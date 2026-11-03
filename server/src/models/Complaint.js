import mongoose from 'mongoose';

// awaiting_items / items_arrived happen only when the needed item is not in the department's stock
export const STATUSES = [
  'pending', 'acknowledged', 'awaiting_items', 'items_arrived', 'worker_assigned', 'in_progress', 'resolved',
];

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES },
    note: String,
    byName: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintNo: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: String,

    authority: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', required: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },

    source: { type: String, enum: ['student', 'council', 'device'], required: true },
    lodgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who submitted it
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // student it concerns

    // automated complaints
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    sensorType: String,
    reading: String,
    repeatCount: { type: Number, default: 0 },
    lastTriggeredAt: Date,

    image: { url: String, publicId: String },

    item: String, // item needed for the repair (from stock, or awaited from institute funds)

    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    status: { type: String, enum: STATUSES, default: 'pending' },
    history: [historySchema],
    resolvedAt: Date,

    // users who have closed the "resolved" popup for this complaint
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

complaintSchema.index({ hostel: 1, createdAt: -1 });
complaintSchema.index({ authority: 1, status: 1, createdAt: -1 });
complaintSchema.index({ student: 1 });
complaintSchema.index({ device: 1, status: 1 });

export default mongoose.model('Complaint', complaintSchema);
