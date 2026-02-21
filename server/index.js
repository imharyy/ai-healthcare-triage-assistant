require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io);

// Connect Database
connectDB();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(compression());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: 'Too many requests' });
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patient'));
app.use('/api/doctors', require('./routes/doctor'));
app.use('/api/appointments', require('./routes/appointment'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/medical-records', require('./routes/medicalRecords'));
app.use('/api/prescriptions', require('./routes/prescription'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/hospitals', require('./routes/hospital'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/telemedicine', require('./routes/telemedicine'));
app.use('/api/receptionist', require('./routes/receptionist'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/triage', require('./routes/triage'));
app.use('/api/ai-assistant', require('./routes/aiAssistant'));
app.use('/api/diagnostic', require('./routes/diagnostic'));
app.use('/api/report-analyzer', require('./routes/reportAnalyzer'));

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`HealHub server running on port ${PORT}`));

module.exports = { app, server };
