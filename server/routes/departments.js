const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

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
        
        res.status(200).json({
            status: 'success',
            results: departmentsWithCounts.length,
            data: {
                departments: departmentsWithCounts
            }
        });
    } catch (error) {
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
        
        res.status(201).json({
            status: 'success',
            data: {
                department
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update department (Admin only)
router.patch('/:id', authorize('admin'), async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: {
                department
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Debug endpoint to check departments
router.get('/debug', async (req, res) => {
    try {
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
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;
