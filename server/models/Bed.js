const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bedNumber: { type: String, required: true },
  ward: { type: String, enum: ['icu', 'general', 'emergency', 'pediatric', 'maternity', 'surgical', 'private'], required: true },
  floor: String,
  room: String,
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'],
    default: 'available'
  },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittedAt: Date,
  expectedDischarge: Date,
  dailyRate: { type: Number, default: 0 },
  features: [String], // e.g., 'oxygen', 'monitor', 'ventilator'
  notes: String,
  lastMaintenanceDate: Date,
  isEmergencyAllocated: { type: Boolean, default: false }
}, { timestamps: true });

bedSchema.index({ hospital: 1, ward: 1, status: 1 });

module.exports = mongoose.model('Bed', bedSchema);
