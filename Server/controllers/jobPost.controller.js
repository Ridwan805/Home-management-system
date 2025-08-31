const JobPost = require('../models/JobPost');
const SecurityGuardJob = require('../models/securityguardjobs');
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
      .populate({
        path: 'hiredUserId',
        select: 'firstName lastName email phoneNumber'
      })
      .sort({ createdAt: -1 });

    // For hired guards, also fetch their application details
    const jobPostsWithApplications = await Promise.all(
      jobPosts.map(async (jobPost) => {
        const jobPostObj = jobPost.toObject();
        
        if (jobPost.status === 'Filled' && jobPost.hiredUserId) {
          // Find the application for the hired guard
          const application = await SecurityGuardJob.findOne({
            jobPostId: jobPost._id,
            guardId: jobPost.hiredUserId._id,
            status: 'Hired'
          });
          
          if (application) {
            jobPostObj.hiredGuardApplication = application;
          }
        }
        
        return jobPostObj;
      })
    );

    res.json(jobPostsWithApplications);
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
    const acceptedApplication = await SecurityGuardJob.findById(applicationId);
    if (!acceptedApplication || acceptedApplication.jobPostId.toString() !== jobPostId) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Get tenant information for the property
    const Rent = require('../models/Rent');
    let tenantId = null;
    
    // Populate property to get currentRentId
    await jobPost.populate('propertyId', 'currentRentId');
    
    if (jobPost.propertyId.currentRentId) {
      const currentRent = await Rent.findById(jobPost.propertyId.currentRentId);
      if (currentRent && currentRent.tenants && currentRent.tenants.length > 0) {
        tenantId = currentRent.tenants[0]; // Take the first tenant
      }
    } else {
      // If no currentRentId, try to find active rent for this property
      const activeRent = await Rent.findOne({
        propertyId: jobPost.propertyId._id,
        status: 'Active'
      });
      if (activeRent && activeRent.tenants && activeRent.tenants.length > 0) {
        tenantId = activeRent.tenants[0]; // Take the first tenant
      }
    }
    
    // Update the accepted application
    console.log('🎯 HIRE GUARD: Updating application status to Hired');
    acceptedApplication.status = 'Hired';
    acceptedApplication.decisionAt = new Date();
    acceptedApplication.hiredDate = new Date();
    if (tenantId) {
      acceptedApplication.tenantId = tenantId;
      console.log('🎯 HIRE GUARD: Tenant ID set:', tenantId);
    }
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
    await SecurityGuardJob.updateMany(
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

    const applications = await SecurityGuardJob.find({ jobPostId })
      .populate('guardId', 'firstName lastName email experience')
      .sort({ applicationDate: -1 });

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
    await SecurityGuardJob.updateMany(
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
    
    // Import required models
    const SecurityGuardJob = require('../models/securityguardjobs');
    const Rent = require('../models/Rent');
    
    // First, find all properties where this user is an active tenant
    const activeRents = await Rent.find({
      tenants: tenantId,
      status: 'Active'
    }).select('propertyId');
    
    if (!activeRents || activeRents.length === 0) {
      return res.json({
        success: true,
        assignedGuards: [],
        message: 'No active rental properties found'
      });
    }
    
    // Extract property IDs from active rents
    const propertyIds = activeRents.map(rent => rent.propertyId);
    
    // Find all active security guard jobs for these properties
    const assignedJobs = await SecurityGuardJob.find({
      propertyId: { $in: propertyIds },
      isActive: true,
      status: { $in: ['Hired', 'Active'] }
    })
    .populate('guardId', 'firstName lastName email phoneNumber profilePicture experience certifications specialSkills emergencyContact availability')
    .populate('propertyId', 'address city state propertyType specifications location')
    .populate('jobPostId', 'title requirements')
    .populate('ownerId', 'firstName lastName email phoneNumber')
    .sort({ hiredDate: -1 });
    
    if (!assignedJobs || assignedJobs.length === 0) {
      return res.json({
        success: true,
        assignedGuards: [],
        message: 'No security guards assigned to your properties'
      });
    }
    
    // Format the response with comprehensive guard details
    const assignedGuards = assignedJobs.map(job => ({
      _id: job._id,
      jobPost: {
        _id: job.jobPostId?._id || job._id,
        title: job.jobPostId?.title || 'Security Guard Position',
        requirements: job.jobPostId?.requirements || {},
        updatedAt: job.updatedAt,
        hiredDate: job.hiredDate
      },
      guard: {
        _id: job.guardId._id,
        name: `${job.guardId.firstName} ${job.guardId.lastName}`,
        firstName: job.guardId.firstName,
        lastName: job.guardId.lastName,
        email: job.guardId.email,
        phoneNumber: job.guardId.phoneNumber,
        profilePicture: job.guardId.profilePicture,
        experience: job.guardId.experience,
        certifications: job.guardId.certifications,
        specialSkills: job.guardId.specialSkills,
        emergencyContact: job.guardId.emergencyContact,
        availability: job.guardId.availability
      },
      property: {
        _id: job.propertyId._id,
        address: job.propertyId.address,
        city: job.propertyId.city,
        state: job.propertyId.state,
        propertyType: job.propertyId.propertyType,
        specifications: job.propertyId.specifications,
        location: job.propertyId.location
      },
      owner: job.ownerId ? {
        _id: job.ownerId._id,
        name: `${job.ownerId.firstName} ${job.ownerId.lastName}`,
        email: job.ownerId.email,
        phoneNumber: job.ownerId.phoneNumber
      } : null,
      jobDetails: {
        status: job.status,
        salary: job.salary,
        workSchedule: job.jobDetails?.workSchedule,
        duties: job.jobDetails?.duties,
        equipmentProvided: job.jobDetails?.equipmentProvided,
        specialInstructions: job.jobDetails?.specialInstructions,
        emergencyContacts: job.jobDetails?.emergencyContacts
      },
      timeline: {
        appliedDate: job.appliedDate,
        hiredDate: job.hiredDate,
        startDate: job.startDate,
        endDate: job.endDate
      }
    }));
    
    res.json({
      success: true,
      assignedGuards,
      totalGuards: assignedGuards.length
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

// Get security guard's current job assignment
const getGuardCurrentJob = async (req, res) => {
  try {
    const guardId = req.user._id || req.user.userId || req.user.id;
    
    // Import SecurityGuardJob model
    const SecurityGuardJob = require('../models/securityguardjobs');
    const Rent = require('../models/Rent');
    
    // Find the current active job for this guard using the new schema
    const currentJob = await SecurityGuardJob.findOne({
      guardId: guardId,
      isActive: true,
      status: { $in: ['Hired', 'Active'] }
    })
    .populate('propertyId', 'address ownerUserId currentRentId propertyType specifications location contactInfo')
    .populate('ownerId', 'firstName lastName email phoneNumber')
    .populate('tenantId', 'firstName lastName email phoneNumber')
    .populate('jobPostId', 'title requirements');
    
    if (!currentJob) {
      return res.json({
        success: true,
        data: null,
        message: 'No current job assignment found'
      });
    }
    
    // Get comprehensive tenant information from rent records
    let tenantDetails = null;
    let rentDetails = null;
    
    if (currentJob.tenantId) {
      // Use the populated tenant data
      tenantDetails = {
        _id: currentJob.tenantId._id,
        name: `${currentJob.tenantId.firstName} ${currentJob.tenantId.lastName}`,
        email: currentJob.tenantId.email,
        phoneNumber: currentJob.tenantId.phoneNumber
      };
    } else if (currentJob.propertyId) {
      // Try to find tenant through rent records if tenantId is null
      let activeRent = null;
      
      // First try currentRentId
      if (currentJob.propertyId.currentRentId) {
        activeRent = await Rent.findById(currentJob.propertyId.currentRentId)
          .populate('tenants', 'firstName lastName email phoneNumber');
      }
      
      // If no currentRentId or rent not found, search for active rent
      if (!activeRent) {
        activeRent = await Rent.findOne({
          propertyId: currentJob.propertyId._id,
          status: 'Active'
        }).populate('tenants', 'firstName lastName email phoneNumber');
      }
      
      if (activeRent && activeRent.tenants && activeRent.tenants.length > 0) {
        const tenant = activeRent.tenants[0];
        tenantDetails = {
          _id: tenant._id,
          name: `${tenant.firstName} ${tenant.lastName}`,
          email: tenant.email,
          phoneNumber: tenant.phoneNumber
        };
        
        rentDetails = {
          _id: activeRent._id,
          status: activeRent.status,
          startDate: activeRent.term?.startDate,
          endDate: activeRent.term?.endDate,
          rentAmount: activeRent.rent?.amount,
          currency: activeRent.rent?.currency || 'USD'
        };
        
        // Update the security guard job with the found tenantId
        await SecurityGuardJob.findByIdAndUpdate(currentJob._id, {
          tenantId: tenant._id
        });
      }
    }
    
    // Format the response with comprehensive data
    const jobDetails = {
      _id: currentJob._id,
      title: currentJob.jobPostId?.title || 'Security Guard Position',
      description: currentJob.jobPostId?.requirements?.description || currentJob.jobDetails?.duties || '',
      salary: currentJob.salary?.amount ? `${currentJob.salary.currency} ${currentJob.salary.amount}/${currentJob.salary.paymentFrequency}` : 'Not specified',
      workingHours: currentJob.jobDetails?.workSchedule || currentJob.jobPostId?.requirements?.workingHours || 'Not specified',
      hiredDate: currentJob.hiredDate || currentJob.createdAt,
      status: currentJob.status,
      property: {
        _id: currentJob.propertyId._id,
        name: currentJob.propertyId.address,
        address: currentJob.propertyId.address,
        type: currentJob.propertyId.propertyType || 'Property',
        specifications: currentJob.propertyId.specifications,
        location: currentJob.propertyId.location,
        contactInfo: currentJob.propertyId.contactInfo
      },
      owner: {
        _id: currentJob.ownerId._id,
        name: `${currentJob.ownerId.firstName} ${currentJob.ownerId.lastName}`,
        email: currentJob.ownerId.email,
        phoneNumber: currentJob.ownerId.phoneNumber
      },
      tenant: tenantDetails,
      rent: rentDetails,
      // Additional job details
      jobDetails: {
        duties: currentJob.jobDetails?.duties,
        workSchedule: currentJob.jobDetails?.workSchedule,
        equipmentProvided: currentJob.jobDetails?.equipmentProvided,
        specialInstructions: currentJob.jobDetails?.specialInstructions,
        emergencyContacts: currentJob.jobDetails?.emergencyContacts
      }
    };
    
    res.json({
      success: true,
      data: jobDetails
    });
  } catch (error) {
    console.error('Error fetching guard current job:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
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
  getTenantAssignedGuards,
  getGuardCurrentJob
};