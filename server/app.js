const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced CORS for production and custom domain
const allowedOrigins = [
  'https://lamartinekipkoech.space', // REPLACE WITH YOUR ACTUAL DOMAIN
  'https://www.lamartinekipkoech.space', // REPLACE WITH YOUR ACTUAL DOMAIN
  'http://localhost:5000',
  `https://nexus-erp.onrender.com` // Your Render subdomain
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: false
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// MongoDB Connection
console.log('🚀 Initializing Nexus ERP Server...');
console.log('🔗 Connecting to MongoDB...');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required but not provided');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('🏠 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.log('💡 Please check:');
  console.log('   1. MongoDB Atlas IP whitelist (add 0.0.0.0/0)');
  console.log('   2. Database user credentials');
  console.log('   3. Network connectivity');
});

// Import Models
require('./models/User');
require('./models/Department');
require('./models/EmployeeProfile');
require('./models/Attendance');
require('./models/Task');
require('./models/Request');
require('./models/Document');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/employeeProfile', require('./routes/employeeProfile'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/logs', require('./routes/logs'));


// Health check endpoint (for monitoring)
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'OK',
    message: 'Nexus ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    database: statusMap[dbStatus] || 'unknown',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version
  });
});

// Frontend Routes - SPA support
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/dashboard.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/dashboard.html'));
});

app.get('/employee', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/employee-dashboard.html'));
});

app.get('/employee/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/employee-dashboard.html'));
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Catch-all handler for SPA (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🚀 NEXUS ERP PRODUCTION SERVER`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏠 Host: 0.0.0.0 (all interfaces)`);
  console.log(`🔗 MongoDB: ${MONGODB_URI ? 'Configured' : 'Missing'}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
});