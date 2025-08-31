import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiConfig, { authenticatedFetch } from '../../config/api';
import './SecurityGuardInfo.css';

const SecurityGuardInfo = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobPosts, setJobPosts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [selectedJobPost, setSelectedJobPost] = useState(null);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  
  const [newJobPost, setNewJobPost] = useState({
    propertyId: '',
    jobType: 'SecurityGuard',
    title: '',
    requirements: {
      description: '',
      duties: '',
      skills: '',
      workingHours: '',
      documentsRequired: '',
      salary: '',
      experience: ''
    },
    location: ''
  });

  useEffect(() => {
    fetchJobPosts();
    fetchProperties();
  }, []);

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.userId;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const data = await authenticatedFetch(apiConfig.getUrl(`/api/job-posts?postedById=${userId}`));
      setJobPosts(data || []);
    } catch (error) {
      console.error('Error fetching job posts:', error);
      toast.error('Failed to fetch job posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const data = await authenticatedFetch(apiConfig.getUrl('/api/properties/user'));
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchApplications = async (jobPostId) => {
    try {
      setLoading(true);
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.jobPostApplications(jobPostId)));
      setApplications(data.applications || []);
      setShowApplicationsModal(true);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const createJobPost = async (e) => {
    e.preventDefault();
    
    
    // Validate required fields
    if (!newJobPost.propertyId || !newJobPost.title || !newJobPost.requirements.description || !newJobPost.requirements.duties || !newJobPost.requirements.workingHours) {
      toast.error('Please fill in all required fields (Property, Title, Description, Duties, Working Hours)');
      return;
    }
    
    try {
      setLoading(true);
      
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.jobPosts), {
        method: 'POST',
        body: JSON.stringify(newJobPost)
      });
      
      toast.success('Job post created successfully!');
      setShowCreateJobModal(false);
      setNewJobPost({
        propertyId: '',
        jobType: 'SecurityGuard',
        title: '',
        requirements: {
          description: '',
          duties: '',
          skills: '',
          workingHours: '',
          documentsRequired: '',
          salary: '',
          experience: ''
        },
        location: ''
      });
      fetchJobPosts();
    } catch (error) {
      console.error('Error creating job post:', error);
      toast.error(error.message || 'Failed to create job post');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.updateApplicationStatus(applicationId)), {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      toast.success(`Application ${status} successfully!`);
      fetchApplications(selectedJobPost._id);
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error(`Failed to ${status} application`);
    }
  };

  const hireGuard = async (applicationId) => {
    try {
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.hireGuard), {
        method: 'POST',
        body: JSON.stringify({ 
          jobPostId: selectedJobPost._id,
          applicationId: applicationId 
        })
      });
      
      toast.success('Security guard hired successfully!');
      setShowApplicationsModal(false);
      fetchJobPosts();
    } catch (error) {
      console.error('Error hiring guard:', error);
      toast.error('Failed to hire security guard');
    }
  };

  const handleHireGuard = async (jobPostId, applicationId) => {
    if (!window.confirm('Are you sure you want to hire this security guard?')) {
      return;
    }
    
    try {
      setLoading(true);
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.hireGuard), {
        method: 'POST',
        body: JSON.stringify({ 
          jobPostId: jobPostId,
          applicationId: applicationId 
        })
      });
      
      toast.success('Security guard hired successfully!');
      setShowApplicationsModal(false);
      fetchJobPosts();
    } catch (error) {
      console.error('Error hiring guard:', error);
      toast.error('Failed to hire security guard');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (applicationId) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    
    if (!window.confirm('Are you sure you want to reject this application?')) {
      return;
    }
    
    try {
      setLoading(true);
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.updateApplicationStatus(applicationId)), {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'Rejected',
          rejectionReason: reason || ''
        })
      });
      
      toast.success('Application rejected successfully!');
      fetchApplications(selectedJobPost._id);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageGuard = (guardId) => {
    // TODO: Implement messaging system
    toast.info('Messaging system will be implemented soon');
  };



  const handleFireGuard = async (jobId) => {
    const reason = window.prompt('Please provide a reason for termination (optional):');
    
    if (!window.confirm('Are you sure you want to fire this security guard? This action cannot be undone.')) {
      return;
    }

    try {
      // Use the new fire guard endpoint
      await authenticatedFetch(apiConfig.getUrl(`/api/job-posts/${jobId}/fire`), {
        method: 'POST',
        body: JSON.stringify({ reason: reason || '' })
      });
      
      toast.success('Security guard has been fired successfully');
      fetchJobPosts();
    } catch (error) {
      console.error('Error firing guard:', error);
      toast.error('Failed to fire security guard');
    }
  };

  const deleteJobPost = async (jobPostId) => {
    if (!window.confirm('Are you sure you want to delete this job post?')) return;
    
    try {
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.jobPostById(jobPostId)), {
        method: 'DELETE'
      });
      
      toast.success('Job post deleted successfully!');
      fetchJobPosts();
    } catch (error) {
      console.error('Error deleting job post:', error);
      toast.error('Failed to delete job post');
    }
  };

  return (
    <div className="security-guard-info">
      <div className="header">
        <h1>Security Guard Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateJobModal(true)}
        >
          Post New Job
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Job Posts ({jobPosts.length})
        </button>
        <button 
          className={`tab ${activeTab === 'hired' ? 'active' : ''}`}
          onClick={() => setActiveTab('hired')}
        >
          Hired Guards
        </button>
      </div>

      <div className="content">
        {activeTab === 'jobs' && (
          <div className="job-posts">
            {loading ? (
              <div className="loading">Loading job posts...</div>
            ) : jobPosts.length === 0 ? (
              <div className="empty-state">
                <p>No job posts yet. Create your first security guard job posting!</p>
              </div>
            ) : (
              <div className="job-posts-grid">
                {jobPosts.map(job => (
                  <div key={job._id} className="job-post-card">
                    <div className="job-header">
                      <h3>{job.title || 'Security Guard Position'}</h3>
                      <span className={`status ${job.status}`}>{job.status}</span>
                    </div>
                    <div className="job-details">
                      <p><strong>Property:</strong> {job.propertyId?.address || job.property?.address || 'N/A'}</p>
                      <p><strong>Location:</strong> {job.location || 'Property address'}</p>
                      <p><strong>Applications:</strong> {job.applications?.length || 0}</p>
                      <p><strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="job-requirements">
                      <strong>Requirements:</strong>
                      {typeof job.requirements === 'object' && job.requirements ? (
                        <div className="requirements-details">
                          {job.requirements.description && <p><strong>Description:</strong> {job.requirements.description}</p>}
                          {job.requirements.duties && <p><strong>Duties:</strong> {job.requirements.duties}</p>}
                          {job.requirements.skills && <p><strong>Skills:</strong> {job.requirements.skills}</p>}
                          {job.requirements.workingHours && <p><strong>Working Hours:</strong> {job.requirements.workingHours}</p>}
                          {job.requirements.salary && <p><strong>Salary:</strong> {job.requirements.salary}</p>}
                          {job.requirements.experience && <p><strong>Experience:</strong> {job.requirements.experience}</p>}
                        </div>
                      ) : (
                        <p>{job.requirements || 'No requirements specified'}</p>
                      )}
                    </div>
                    <div className="job-actions">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedJobPost(job);
                          fetchApplications(job._id);
                        }}
                        disabled={job.applications?.length === 0}
                      >
                        View Applications ({job.applications?.length || 0})
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => deleteJobPost(job._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hired' && (
          <div className="hired-guards">
            <div className="hired-guards-grid">
              {jobPosts
                .filter(job => job.status === 'Filled' && job.hiredUserId)
                .map(job => (
                  <div key={job._id} className="hired-guard-card enhanced">
                    <div className="guard-header">
                      <div className="guard-avatar">
                        <div className="avatar-placeholder">
                          {job.hiredUserId.firstName?.[0]}{job.hiredUserId.lastName?.[0]}
                        </div>
                      </div>
                      <div className="guard-basic-info">
                        <h3>{job.hiredUserId.firstName} {job.hiredUserId.lastName}</h3>
                        <p className="guard-position">{job.title || 'Security Guard'}</p>
                        <p className="guard-property">{job.propertyId?.address || job.propertyId?.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="guard-details">
                      <div className="detail-section">
                        <h4>Contact Information</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Email:</span>
                            <span className="value">{job.hiredUserId.email}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Phone:</span>
                            <span className="value">{job.hiredUserId.phoneNumber || 'Not provided'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Address:</span>
                            <span className="value">{job.hiredUserId.address || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="detail-section">
                        <h4>Professional Information</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Experience:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.experience || job.hiredUserId.experience || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">License:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.license || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Certifications:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.certifications || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Skills:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.skills || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Availability:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.availability || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Previous Work:</span>
                            <span className="value">{job.hiredGuardApplication?.details?.previousWork || 'Not specified'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="detail-section">
                        <h4>Job Details</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Salary:</span>
                            <span className="value">{job.requirements?.salary || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Working Hours:</span>
                            <span className="value">{job.requirements?.workingHours || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Hired Date:</span>
                            <span className="value">{job.hiredGuardApplication?.decisionAt ? new Date(job.hiredGuardApplication.decisionAt).toLocaleDateString() : 'Not available'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="guard-actions">
                      <button className="btn btn-primary" onClick={() => handleMessageGuard(job.hiredUserId._id)}>
                        <i className="icon-message"></i> Message
                      </button>
                      <button className="btn btn-danger" onClick={() => handleFireGuard(job._id)}>
                        <i className="icon-fire"></i> Fire Guard
                      </button>
                    </div>
                  </div>
                ))
              }
              {jobPosts.filter(job => job.status === 'Filled').length === 0 && (
                <div className="empty-state">
                  <p>No security guards hired yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showCreateJobModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create Security Guard Job Post</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateJobModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={createJobPost} className="modal-body">
              <div className="form-group">
                <label>Property:</label>
                <select 
                  value={newJobPost.propertyId}
                  onChange={(e) => setNewJobPost({...newJobPost, propertyId: e.target.value})}
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property._id} value={property._id}>
                      {property.address}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Job Title:</label>
                <input 
                  type="text"
                  value={newJobPost.title}
                  onChange={(e) => setNewJobPost({...newJobPost, title: e.target.value})}
                  placeholder="e.g., Night Security Guard, Residential Security Officer"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Location (Optional):</label>
                <input 
                  type="text"
                  value={newJobPost.location}
                  onChange={(e) => setNewJobPost({...newJobPost, location: e.target.value})}
                  placeholder="Specific location details (will use property address if empty)"
                />
              </div>
              
              <div className="form-group">
                <label>Job Description:</label>
                <textarea 
                  value={newJobPost.requirements.description}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, description: e.target.value}})}
                  rows="3"
                  placeholder="Brief description of the security guard position..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Duties:</label>
                <textarea 
                  value={newJobPost.requirements.duties}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, duties: e.target.value}})}
                  rows="3"
                  placeholder="Main responsibilities and duties..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Working Hours:</label>
                <input 
                  type="text"
                  value={newJobPost.requirements.workingHours}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, workingHours: e.target.value}})}
                  placeholder="e.g., 8 PM - 6 AM, Monday to Friday"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Required Skills (Optional):</label>
                <input 
                  type="text"
                  value={newJobPost.requirements.skills}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, skills: e.target.value}})}
                  placeholder="e.g., Physical fitness, Communication skills"
                />
              </div>
              
              <div className="form-group">
                <label>Experience Required (Optional):</label>
                <input 
                  type="text"
                  value={newJobPost.requirements.experience}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, experience: e.target.value}})}
                  placeholder="e.g., Minimum 2 years in security"
                />
              </div>
              
              <div className="form-group">
                <label>Salary (Optional):</label>
                <input 
                  type="text"
                  value={newJobPost.requirements.salary}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, salary: e.target.value}})}
                  placeholder="e.g., $15/hour, $3000/month"
                />
              </div>
              
              <div className="form-group">
                <label>Documents Required (Optional):</label>
                <input 
                  type="text"
                  value={newJobPost.requirements.documentsRequired}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: {...newJobPost.requirements, documentsRequired: e.target.value}})}
                  placeholder="e.g., Security license, Background check"
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateJobModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Job Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applications Modal */}
      {showApplicationsModal && selectedJobPost && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>Applications for {selectedJobPost.title || 'Security Guard Position'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowApplicationsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <p>No applications received yet.</p>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map(application => (
                    <div key={application._id} className="application-card">
                      <div className="applicant-info">
                        <h3>{application.guardId?.firstName} {application.guardId?.lastName}</h3>
                        <p><strong>Email:</strong> {application.guardId?.email}</p>
                        <p><strong>Experience:</strong> {application.details?.experience || 'Not specified'}</p>
                        <p><strong>Applied:</strong> {new Date(application.submittedAt).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> <span className={`status ${application.status.toLowerCase()}`}>{application.status}</span></p>
                      </div>
                      
                      <div className="application-details">
                        <h4>Application Details:</h4>
                        <div className="details-grid">
                          <p><strong>Availability:</strong> {application.details?.availability || 'Not specified'}</p>
                          <p><strong>License:</strong> {application.details?.license || 'Not specified'}</p>
                          <p><strong>Certifications:</strong> {application.details?.certifications || 'Not specified'}</p>
                          <p><strong>Previous Work:</strong> {application.details?.previousWork || 'Not specified'}</p>
                          <p><strong>Skills:</strong> {application.details?.skills || 'Not specified'}</p>
                          {application.details?.coverLetter && (
                            <p><strong>Cover Letter:</strong> {application.details.coverLetter}</p>
                          )}
                        </div>
                        
                        {(application.documents?.idDocument || application.documents?.licenseDocument || application.documents?.resume) && (
                          <div className="documents">
                            <h4>Documents:</h4>
                            <div className="document-links">
                              {application.documents.idDocument && (
                                <a href={`${apiConfig.baseUrl}/api/images/${application.documents.idDocument}`} target="_blank" rel="noopener noreferrer">
                                  ID Document
                                </a>
                              )}
                              {application.documents.licenseDocument && (
                                <a href={`${apiConfig.baseUrl}/api/images/${application.documents.licenseDocument}`} target="_blank" rel="noopener noreferrer">
                                  License Document
                                </a>
                              )}
                              {application.documents.resume && (
                                <a href={`${apiConfig.baseUrl}/api/images/${application.documents.resume}`} target="_blank" rel="noopener noreferrer">
                                  Resume
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {(application.status === 'Applied' || application.status === 'Reviewed') && (
                        <div className="application-actions">
                          <button 
                            className="btn btn-success"
                            onClick={() => handleHireGuard(selectedJobPost._id, application._id)}
                            disabled={loading}
                          >
                            Hire
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleRejectApplication(application._id)}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityGuardInfo;