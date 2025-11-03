const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Get all departments
router.get('/', async (req, res) => {
    try {
        console.log('📂 Fetching departments...');
        
        let departments = await Department.find();
        console.log(`📂 Found ${departments.length} departments in database`);
        
        // If no departments exist, create sample departments
        if (departments.length === 0) {
            console.log('📂 Creating sample departments...');
            departments = await Department.create([
                { name: 'HR', description: 'Human Resources Management' },
                { name: 'Finance', description: 'Finance and Accounting' },
                { name: 'Sales', description: 'Sales and Marketing' },
                { name: 'IT', description: 'Information Technology' },
                { name: 'Operations', description: 'Business Operations' }
            ]);
            console.log('📂 Sample departments created successfully');
        }

        // Get user counts for each department
        const userCounts = await User.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);

        console.log('📂 User counts by department:', userCounts);

        // Add user counts to departments
        const departmentsWithCounts = departments.map(dept => {
            const deptCount = userCounts.find(d => d._id === dept.name);
            return {
                _id: dept._id,
                name: dept.name,
                description: dept.description,
                employeeCount: deptCount ? deptCount.count : 0,
                isActive: dept.isActive,
                createdAt: dept.createdAt,
                updatedAt: dept.updatedAt
            };
        });

        console.log('📂 Sending departments response:', departmentsWithCounts.length, 'departments');

        await logger.log(req, 'departments_viewed', 'User viewed departments list', { departmentCount: departmentsWithCounts.length }, 'low');
        
        res.status(200).json({
            status: 'success',
            results: departmentsWithCounts.length,
            data: {
                departments: departmentsWithCounts
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_departments');
        console.error('❌ Error in departments route:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Create department (Admin only)
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const department = await Department.create(req.body);
        
        // Log department creation
        await logger.departmentCreated(req, department);

        res.status(201).json({
            status: 'success',
            data: {
                department
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'create_department');
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update department (Admin only)
router.patch('/:id', authorize('admin'), async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({
                status: 'fail',
                message: 'Department not found'
            });
        }

        const oldData = {
            name: department.name,
            description: department.description,
            budget: department.budget
        };

        const updatedDepartment = await Department.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

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
            await logger.departmentUpdated(req, updatedDepartment, changes);
        }

        res.status(200).json({
            status: 'success',
            data: {
                department: updatedDepartment
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_department');
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete department (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({
                status: 'fail',
                message: 'Department not found'
            });
        }

        // Check if department has users
        const usersInDept = await User.countDocuments({ 
            department: department.name, 
            isActive: true 
        });

        if (usersInDept > 0) {
            await logger.log(req, 'department_deletion_failed', `Attempted to delete department with active users: ${department.name}`, { departmentId: department._id, userCount: usersInDept }, 'high');
            return res.status(400).json({
                status: 'fail',
                message: `Cannot delete department. There are ${usersInDept} active users in this department.`
            });
        }

        await Department.findByIdAndDelete(req.params.id);

        // Log department deletion
        await logger.departmentDeleted(req, department);

        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Department deleted successfully'
        });
    } catch (error) {
        await logger.systemError(req, error, 'delete_department');
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Debug endpoint to check departments
router.get('/debug', authorize('admin'), async (req, res) => {
    try {
        await logger.log(req, 'departments_debug_viewed', 'Admin viewed departments debug info', {}, 'low');
        
        const departments = await Department.find();
        const users = await User.find().select('department firstName lastName');
        
        res.status(200).json({
            status: 'success',
            data: {
                departmentsCount: departments.length,
                departments: departments,
                usersByDept: users.reduce((acc, user) => {
                    acc[user.department] = (acc[user.department] || 0) + 1;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'departments_debug');
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;