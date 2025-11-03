const express = require('express');
const Log = require('../models/Log');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Get all logs (Admin only)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      severity,
      user,
      startDate,
      endDate,
      search
    } = req.query;

    let query = {};

    // Filter by action
    if (action) {
      query.action = action;
    }

    // Filter by severity
    if (severity) {
      query.severity = severity;
    }

    // Filter by user
    if (user) {
      query.user = user;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search in description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    await logger.log(req, 'logs_viewed', 'Admin viewed system logs', { 
      page, limit, action, severity, search 
    }, 'low');

    const logs = await Log.find(query)
      .populate('user', 'firstName lastName email role')
      .populate('targetUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Log.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: {
        logs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_logs');
    console.error('Error fetching logs:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get log statistics
router.get('/stats', authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    await logger.log(req, 'log_stats_viewed', 'Admin viewed log statistics', { days }, 'low');

    const stats = await Log.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const severityStats = await Log.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyStats = await Log.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        actionStats: stats,
        severityStats,
        dailyStats,
        totalLogs: stats.reduce((sum, stat) => sum + stat.count, 0)
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_log_stats');
    console.error('Error fetching log stats:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get available log actions (for filters)
router.get('/actions', authorize('admin'), async (req, res) => {
  try {
    await logger.log(req, 'log_actions_viewed', 'Admin viewed available log actions', {}, 'low');
    
    const actions = await Log.distinct('action');
    res.status(200).json({
      status: 'success',
      data: {
        actions
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_log_actions');
    console.error('Error fetching log actions:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Delete old logs (keep only last 90 days by default)
router.delete('/cleanup', authorize('admin'), async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Log.deleteMany({
      createdAt: { $lt: cutoffDate },
      severity: { $ne: 'critical' } // Keep critical logs forever
    });

    await logger.log(req, 'logs_cleanup', `Admin cleaned up logs older than ${days} days`, { 
      deletedCount: result.deletedCount,
      days 
    }, 'medium');

    res.status(200).json({
      status: 'success',
      data: {
        deletedCount: result.deletedCount,
        message: `Deleted logs older than ${days} days`
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'cleanup_logs');
    console.error('Error cleaning up logs:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Export logs (simulated)
router.get('/export', authorize('admin'), async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    await logger.log(req, 'logs_exported', `Admin exported logs in ${format} format`, { format }, 'low');

    // In a real implementation, this would generate a file
    res.status(200).json({
      status: 'success',
      data: {
        message: `Log export in ${format} format would be generated here`,
        format,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'export_logs');
    console.error('Error exporting logs:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router;