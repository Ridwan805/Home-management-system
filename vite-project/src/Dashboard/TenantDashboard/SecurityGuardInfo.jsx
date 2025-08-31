import React, { useState, useEffect } from 'react';
import apiConfig from '../../config/api';
import './SecurityGuardInfo.css';

const SecurityGuardInfo = () => {
  const [activeTab, setActiveTab] = useState('post-job');
  const [jobPosts, setJobPosts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedJobPost, setSelectedJobPost] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Job posting form state
  const [jobForm, setJobForm] = useState({
    propertyId: '',
    title: '',
    description: '',
    duties: '',
    skills: '',
    workingHours: '',
    documentsRequired: '',
    salary: '',
    experience: ''
  });

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch (e) {
      return null;
    }
  };

  // Using API configuration instead of hardcoded URL

  useEffect(() => {
    fetchProperties();
    fetchJobPosts();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.userProperties), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.jobPosts), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setJobPosts(data || []);
      } else {
        setError(data.message || 'Failed to fetch job posts');
      }
    } catch (error) {
      setError('Error fetching job posts');
    } finally {
      setLoading(false);
    }
  };

  const handleJobFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const token = getAuthToken();
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.jobPosts), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          propertyId: jobForm.propertyId,
          jobType: 'SecurityGuard',
          title: jobForm.title,
          requirements: {
            description: jobForm.description,
            duties: jobForm.duties,
            skills: jobForm.skills,
            workingHours: jobForm.workingHours,
            documentsRequired: jobForm.documentsRequired,
            salary: jobForm.salary,
            experience: jobForm.experience
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Job posted successfully!');
        setJobForm({
          propertyId: '',
          title: '',
          description: '',
          duties: '',
          skills: '',
          workingHours: '',
          documentsRequired: '',
          salary: '',
          experience: ''
        });
        fetchJobPosts();
      } else {
        setError(data.message || 'Failed to post job');
      }
    } catch (error) {
      setError('Error posting job');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobPostId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(apiConfig.getUrl(`api/job-posts/${jobPostId}/applications`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleViewApplications = (jobPost) => {
    setSelectedJobPost(jobPost);
    fetchApplications(jobPost._id);
    setActiveTab('applications');
  };

  const handleHireGuard = async (applicationId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(apiConfig.getUrl('api/job-posts/hire'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          jobPostId: selectedJobPost._id,
          applicationId 
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Guard hired successfully!');
        fetchJobPosts();
        fetchApplications(selectedJobPost._id);
        setShowApplicationModal(false);
      } else {
        setError(data.message || 'Failed to hire guard');
      }
    } catch (error) {
      setError('Error hiring guard');
    }
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="security-guard-info">
      <h2 className="section-title">Security Guard Management</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'post-job' ? 'active' : ''}`}
          onClick={() => setActiveTab('post-job')}
        >
          Post New Job
        </button>
        <button 
          className={`tab-btn ${activeTab === 'manage-jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-jobs')}
        >
          Manage Jobs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
      </div>

      {activeTab === 'post-job' && (
        <div className="tab-content">
          <div className="job-post-form-container">
            <h3>Post Security Guard Job</h3>
            <form onSubmit={handleJobFormSubmit} className="job-post-form">
              <div className="form-group">
                <label htmlFor="propertyId">Select Property *</label>
                <select
                  id="propertyId"
                  value={jobForm.propertyId}
                  onChange={(e) => setJobForm({...jobForm, propertyId: e.target.value})}
                  required
                >
                  <option value="">Choose a property...</option>
                  {properties.map(property => (
                    <option key={property._id} value={property._id}>
                      {property.address}, {property.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">Job Title *</label>
                <input
                  type="text"
                  id="title"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                  placeholder="e.g., Night Security Guard"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Job Description *</label>
                <textarea
                  id="description"
                  value={jobForm.description}
                  onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                  placeholder="Describe the security guard position..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="duties">Key Duties *</label>
                  <textarea
                    id="duties"
                    value={jobForm.duties}
                    onChange={(e) => setJobForm({...jobForm, duties: e.target.value})}
                    placeholder="List main responsibilities..."
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="skills">Required Skills *</label>
                  <textarea
                    id="skills"
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({...jobForm, skills: e.target.value})}
                    placeholder="List required skills and qualifications..."
                    rows="3"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="workingHours">Working Hours *</label>
                  <input
                    type="text"
                    id="workingHours"
                    value={jobForm.workingHours}
                    onChange={(e) => setJobForm({...jobForm, workingHours: e.target.value})}
                    placeholder="e.g., 10 PM - 6 AM, Monday-Friday"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="salary">Salary/Rate *</label>
                  <input
                    type="text"
                    id="salary"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({...jobForm, salary: e.target.value})}
                    placeholder="e.g., $15/hour or $2500/month"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="experience">Experience Required</label>
                  <input
                    type="text"
                    id="experience"
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({...jobForm, experience: e.target.value})}
                    placeholder="e.g., 2+ years in security"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="documentsRequired">Required Documents</label>
                  <input
                    type="text"
                    id="documentsRequired"
                    value={jobForm.documentsRequired}
                    onChange={(e) => setJobForm({...jobForm, documentsRequired: e.target.value})}
                    placeholder="e.g., Security license, ID, Background check"
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'manage-jobs' && (
        <div className="tab-content">
          <h3>Your Job Posts</h3>
          {loading ? (
            <div className="loading">Loading job posts...</div>
          ) : jobPosts.length === 0 ? (
            <div className="no-jobs">
              <p>No job posts yet. Create your first security guard job posting!</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {jobPosts.map(job => (
                <div key={job._id} className="job-card">
                  <div className="job-header">
                    <h4>{job.title}</h4>
                    <span className={`status-badge ${job.status.toLowerCase()}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="job-property">
                    <strong>Property:</strong> {job.propertyId?.address || 'Property details not available'}
                  </p>
                  <p className="job-description">{job.requirements?.description}</p>
                  <div className="job-details">
                    <span><strong>Salary:</strong> {job.requirements?.salary}</span>
                    <span><strong>Hours:</strong> {job.requirements?.workingHours}</span>
                  </div>
                  <div className="job-stats">
                    <span>Applications: {job.applications?.length || 0}</span>
                    <span>Posted: {formatDate(job.createdAt)}</span>
                  </div>
                  <div className="job-actions">
                    <button 
                      className="view-applications-btn"
                      onClick={() => handleViewApplications(job)}
                    >
                      View Applications ({job.applications?.length || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'applications' && selectedJobPost && (
        <div className="tab-content">
          <div className="applications-header">
            <h3>Applications for: {selectedJobPost.title}</h3>
            <button 
              className="back-btn"
              onClick={() => setActiveTab('manage-jobs')}
            >
              ← Back to Jobs
            </button>
          </div>
          
          {applications.length === 0 ? (
            <div className="no-applications">
              <p>No applications received yet for this job.</p>
            </div>
          ) : (
            <div className="applications-list">
              {applications.map(application => (
                <div key={application._id} className="application-card">
                  <div className="application-header">
                    <div className="applicant-info">
                      <h4>{application.guardId?.firstName} {application.guardId?.lastName}</h4>
                      <span className={`status-badge ${application.status.toLowerCase()}`}>
                        {application.status}
                      </span>
                    </div>
                    <div className="application-date">
                      Applied: {formatDate(application.submittedAt)}
                    </div>
                  </div>
                  
                  <div className="application-details">
                    <p><strong>Email:</strong> {application.guardId?.email}</p>
                    <p><strong>Phone:</strong> {application.guardId?.phoneNumber || 'Not provided'}</p>
                    <p><strong>Experience:</strong> {application.details?.experience || 'Not specified'}</p>
                    <p><strong>License:</strong> {application.details?.license || 'Not specified'}</p>
                  </div>
                  
                  <div className="application-actions">
                    <button 
                      className="view-details-btn"
                      onClick={() => handleViewApplication(application)}
                    >
                      View Full Application
                    </button>
                    {application.status === 'Applied' && selectedJobPost.status === 'Open' && (
                      <button 
                        className="hire-btn"
                        onClick={() => handleHireGuard(application._id)}
                      >
                        Hire This Guard
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="modal-overlay" onClick={() => setShowApplicationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Application Details</h3>
              <button 
                className="close-btn"
                onClick={() => setShowApplicationModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="applicant-profile">
                <h4>{selectedApplication.guardId?.firstName} {selectedApplication.guardId?.lastName}</h4>
                <p><strong>Email:</strong> {selectedApplication.guardId?.email}</p>
                <p><strong>Phone:</strong> {selectedApplication.guardId?.phoneNumber || 'Not provided'}</p>
                <p><strong>Status:</strong> 
                  <span className={`status-badge ${selectedApplication.status.toLowerCase()}`}>
                    {selectedApplication.status}
                  </span>
                </p>
              </div>
              
              <div className="application-details-full">
                <h5>Application Details</h5>
                <p><strong>Experience:</strong> {selectedApplication.details?.experience || 'Not specified'}</p>
                <p><strong>License:</strong> {selectedApplication.details?.license || 'Not specified'}</p>
                <p><strong>Certifications:</strong> {selectedApplication.details?.certifications || 'None specified'}</p>
                <p><strong>Availability:</strong> {selectedApplication.details?.availability || 'Not specified'}</p>
                <p><strong>Previous Work:</strong> {selectedApplication.details?.previousWork || 'Not specified'}</p>
                <p><strong>Skills:</strong> {selectedApplication.details?.skills || 'Not specified'}</p>
                {selectedApplication.details?.coverLetter && (
                  <div>
                    <strong>Cover Letter:</strong>
                    <p className="cover-letter">{selectedApplication.details.coverLetter}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                {selectedApplication.status === 'Applied' && selectedJobPost.status === 'Open' && (
                  <button 
                    className="hire-btn"
                    onClick={() => handleHireGuard(selectedApplication._id)}
                  >
                    Hire This Guard
                  </button>
                )}
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityGuardInfo;