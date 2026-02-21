const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 15 }, // minutes
  maxPatients: { type: Number, default: 20 },
  isActive: { type: Boolean, default: true },
  consultationType: { type: String, enum: ['in-person', 'teleconsultation', 'both'], default: 'in-person' },
  // Blocked dates
  blockedDates: [{
    date: Date,
    reason: String,
    isFullDay: { type: Boolean, default: true },
    startTime: String,
    endTime: String
  }],
  // Emergency only slots
  emergencySlots: [{
    startTime: String,
    endTime: String
  }],
  // Leave
  leaves: [{
    startDate: Date,
    endDate: Date,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

scheduleSchema.index({ doctor: 1, dayOfWeek: 1 });
scheduleSchema.index({ hospital: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
