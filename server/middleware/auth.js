const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Authenticate JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -twoFactorSecret');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token or user deactivated.' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

// Audit logging middleware
const audit = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.json;
    res.json = function(data) {
      AuditLog.create({
        user: req.user?._id,
        action,
        resource,
        resourceId: req.params.id,
        details: { method: req.method, path: req.originalUrl, body: req.method !== 'GET' ? req.body : undefined },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        hospital: req.user?.hospital,
        status: res.statusCode < 400 ? 'success' : 'failure'
      }).catch(err => console.error('Audit log error:', err));
      return originalSend.call(this, data);
    };
    next();
  };
};

// Generate tokens
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, hospital: user.hospital },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

module.exports = { auth, authorize, audit, generateToken, generateRefreshToken };
