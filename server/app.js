const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();
const requestLogger = require('./middleware/requestLogger');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 10000;

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection established');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message received:', data);
            
            // Handle different message types
            switch (data.type) {
                case 'subscribe':
                    ws.userId = data.userId;
                    console.log(`👤 User ${data.userId} subscribed to notifications`);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
            }
        } catch (error) {
            console.error('WebSocket message parsing error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
        timestamp: Date.now()
    }));
});

// Broadcast notification to specific user
function sendNotificationToUser(userId, notification) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
            client.send(JSON.stringify({
                type: 'notification',
                ...notification
            }));
        }
    });
}

// Broadcast notification to all users
function broadcastNotification(notification) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'notification',
                ...notification
            }));
        }
    });
}

// Make functions available to routes
app.locals.sendNotificationToUser = sendNotificationToUser;
app.locals.broadcastNotification = broadcastNotification;

// Enhanced CORS configuration
const allowedOrigins = [
    'https://lamartinekipkoech.space',
    'https://www.lamartinekipkoech.space',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://localhost:10000',
    'https://nexus-erp.onrender.com',
    'https://*.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
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
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS policy'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Authorization'],
    maxAge: 86400
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
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

app.use(requestLogger);

// MongoDB Connection
console.log('🚀 Initializing Nexus ERP Server...');
console.log('🔗 Connecting to MongoDB...');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is required but not provided');
}

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
})
.catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
});

// Import Models
require('./models/User');
require('./models/Department');
require('./models/EmployeeProfile');
require('./models/Attendance');
require('./models/Task');
require('./models/Request');
require('./models/Document');
require('./models/Log');

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

// Notification endpoints
app.get('/api/notifications/test', (req, res) => {
    const { userId, message } = req.query;
    
    if (userId && message) {
        sendNotificationToUser(userId, {
            title: 'Test Notification',
            message: message,
            type: 'info',
            timestamp: new Date().toISOString()
        });
    }
    
    res.json({ status: 'success', message: 'Test notification sent' });
});

// Health check endpoint
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
        environment: process.env.NODE_ENV || 'development',
        database: statusMap[dbStatus] || 'unknown',
        websocket: {
            connections: wss.clients.size,
            active: true
        }
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

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Server Error:', err.stack);
    
    if (err.message.includes('CORS')) {
        return res.status(403).json({
            status: 'error',
            message: 'CORS policy violation'
        });
    }
    
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message
    });
});

// Start server with WebSocket support
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 NEXUS ERP PRODUCTION SERVER`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB: ${MONGODB_URI ? 'Configured' : 'Missing'}`);
    console.log(`🔌 WebSocket: Active (${wss.clients.size} connections)`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
});