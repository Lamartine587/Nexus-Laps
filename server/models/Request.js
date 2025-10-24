const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requestId: { type: String, unique: true, required: true },
    type: { 
        type: String, 
        enum: ['leave', 'expense', 'support', 'resource', 'other'],
        required: true 
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    submittedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    department: { 
        type: String, 
        enum: ['HR', 'Finance', 'Sales', 'IT', 'Operations'],
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'in-review'],
        default: 'pending' 
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    },
    // Leave request specific fields
    leaveType: { 
        type: String, 
        enum: ['sick', 'vacation', 'personal', 'maternity', 'paternity'] 
    },
    startDate: { type: Date },
    endDate: { type: Date },
    totalDays: { type: Number },
    
    // Expense request specific fields
    expenseAmount: { type: Number },
    expenseCategory: { 
        type: String, 
        enum: ['travel', 'meals', 'equipment', 'training', 'other'] 
    },
    expenseReceipts: [{
        name: String,
        url: String,
        amount: Number
    }],
    
    // Support request specific fields
    supportCategory: { 
        type: String, 
        enum: ['hardware', 'software', 'network', 'access', 'other'] 
    },
    urgency: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical'] 
    },
    
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    notes: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    resolution: { type: String },
    resolvedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Generate request ID before saving
requestSchema.pre('save', function(next) {
    if (!this.requestId) {
        const prefix = this.type ? this.type.toUpperCase().substring(0, 3) : 'REQ';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.requestId = `${prefix}-${timestamp}-${random}`;
    }
    
    this.updatedAt = Date.now();
    next();
});

// Also add pre-validate to ensure requestId exists before validation
requestSchema.pre('validate', function(next) {
    if (!this.requestId) {
        const prefix = this.type ? this.type.toUpperCase().substring(0, 3) : 'REQ';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.requestId = `${prefix}-${timestamp}-${random}`;
    }
    next();
});

module.exports = mongoose.model('Request', requestSchema);
