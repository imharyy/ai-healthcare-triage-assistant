const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  testName: { type: String, required: true },
  testCode: String,
  category: {
    type: String,
    enum: ['blood', 'urine', 'stool', 'imaging', 'cardiac', 'hormonal', 'allergy', 'genetic', 'other'],
    default: 'blood'
  },
  status: {
    type: String,
    enum: ['ordered', 'sample-collected', 'processing', 'completed', 'cancelled'],
    default: 'ordered'
  },
  priority: { type: String, enum: ['normal', 'urgent', 'stat'], default: 'normal' },
  orderedDate: { type: Date, default: Date.now },
  sampleCollectedAt: Date,
  completedAt: Date,
  results: [{
    parameter: String,
    value: String,
    unit: String,
    normalRange: String,
    isAbnormal: { type: Boolean, default: false },
    flag: { type: String, enum: ['normal', 'low', 'high', 'critical'] }
  }],
  files: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: String,
  interpretation: String, // Doctor's interpretation
  doctorNotified: { type: Boolean, default: false },
  doctorNotifiedAt: Date,
  cost: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false }
}, { timestamps: true });

labTestSchema.index({ patient: 1, orderedDate: -1 });
labTestSchema.index({ doctor: 1, status: 1 });
labTestSchema.index({ hospital: 1 });

module.exports = mongoose.model('LabTest', labTestSchema);
