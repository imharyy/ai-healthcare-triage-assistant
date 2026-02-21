const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isEmergencyOnly: { type: Boolean, default: false },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }
});

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  date: { type: Date, required: true },
  timeSlot: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  tokenNumber: { type: Number },
  type: {
    type: String,
    enum: ['clinic', 'hospital', 'pathology', 'teleconsultation', 'follow-up', 'emergency', 'walk-in'],
    default: 'clinic'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'emergency', 'elderly'],
    default: 'normal'
  },
  reason: String,
  symptoms: [String],
  notes: String,
  // Triage data
  triageData: {
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    suggestedDepartment: String,
    isEmergency: { type: Boolean, default: false },
    suggestTeleconsultation: { type: Boolean, default: false },
    symptoms: [{ name: String, duration: String, severity: String }]
  },
  // Confirmation
  confirmedByPatient: { type: Boolean, default: false },
  confirmationTime: Date,
  // Consultation
  consultationStartTime: Date,
  consultationEndTime: Date,
  consultationNotes: String,
  diagnosis: [String],
  // Follow-up
  followUpDate: Date,
  followUpNotes: String,
  followUpCompleted: { type: Boolean, default: false },
  // Walk-in
  isWalkIn: { type: Boolean, default: false },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Billing link
  billing: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
  // Reschedule history
  rescheduleHistory: [{
    previousDate: Date,
    previousSlot: { startTime: String, endTime: String },
    rescheduledAt: Date,
    reason: String
  }],
  cancelReason: String,
  cancelledAt: Date
}, { timestamps: true });

appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ hospital: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Auto token number generation
appointmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.tokenNumber) {
    const today = new Date(this.date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const count = await mongoose.model('Appointment').countDocuments({
      doctor: this.doctor,
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled'] }
    });
    this.tokenNumber = count + 1;
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
