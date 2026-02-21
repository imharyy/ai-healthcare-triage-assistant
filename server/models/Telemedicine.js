const mongoose = require('mongoose');

const telemedicineSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  roomId: { type: String, unique: true },
  status: {
    type: String,
    enum: ['scheduled', 'waiting', 'in-progress', 'completed', 'cancelled', 'failed'],
    default: 'scheduled'
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number, // minutes
  // Chat messages
  chatMessages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
    fileUrl: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Shared files
  sharedFiles: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: String,
    path: String,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Notes
  consultationNotes: String,
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  // Recording consent
  recordingConsent: { type: Boolean, default: false },
  recordingPath: String,
  // Payment
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  paymentAmount: Number,
  transactionId: String
}, { timestamps: true });

telemedicineSchema.index({ appointment: 1 });
telemedicineSchema.index({ roomId: 1 });

module.exports = mongoose.model('Telemedicine', telemedicineSchema);
