const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, department, position } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await logger.log(req, 'registration_failed', `Registration failed - user already exists: ${email}`, { email }, 'medium');
      return res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email'
      });
    }

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'employee';

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position
    });

    const token = signToken(newUser._id);

    // Update last login
    newUser.lastLogin = new Date();
    await newUser.save();

    // Log user creation
    await logger.userCreated(req, newUser, 'via registration');

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          position: newUser.position,
          employeeId: newUser.employeeId
        }
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_registration');
    console.error('Registration error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    if (!email || !password) {
      await logger.loginFailed(req, email || 'unknown', 'Missing email or password');
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found:', email);
      await logger.loginFailed(req, email, 'User not found');
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await logger.loginFailed(req, email, 'Account deactivated');
      return res.status(401).json({
        status: 'fail',
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordCorrect = await user.correctPassword(password, user.password);
    
    if (!isPasswordCorrect) {
      console.log('Incorrect password for:', email);
      await logger.loginFailed(req, email, 'Incorrect password');
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);

    // Log successful login
    await logger.loginSuccess(req, user);

    console.log('Login successful for:', email);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          employeeId: user.employeeId
        }
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_login');
    console.error('Login error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Get current user (protected)
router.get('/me', protect, async (req, res) => {
  try {
    await logger.log(req, 'profile_viewed', 'User viewed their profile', {}, 'low');
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    await logger.systemError(req, error, 'get_current_user');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', protect, async (req, res) => {
  try {
    await logger.logout(req);
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    await logger.systemError(req, error, 'user_logout');
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router;