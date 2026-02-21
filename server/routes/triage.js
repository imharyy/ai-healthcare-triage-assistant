const router = require('express').Router();
const { performTriage, getAvailableSymptoms } = require('../utils/triage');
const { auth } = require('../middleware/auth');

// Get available symptoms
router.get('/symptoms', auth, (req, res) => {
  res.json({ success: true, data: getAvailableSymptoms() });
});

// Perform triage
router.post('/assess', auth, async (req, res) => {
  try {
    const { symptoms } = req.body;
    const result = performTriage(symptoms);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
