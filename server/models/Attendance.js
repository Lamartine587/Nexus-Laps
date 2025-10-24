const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  hoursWorked: { type: Number },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'half-day', 'holiday'],
    default: 'absent'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);