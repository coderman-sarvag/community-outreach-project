import mongoose from 'mongoose';

// Items a department keeps in stock for repairs (only that department sees them)
const itemSchema = new mongoose.Schema(
  {
    authority: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', required: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, default: 'pcs' },
    quantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

itemSchema.index({ authority: 1, name: 1 }, { unique: true });

export default mongoose.model('Item', itemSchema);
