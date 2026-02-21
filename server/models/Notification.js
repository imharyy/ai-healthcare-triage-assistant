const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'appointment-reminder', 'appointment-confirmed', 'appointment-cancelled',
      'queue-update', 'doctor-delay', 'follow-up-reminder',
      'lab-result', 'medication-reminder', 'emergency',
      'feedback-request', 'prescription-ready', 'billing',
      'general', 'system'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  channel: { type: String, enum: ['in-app', 'email', 'sms', 'push', 'all'], default: 'in-app' },
  scheduledFor: Date,
  sentAt: Date,
  expiresAt: Date
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
