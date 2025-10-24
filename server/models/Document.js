const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { 
        type: String, 
        enum: ['policy', 'form', 'template', 'guide', 'report', 'other'],
        required: true 
    },
    department: { 
        type: String, 
        enum: ['HR', 'Finance', 'Sales', 'IT', 'Operations', 'All'],
        default: 'All'
    },
    file: {
        originalName: String,
        fileName: String,
        filePath: String,
        fileSize: Number,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now }
    },
    accessLevel: { 
        type: String, 
        enum: ['public', 'department', 'private'],
        default: 'department' 
    },
    tags: [String],
    version: { type: String, default: '1.0' },
    isActive: { type: Boolean, default: true },
    uploadedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    downloadCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

documentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Document', documentSchema);
