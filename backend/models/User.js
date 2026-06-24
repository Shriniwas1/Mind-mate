const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  hasApp: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  profileCompleted: { type: Boolean, default: false },
  emergencyContact: emergencyContactSchema,
  createdAt: { type: Date, default: Date.now },
  // Password reset via OTP
  resetOtp: { type: String, default: null },          // bcrypt-hashed 6-digit OTP
  resetOtpExpiry: { type: Date, default: null },       // expires 10 minutes after generation
});

userSchema.index({ 'emergencyContact.email': 1 });

// FIXED: Removed 'next' because it's an async function
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (error) {
    throw error; // Mongoose will catch this and pass it to the route
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);