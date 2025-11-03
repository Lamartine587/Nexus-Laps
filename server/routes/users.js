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
    await logger.log(req, 'users_list_viewed', 'Admin viewed users list', {}, 'low');
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_users');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get users by department
router.get('/department/:department', authorize('admin', 'manager'), async (req, res) => {
  try {
    await logger.log(req, 'users_by_department_viewed', `Viewed users in department: ${req.params.department}`, { department: req.params.department }, 'low');
    const users = await User.find({ department: req.params.department }).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_users_by_department');
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
      await logger.unauthorizedAccess(req, 'view_other_user_profile');
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied'
      });
    }

    await logger.log(req, 'user_profile_viewed', `Viewed profile of ${user.firstName} ${user.lastName}`, { viewedUserId: user._id }, 'low');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'fetch_user');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Update user (Admin only for role changes)
router.patch('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      position: user.position
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).select('-password');

    // Log the action
    const changes = {};
    Object.keys(req.body).forEach(key => {
      if (oldData[key] !== req.body[key]) {
        changes[key] = {
          from: oldData[key],
          to: req.body[key]
        };
      }
    });

    await logger.userUpdated(req, updatedUser, changes);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
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
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { isActive: false }, 
      { new: true }
    ).select('-password');

    // Log the status change
    await logger.userStatusChanged(req, updatedUser, false);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_deactivate');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Activate user
router.patch('/:id/activate', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { isActive: true }, 
      { new: true }
    ).select('-password');

    // Log the status change
    await logger.userStatusChanged(req, updatedUser, true);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_activate');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log the deletion
    await logger.userDeleted(req, user);

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'User deleted successfully'
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_delete');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router;