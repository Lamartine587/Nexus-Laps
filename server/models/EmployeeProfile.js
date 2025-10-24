const mongoose = require('mongoose');

const employeeProfileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  dateOfBirth: { type: Date },
  phone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  employmentDetails: {
    hireDate: { type: Date, default: Date.now },
    employmentType: { 
      type: String, 
      enum: ['full-time', 'part-time', 'contract'], 
      default: 'full-time' 
    },
    salary: { type: Number },
    bankAccount: {
      accountNumber: String,
      bankName: String,
      branch: String
    }
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);