const mongoose = require('mongoose');

const securityGuardApplicationSchema = new mongoose.Schema({
  jobPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  guardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    experience: { type: String, required: true },
    license: { type: String, default: '' },
    certifications: { type: String, default: '' },
    availability: { type: String, required: true },
    previousWork: { type: String, default: '' },
    skills: { type: String, default: '' },
    coverLetter: { type: String, default: '' }
  },
  documents: {
    idDocument: { type: String, default: '' },
    licenseDocument: { type: String, default: '' },
    certificationDocuments: { type: String, default: '' },
    resume: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Applied', 'Reviewed', 'Accepted', 'Rejected', 'Hired'],
    default: 'Applied'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  decisionAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Compound index to ensure one application per guard per job
securityGuardApplicationSchema.index({ jobPostId: 1, guardId: 1 }, { unique: true });

// Index for efficient queries
securityGuardApplicationSchema.index({ guardId: 1, status: 1 });
securityGuardApplicationSchema.index({ jobPostId: 1, status: 1 });

module.exports = mongoose.model('SecurityGuardApplication', securityGuardApplicationSchema);