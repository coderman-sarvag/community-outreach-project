import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'council', 'authority'], required: true },
    phone: String,

    // student and council
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },

    // council
    designation: String,

    // student
    enrollmentNo: String,
    branch: String,
    roomNo: String,

    // authority
    authority: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority' },
  },
  { timestamps: true }
);

userSchema.index({ hostel: 1, role: 1 });

export default mongoose.model('User', userSchema);
