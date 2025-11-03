const express = require('express');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(protect);

// Get documents accessible to employee
router.get('/my-documents', async (req, res) => {
    try {
        await logger.log(req, 'documents_viewed', 'User viewed accessible documents', {}, 'low');
        
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
        await logger.systemError(req, error, 'fetch_documents');
        console.error('Error fetching documents:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Upload document (Admin/Manager only)
router.post('/upload', async (req, res) => {
    try {
        const documentData = {
            ...req.body,
            uploadedBy: req.user._id
        };

        const document = await Document.create(documentData);
        await document.populate('uploadedBy', 'firstName lastName');

        // Log document upload
        await logger.documentUploaded(req, document);

        res.status(201).json({
            status: 'success',
            data: {
                document
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'upload_document');
        console.error('Error uploading document:', error);
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
        ).populate('uploadedBy', 'firstName lastName');

        if (!document) {
            return res.status(404).json({
                status: 'fail',
                message: 'Document not found or access denied'
            });
        }

        // Log document download
        await logger.documentDownloaded(req, document);

        res.status(200).json({
            status: 'success',
            data: {
                document
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'download_document');
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

        await logger.log(req, 'documents_searched', `User searched documents with query: ${query}`, { query, category }, 'low');

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
        await logger.systemError(req, error, 'search_documents');
        console.error('Error searching documents:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Update document (Admin/Uploader only)
router.patch('/:id', async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            $or: [
                { uploadedBy: req.user._id },
                { accessLevel: 'public' }
            ]
        });

        if (!document) {
            return res.status(404).json({
                status: 'fail',
                message: 'Document not found or access denied'
            });
        }

        const updatedDocument = await Document.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('uploadedBy', 'firstName lastName');

        await logger.log(req, 'document_updated', `Updated document: ${document.title}`, { documentId: document._id, changes: req.body }, 'low');

        res.status(200).json({
            status: 'success',
            data: {
                document: updatedDocument
            }
        });
    } catch (error) {
        await logger.systemError(req, error, 'update_document');
        console.error('Error updating document:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

// Delete document (Admin/Uploader only)
router.delete('/:id', async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            $or: [
                { uploadedBy: req.user._id },
                { accessLevel: 'public' }
            ]
        });

        if (!document) {
            return res.status(404).json({
                status: 'fail',
                message: 'Document not found or access denied'
            });
        }

        await Document.findByIdAndDelete(req.params.id);

        // Log document deletion
        await logger.documentDeleted(req, document);

        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        await logger.systemError(req, error, 'delete_document');
        console.error('Error deleting document:', error);
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
});

module.exports = router;