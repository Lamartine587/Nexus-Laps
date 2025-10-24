const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    enum: ['HR', 'Finance', 'Sales', 'Inventory', 'IT', 'Operations']
  },
  manager: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  description: { type: String },
  employeeCount: { type: Number, default: 0 },
  budget: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', departmentSchema);