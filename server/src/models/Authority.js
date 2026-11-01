import mongoose from 'mongoose';

const authoritySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    email: String,
    phone: String,
  },
  { timestamps: true }
);

export default mongoose.model('Authority', authoritySchema);
