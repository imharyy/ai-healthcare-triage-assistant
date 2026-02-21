const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  type: { type: String, enum: ['doctor', 'hospital', 'service', 'general'], default: 'doctor' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  categories: {
    doctorBehavior: { type: Number, min: 1, max: 5 },
    waitTime: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    facilities: { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
    overallExperience: { type: Number, min: 1, max: 5 }
  },
  comment: String,
  isAnonymous: { type: Boolean, default: false },
  response: { text: String, respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, respondedAt: Date }
}, { timestamps: true });

feedbackSchema.index({ doctor: 1 });
feedbackSchema.index({ hospital: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
