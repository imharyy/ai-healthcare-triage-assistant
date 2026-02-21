const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  type: { type: String, enum: ['medical', 'accident', 'cardiac', 'stroke', 'breathing', 'other'], default: 'medical' },
  description: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  status: {
    type: String,
    enum: ['requested', 'acknowledged', 'dispatched', 'arrived', 'resolved', 'cancelled'],
    default: 'requested'
  },
  ambulanceRequested: { type: Boolean, default: false },
  ambulanceStatus: { type: String, enum: ['none', 'dispatched', 'en-route', 'arrived'], default: 'none' },
  contactNumber: String,
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: Date,
  resolvedAt: Date,
  notes: String,
  priority: { type: String, enum: ['high', 'critical'], default: 'high' }
}, { timestamps: true });

emergencyRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
