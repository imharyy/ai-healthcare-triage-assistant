const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  services: [String],
  isActive: { type: Boolean, default: true },
  floor: String,
  roomNumbers: [String],
  contactExtension: String
}, { timestamps: true });

departmentSchema.index({ hospital: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
