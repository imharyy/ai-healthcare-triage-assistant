const router = require('express').Router();
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { auth, generateToken, generateRefreshToken, audit } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, dateOfBirth, gender } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists with this email or phone' });

    const user = await User.create({
      firstName, lastName, email, phone, password,
      role: role || 'patient', dateOfBirth, gender
    });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      data: { user, token, refreshToken }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    // Check 2FA
    if (user.twoFactorEnabled) {
      return res.json({ success: true, requires2FA: true, userId: user._id });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: { user, token, refreshToken }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, token: otpToken } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpToken
    });

    if (!verified) return res.status(401).json({ success: false, message: 'Invalid 2FA code' });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({ success: true, data: { user, token, refreshToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Setup 2FA
router.post('/setup-2fa', auth, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `HealHub:${req.user.email}` });
    req.user.twoFactorSecret = secret.base32;
    req.user.twoFactorEnabled = true;
    await req.user.save();
    res.json({ success: true, data: { secret: secret.base32, otpauthUrl: secret.otpauth_url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disable 2FA
router.post('/disable-2fa', auth, async (req, res) => {
  try {
    req.user.twoFactorEnabled = false;
    req.user.twoFactorSecret = undefined;
    await req.user.save();
    res.json({ success: true, message: '2FA disabled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// OTP Login (phone)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    // In production, send via SMS service
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: 'OTP sent successfully', ...(process.env.NODE_ENV === 'development' && { otp }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone, otp, otpExpiry: { $gt: new Date() } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    user.isVerified = true;
    await user.save();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({ success: true, data: { user, token, refreshToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid token' });

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('hospital hospitals departments');
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'bloodGroup', 'address', 'bio'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload profile photo
router.post('/profile-photo', auth, setUploadType('profile'), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const user = await User.findByIdAndUpdate(req.user._id,
      { profilePhoto: `/uploads/profiles/${req.file.filename}` },
      { new: true }
    );
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Emergency contacts
router.put('/emergency-contacts', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { emergencyContacts: req.body.contacts },
      { new: true }
    );
    res.json({ success: true, data: user.emergencyContacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Family members
router.put('/family-members', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { familyMembers: req.body.members },
      { new: true }
    );
    res.json({ success: true, data: user.familyMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update allergies
router.put('/allergies', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { allergies: req.body.allergies },
      { new: true }
    );
    res.json({ success: true, data: user.allergies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update medications
router.put('/medications', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { ongoingMedications: req.body.medications },
      { new: true }
    );
    res.json({ success: true, data: user.ongoingMedications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
