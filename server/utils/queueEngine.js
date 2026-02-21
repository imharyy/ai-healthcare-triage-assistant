const Queue = require('../models/Queue');
const Notification = require('../models/Notification');

class QueueEngine {
  // Get or create today's queue for a doctor
  static async getOrCreateQueue(doctorId, hospitalId, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let queue = await Queue.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    if (!queue) {
      queue = new Queue({
        doctor: doctorId,
        hospital: hospitalId,
        date: dayStart,
        currentToken: 0,
        totalInQueue: 0,
        entries: []
      });
      await queue.save();
    }
    return queue;
  }

  // Add patient to queue
  static async addToQueue(doctorId, hospitalId, appointmentId, patientId, tokenNumber, priority = 'normal') {
    const queue = await this.getOrCreateQueue(doctorId, hospitalId, new Date());
    
    // Check if already in queue
    const existing = queue.entries.find(e => e.patient.toString() === patientId.toString());
    if (existing) return queue;

    let position = queue.entries.filter(e => e.status === 'waiting').length + 1;

    // Priority handling
    if (priority === 'emergency' || priority === 'elderly') {
      const priorityEntries = queue.entries.filter(e => 
        e.status === 'waiting' && (e.priority === 'emergency' || e.priority === 'elderly')
      );
      position = priorityEntries.length + 1;
    }

    queue.entries.push({
      appointment: appointmentId,
      patient: patientId,
      tokenNumber,
      position,
      status: 'waiting',
      priority,
      checkedInAt: new Date(),
      estimatedWaitTime: position * queue.averageConsultationTime + queue.doctorDelay
    });

    queue.totalInQueue = queue.entries.filter(e => e.status === 'waiting').length;
    queue.recalculateWaitTimes();
    await queue.save();
    return queue;
  }

  // Call next patient
  static async callNext(doctorId, hospitalId) {
    const queue = await this.getOrCreateQueue(doctorId, hospitalId, new Date());
    
    // Sort by priority then position
    const waiting = queue.entries
      .filter(e => e.status === 'waiting')
      .sort((a, b) => {
        const priorityOrder = { emergency: 0, elderly: 1, urgent: 2, normal: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.position - b.position;
      });

    if (waiting.length === 0) return { queue, entry: null };

    const next = waiting[0];
    const entryIdx = queue.entries.findIndex(e => e.patient.toString() === next.patient.toString());
    queue.entries[entryIdx].status = 'called';
    queue.entries[entryIdx].calledAt = new Date();
    queue.currentToken = next.tokenNumber;
    queue.recalculateWaitTimes();
    await queue.save();

    return { queue, entry: queue.entries[entryIdx] };
  }

  // Start consultation
  static async startConsultation(doctorId, patientId) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    const entryIdx = queue.entries.findIndex(e => 
      e.patient.toString() === patientId.toString() && (e.status === 'called' || e.status === 'waiting')
    );
    if (entryIdx !== -1) {
      queue.entries[entryIdx].status = 'in-consultation';
      await queue.save();
    }
    return queue;
  }

  // Complete consultation
  static async completeConsultation(doctorId, patientId) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    const entryIdx = queue.entries.findIndex(e => 
      e.patient.toString() === patientId.toString() && e.status === 'in-consultation'
    );
    if (entryIdx !== -1) {
      queue.entries[entryIdx].status = 'completed';
      queue.entries[entryIdx].completedAt = new Date();

      // Update average consultation time
      if (queue.entries[entryIdx].calledAt) {
        const duration = (new Date() - queue.entries[entryIdx].calledAt) / 60000;
        const completedCount = queue.entries.filter(e => e.status === 'completed').length;
        queue.averageConsultationTime = Math.round(
          ((queue.averageConsultationTime * (completedCount - 1)) + duration) / completedCount
        );
      }

      queue.totalInQueue = queue.entries.filter(e => e.status === 'waiting').length;
      queue.recalculateWaitTimes();
      await queue.save();
    }
    return queue;
  }

  // Skip patient
  static async skipPatient(doctorId, patientId) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    const entryIdx = queue.entries.findIndex(e => 
      e.patient.toString() === patientId.toString()
    );
    if (entryIdx !== -1) {
      queue.entries[entryIdx].status = 'skipped';
      queue.totalInQueue = queue.entries.filter(e => e.status === 'waiting').length;
      queue.recalculateWaitTimes();
      await queue.save();
    }
    return queue;
  }

  // Pause queue (emergency)
  static async pauseQueue(doctorId, reason) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    queue.status = 'emergency-pause';
    queue.pauseReason = reason;
    queue.recalculateWaitTimes();
    await queue.save();
    return queue;
  }

  // Resume queue
  static async resumeQueue(doctorId) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    queue.status = 'active';
    queue.pauseReason = '';
    queue.recalculateWaitTimes();
    await queue.save();
    return queue;
  }

  // Set doctor delay
  static async setDoctorDelay(doctorId, delayMinutes, reason) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    queue.doctorDelay = delayMinutes;
    queue.delayReason = reason;
    queue.recalculateWaitTimes();
    await queue.save();
    return queue;
  }

  // Get patient position
  static async getPatientPosition(doctorId, patientId) {
    const queue = await this.getOrCreateQueue(doctorId, null, new Date());
    const entry = queue.entries.find(e => e.patient.toString() === patientId.toString());
    if (!entry) return null;

    const waitingAhead = queue.entries.filter(e => 
      e.status === 'waiting' && e.position < entry.position
    ).length;

    return {
      tokenNumber: entry.tokenNumber,
      position: waitingAhead + 1,
      estimatedWaitTime: entry.estimatedWaitTime,
      arrivalSuggestion: entry.arrivalSuggestion,
      status: entry.status,
      queueStatus: queue.status,
      doctorDelay: queue.doctorDelay
    };
  }
}

module.exports = QueueEngine;
