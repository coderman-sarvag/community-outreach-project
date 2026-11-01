import { Router } from 'express';
import Authority from '../models/Authority.js';
import User from '../models/User.js';
import Device from '../models/Device.js';
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

router.get('/devices', requireRole('council'), async (req, res, next) => {
  try {
    res.json(await Device.find({ hostel: req.user.hostel }).sort('deviceId').lean());
  } catch (e) {
    next(e);
  }
});

export default router;
