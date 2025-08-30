const JobPost = require('../models/JobPost');
const SecurityGuardApplication = require('../models/SecurityGuardApplication');
const User = require('../models/User');
const Property = require('../models/Property');

// Create a new job post
const createJobPost = async (req, res) => {
  try {
    const { propertyId, jobType, requirements, title, location } = req.body;
    const postedById = req.user.id;

    // Verify the user owns the property or is authorized to post
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user is owner of the property
    if (property.ownerId.toString() !== postedById) {
      return res.status(403).json({ message: 'Not authorized to post jobs for this property' });
    }

    const jobPost = new JobPost({
      propertyId,
      postedById,
      jobType,
      requirements,
      title,
      location: location || property.address
    });

    await jobPost.save();
    await jobPost.populate('propertyId postedById');

    res.status(201).json({
      message: 'Job post created successfully',
      jobPost
    });
  } catch (error) {
    console.error('Error creating job post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all job posts with filters
const getJobPosts = async (req, res) => {
  try {
    const { jobType, status, propertyId, postedById } = req.query;
    const filter = {};

    if (jobType) filter.jobType = jobType;
    if (status) filter.status = status;
    if (propertyId) filter.propertyId = propertyId;
    if (postedById) filter.postedById = postedById;

    const jobPosts = await JobPost.find(filter)
      .populate('propertyId', 'name address')
      .populate('postedById', 'firstName lastName email')
      .populate('hiredUserId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(jobPosts);
  } catch (error) {
    console.error('Error fetching job posts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a specific job post by ID
const getJobPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const jobPost = await JobPost.findById(id)
      .populate('propertyId')
      .populate('postedById', 'firstName lastName email')
      .populate('hiredUserId', 'firstName lastName email')
      .populate({
        path: 'applications',
        populate: {
          path: 'guardId',
          select: 'firstName lastName email experience'
        }
      });

    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    res.json(jobPost);
  } catch (error) {
    console.error('Error fetching job post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update job post
const updateJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { requirements, title, location, status } = req.body;
    const userId = req.user.id;

    const jobPost = await JobPost.findById(id);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    // Check if user is authorized to update
    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this job post' });
    }

    // Update fields
    if (requirements) jobPost.requirements = { ...jobPost.requirements, ...requirements };
    if (title) jobPost.title = title;
    if (location) jobPost.location = location;
    if (status) jobPost.status = status;

    await jobPost.save();
    await jobPost.populate('propertyId postedById hiredUserId');

    res.json({
      message: 'Job post updated successfully',
      jobPost
    });
  } catch (error) {
    console.error('Error updating job post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hire a security guard (accept application)
const hireGuard = async (req, res) => {
  try {
    const { jobPostId, applicationId } = req.body;
    const userId = req.user.id;

    // Find the job post
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    // Check if user is authorized
    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to hire for this job' });
    }

    // Check if job is still open
    if (jobPost.status !== 'Open') {
      return res.status(400).json({ message: 'Job is no longer open for hiring' });
    }

    // Find the application to accept
    const acceptedApplication = await SecurityGuardApplication.findById(applicationId);
    if (!acceptedApplication || acceptedApplication.jobPostId.toString() !== jobPostId) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update the accepted application
    acceptedApplication.status = 'Accepted';
    acceptedApplication.decisionAt = new Date();
    await acceptedApplication.save();

    // Update job post
    jobPost.status = 'Filled';
    jobPost.hiredUserId = acceptedApplication.guardId;
    await jobPost.save();

    // Reject all other applications
    await SecurityGuardApplication.updateMany(
      {
        jobPostId: jobPostId,
        _id: { $ne: applicationId },
        status: { $in: ['Applied', 'Reviewed'] }
      },
      {
        status: 'Rejected',
        decisionAt: new Date(),
        rejectionReason: 'Another candidate was selected for this position'
      }
    );

    // Populate the response
    await jobPost.populate('hiredUserId', 'firstName lastName email');
    await acceptedApplication.populate('guardId', 'firstName lastName email');

    res.json({
      message: 'Security guard hired successfully',
      jobPost,
      hiredApplication: acceptedApplication
    });
  } catch (error) {
    console.error('Error hiring guard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get applications for a job post
const getJobApplications = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const userId = req.user.id;

    // Verify job post exists and user is authorized
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view applications' });
    }

    const applications = await SecurityGuardApplication.find({ jobPostId })
      .populate('guardId', 'firstName lastName email experience')
      .sort({ submittedAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel/Close job post
const cancelJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const jobPost = await JobPost.findById(id);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this job post' });
    }

    if (jobPost.status === 'Filled') {
      return res.status(400).json({ message: 'Cannot cancel a filled job post' });
    }

    jobPost.status = 'Cancelled';
    await jobPost.save();

    // Reject all pending applications
    await SecurityGuardApplication.updateMany(
      {
        jobPostId: id,
        status: { $in: ['Applied', 'Reviewed'] }
      },
      {
        status: 'Rejected',
        decisionAt: new Date(),
        rejectionReason: 'Job post was cancelled by the employer'
      }
    );

    res.json({
      message: 'Job post cancelled successfully',
      jobPost
    });
  } catch (error) {
    console.error('Error cancelling job post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createJobPost,
  getJobPosts,
  getJobPostById,
  updateJobPost,
  hireGuard,
  getJobApplications,
  cancelJobPost
};