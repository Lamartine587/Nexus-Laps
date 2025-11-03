const express = require('express');
const Request = require('../models/Request');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../middleware/logger');

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

        // Log request submission
        await logger.requestSubmitted(req, newRequest);

        res.status(201).json({
            status: 'success',
            data: {
                request: newRequest
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'submit_request');
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
        await logger.log(req, 'requests_list_viewed', 'Admin viewed all requests', {}, 'low');
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
        await logger.systemError(req, error, 'fetch_requests');
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
        
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        const oldStatus = request.status;

        const updatedRequest = await Request.findByIdAndUpdate(
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

        // Log status change
        if (oldStatus !== status) {
            await logger.requestStatusChanged(req, updatedRequest, oldStatus, status);
        }

        res.status(200).json({
            status: 'success',
            data: {
                request: updatedRequest
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_request_status');
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
        await logger.log(req, 'my_requests_viewed', 'Employee viewed their requests', {}, 'low');
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
        await logger.systemError(req, error, 'fetch_my_requests');
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

        await logger.log(req, 'request_details_viewed', `Viewed details of request: ${request.requestId}`, { requestId: request.requestId }, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                request
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'fetch_request_details');
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
        
        const request = await Request.findOne({ _id: req.params.id, submittedBy: req.user._id });

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        const updatedRequest = await Request.findOneAndUpdate(
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

        await logger.log(req, 'request_note_added', `Added note to request: ${request.requestId}`, { requestId: request.requestId, noteLength: text.length }, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                request: updatedRequest
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'add_request_note');
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
        const request = await Request.findOne({ _id: req.params.id, submittedBy: req.user._id });

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found or cannot be cancelled'
            });
        }

        const updatedRequest = await Request.findOneAndUpdate(
            { _id: req.params.id, submittedBy: req.user._id, status: 'pending' },
            { 
                status: 'cancelled',
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('submittedBy', 'firstName lastName employeeId');

        if (!updatedRequest) {
            return res.status(400).json({
                status: 'fail',
                message: 'Request cannot be cancelled (may already be processed)'
            });
        }

        await logger.requestStatusChanged(req, updatedRequest, 'pending', 'cancelled');

        res.status(200).json({
            status: 'success',
            data: {
                request: updatedRequest
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'cancel_request');
        console.error('Error cancelling request:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete request (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                status: 'fail',
                message: 'Request not found'
            });
        }

        await Request.findByIdAndDelete(req.params.id);

        // Log deletion
        await logger.requestDeleted(req, request);

        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Request deleted successfully'
        });
    } catch (error) {
        await logger.systemError(req, error, 'delete_request');
        console.error('Error deleting request:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;