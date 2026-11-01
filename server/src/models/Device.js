import mongoose from 'mongoose';

export const SENSOR_TYPES = ['leak', 'dustbin', 'water_quality', 'geyser'];

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, select: false },
    sensorType: { type: String, enum: SENSOR_TYPES, required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    location: { type: String, required: true },
    lastSeen: Date,
    lastReading: String,
    lastIp: String,
  },
  { timestamps: true }
);

export default mongoose.model('Device', deviceSchema);
