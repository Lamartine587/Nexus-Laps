const Log = require('../models/Log');

const logger = {
  // General log method
  log: async (req, action, description, metadata = {}, severity = 'low') => {
    try {
      await Log.create({
        action,
        description,
        user: req.user._id,
        userRole: req.user.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        metadata,
        severity
      });
    } catch (error) {
      console.error('Logging error:', error);
    }
  },

  // User management logs
  userCreated: async (req, targetUser, additionalInfo = '') => {
    await logger.log(
      req,
      'user_created',
      `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) created${additionalInfo ? ' - ' + additionalInfo : ''}`,
      { targetUserId: targetUser._id, targetUserEmail: targetUser.email },
      'medium'
    );
  },

  userUpdated: async (req, targetUser, changes) => {
    await logger.log(
      req,
      'user_updated',
      `User ${targetUser.firstName} ${targetUser.lastName} updated - Changes: ${JSON.stringify(changes)}`,
      { targetUserId: targetUser._id, changes },
      'low'
    );
  },

  userDeleted: async (req, targetUser) => {
    await logger.log(
      req,
      'user_deleted',
      `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) deleted`,
      { targetUserId: targetUser._id, targetUserEmail: targetUser.email },
      'high'
    );
  },

  userStatusChanged: async (req, targetUser, newStatus) => {
    await logger.log(
      req,
      'user_status_changed',
      `User ${targetUser.firstName} ${targetUser.lastName} status changed to ${newStatus ? 'active' : 'inactive'}`,
      { targetUserId: targetUser._id, newStatus },
      'medium'
    );
  },

  // Department management logs
  departmentCreated: async (req, department) => {
    await logger.log(
      req,
      'department_created',
      `Department ${department.name} created`,
      { departmentId: department._id, departmentName: department.name },
      'medium'
    );
  },

  departmentUpdated: async (req, department, changes) => {
    await logger.log(
      req,
      'department_updated',
      `Department ${department.name} updated - Changes: ${JSON.stringify(changes)}`,
      { departmentId: department._id, changes },
      'low'
    );
  },

  departmentDeleted: async (req, department) => {
    await logger.log(
      req,
      'department_deleted',
      `Department ${department.name} deleted`,
      { departmentId: department._id, departmentName: department.name },
      'high'
    );
  },

  // Task management logs
  taskCreated: async (req, task) => {
    await logger.log(
      req,
      'task_created',
      `Task "${task.title}" created and assigned to ${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
      { taskId: task._id, assignedTo: task.assignedTo._id },
      'low'
    );
  },

  taskUpdated: async (req, task, changes) => {
    await logger.log(
      req,
      'task_updated',
      `Task "${task.title}" updated - Changes: ${JSON.stringify(changes)}`,
      { taskId: task._id, changes },
      'low'
    );
  },

  taskDeleted: async (req, task) => {
    await logger.log(
      req,
      'task_deleted',
      `Task "${task.title}" deleted`,
      { taskId: task._id },
      'medium'
    );
  },

  // Attendance logs
  attendanceUpdated: async (req, attendance, changes) => {
    await logger.log(
      req,
      'attendance_updated',
      `Attendance record updated for ${attendance.employee.firstName} ${attendance.employee.lastName} - Changes: ${JSON.stringify(changes)}`,
      { attendanceId: attendance._id, employeeId: attendance.employee._id, changes },
      'low'
    );
  },

  attendanceDeleted: async (req, attendance) => {
    await logger.log(
      req,
      'attendance_deleted',
      `Attendance record deleted for ${attendance.employee.firstName} ${attendance.employee.lastName}`,
      { attendanceId: attendance._id, employeeId: attendance.employee._id },
      'medium'
    );
  },

  // Request logs
  requestStatusChanged: async (req, request, newStatus) => {
    await logger.log(
      req,
      'request_approved',
      `Request ${request.requestId} ${newStatus} by admin`,
      { requestId: request._id, newStatus },
      'low'
    );
  },

  // System logs
  systemLogin: async (req) => {
    await logger.log(
      req,
      'system_login',
      `User logged into admin dashboard`,
      {},
      'low'
    );
  },

  systemLogout: async (req) => {
    await logger.log(
      req,
      'system_logout',
      `User logged out from admin dashboard`,
      {},
      'low'
    );
  },

  systemError: async (req, error, context) => {
    await logger.log(
      req,
      'system_error',
      `System error in ${context}: ${error.message}`,
      { error: error.message, stack: error.stack, context },
      'high'
    );
  },

  settingsUpdated: async (req, changes) => {
    await logger.log(
      req,
      'system_settings_updated',
      `System settings updated - Changes: ${JSON.stringify(changes)}`,
      { changes },
      'medium'
    );
  }
};

module.exports = logger;