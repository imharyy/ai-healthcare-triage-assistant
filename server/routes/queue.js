const router = require('express').Router();
const Queue = require('../models/Queue');
const QueueEngine = require('../utils/queueEngine');
const { auth, authorize } = require('../middleware/auth');

// Get queue status
router.get('/:doctorId', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queue = await Queue.findOne({
      doctor: req.params.doctorId,
      date: { $gte: today, $lt: tomorrow }
    }).populate('entries.patient', 'firstName lastName phone profilePhoto')
      .populate('entries.appointment');

    if (!queue) return res.json({ success: true, data: null, message: 'No active queue' });
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient's position in queue
router.get('/position/:doctorId', auth, async (req, res) => {
  try {
    const position = await QueueEngine.getPatientPosition(req.params.doctorId, req.user._id);
    if (!position) return res.json({ success: true, data: null, message: 'Not in queue' });
    res.json({ success: true, data: position });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Call next patient
router.post('/call-next/:doctorId', auth, authorize('doctor'), async (req, res) => {
  try {
    const { queue, entry } = await QueueEngine.callNext(req.params.doctorId, req.user.hospital);
    const io = req.app.get('io');

    if (entry) {
      io.to(`user_${entry.patient}`).emit('yourTurn', { tokenNumber: entry.tokenNumber });
      io.to(`queue_${req.params.doctorId}_${new Date().toISOString().split('T')[0]}`).emit('queuePositionUpdate', {
        currentToken: entry.tokenNumber,
        entries: queue.entries
      });
    }

    res.json({ success: true, data: { queue, calledEntry: entry } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Set doctor delay
router.post('/delay/:doctorId', auth, authorize('doctor'), async (req, res) => {
  try {
    const { delayMinutes, reason } = req.body;
    const queue = await QueueEngine.setDoctorDelay(req.params.doctorId, delayMinutes, reason);

    const io = req.app.get('io');
    // Notify all waiting patients
    queue.entries.filter(e => e.status === 'waiting').forEach(entry => {
      io.to(`user_${entry.patient}`).emit('doctorDelay', {
        delay: delayMinutes,
        reason,
        newEstimatedWait: entry.estimatedWaitTime
      });
    });

    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient's current queue position (auto-detect from token)
router.get('/my-position', auth, async (req, res) => {
  try {
    const queue = await Queue.findOne({
      'entries.patient': req.user._id,
      'entries.status': { $in: ['waiting', 'in-progress'] },
      date: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    }).populate('doctor', 'firstName lastName specialization profilePhoto');

    if (!queue) return res.json({ success: true, data: null });

    const myEntry = queue.entries.find(e => e.patient.toString() === req.user._id.toString() && ['waiting', 'in-progress'].includes(e.status));
    const waitingBefore = queue.entries.filter(e => e.status === 'waiting' && e.position < (myEntry?.position || 999)).length;

    res.json({
      success: true,
      data: {
        queueId: queue._id,
        doctor: queue.doctor,
        position: myEntry?.status === 'in-progress' ? 0 : waitingBefore + 1,
        status: myEntry?.status,
        estimatedWaitTime: myEntry?.estimatedWaitTime || waitingBefore * 15,
        totalInQueue: queue.entries.filter(e => e.status === 'waiting').length,
        isPaused: queue.isPaused,
        delay: queue.doctorDelay
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor's own queue
router.get('/my-queue', auth, authorize('doctor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let queue = await Queue.findOne({ doctor: req.user._id, date: { $gte: today } })
      .populate('entries.patient', 'firstName lastName phone dateOfBirth gender bloodGroup profilePhoto')
      .populate('entries.appointment');

    if (!queue) {
      queue = await Queue.create({ doctor: req.user._id, hospital: req.user.hospital, date: today });
    }

    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Call next patient (auto from token)
router.post('/call-next', auth, authorize('doctor'), async (req, res) => {
  try {
    const queue = await QueueEngine.callNextPatient(req.user._id);
    const io = req.app.get('io');
    const current = queue.entries.find(e => e.status === 'in-progress');
    if (current) {
      io.to(`user_${current.patient}`).emit('yourTurn', { doctor: req.user._id });
    }
    io.to(`doctor_${req.user._id}`).emit('queueUpdate', queue);
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Set delay (auto from token)
router.post('/set-delay', auth, authorize('doctor'), async (req, res) => {
  try {
    const { delayMinutes, reason } = req.body;
    const queue = await QueueEngine.setDoctorDelay(req.user._id, delayMinutes, reason);
    const io = req.app.get('io');
    queue.entries.filter(e => e.status === 'waiting').forEach(entry => {
      io.to(`user_${entry.patient}`).emit('doctorDelay', { delay: delayMinutes, reason });
    });
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
