const JobPost = require('../models/JobPost');
const SecurityGuardApplication = require('../models/SecurityGuardApplication');
const User = require('../models/User');
const Property = require('../models/Property');
const NotificationService = require('../services/notificationService');

// Create a new job post
const createJobPost = async (req, res) => {
  try {
    console.log('🏢 CREATE JOB POST: Request body:', req.body);
    console.log('🏢 CREATE JOB POST: User from req.user:', req.user);
    const { propertyId, jobType, requirements, title, location } = req.body;
    const postedById = (req.user._id || req.user.userId || req.user.id).toString();
    console.log('🏢 CREATE JOB POST: Posted by ID:', postedById);

    // Verify the user owns the property or is authorized to post
    const property = await Property.findById(propertyId);
    console.log('🏢 CREATE JOB POST: Found property:', property ? property._id : 'null');
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user is owner of the property
    const propertyOwnerId = property.ownerUserId || property.owner || property.ownerId;
    console.log('🏢 CREATE JOB POST: Property owner ID:', propertyOwnerId);
    console.log('🏢 CREATE JOB POST: Posted by ID:', postedById);
    
    const propertyOwnerIdStr = propertyOwnerId ? propertyOwnerId.toString() : null;
    const postedByIdStr = postedById ? postedById.toString() : null;
    
    console.log('🏢 CREATE JOB POST: Owner check:', propertyOwnerIdStr === postedByIdStr);
    if (propertyOwnerIdStr !== postedByIdStr) {
      console.log('❌ CREATE JOB POST: Not authorized - owner mismatch');
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
    if (propertyId) {
      // Validate propertyId as ObjectId
      if (!propertyId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid propertyId format' });
      }
      filter.propertyId = propertyId;
    }
    if (postedById) {
      // Validate postedById as ObjectId
      if (!postedById.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid postedById format' });
      }
      filter.postedById = postedById;
    }

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
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

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
    console.log('🎯 HIRE GUARD: Request received');
    console.log('🎯 HIRE GUARD: Request body:', req.body);
    console.log('🎯 HIRE GUARD: User:', req.user);
    
    const { jobPostId, applicationId } = req.body;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();
    
    console.log('🎯 HIRE GUARD: Extracted data:', { jobPostId, applicationId, userId });

    // Find the job post
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    // Check if user is authorized
    console.log('🎯 HIRE GUARD: Authorization check:');
    console.log('🎯 HIRE GUARD: jobPost.postedById:', jobPost.postedById);
    console.log('🎯 HIRE GUARD: jobPost.postedById type:', typeof jobPost.postedById);
    console.log('🎯 HIRE GUARD: jobPost.postedById.toString():', jobPost.postedById.toString());
    console.log('🎯 HIRE GUARD: userId:', userId);
    console.log('🎯 HIRE GUARD: userId type:', typeof userId);
    console.log('🎯 HIRE GUARD: Are they equal?:', jobPost.postedById.toString() === userId);
    
    if (jobPost.postedById.toString() !== userId) {
      console.log('❌ HIRE GUARD: Authorization failed - user not authorized');
      return res.status(403).json({ message: 'Not authorized to hire for this job' });
    }
    
    console.log('✅ HIRE GUARD: Authorization passed');

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
    console.log('🎯 HIRE GUARD: Updating application status to Hired');
    acceptedApplication.status = 'Hired';
    acceptedApplication.decisionAt = new Date();
    await acceptedApplication.save();
    console.log('🎯 HIRE GUARD: Application updated successfully');

    // Update job post
    console.log('🎯 HIRE GUARD: Updating job post status to Filled');
    jobPost.status = 'Filled';
    jobPost.hiredUserId = acceptedApplication.guardId;
    jobPost.hiredApplicationId = acceptedApplication._id;
    await jobPost.save();
    console.log('🎯 HIRE GUARD: Job post updated successfully');

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

    // Send hiring notification to the hired guard
    try {
      await jobPost.populate('propertyId', 'address ownerUserId currentRentId');
      await NotificationService.sendGuardHiringNotification(
        acceptedApplication.guardId,
        jobPostId,
        jobPost.title,
        jobPost.propertyId?.address || 'Unknown Property',
        {
          salary: jobPost.requirements?.salary,
          workingHours: jobPost.requirements?.workingHours
        }
      );

      // Get guard details for notifications
      await acceptedApplication.populate('guardId', 'firstName lastName');
      const guardName = `${acceptedApplication.guardId.firstName} ${acceptedApplication.guardId.lastName}`;
      const propertyAddress = jobPost.propertyId?.address || 'Unknown Property';
      const guardDetails = {
        salary: jobPost.requirements?.salary,
        workingHours: jobPost.requirements?.workingHours
      };

      // Notify property owner
      if (jobPost.propertyId?.ownerUserId) {
        await NotificationService.sendOwnerGuardHiredNotification(
          jobPost.propertyId.ownerUserId,
          guardName,
          jobPost.title,
          propertyAddress,
          guardDetails
        );
      }

      // Notify tenants if property is rented
      if (jobPost.propertyId?.currentRentId) {
        const Rent = require('../models/Rent');
        const rent = await Rent.findById(jobPost.propertyId.currentRentId).populate('tenants');
        if (rent && rent.tenants && rent.tenants.length > 0) {
          for (const tenant of rent.tenants) {
            await NotificationService.sendTenantGuardHiredNotification(
              tenant._id,
              guardName,
              jobPost.title,
              propertyAddress,
              guardDetails
            );
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending hiring notifications:', notificationError);
    }

    // Populate the response
    await jobPost.populate('hiredUserId', 'firstName lastName email');
    await acceptedApplication.populate('guardId', 'firstName lastName email');

    console.log('🎯 HIRE GUARD: Sending success response');
    res.json({
      message: 'Security guard hired successfully',
      jobPost,
      hiredApplication: acceptedApplication
    });
    console.log('🎯 HIRE GUARD: Response sent successfully');
  } catch (error) {
    console.error('Error hiring guard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get applications for a job post
const getJobApplications = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

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

    res.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel/Close job post
const cancelJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

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

// Get assigned guards for tenant
const getTenantAssignedGuards = async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    // Get all properties where the user is a tenant
    const tenantProperties = await Property.find({
      'tenants.userId': tenantId,
      'tenants.status': 'Active'
    });
    
    if (!tenantProperties || tenantProperties.length === 0) {
      return res.json({
        success: true,
        assignedGuards: [],
        message: 'No properties assigned to this tenant'
      });
    }
    
    const propertyIds = tenantProperties.map(prop => prop._id);
    
    // Find all filled job posts for these properties with hired guards
    const filledJobPosts = await JobPost.find({
      propertyId: { $in: propertyIds },
      status: 'Filled',
      hiredUserId: { $ne: null },
      jobType: 'SecurityGuard'
    })
    .populate('hiredUserId', 'firstName lastName email phoneNumber profilePicture')
    .populate('propertyId', 'address')
    .sort({ updatedAt: -1 });
    
    // Format the response
    const assignedGuards = filledJobPosts.map(jobPost => ({
      jobPost: {
        _id: jobPost._id,
        title: jobPost.title,
        requirements: jobPost.requirements,
        updatedAt: jobPost.updatedAt
      },
      guard: jobPost.hiredUserId,
      property: jobPost.propertyId
    }));
    
    res.json({
      success: true,
      assignedGuards
    });
  } catch (error) {
    console.error('Error fetching tenant assigned guards:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Fire a security guard
const fireGuard = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

    // Find the job post
    const jobPost = await JobPost.findById(id)
      .populate('hiredUserId', 'firstName lastName email')
      .populate('propertyId', 'address');
    
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    // Check if user is authorized
    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to fire this guard' });
    }

    // Check if job has a hired guard
    if (jobPost.status !== 'Filled' || !jobPost.hiredUserId) {
      return res.status(400).json({ message: 'No guard is currently hired for this position' });
    }

    const firedGuardId = jobPost.hiredUserId._id;
    const jobTitle = jobPost.title;
    const propertyAddress = jobPost.propertyId?.address || 'Unknown Property';

    // Update job post - reopen the position
    jobPost.status = 'Open';
    jobPost.hiredUserId = null;
    await jobPost.save();

    // Send termination notification to the fired guard
    try {
      await NotificationService.sendGuardTerminationNotification(
        firedGuardId,
        jobTitle,
        propertyAddress,
        reason
      );
    } catch (notificationError) {
      console.error('Error sending termination notification:', notificationError);
    }

    res.json({
      message: 'Security guard fired successfully',
      jobPost: {
        _id: jobPost._id,
        status: jobPost.status,
        hiredUserId: jobPost.hiredUserId
      }
    });
  } catch (error) {
    console.error('Error firing guard:', error);
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
  cancelJobPost,
  fireGuard,
  getTenantAssignedGuards
};