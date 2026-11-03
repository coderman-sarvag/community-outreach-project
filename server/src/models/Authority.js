import mongoose from 'mongoose';

const authoritySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    worker: String, // who visits to fix things, e.g. Electrician, Carpenter
    email: String,
    phone: String,
  },
  { timestamps: true }
);

export default mongoose.model('Authority', authoritySchema);
