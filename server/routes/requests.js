const express = require('express');
const Request = require('../models/Request');
const { protect, authorize } = require('../middleware/auth'); // Add authorize import

const router = express.Router();

router.use(protect);

// Submit new request
router.post('/submit', async (req, res) => {
    try {
        const requestData = {
            ...req.body,
            submittedBy: req.user._id,
            department: req.user.department
        };

        const newRequest = await Request.create(requestData);
        await newRequest.populate('submittedBy', 'firstName lastName employeeId');

        res.status(201).json({
            status: 'success',
            data: {
                request: newRequest
            }
        });
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get all requests (Admin/Manager only)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
    try {
        const requests = await Request.find()
            .populate('submittedBy', 'firstName lastName employeeId department')
            .populate('assignedTo', 'firstName lastName')
            .populate('notes.user', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: requests.length,
            data: {
                requests
            }
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update request status (Admin/Manager only)
router.patch('/:id/status', authorize('admin', 'manager'), async (req, res) => {
    try {
        const { status, resolution } = req.body;
        
        const request = await Request.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                ...(resolution && { resolution }),
                resolvedAt: status === 'approved' || status === 'rejected' ? new Date() : null,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        )
        .populate('submittedBy', 'firstName lastName employeeId department')
        .populate('assignedTo', 'firstName lastName');

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                request
            }
        });
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get employee's requests
router.get('/my-requests', async (req, res) => {
    try {
        const requests = await Request.find({ submittedBy: req.user._id })
            .populate('submittedBy', 'firstName lastName employeeId')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: requests.length,
            data: {
                requests
            }
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Get request details
router.get('/:id', async (req, res) => {
    try {
        const request = await Request.findOne({ 
            _id: req.params.id, 
            submittedBy: req.user._id 
        })
        .populate('submittedBy', 'firstName lastName employeeId')
        .populate('assignedTo', 'firstName lastName')
        .populate('notes.user', 'firstName lastName');

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                request
            }
        });
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Add note to request
router.post('/:id/notes', async (req, res) => {
    try {
        const { text } = req.body;
        
        const request = await Request.findOneAndUpdate(
            { _id: req.params.id, submittedBy: req.user._id },
            {
                $push: {
                    notes: {
                        user: req.user._id,
                        text
                    }
                }
            },
            { new: true, runValidators: true }
        ).populate('submittedBy', 'firstName lastName employeeId')
         .populate('notes.user', 'firstName lastName');

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                request
            }
        });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Cancel request
router.patch('/:id/cancel', async (req, res) => {
    try {
        const request = await Request.findOneAndUpdate(
            { _id: req.params.id, submittedBy: req.user._id, status: 'pending' },
            { 
                status: 'cancelled',
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('submittedBy', 'firstName lastName employeeId');

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found or cannot be cancelled'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                request
            }
        });
    } catch (error) {
        console.error('Error cancelling request:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;