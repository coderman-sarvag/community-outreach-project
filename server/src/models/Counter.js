import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

// Atomic, so two complaints arriving at the same moment never get the same number
export async function nextComplaintNo() {
  const c = await Counter.findByIdAndUpdate(
    'complaint',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CMP-${String(c.seq).padStart(4, '0')}`;
}

export default Counter;
