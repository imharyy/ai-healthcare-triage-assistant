const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: String,
  dosage: { type: String, required: true },
  frequency: { type: String, required: true }, // e.g., "1-0-1", "twice daily"
  duration: String, // e.g., "7 days", "2 weeks"
  timing: { type: String, enum: ['before-meal', 'after-meal', 'with-meal', 'empty-stomach', 'bedtime', 'as-needed'] },
  route: { type: String, enum: ['oral', 'topical', 'injection', 'inhalation', 'other'], default: 'oral' },
  instructions: String,
  // Drug interaction
  interactions: [{ drug: String, severity: String, description: String }]
});

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  date: { type: Date, default: Date.now },
  diagnosis: [String],
  medications: [medicationSchema],
  investigations: [{ name: String, instructions: String, urgency: String }],
  advice: [String],
  notes: String,
  followUpDate: Date,
  followUpInstructions: String,
  // Digital signature
  digitalSignature: String,
  signedAt: Date,
  // PDF
  pdfPath: String,
  // Pharmacy
  sentToPharmacy: { type: Boolean, default: false },
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  pharmacyStatus: { type: String, enum: ['pending', 'processing', 'ready', 'dispensed'], default: 'pending' },
  // Templates
  templateUsed: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

prescriptionSchema.index({ patient: 1, date: -1 });
prescriptionSchema.index({ doctor: 1, date: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
