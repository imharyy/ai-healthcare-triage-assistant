const router = require('express').Router();
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { auth, authorize } = require('../middleware/auth');

// Submit feedback
router.post('/', auth, async (req, res) => {
  try {
    const feedback = await Feedback.create({
      patient: req.user._id,
      ...req.body
    });

    // Update doctor rating
    if (feedback.doctor) {
      const feedbacks = await Feedback.find({ doctor: feedback.doctor });
      const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      await User.findByIdAndUpdate(feedback.doctor, {
        averageRating: avgRating.toFixed(1),
        totalRatings: feedbacks.length
      });
    }

    // Update hospital rating
    if (feedback.hospital) {
      const hospitalFeedbacks = await Feedback.find({ hospital: feedback.hospital });
      const avgRating = hospitalFeedbacks.reduce((sum, f) => sum + f.rating, 0) / hospitalFeedbacks.length;
      await Hospital.findByIdAndUpdate(feedback.hospital, {
        rating: avgRating.toFixed(1),
        totalReviews: hospitalFeedbacks.length
      });
    }

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get feedback for doctor
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ doctor: req.params.doctorId })
      .populate('patient', 'firstName lastName')
      .sort({ createdAt: -1 });
    const avg = feedbacks.reduce((s, f) => s + f.rating, 0) / (feedbacks.length || 1);
    res.json({ success: true, data: feedbacks, averageRating: avg.toFixed(1) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get feedback for hospital
router.get('/hospital/:hospitalId', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ hospital: req.params.hospitalId })
      .populate('patient', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Satisfaction scores
    const categories = { doctorBehavior: 0, waitTime: 0, cleanliness: 0, facilities: 0, valueForMoney: 0, overallExperience: 0 };
    let count = 0;
    feedbacks.forEach(f => {
      if (f.categories) {
        Object.keys(categories).forEach(key => {
          if (f.categories[key]) { categories[key] += f.categories[key]; count++; }
        });
      }
    });
    if (count > 0) Object.keys(categories).forEach(key => categories[key] = (categories[key] / feedbacks.length).toFixed(1));

    res.json({ success: true, data: feedbacks, satisfactionScores: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my feedback
router.get('/my-feedback', auth, async (req, res) => {
  try {
    const feedback = await Feedback.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization profilePhoto')
      .populate('hospital', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Respond to feedback
router.put('/:id/respond', auth, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, {
      response: { text: req.body.response, respondedBy: req.user._id, respondedAt: new Date() }
    }, { new: true });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
