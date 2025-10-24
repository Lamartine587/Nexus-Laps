const express = require('express');
const User = require('../models/User');
const logger = require('../middleware/logger');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

// Get all users (Admin/Manager only)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get users by department
router.get('/department/:department', authorize('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({ department: req.params.department }).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Users can only access their own data unless they're admin/manager
    if (req.user.role === 'employee' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Update user (Admin only for role changes)
router.patch('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});
router.patch('/:id', authorize('admin'), async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      ).select('-password');
  
      // Log the action
      await logger.userUpdated(req, user, req.body);
  
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (error) {
      // Log the error
      await logger.systemError(req, error, 'user_update');
      res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
  });

// Deactivate user
router.patch('/:id/deactivate', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { isActive: false }, 
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router;