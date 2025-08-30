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
    requirements: '',
    location: ''
  });

  useEffect(() => {
    fetchJobPosts();
    fetchProperties();
  }, []);

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      const data = await authenticatedFetch(apiConfig.getUrl('/api/job-posts/owner'));
      setJobPosts(data.jobPosts || []);
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
      const data = await authenticatedFetch(apiConfig.getUrl(`/api/security-guard-applications/job/${jobPostId}`));
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
    console.log('Creating job post with data:', newJobPost);
    
    // Validate required fields
    if (!newJobPost.propertyId || !newJobPost.title || !newJobPost.requirements) {
      toast.error('Please fill in all required fields');
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
        requirements: '',
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
      const data = await authenticatedFetch(apiConfig.getUrl(apiConfig.endpoints.hireGuard(selectedJobPost._id, applicationId)), {
        method: 'POST',
        body: JSON.stringify({ applicationId })
      });
      
      toast.success('Security guard hired successfully!');
      setShowApplicationsModal(false);
      fetchJobPosts();
    } catch (error) {
      console.error('Error hiring guard:', error);
      toast.error('Failed to hire security guard');
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
                      <p>{job.requirements}</p>
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
                .filter(job => job.status === 'filled' && job.hiredGuard)
                .map(job => (
                  <div key={job._id} className="hired-guard-card">
                    <div className="guard-info">
                      <h3>{job.hiredGuard.name}</h3>
                      <p><strong>Email:</strong> {job.hiredGuard.email}</p>
                      <p><strong>Phone:</strong> {job.hiredGuard.phone}</p>
                      <p><strong>Property:</strong> {job.property?.address}</p>
                      <p><strong>Job Type:</strong> {job.jobType}</p>
                      <p><strong>Hired Date:</strong> {new Date(job.hiredAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              }
              {jobPosts.filter(job => job.status === 'filled').length === 0 && (
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
                <label>Requirements:</label>
                <textarea 
                  value={newJobPost.requirements}
                  onChange={(e) => setNewJobPost({...newJobPost, requirements: e.target.value})}
                  rows="4"
                  placeholder="e.g., Minimum 2 years experience, Physical fitness, Clean background check..."
                  required
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
                        <h3>{application.guard.name}</h3>
                        <p><strong>Email:</strong> {application.guard.email}</p>
                        <p><strong>Phone:</strong> {application.guard.phone}</p>
                        <p><strong>Experience:</strong> {application.guard.experience || 'Not specified'}</p>
                        <p><strong>Applied:</strong> {new Date(application.submittedAt).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="application-details">
                        <h4>Application Details:</h4>
                        <p>{application.details}</p>
                        
                        {application.documents && application.documents.length > 0 && (
                          <div className="documents">
                            <h4>Documents:</h4>
                            {application.documents.map((doc, index) => (
                              <a key={index} href={`http://localhost:5001${doc}`} target="_blank" rel="noopener noreferrer">
                                Document {index + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="application-status">
                        <span className={`status ${application.status}`}>
                          {application.status}
                        </span>
                      </div>
                      
                      {application.status === 'pending' && (
                        <div className="application-actions">
                          <button 
                            className="btn btn-success"
                            onClick={() => hireGuard(application._id)}
                          >
                            Hire
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => updateApplicationStatus(application._id, 'rejected')}
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