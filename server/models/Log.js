const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'user_created', 'user_updated', 'user_deleted', 'user_status_changed',
      'department_created', 'department_updated', 'department_deleted',
      'task_created', 'task_updated', 'task_deleted', 'task_status_changed',
      'attendance_updated', 'attendance_deleted',
      'request_approved', 'request_rejected', 'request_updated',
      'document_uploaded', 'document_deleted', 'document_downloaded',
      'system_login', 'system_logout', 'system_error', 'system_settings_updated'
    ]
  },
  description: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetDepartment: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
logSchema.index({ createdAt: -1 });
logSchema.index({ action: 1 });
logSchema.index({ user: 1 });
logSchema.index({ severity: 1 });

module.exports = mongoose.model('Log', logSchema);