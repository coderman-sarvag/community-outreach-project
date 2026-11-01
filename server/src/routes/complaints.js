import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Complaint, { STATUSES } from '../models/Complaint.js';
import Authority from '../models/Authority.js';
import User from '../models/User.js';
import { nextComplaintNo } from '../models/Counter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { scopeFilter, POPULATE } from '../utils/scope.js';
import { emitComplaint } from '../utils/realtime.js';
import { uploadImage } from '../config/cloudinary.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(Object.assign(new Error('Only image files can be attached.'), { status: 400 })),
});

const bad = (res, message, status = 400) => res.status(status).json({ message });

// List complaints the logged-in user is allowed to see
router.get('/', async (req, res, next) => {
  try {
    const filter = scopeFilter(req.user);
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const complaints = await Complaint.find(filter)
      .select('-seenBy')
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json(complaints);
  } catch (e) {
    next(e);
  }
});

// Resolved complaints this user has not closed the popup for yet
router.get('/notifications', requireRole('student', 'council'), async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      ...scopeFilter(req.user),
      status: 'resolved',
      seenBy: { $ne: req.user._id },
    })
      .select('-seenBy')
      .populate(POPULATE)
      .sort({ resolvedAt: 1 })
      .limit(50)
      .lean();
    res.json(complaints);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/seen', requireRole('student', 'council'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid complaint.');
    await Complaint.updateOne(
      { _id: req.params.id, ...scopeFilter(req.user) },
      { $addToSet: { seenBy: req.user._id } }
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Lodge a complaint (student, or council on behalf of a student / the hostel)
router.post('/', requireRole('student', 'council'), upload.single('image'), async (req, res, next) => {
  try {
    const user = req.user;
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const location = String(req.body.location || '').trim();
    const { authorityId, studentId } = req.body;

    if (!title) return bad(res, 'Add a short title for the complaint.');
    if (!mongoose.isValidObjectId(authorityId) || !(await Authority.exists({ _id: authorityId }))) {
      return bad(res, 'Choose which authority the complaint is for.');
    }

    let student = null;
    if (user.role === 'student') {
      student = user._id;
    } else if (studentId) {
      if (!mongoose.isValidObjectId(studentId)) return bad(res, 'Invalid student.');
      const s = await User.findOne({ _id: studentId, role: 'student', hostel: user.hostel }).lean();
      if (!s) return bad(res, 'That student is not in your hostel.');
      student = s._id;
    }

    const image = req.file ? await uploadImage(req.file.buffer, req.file.mimetype) : undefined;

    const complaint = await Complaint.create({
      complaintNo: await nextComplaintNo(),
      title: title.slice(0, 120),
      description: description.slice(0, 2000),
      location: (location || (user.role === 'student' ? `Room ${user.roomNo}` : '')).slice(0, 120),
      authority: authorityId,
      hostel: user.hostel,
      source: user.role === 'student' ? 'student' : 'council',
      lodgedBy: user._id,
      student,
      image,
      history: [{ status: 'pending', note: 'Complaint lodged', byName: user.name }],
    });

    await complaint.populate(POPULATE);
    emitComplaint('complaint:new', complaint);
    const out = complaint.toObject();
    delete out.seenBy;
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
});

// Authority moves a complaint forward: pending -> acknowledged -> in_progress -> resolved
router.patch('/:id/status', requireRole('authority'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid complaint.');
    const { status } = req.body;
    const note = String(req.body.note || '').trim().slice(0, 500);
    if (!STATUSES.includes(status)) return bad(res, 'Unknown status.');

    const complaint = await Complaint.findOne({ _id: req.params.id, authority: req.user.authority });
    if (!complaint) return bad(res, 'Complaint not found for your department.', 404);
    if (STATUSES.indexOf(status) <= STATUSES.indexOf(complaint.status)) {
      return bad(res, `This complaint is already ${complaint.status.replace('_', ' ')}.`);
    }

    complaint.status = status;
    complaint.history.push({ status, note, byName: req.user.name });
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.seenBy = [];
    }
    await complaint.save();
    await complaint.populate(POPULATE);

    emitComplaint('complaint:updated', complaint);
    if (status === 'resolved') emitComplaint('complaint:resolved', complaint);

    const out = complaint.toObject();
    delete out.seenBy;
    res.json(out);
  } catch (e) {
    next(e);
  }
});

export default router;
