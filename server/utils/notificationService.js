const Notification = require('../models/Notification');

class NotificationService {
  static async create(userId, type, title, message, data = {}, priority = 'normal') {
    try {
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        priority,
        sentAt: new Date()
      });
      return notification;
    } catch (err) {
      console.error('Notification creation error:', err);
      return null;
    }
  }

  static async sendToSocket(io, userId, notification) {
    try {
      io.to(`user_${userId}`).emit('notification', notification);
    } catch (err) {
      console.error('Socket notification error:', err);
    }
  }

  static async createAndSend(io, userId, type, title, message, data = {}, priority = 'normal') {
    const notification = await this.create(userId, type, title, message, data, priority);
    if (notification && io) {
      this.sendToSocket(io, userId, notification);
    }
    return notification;
  }

  static async appointmentReminder(io, userId, appointment) {
    return this.createAndSend(io, userId, 'appointment-reminder',
      'Appointment Reminder',
      `You have an appointment on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.timeSlot.startTime}`,
      { appointmentId: appointment._id }
    );
  }

  static async queueUpdate(io, userId, position, estimatedWait) {
    return this.createAndSend(io, userId, 'queue-update',
      'Queue Update',
      `Your position: #${position}. Estimated wait: ${estimatedWait} minutes`,
      { position, estimatedWait }
    );
  }

  static async doctorDelay(io, userId, delayMinutes, reason) {
    return this.createAndSend(io, userId, 'doctor-delay',
      'Doctor Running Late',
      `Your doctor is running ${delayMinutes} minutes late. ${reason || ''}`,
      { delayMinutes }, 'high'
    );
  }

  static async labResult(io, userId, testName) {
    return this.createAndSend(io, userId, 'lab-result',
      'Lab Result Available',
      `Your ${testName} results are now available`,
      { testName }
    );
  }

  static async medicationReminder(io, userId, medicationName) {
    return this.createAndSend(io, userId, 'medication-reminder',
      'Medication Reminder',
      `Time to take your medication: ${medicationName}`,
      { medicationName }
    );
  }

  static async followUpReminder(io, userId, doctorName, date) {
    return this.createAndSend(io, userId, 'follow-up-reminder',
      'Follow-up Reminder',
      `You have a follow-up with Dr. ${doctorName} on ${new Date(date).toLocaleDateString()}`,
      { doctorName, date }
    );
  }

  static async emergencyAlert(io, hospitalId, emergencyData) {
    if (io) {
      io.to(`hospital_${hospitalId}`).emit('emergencyAlert', emergencyData);
    }
  }
}

module.exports = NotificationService;
