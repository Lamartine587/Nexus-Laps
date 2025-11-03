const Log = require('../models/Log');

const logger = {
  // Enhanced general log method with better error handling
  log: async (req, action, description, metadata = {}, severity = 'low') => {
    try {
      // Ensure we have a user object (might be undefined in some cases)
      const userId = req.user ? req.user._id : null;
      const userRole = req.user ? req.user.role : 'system';
      
      await Log.create({
        action,
        description,
        user: userId,
        userRole: userRole,
        ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent'),
        metadata,
        severity
      });
      
      console.log(`📝 LOG: ${action} - ${description}`);
    } catch (error) {
      console.error('❌ Logging error:', error);
      // Don't throw error to avoid breaking the main functionality
    }
  },

  // Authentication logs
  loginSuccess: async (req, user) => {
    await logger.log(
      req,
      'login_success',
      `User ${user.email} logged in successfully`,
      { userId: user._id, userEmail: user.email },
      'low'
    );
  },

  loginFailed: async (req, email, reason) => {
    await logger.log(
      req,
      'login_failed',
      `Failed login attempt for ${email}: ${reason}`,
      { attemptedEmail: email, reason },
      'medium'
    );
  },

  logout: async (req) => {
    await logger.log(
      req,
      'logout',
      `User ${req.user.email} logged out`,
      { userId: req.user._id },
      'low'
    );
  },

  // Enhanced User management logs
  userCreated: async (req, targetUser, additionalInfo = '') => {
    await logger.log(
      req,
      'user_created',
      `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) created with role: ${targetUser.role}${additionalInfo ? ' - ' + additionalInfo : ''}`,
      { 
        targetUserId: targetUser._id, 
        targetUserEmail: targetUser.email,
        role: targetUser.role,
        department: targetUser.department
      },
      'medium'
    );
  },

  userUpdated: async (req, targetUser, changes) => {
    await logger.log(
      req,
      'user_updated',
      `User ${targetUser.firstName} ${targetUser.lastName} updated - Changes: ${JSON.stringify(changes)}`,
      { 
        targetUserId: targetUser._id, 
        changes,
        updatedBy: req.user._id
      },
      'low'
    );
  },

  userDeleted: async (req, targetUser) => {
    await logger.log(
      req,
      'user_deleted',
      `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) deleted by ${req.user.email}`,
      { 
        targetUserId: targetUser._id, 
        targetUserEmail: targetUser.email,
        deletedBy: req.user._id 
      },
      'high'
    );
  },

  userStatusChanged: async (req, targetUser, newStatus) => {
    await logger.log(
      req,
      'user_status_changed',
      `User ${targetUser.firstName} ${targetUser.lastName} status changed to ${newStatus ? 'active' : 'inactive'} by ${req.user.email}`,
      { 
        targetUserId: targetUser._id, 
        newStatus,
        changedBy: req.user._id 
      },
      'medium'
    );
  },

  // Enhanced Department management logs
  departmentCreated: async (req, department) => {
    await logger.log(
      req,
      'department_created',
      `Department ${department.name} created by ${req.user.email}`,
      { 
        departmentId: department._id, 
        departmentName: department.name,
        createdBy: req.user._id 
      },
      'medium'
    );
  },

  departmentUpdated: async (req, department, changes) => {
    await logger.log(
      req,
      'department_updated',
      `Department ${department.name} updated by ${req.user.email} - Changes: ${JSON.stringify(changes)}`,
      { 
        departmentId: department._id, 
        changes,
        updatedBy: req.user._id 
      },
      'low'
    );
  },

  departmentDeleted: async (req, department) => {
    await logger.log(
      req,
      'department_deleted',
      `Department ${department.name} deleted by ${req.user.email}`,
      { 
        departmentId: department._id, 
        departmentName: department.name,
        deletedBy: req.user._id 
      },
      'high'
    );
  },

  // Enhanced Task management logs
  taskCreated: async (req, task) => {
    await logger.log(
      req,
      'task_created',
      `Task "${task.title}" created and assigned to ${task.assignedTo.firstName} ${task.assignedTo.lastName} by ${req.user.email}`,
      { 
        taskId: task._id, 
        assignedTo: task.assignedTo._id,
        createdBy: req.user._id 
      },
      'low'
    );
  },

  taskUpdated: async (req, task, changes) => {
    await logger.log(
      req,
      'task_updated',
      `Task "${task.title}" updated by ${req.user.email} - Changes: ${JSON.stringify(changes)}`,
      { 
        taskId: task._id, 
        changes,
        updatedBy: req.user._id 
      },
      'low'
    );
  },

  taskDeleted: async (req, task) => {
    await logger.log(
      req,
      'task_deleted',
      `Task "${task.title}" deleted by ${req.user.email}`,
      { 
        taskId: task._id,
        deletedBy: req.user._id 
      },
      'medium'
    );
  },

  taskStatusChanged: async (req, task, oldStatus, newStatus) => {
    await logger.log(
      req,
      'task_status_changed',
      `Task "${task.title}" status changed from ${oldStatus} to ${newStatus} by ${req.user.email}`,
      { 
        taskId: task._id, 
        oldStatus,
        newStatus,
        changedBy: req.user._id 
      },
      'low'
    );
  },

  // Enhanced Attendance logs
  attendanceCheckedIn: async (req, attendance) => {
    await logger.log(
      req,
      'attendance_checked_in',
      `User checked in at ${attendance.checkIn}`,
      { 
        attendanceId: attendance._id, 
        checkInTime: attendance.checkIn 
      },
      'low'
    );
  },

  attendanceCheckedOut: async (req, attendance) => {
    await logger.log(
      req,
      'attendance_checked_out',
      `User checked out at ${attendance.checkOut}, worked ${attendance.hoursWorked} hours`,
      { 
        attendanceId: attendance._id, 
        checkOutTime: attendance.checkOut,
        hoursWorked: attendance.hoursWorked 
      },
      'low'
    );
  },

  attendanceUpdated: async (req, attendance, changes) => {
    await logger.log(
      req,
      'attendance_updated',
      `Attendance record updated for ${attendance.employee.firstName} ${attendance.employee.lastName} by ${req.user.email} - Changes: ${JSON.stringify(changes)}`,
      { 
        attendanceId: attendance._id, 
        employeeId: attendance.employee._id, 
        changes,
        updatedBy: req.user._id 
      },
      'low'
    );
  },

  attendanceDeleted: async (req, attendance) => {
    await logger.log(
      req,
      'attendance_deleted',
      `Attendance record deleted for ${attendance.employee.firstName} ${attendance.employee.lastName} by ${req.user.email}`,
      { 
        attendanceId: attendance._id, 
        employeeId: attendance.employee._id,
        deletedBy: req.user._id 
      },
      'medium'
    );
  },

  // Enhanced Request logs
  requestSubmitted: async (req, request) => {
    await logger.log(
      req,
      'request_submitted',
      `New ${request.type} request submitted: ${request.subject}`,
      { 
        requestId: request._id, 
        requestType: request.type,
        subject: request.subject 
      },
      'low'
    );
  },

  requestStatusChanged: async (req, request, oldStatus, newStatus) => {
    await logger.log(
      req,
      'request_status_changed',
      `Request ${request.requestId} status changed from ${oldStatus} to ${newStatus} by ${req.user.email}`,
      { 
        requestId: request._id, 
        oldStatus,
        newStatus,
        changedBy: req.user._id 
      },
      'low'
    );
  },

  requestDeleted: async (req, request) => {
    await logger.log(
      req,
      'request_deleted',
      `Request ${request.requestId} deleted by ${req.user.email}`,
      { 
        requestId: request._id,
        deletedBy: req.user._id 
      },
      'medium'
    );
  },

  // Document logs
  documentUploaded: async (req, document) => {
    await logger.log(
      req,
      'document_uploaded',
      `Document "${document.title}" uploaded by ${req.user.email}`,
      { 
        documentId: document._id, 
        title: document.title,
        category: document.category 
      },
      'low'
    );
  },

  documentDownloaded: async (req, document) => {
    await logger.log(
      req,
      'document_downloaded',
      `Document "${document.title}" downloaded by ${req.user.email}`,
      { 
        documentId: document._id, 
        title: document.title 
      },
      'low'
    );
  },

  documentDeleted: async (req, document) => {
    await logger.log(
      req,
      'document_deleted',
      `Document "${document.title}" deleted by ${req.user.email}`,
      { 
        documentId: document._id,
        deletedBy: req.user._id 
      },
      'medium'
    );
  },

  // System logs
  systemError: async (req, error, context) => {
    await logger.log(
      req,
      'system_error',
      `System error in ${context}: ${error.message}`,
      { 
        error: error.message, 
        stack: error.stack, 
        context 
      },
      'high'
    );
  },

  unauthorizedAccess: async (req, action) => {
    await logger.log(
      req,
      'unauthorized_access',
      `Unauthorized access attempt to ${action} from IP: ${req.ip}`,
      { 
        attemptedAction: action,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') 
      },
      'high'
    );
  },

  settingsUpdated: async (req, changes) => {
    await logger.log(
      req,
      'system_settings_updated',
      `System settings updated by ${req.user.email} - Changes: ${JSON.stringify(changes)}`,
      { 
        changes,
        updatedBy: req.user._id 
      },
      'medium'
    );
  }
};

module.exports = logger;