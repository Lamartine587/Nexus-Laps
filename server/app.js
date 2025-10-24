const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import Models (This registers them with Mongoose)
require('./models/User');
require('./models/Department');
require('./models/EmployeeProfile');
require('./models/Attendance');
require('./models/Task');
require('./models/Request');
require('./models/Document');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/employee', require('./routes/employeeProfile'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/documents', require('./routes/documents'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Nexus ERP Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Nexus ERP server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API available at: http://localhost:${PORT}/api`);
});
