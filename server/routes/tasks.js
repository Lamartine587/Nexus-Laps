const express = require('express');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Get all tasks (Admin/Manager only)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        await logger.log(req, 'tasks_list_viewed', 'Admin viewed all tasks', {}, 'low');
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
        await logger.systemError(req, error, 'fetch_tasks');
        console.error('Error fetching tasks:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Create task (Admin/Manager only)
router.post('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            assignedBy: req.user._id
        };

        const task = await Task.create(taskData);
        await task.populate('assignedTo', 'firstName lastName department');
        await task.populate('assignedBy', 'firstName lastName');

        // Log task creation
        await logger.taskCreated(req, task);

        res.status(201).json({
            status: 'success',
            data: {
                task
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'create_task');
        console.error('Error creating task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update task (Admin/Manager only)
router.patch('/:id', authorize('admin', 'manager'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'firstName lastName department');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        const oldData = {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate
        };

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('assignedTo', 'firstName lastName department')
        .populate('assignedBy', 'firstName lastName');

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
            await logger.taskUpdated(req, updatedTask, changes);
        }

        res.status(200).json({
            status: 'success',
            data: {
                task: updatedTask
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_task');
        console.error('Error updating task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete task (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'firstName lastName department');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        // Log the deletion
        await logger.taskDeleted(req, task);

        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        await logger.systemError(req, error, 'delete_task');
        console.error('Error deleting task:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get employee's tasks
router.get('/my-tasks', async (req, res) => {
    try {
        await logger.log(req, 'my_tasks_viewed', 'Employee viewed their tasks', {}, 'low');
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
        await logger.systemError(req, error, 'fetch_my_tasks');
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
        
        const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id })
            .populate('assignedTo', 'firstName lastName department');

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        const oldStatus = task.status;

        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, assignedTo: req.user._id },
            { 
                status,
                ...(actualHours && { actualHours }),
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('assignedBy', 'firstName lastName');

        // Log status change
        if (oldStatus !== status) {
            await logger.taskStatusChanged(req, updatedTask, oldStatus, status);
        }

        res.status(200).json({
            status: 'success',
            data: {
                task: updatedTask
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_task_status');
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
        
        const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });

        if (!task) {
            return res.status(404).json({
                status: 'fail',
                message: 'Task not found'
            });
        }

        const updatedTask = await Task.findOneAndUpdate(
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

        await logger.log(req, 'task_comment_added', `Added comment to task: ${task.title}`, { taskId: task._id, commentLength: text.length }, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                task: updatedTask
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'add_task_comment');
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
        await logger.log(req, 'task_stats_viewed', 'User viewed task statistics', {}, 'low');
        
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
        await logger.systemError(req, error, 'fetch_task_stats');
        console.error('Error fetching task stats:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;