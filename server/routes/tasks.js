const express = require('express');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth'); // Add authorize import

const router = express.Router();

router.use(protect);

// Get all tasks (Admin/Manager only) - ADD THIS ROUTE
router.get('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('assignedTo', 'firstName lastName department')
            .populate('assignedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: tasks.length,
            data: {
                tasks
            }
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Create task (Admin/Manager only) - ADD THIS ROUTE
router.post('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            assignedBy: req.user._id
        };

        const task = await Task.create(taskData);
        await task.populate('assignedTo', 'firstName lastName department');
        await task.populate('assignedBy', 'firstName lastName');

        res.status(201).json({
            status: 'success',
            data: {
                task
            }
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update task (Admin/Manager only) - ADD THIS ROUTE
router.patch('/:id', authorize('admin', 'manager'), async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('assignedTo', 'firstName lastName department')
        .populate('assignedBy', 'firstName lastName');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                task
            }
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete task (Admin only) - ADD THIS ROUTE
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Keep your existing employee routes below...
// Get employee's tasks
router.get('/my-tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id })
            .populate('assignedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: tasks.length,
            data: {
                tasks
            }
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, actualHours } = req.body;
        
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user._id },
            { 
                status,
                ...(actualHours && { actualHours }),
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('assignedBy', 'firstName lastName');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                task
            }
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Add comment to task
router.post('/:id/comments', async (req, res) => {
    try {
        const { text } = req.body;
        
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user._id },
            {
                $push: {
                    comments: {
                        user: req.user._id,
                        text
                    }
                }
            },
            { new: true, runValidators: true }
        ).populate('assignedBy', 'firstName lastName')
         .populate('comments.user', 'firstName lastName');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                task
            }
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get task statistics
router.get('/my-stats', async (req, res) => {
    try {
        const stats = await Task.aggregate([
            { $match: { assignedTo: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalHours: { $sum: '$actualHours' }
                }
            }
        ]);

        const totalTasks = await Task.countDocuments({ assignedTo: req.user._id });
        const completedTasks = await Task.countDocuments({ 
            assignedTo: req.user._id, 
            status: 'completed' 
        });
        const totalHours = await Task.aggregate([
            { $match: { assignedTo: req.user._id } },
            { $group: { _id: null, total: { $sum: '$actualHours' } } }
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                stats,
                summary: {
                    totalTasks,
                    completedTasks,
                    completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0,
                    totalHours: totalHours[0]?.total || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;