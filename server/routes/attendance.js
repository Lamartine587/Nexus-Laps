const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Check in
router.post('/checkin', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('🕒 Check-in attempt for user:', req.user._id, 'on date:', today);

        // Check if already checked in today
        const existingAttendance = await Attendance.findOne({
            employee: req.user._id,
            date: today
        });

        if (existingAttendance) {
            console.log('❌ User already checked in today');
            await logger.log(req, 'checkin_failed', 'User attempted to check in again', { reason: 'already_checked_in' }, 'low');
            return res.status(400).json({
                status: 'fail',
                message: 'Already checked in today'
            });
        }

        // Create new attendance record
        const attendance = await Attendance.create({
            employee: req.user._id,
            date: today,
            checkIn: new Date(),
            status: 'present'
        });

        await attendance.populate('employee', 'firstName lastName employeeId department');

        console.log('✅ Check-in successful for user:', req.user._id);

        // Log successful check-in
        await logger.attendanceCheckedIn(req, attendance);

        res.status(201).json({
            status: 'success',
            data: {
                attendance: {
                    _id: attendance._id,
                    date: attendance.date,
                    checkIn: attendance.checkIn,
                    status: attendance.status,
                    employee: attendance.employee
                }
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'attendance_checkin');
        console.error('❌ Check-in error:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Check out
router.post('/checkout', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('🕒 Check-out attempt for user:', req.user._id, 'on date:', today);

        // Find today's attendance record
        const attendance = await Attendance.findOne({
            employee: req.user._id,
            date: today
        });

        if (!attendance) {
            console.log('❌ No check-in record found for today');
            await logger.log(req, 'checkout_failed', 'User attempted to check out without checking in', { reason: 'no_checkin_record' }, 'low');
            return res.status(400).json({
                status: 'fail',
                message: 'No check-in record found for today'
            });
        }

        if (attendance.checkOut) {
            console.log('❌ User already checked out today');
            await logger.log(req, 'checkout_failed', 'User attempted to check out again', { reason: 'already_checked_out' }, 'low');
            return res.status(400).json({
                status: 'fail',
                message: 'Already checked out today'
            });
        }

        // Update check-out time
        attendance.checkOut = new Date();
        
        // Calculate hours worked
        if (attendance.checkIn) {
            const diff = attendance.checkOut - attendance.checkIn;
            attendance.hoursWorked = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
        }

        await attendance.save();
        await attendance.populate('employee', 'firstName lastName employeeId department');

        console.log('✅ Check-out successful for user:', req.user._id);

        // Log successful check-out
        await logger.attendanceCheckedOut(req, attendance);

        res.status(200).json({
            status: 'success',
            data: {
                attendance: {
                    _id: attendance._id,
                    date: attendance.date,
                    checkIn: attendance.checkIn,
                    checkOut: attendance.checkOut,
                    hoursWorked: attendance.hoursWorked,
                    status: attendance.status,
                    employee: attendance.employee
                }
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'attendance_checkout');
        console.error('❌ Check-out error:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get my attendance
router.get('/my-attendance', async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { employee: req.user._id };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        await logger.log(req, 'attendance_viewed', 'User viewed their attendance records', { month, year }, 'low');

        const attendance = await Attendance.find(query)
            .populate('employee', 'firstName lastName employeeId department')
            .sort({ date: -1 });

        res.status(200).json({
            status: 'success',
            results: attendance.length,
            data: {
                attendance
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_attendance');
        console.error('Error fetching attendance:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get all attendance (Admin/Manager only)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        const { department, date } = req.query;
        let query = {};

        if (department) {
            const employees = await User.find({ department }).select('_id');
            query.employee = { $in: employees.map(emp => emp._id) };
        }

        if (date) {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            query.date = targetDate;
        }

        await logger.log(req, 'all_attendance_viewed', 'Admin viewed all attendance records', { department, date }, 'low');

        const attendance = await Attendance.find(query)
            .populate('employee', 'firstName lastName employeeId department')
            .sort({ date: -1 });

        res.status(200).json({
            status: 'success',
            results: attendance.length,
            data: {
                attendance
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_all_attendance');
        console.error('Error fetching attendance:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update attendance record (Admin only)
router.patch('/:id', authorize('admin'), async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id).populate('employee', 'firstName lastName employeeId department');
        
        if (!attendance) {
            return res.status(404).json({
                status: 'fail',
                message: 'Attendance record not found'
            });
        }

        const oldData = {
            status: attendance.status,
            checkIn: attendance.checkIn,
            checkOut: attendance.checkOut,
            hoursWorked: attendance.hoursWorked
        };

        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('employee', 'firstName lastName employeeId department');

        // Log the update
        const changes = {};
        Object.keys(req.body).forEach(key => {
            if (oldData[key] !== req.body[key]) {
                changes[key] = {
                    from: oldData[key],
                    to: req.body[key]
                };
            }
        });

        if (Object.keys(changes).length > 0) {
            await logger.attendanceUpdated(req, updatedAttendance, changes);
        }

        res.status(200).json({
            status: 'success',
            data: {
                attendance: updatedAttendance
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'attendance_update');
        console.error('Error updating attendance:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete attendance record (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id).populate('employee', 'firstName lastName employeeId department');

        if (!attendance) {
            return res.status(404).json({
                status: 'fail',
                message: 'Attendance record not found'
            });
        }

        await Attendance.findByIdAndDelete(req.params.id);

        // Log the deletion
        await logger.attendanceDeleted(req, attendance);

        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Attendance record deleted successfully'
        });
    } catch (error) {
        await logger.systemError(req, error, 'attendance_delete');
        console.error('Error deleting attendance:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;