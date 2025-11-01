const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced CORS configuration for production
const allowedOrigins = [
  'https://lamartinekipkoech.space',
  'https://www.lamartinekipkoech.space',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://nexus-laps.onrender.com',
  'https://*.onrender.com' // Allow all Render subdomains
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a subdomain of allowed domains
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const domain = allowedOrigin.replace('*.', '');
        return origin.endsWith(domain);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

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

// MongoDB Connection with enhanced error handling
console.log('🚀 Initializing Nexus ERP Server...');
console.log('🔗 Connecting to MongoDB...');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required but not provided');
  console.log('💡 Please set MONGODB_URI environment variable in Render dashboard');
  // Don't exit in production, let the app start without DB for better error handling
}

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

mongoose.connect(MONGODB_URI, mongooseOptions)
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('🏠 Database:', mongoose.connection.db?.databaseName || 'Unknown');
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
  console.log('💡 Please check:');
  console.log('   1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 or Render IPs)');
  console.log('   2. Database user credentials');
  console.log('   3. Network connectivity');
  console.log('   4. MONGODB_URI environment variable');
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
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
  
  const healthStatus = {
    status: 'OK',
    message: 'Nexus ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: {
      status: statusMap[dbStatus] || 'unknown',
      connected: dbStatus === 1
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    },
    services: {
      mongodb: dbStatus === 1,
      api: true
    }
  };
  
  // If DB is not connected, return 503 but don't crash
  if (dbStatus !== 1) {
    healthStatus.status = 'WARNING';
    healthStatus.message = 'API running but database connection issues';
    return res.status(503).json(healthStatus);
  }
  
  res.json(healthStatus);
});

// API status endpoint for frontend checking
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    message: 'Nexus ERP API is ready',
    timestamp: new Date().toISOString()
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
    message: `API endpoint ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for SPA (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  
  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      status: 'error',
      message: 'CORS policy violation',
      timestamp: new Date().toISOString()
    });
  }
  
  // MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
    return res.status(503).json({
      status: 'error',
      message: 'Database service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
  
  // Default error
  const errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🚀 NEXUS ERP PRODUCTION SERVER`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏠 Host: 0.0.0.0 (all interfaces)`);
  console.log(`🔗 MongoDB: ${MONGODB_URI ? 'Configured' : 'Missing - check env vars'}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 API Status: http://localhost:${PORT}/api/status`);
  console.log('='.repeat(60));
  
  // Log startup completion
  console.log('✅ Server started successfully');
  console.log('💡 If you encounter issues:');
  console.log('   1. Check Render logs for errors');
  console.log('   2. Verify MONGODB_URI environment variable');
  console.log('   3. Check MongoDB Atlas IP whitelist');
  console.log('   4. Test API endpoints directly');
});