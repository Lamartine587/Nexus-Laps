const express = require('express');
const EmployeeProfile = require('../models/EmployeeProfile');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Get current employee's profile
router.get('/my-profile', async (req, res) => {
    try {
        let profile = await EmployeeProfile.findOne({ user: req.user._id })
            .populate('user', 'firstName lastName email department position employeeId createdAt');
        
        if (!profile) {
            // Create a default profile if none exists
            profile = await EmployeeProfile.create({
                user: req.user._id,
                dateOfBirth: null,
                phone: '',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: ''
                },
                emergencyContact: {
                    name: '',
                    relationship: '',
                    phone: ''
                },
                employmentDetails: {
                    hireDate: req.user.createdAt,
                    employmentType: 'full-time',
                    salary: null,
                    bankAccount: {
                        accountNumber: '',
                        bankName: '',
                        branch: ''
                    }
                }
            });
            
            await profile.populate('user', 'firstName lastName email department position employeeId createdAt');
            
            await logger.log(req, 'profile_created', 'Auto-created employee profile', { userId: req.user._id }, 'low');
        }

        await logger.log(req, 'profile_viewed', 'User viewed their employee profile', {}, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                profile
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_employee_profile');
        console.error('Error fetching employee profile:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update employee profile
router.patch('/my-profile', async (req, res) => {
    try {
        const oldProfile = await EmployeeProfile.findOne({ user: req.user._id });
        
        const profile = await EmployeeProfile.findOneAndUpdate(
            { user: req.user._id },
            req.body,
            { new: true, runValidators: true }
        ).populate('user', 'firstName lastName email department position employeeId createdAt');

        // Log profile update
        const changes = {};
        if (oldProfile) {
            Object.keys(req.body).forEach(key => {
                if (JSON.stringify(oldProfile[key]) !== JSON.stringify(req.body[key])) {
                    changes[key] = {
                        from: oldProfile[key],
                        to: req.body[key]
                    };
                }
            });
        }

        if (Object.keys(changes).length > 0) {
            await logger.log(req, 'profile_updated', 'User updated their employee profile', { changes }, 'low');
        }

        res.status(200).json({
            status: 'success',
            data: {
                profile
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_employee_profile');
        console.error('Error updating employee profile:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get employee attendance
router.get('/my-attendance', async (req, res) => {
    try {
        const { month, year } = req.query;
        
        console.log('📅 Fetching attendance for:', { month, year, user: req.user._id });

        await logger.log(req, 'attendance_viewed', 'User viewed their attendance via profile', { month, year }, 'low');

        // Generate sample attendance data
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const attendanceData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetYear, targetMonth, day);
            
            // Skip weekends (Saturday=6, Sunday=0) and some random days for realism
            if (date.getDay() === 0 || date.getDay() === 6 || Math.random() < 0.3) {
                continue;
            }

            // Skip future dates
            if (date > currentDate) {
                continue;
            }

            const checkIn = new Date(date);
            checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
            
            const checkOut = new Date(checkIn);
            checkOut.setHours(checkIn.getHours() + 8 + Math.floor(Math.random() * 1.5));
            
            const hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(1);

            attendanceData.push({
                date: date.toISOString().split('T')[0],
                checkIn: checkIn.toTimeString().split(' ')[0],
                checkOut: checkOut.toTimeString().split(' ')[0],
                hoursWorked: parseFloat(hoursWorked),
                status: hoursWorked >= 7 ? 'Present' : hoursWorked >= 4 ? 'Half-day' : 'Absent'
            });
        }

        res.status(200).json({
            status: 'success',
            results: attendanceData.length,
            data: {
                attendance: attendanceData
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_profile_attendance');
        console.error('❌ Error fetching attendance:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get employee tasks
router.get('/my-tasks', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const tasks = this.generateDepartmentTasks(user.department);

        await logger.log(req, 'tasks_viewed', 'User viewed their tasks via profile', { department: user.department }, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                tasks
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_profile_tasks');
        console.error('Error fetching tasks:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Helper function to generate department-specific tasks
const generateDepartmentTasks = (department) => {
    const departmentTasks = {
        'HR': [
            { _id: '1', title: 'Review employee onboarding documents', description: 'Check and verify all new employee documents', status: 'todo', priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { _id: '2', title: 'Process payroll for current month', description: 'Calculate and process payroll for all employees', status: 'progress', priority: 'high', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
            { _id: '3', title: 'Schedule performance reviews', description: 'Coordinate performance review meetings', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
            { _id: '4', title: 'Update employee handbook', description: 'Add new policies to employee handbook', status: 'completed', priority: 'low', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), actualHours: 2.5 }
        ],
        'Finance': [
            { _id: '1', title: 'Prepare monthly financial reports', description: 'Generate financial reports for management review', status: 'progress', priority: 'high', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { _id: '2', title: 'Review expense claims', description: 'Verify and process employee expense claims', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            { _id: '3', title: 'Process vendor payments', description: 'Handle payments to suppliers and vendors', status: 'completed', priority: 'high', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actualHours: 4 },
            { _id: '4', title: 'Update budget forecasts', description: 'Review and update budget projections', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }
        ],
        'Sales': [
            { _id: '1', title: 'Follow up with potential clients', description: 'Contact leads from last marketing campaign', status: 'todo', priority: 'high', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            { _id: '2', title: 'Prepare sales presentation', description: 'Create presentation for upcoming client meeting', status: 'progress', priority: 'medium', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { _id: '3', title: 'Update CRM with new leads', description: 'Enter new contact information into CRM system', status: 'completed', priority: 'low', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actualHours: 1.5 },
            { _id: '4', title: 'Analyze sales performance data', description: 'Review Q3 sales metrics and trends', status: 'todo', priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        ],
        'IT': [
            { _id: '1', title: 'Resolve support ticket #4521', description: 'User reported login issues with the new system', status: 'progress', priority: 'high', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
            { _id: '2', title: 'Update system documentation', description: 'Document new system features and procedures', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { _id: '3', title: 'Perform server maintenance', description: 'Monthly server updates and maintenance', status: 'completed', priority: 'high', dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), actualHours: 3 },
            { _id: '4', title: 'Test new software deployment', description: 'QA testing for upcoming software release', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) }
        ],
        'Operations': [
            { _id: '1', title: 'Optimize workflow processes', description: 'Identify and implement process improvements', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
            { _id: '2', title: 'Coordinate with vendors', description: 'Manage relationships with key suppliers', status: 'progress', priority: 'high', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
            { _id: '3', title: 'Update operational procedures', description: 'Document new operational guidelines', status: 'completed', priority: 'low', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), actualHours: 2 },
            { _id: '4', title: 'Monitor inventory levels', description: 'Track and report on inventory status', status: 'todo', priority: 'high', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) }
        ]
    };

    return departmentTasks[department] || [
        { _id: '1', title: 'Complete assigned tasks', description: 'Work on tasks assigned by manager', status: 'todo', priority: 'medium', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { _id: '2', title: 'Attend team meeting', description: 'Weekly team coordination meeting', status: 'completed', priority: 'high', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actualHours: 1 }
    ];
};

module.exports = router;