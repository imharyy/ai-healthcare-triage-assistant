const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  date: { type: Date, required: true },
  currentToken: { type: Number, default: 0 },
  totalInQueue: { type: Number, default: 0 },
  averageConsultationTime: { type: Number, default: 15 }, // minutes
  status: { type: String, enum: ['active', 'paused', 'closed', 'emergency-pause'], default: 'active' },
  pauseReason: String,
  entries: [{
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tokenNumber: Number,
    position: Number,
    status: {
      type: String,
      enum: ['waiting', 'called', 'in-consultation', 'completed', 'skipped', 'no-show'],
      default: 'waiting'
    },
    priority: { type: String, enum: ['normal', 'urgent', 'emergency', 'elderly'], default: 'normal' },
    checkedInAt: Date,
    calledAt: Date,
    completedAt: Date,
    estimatedWaitTime: Number, // minutes
    arrivalSuggestion: String
  }],
  doctorDelay: { type: Number, default: 0 }, // minutes
  delayReason: String,
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

queueSchema.index({ doctor: 1, date: 1 }, { unique: true });
queueSchema.index({ hospital: 1, date: 1 });

// Calculate estimated wait times
queueSchema.methods.recalculateWaitTimes = function() {
  let cumulativeWait = this.doctorDelay;
  const waitingEntries = this.entries.filter(e => e.status === 'waiting');
  waitingEntries.forEach((entry, idx) => {
    entry.estimatedWaitTime = cumulativeWait + (idx * this.averageConsultationTime);
    if (entry.estimatedWaitTime > 15) {
      const arriveIn = entry.estimatedWaitTime - 15;
      entry.arrivalSuggestion = `Arrive in ${arriveIn} minutes`;
    } else {
      entry.arrivalSuggestion = 'Please be at the hospital';
    }
  });
  this.lastUpdated = new Date();
  return this;
};

module.exports = mongoose.model('Queue', queueSchema);
