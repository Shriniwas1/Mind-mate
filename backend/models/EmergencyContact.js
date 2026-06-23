const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: {
    type: String,
    required: true
  },
  hasApp: { 
    type: Boolean, 
    default: false 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

emergencyContactSchema.index({ userId: 1 });
emergencyContactSchema.index({ email: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);