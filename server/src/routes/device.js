import { Router } from 'express';
import Device from '../models/Device.js';
import Authority from '../models/Authority.js';
import Complaint from '../models/Complaint.js';
import { nextComplaintNo } from '../models/Counter.js';
import { POPULATE } from '../utils/scope.js';
import { emitComplaint } from '../utils/realtime.js';
import { automatedImage } from '../config/automatedImage.js';

const router = Router();

// What each sensor type files, and which department it goes to
const RULES = {
  leak: {
    authority: 'WATER',
    title: 'Water leakage detected',
    priority: 'high',
    describe: (r, d) => `Leak sensor at ${d.location} detected water on the floor.`,
  },
  dustbin: {
    authority: 'SANITATION',
    title: 'Dustbin full',
    priority: 'normal',
    describe: (r, d) => `Dustbin at ${d.location} is full${r ? ` (garbage ${r} below the lid)` : ''}.`,
  },
  water_quality: {
    authority: 'WATER',
    title: 'Drinking water quality alert',
    priority: 'high',
    describe: (r, d) =>
      `Water at ${d.location} reads ${r || 'above the safe TDS limit'}. The filter or RO may need service.`,
  },
  geyser: {
    authority: 'ELECTRICAL',
    title: 'No hot water (geyser fault)',
    priority: 'normal',
    describe: (r, d) => `Geyser outlet at ${d.location} is staying cold${r ? ` (${r})` : ''}.`,
  },
};

/*
  POST /api/device/report
  Body (JSON): { "deviceId": "HA-LEAK-01", "apiKey": "key-ha-leak-01", "reading": "wet", "message": "" }
  Responses: 201 created | 200 duplicate (an open complaint already exists for this device) | 401 bad key
*/
router.post('/report', async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId || req.get('x-device-id');
    const apiKey = req.body?.apiKey || req.get('x-device-key');
    if (!deviceId || !apiKey) return res.status(400).json({ message: 'deviceId and apiKey are required' });

    const device = await Device.findOne({ deviceId }).select('+apiKey');
    if (!device || device.apiKey !== apiKey) {
      return res.status(401).json({ message: 'Unknown device or wrong key' });
    }

    const reading = req.body.reading != null ? String(req.body.reading).slice(0, 100) : undefined;
    const extra = req.body.message ? String(req.body.message).slice(0, 300) : '';
    device.lastSeen = new Date();
    device.lastReading = reading;
    device.lastIp = req.ip;
    await device.save();

    // One open complaint per device: repeated triggers update it instead of creating new tickets
    const open = await Complaint.findOne({ device: device._id, status: { $ne: 'resolved' } });
    if (open) {
      open.repeatCount += 1;
      open.lastTriggeredAt = new Date();
      if (reading) open.reading = reading;
      await open.save();
      await open.populate(POPULATE);
      emitComplaint('complaint:updated', open);
      return res.status(200).json({ status: 'duplicate', complaintNo: open.complaintNo });
    }

    const rule = RULES[device.sensorType];
    const authority = await Authority.findOne({ code: rule.authority }).lean();
    if (!authority) return res.status(500).json({ message: `Authority ${rule.authority} missing; run npm run seed` });

    const complaint = await Complaint.create({
      complaintNo: await nextComplaintNo(),
      title: rule.title,
      description: [rule.describe(reading, device), extra].filter(Boolean).join(' '),
      location: device.location,
      authority: authority._id,
      hostel: device.hostel,
      source: 'device',
      device: device._id,
      sensorType: device.sensorType,
      reading,
      image: await automatedImage(),
      priority: rule.priority,
      lastTriggeredAt: new Date(),
      history: [{ status: 'pending', note: `Reported automatically by ${device.deviceId}`, byName: device.deviceId }],
    });

    await complaint.populate(POPULATE);
    emitComplaint('complaint:new', complaint);
    res.status(201).json({ status: 'created', complaintNo: complaint.complaintNo });
  } catch (e) {
    next(e);
  }
});

export default router;
