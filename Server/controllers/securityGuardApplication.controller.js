const SecurityGuardJob = require('../models/securityguardjobs');
const JobPost = require('../models/JobPost');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// Apply for a security guard job
const applyForJob = async (req, res) => {
  try {
    const { jobPostId, details, documents } = req.body;
    const guardId = (req.user._id || req.user.userId || req.user.id).toString();

    // Verify user is a security guard
    const user = await User.findById(guardId);
    if (!user || user.role !== 'Security Guard') {
      return res.status(403).json({ message: 'Only Security Guards can apply for security jobs' });
    }

    // Verify job post exists and is open
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.status !== 'Open') {
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }

    if (jobPost.jobType !== 'SecurityGuard') {
      return res.status(400).json({ message: 'This job is not for Security Guards' });
    }

    // Check if user already applied
    const existingApplication = await SecurityGuardJob.findOne({
      jobPostId,
      guardId
    });

    if (existingApplication) {
      // Allow reapplication only if the previous application was rejected
      if (existingApplication.status !== 'Rejected') {
        return res.status(400).json({ 
          message: `You have already applied for this job. Current status: ${existingApplication.status}. You can only reapply if your application was rejected.` 
        });
      }
      
      // If rejected, delete the old application to allow reapplication
      await SecurityGuardJob.findByIdAndDelete(existingApplication._id);
    }

    // Create application
    const application = new SecurityGuardJob({
      jobPostId,
      guardId,
      propertyId: jobPost.propertyId,
      ownerId: jobPost.postedById,
      applicationDetails: {
        experience: details.experience || user.experience || '',
        license: details.license || '',
        certifications: details.certifications || '',
        availability: details.availability || '',
        previousWork: details.previousWork || '',
        skills: details.skills || '',
        coverLetter: details.coverLetter || ''
      },
      documents: documents || {}
    });

    await application.save();

    // Add application to job post
    jobPost.applications.push(application._id);
    await jobPost.save();

    // Send notification to job poster about new application
    try {
      await jobPost.populate('propertyId', 'address');
      const guardName = `${user.firstName} ${user.lastName}`;
      
      await NotificationService.sendOwnerNewApplicationNotification(
        jobPost.postedById,
        application._id,
        guardName,
        jobPost.title,
        jobPost.propertyId?.address || 'Unknown Property'
      );
    } catch (notificationError) {
      console.error('Error sending new application notification:', notificationError);
    }

    // Populate response
    await application.populate('guardId', 'firstName lastName email');
    await application.populate('jobPostId', 'title requirements');

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Error applying for job:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get applications by guard
const getMyApplications = async (req, res) => {
  try {
    const guardId = (req.user._id || req.user.userId || req.user.id).toString();
    const { status } = req.query;

    const filter = { guardId };
    if (status) filter.status = status;

    const applications = await SecurityGuardJob.find(filter)
      .populate({
        path: 'jobPostId',
        populate: {
          path: 'propertyId postedById',
          select: 'name address firstName lastName email'
        }
      })
      .sort({ submittedAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get specific application by ID
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

    const application = await SecurityGuardJob.findById(id)
      .populate('guardId', 'firstName lastName email experience')
      .populate({
        path: 'jobPostId',
        populate: {
          path: 'propertyId postedById',
          select: 'name address firstName lastName email'
        }
      });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user is authorized to view this application
    const jobPost = await JobPost.findById(application.jobPostId._id);
    const isGuard = application.guardId._id.toString() === userId;
    const isJobPoster = jobPost.postedById._id.toString() === userId;

    if (!isGuard && !isJobPoster) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update application (only by the applicant before review)
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { details, documents } = req.body;
    const guardId = (req.user._id || req.user.userId || req.user.id).toString();

    const application = await SecurityGuardJob.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user owns this application
    if (application.guardId.toString() !== guardId) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    // Check if application can still be updated
    if (application.status !== 'Applied') {
      return res.status(400).json({ message: 'Cannot update application after it has been reviewed' });
    }

    // Update details and documents
    if (details) {
      application.applicationDetails = { ...application.applicationDetails, ...details };
    }
    if (documents) {
      application.documents = { ...application.documents, ...documents };
    }

    await application.save();
    await application.populate('jobPostId', 'title requirements');

    res.json({
      message: 'Application updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Withdraw application
const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const guardId = (req.user._id || req.user.userId || req.user.id).toString();

    const application = await SecurityGuardJob.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user owns this application
    if (application.guardId.toString() !== guardId) {
      return res.status(403).json({ message: 'Not authorized to withdraw this application' });
    }

    // Check if application can be withdrawn
    if (application.status === 'Accepted') {
      return res.status(400).json({ message: 'Cannot withdraw an accepted application' });
    }

    if (application.status === 'Rejected') {
      return res.status(400).json({ message: 'Application is already rejected' });
    }

    // Remove application from job post
    await JobPost.findByIdAndUpdate(
      application.jobPostId,
      { $pull: { applications: application._id } }
    );

    // Delete the application
    await SecurityGuardJob.findByIdAndDelete(id);

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update application status (by job poster)
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, rejectionReason, salary, jobDetails } = req.body;
    const userId = (req.user._id || req.user.userId || req.user.id).toString();

    const application = await SecurityGuardJob.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify user is authorized (job poster)
    const jobPost = await JobPost.findById(application.jobPostId);
    if (jobPost.postedById.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this application status' });
    }

    // Validate status transition
    const validStatuses = ['Applied', 'Reviewed', 'Accepted', 'Rejected', 'Hired', 'Active', 'Fired', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update application
    application.status = status;
    if (reviewNotes) application.reviewNotes = reviewNotes;
    if (rejectionReason) application.rejectionReason = rejectionReason;
    
    if (status === 'Accepted' || status === 'Rejected' || status === 'Hired') {
      application.decisionAt = new Date();
    }

    // Handle hiring process
    if (status === 'Hired') {
      application.hiredDate = new Date();
      application.isActive = true;
      
      // Set salary information if provided
      if (salary) {
        application.salary = {
          amount: salary.amount || 0,
          currency: salary.currency || 'USD',
          paymentFrequency: salary.paymentFrequency || 'monthly'
        };
      }
      
      // Set job details if provided
      if (jobDetails) {
        application.jobDetails = {
          ...application.jobDetails,
          ...jobDetails
        };
      }
      
      // Update job post status to filled
      jobPost.status = 'Filled';
      jobPost.hiredUserId = application.guardId;
      jobPost.hiredDate = new Date();
      await jobPost.save();
      
      // Automatically create monthly invoice and payment for security guard
      if (application.salary && application.salary.amount > 0) {
        try {
          const Invoice = require('../models/Invoice');
          const Payment = require('../models/Payment');
          
          // Calculate billing period (current month)
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const dueDate = new Date(endOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after month end
          
          // Create invoice for security guard salary
          const invoice = new Invoice({
            propertyId: jobPost.propertyId,
            billTo: application.guardId, // Security guard receives payment
            billFrom: userId, // Property owner pays
            dueDate: dueDate,
            period: {
              start: startOfMonth,
              end: endOfMonth
            },
            lineItems: [{
              type: 'other',
              description: `Security Guard Salary - ${application.jobDetails?.title || 'Security Services'}`,
              quantity: 1,
              unitPrice: application.salary.amount,
              amount: application.salary.amount,
              taxable: false,
              taxRate: 0,
              taxAmount: 0
            }],
            subtotal: application.salary.amount,
            total: application.salary.amount,
            balance: application.salary.amount,
            currency: application.salary.currency || 'USD',
            status: 'open',
            auto: {
              generated: true,
              source: 'system',
              generatedAt: new Date(),
              generatedBy: userId
            }
          });
          
          await invoice.save();
          
          // Create payment object with completed status (automatically paid upon hiring)
          const payment = new Payment({
            invoiceId: invoice._id,
            type: 'security_guard_payment',
            status: 'completed',
            method: 'auto_payment',
            amount: application.salary.amount,
            currency: application.salary.currency || 'USD',
            propertyId: jobPost.propertyId,
            payerId: userId, // Property owner pays
            payeeId: application.guardId, // Security guard receives
            receiverId: application.guardId,
            description: `Security Guard Salary Payment - ${application.jobDetails?.title || 'Security Services'}`,
            dueDate: dueDate,
            completedAt: new Date(),
            billingPeriod: {
              startDate: startOfMonth,
              endDate: endOfMonth,
              isRecurring: true,
              recurringFrequency: 'monthly'
            },
            history: [{
              status: 'pending',
              timestamp: new Date(),
              note: 'Payment created automatically upon guard hiring',
              updatedBy: userId
            }, {
              status: 'completed',
              timestamp: new Date(),
              note: 'Payment automatically completed upon guard hiring',
              updatedBy: userId
            }]
          });
          
          await payment.save();
          
          console.log(`Created invoice ${invoice.invoiceNo} and payment ${payment.paymentId} for hired security guard`);
          
          // Send notifications about invoice and payment creation
          try {
            // Notify owner about invoice generation
            await NotificationService.sendOwnerInvoiceNotification(
              userId, // owner ID
              invoice._id,
              invoice.description,
              invoice.totalAmount,
              invoice.dueDate
            );
            
            // Notify guard about invoice generation and welcome message
            await NotificationService.sendGuardInvoiceGeneratedNotification(
              application.guardId,
              invoice._id,
              invoice.totalAmount,
              application.jobDetails?.title || 'Security Services',
              jobPost.propertyId?.address || 'Unknown Property'
            );
            
            // Notify guard about pending payment
            await NotificationService.sendGuardPaymentPendingNotification(
              application.guardId,
              payment._id,
              payment.amount,
              payment.dueDate
            );
          } catch (notificationError) {
            console.error('Error sending invoice/payment notifications:', notificationError);
          }
        } catch (invoiceError) {
          console.error('Error creating invoice and payment for hired guard:', invoiceError);
          // Don't fail the hiring process if invoice creation fails
        }
      }
    }

    await application.save();
    await application.populate('guardId', 'firstName lastName email');

    // Send notification to guard about status change
    try {
      await application.populate('jobPostId', 'title');
      await jobPost.populate('propertyId', 'address');
      
      await NotificationService.sendGuardApplicationStatusNotification(
        application.guardId._id,
        application._id,
        application.status, // oldStatus
        status, // newStatus
        application.jobPostId.title,
        jobPost.propertyId?.address || 'Unknown Property',
        rejectionReason
      );
    } catch (notificationError) {
      console.error('Error sending application status notification:', notificationError);
    }

    res.json({
      message: `Application ${status.toLowerCase()} successfully`,
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get application statistics for a guard
const getApplicationStats = async (req, res) => {
  try {
    const guardId = (req.user._id || req.user.userId || req.user.id).toString();

    const stats = await SecurityGuardJob.aggregate([
      { $match: { guardId: guardId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      applied: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats[stat._id.toLowerCase()] = stat.count;
    });

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get applications for a specific job post (Owner only)
const getApplicationsByJobPost = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const ownerId = (req.user._id || req.user.userId || req.user.id).toString();

    // Validate user ID
    if (!ownerId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify job post exists and belongs to the owner
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }



    if (!jobPost.postedById) {
      return res.status(500).json({ message: 'Job post missing postedById field' });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view applications' });
    }

    // Get applications for this job post
    const applications = await SecurityGuardJob.find({ jobPostId })
      .populate('guardId', 'firstName lastName email phoneNumber address profilePicture')
      .sort({ applicationDate: -1 });

    // Transform applications to match frontend expectations
    const transformedApplications = applications.map(app => ({
      ...app.toObject(),
      details: app.applicationDetails // Map applicationDetails to details for frontend compatibility
    }));

    res.status(200).json({
      success: true,
      applications: transformedApplications
    });
  } catch (error) {
    console.error('Error fetching applications by job post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getApplicationById,
  updateApplication,
  withdrawApplication,
  updateApplicationStatus,
  getApplicationStats,
  getApplicationsByJobPost
};