import { Router } from 'express';
import Authority from '../models/Authority.js';
import User from '../models/User.js';
import Device from '../models/Device.js';
import Item from '../models/Item.js';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const COUNCIL_ORDER = [
  'Warden',
  'Assistant Warden',
  'Supervisor',
  'Bhawan Secretary',
  'Technical Secretary',
  'Mess Secretary',
];

router.get('/authorities', async (req, res, next) => {
  try {
    res.json(await Authority.find().sort('name').lean());
  } catch (e) {
    next(e);
  }
});

router.get('/council', requireRole('student', 'council'), async (req, res, next) => {
  try {
    const members = await User.find({ role: 'council', hostel: req.user.hostel })
      .select('name designation phone email')
      .lean();
    members.sort((a, b) => COUNCIL_ORDER.indexOf(a.designation) - COUNCIL_ORDER.indexOf(b.designation));
    res.json(members);
  } catch (e) {
    next(e);
  }
});

router.get('/students', requireRole('council'), async (req, res, next) => {
  try {
    res.json(
      await User.find({ role: 'student', hostel: req.user.hostel })
        .select('name enrollmentNo branch roomNo email phone')
        .sort('name')
        .lean()
    );
  } catch (e) {
    next(e);
  }
});

// Stock list: only the department itself sees and updates its items
router.get('/items', requireRole('authority'), async (req, res, next) => {
  try {
    res.json(await Item.find({ authority: req.user.authority }).sort('name').lean());
  } catch (e) {
    next(e);
  }
});

router.patch('/items/:id', requireRole('authority'), async (req, res, next) => {
  try {
    const quantity = Math.max(0, Math.floor(Number(req.body.quantity)));
    if (!mongoose.isValidObjectId(req.params.id) || !Number.isFinite(quantity)) {
      return res.status(400).json({ message: 'Invalid item or quantity.' });
    }
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, authority: req.user.authority },
      { quantity },
      { new: true }
    ).lean();
    if (!item) return res.status(404).json({ message: 'Item not found for your department.' });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.get('/devices', requireRole('council'), async (req, res, next) => {
  try {
    res.json(await Device.find({ hostel: req.user.hostel }).sort('deviceId').lean());
  } catch (e) {
    next(e);
  }
});

export default router;
