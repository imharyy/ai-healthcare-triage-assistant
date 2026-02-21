const router = require('express').Router();
const Telemedicine = require('../models/Telemedicine');
const { v4: uuidv4 } = require('uuid');
const { auth, authorize } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Create telemedicine session
router.post('/', auth, authorize('doctor'), async (req, res) => {
  try {
    const session = await Telemedicine.create({
      ...req.body,
      roomId: uuidv4(),
      doctor: req.user._id
    });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Join session
router.get('/join/:roomId', auth, async (req, res) => {
  try {
    const session = await Telemedicine.findOne({ roomId: req.params.roomId })
      .populate('patient', 'firstName lastName profilePhoto')
      .populate('doctor', 'firstName lastName specialization profilePhoto');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (session.status === 'scheduled') {
      session.status = 'waiting';
      await session.save();
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start session
router.put('/:id/start', auth, authorize('doctor'), async (req, res) => {
  try {
    const session = await Telemedicine.findByIdAndUpdate(req.params.id, {
      status: 'in-progress',
      startedAt: new Date()
    }, { new: true });

    const io = req.app.get('io');
    io.to(`user_${session.patient}`).emit('teleconsultationStarted', { sessionId: session._id, roomId: session.roomId });

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// End session
router.put('/:id/end', auth, authorize('doctor'), async (req, res) => {
  try {
    const session = await Telemedicine.findById(req.params.id);
    session.status = 'completed';
    session.endedAt = new Date();
    session.duration = session.startedAt ? Math.round((session.endedAt - session.startedAt) / 60000) : 0;
    session.consultationNotes = req.body.notes;
    await session.save();

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send chat message
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const session = await Telemedicine.findById(req.params.id);
    session.chatMessages.push({
      sender: req.user._id,
      message: req.body.message,
      type: req.body.type || 'text'
    });
    await session.save();

    const io = req.app.get('io');
    const recipientId = req.user._id.toString() === session.doctor.toString() ? session.patient : session.doctor;
    io.to(`user_${recipientId}`).emit('chatMessage', {
      sessionId: session._id,
      message: req.body.message,
      sender: req.user._id,
      senderName: `${req.user.firstName} ${req.user.lastName}`
    });

    res.json({ success: true, data: session.chatMessages[session.chatMessages.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload file in telemedicine
router.post('/:id/file', auth, setUploadType('telemedicine'), upload.single('file'), async (req, res) => {
  try {
    const session = await Telemedicine.findById(req.params.id);
    const file = {
      sender: req.user._id,
      filename: req.file.originalname,
      path: `/uploads/telemedicine/${req.file.filename}`,
      mimetype: req.file.mimetype
    };
    session.sharedFiles.push(file);
    await session.save();
    res.json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my sessions
router.get('/my', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : { patient: req.user._id };
    const sessions = await Telemedicine.find(filter)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName specialization')
      .populate('appointment')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
