const express = require('express');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Get documents accessible to employee
router.get('/my-documents', async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [
                { department: 'All' },
                { department: req.user.department },
                { accessLevel: 'public' },
                { 
                    accessLevel: 'department', 
                    department: req.user.department 
                },
                { uploadedBy: req.user._id }
            ],
            isActive: true
        })
        .populate('uploadedBy', 'firstName lastName')
        .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: documents.length,
            data: {
                documents
            }
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Increment download count
router.patch('/:id/download', async (req, res) => {
    try {
        const document = await Document.findOneAndUpdate(
            { 
                _id: req.params.id,
                $or: [
                    { department: 'All' },
                    { department: req.user.department },
                    { accessLevel: 'public' },
                    { 
                        accessLevel: 'department', 
                        department: req.user.department 
                    },
                    { uploadedBy: req.user._id }
                ],
                isActive: true
            },
            { 
                $inc: { downloadCount: 1 } 
            },
            { new: true }
        );

        if (!document) {
            return res.status(404).json({
                status: 'fail',
                message: 'Document not found or access denied'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                document
            }
        });
    } catch (error) {
        console.error('Error recording download:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Search documents
router.get('/search', async (req, res) => {
    try {
        const { query, category } = req.query;
        let searchCriteria = {
            $or: [
                { department: 'All' },
                { department: req.user.department },
                { accessLevel: 'public' },
                { 
                    accessLevel: 'department', 
                    department: req.user.department 
                },
                { uploadedBy: req.user._id }
            ],
            isActive: true
        };

        if (query) {
            searchCriteria.$and = [
                searchCriteria,
                {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } },
                        { tags: { $in: [new RegExp(query, 'i')] } }
                    ]
                }
            ];
        }

        if (category) {
            searchCriteria.category = category;
        }

        const documents = await Document.find(searchCriteria)
            .populate('uploadedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: documents.length,
            data: {
                documents
            }
        });
    } catch (error) {
        console.error('Error searching documents:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;
