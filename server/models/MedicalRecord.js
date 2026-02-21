const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  type: {
    type: String,
    enum: ['visit', 'lab-report', 'prescription', 'imaging', 'discharge-summary', 'surgical', 'vaccination', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['blood', 'sugar', 'xray', 'mri', 'ct-scan', 'ultrasound', 'ecg', 'general', 'pathology', 'other'],
    default: 'general'
  },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  // Visit details
  visitNotes: String,
  diagnosis: [String],
  symptoms: [String],
  vitals: {
    bloodPressure: { systolic: Number, diastolic: Number },
    heartRate: Number,
    temperature: Number,
    weight: Number,
    height: Number,
    oxygenSaturation: Number,
    respiratoryRate: Number,
    bloodSugar: { fasting: Number, postPrandial: Number, random: Number }
  },
  // Files
  files: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Lab results for chronic parameter tracking
  labValues: [{
    parameter: String,
    value: Number,
    unit: String,
    normalRange: { min: Number, max: Number },
    isAbnormal: Boolean,
    date: Date
  }],
  // Tags
  tags: [String],
  isConfidential: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

medicalRecordSchema.index({ patient: 1, date: -1 });
medicalRecordSchema.index({ patient: 1, type: 1 });
medicalRecordSchema.index({ patient: 1, category: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
