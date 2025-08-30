import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import apiConfig from '../../config/api';
import './LookingForJob.css';

const LookingForJob = () => {
  const { user } = useContext(AuthContext);
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    experience: user?.experience || '',
    license: '',
    certifications: '',
    availability: '',
    previousWork: '',
    skills: '',
    coverLetter: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState([]);

  // Fetch available job posts
  const fetchJobPosts = async () => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        setError('Please log in to view available jobs');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      if (!token) {
        setError('Please log in to view available jobs');
        setLoading(false);
        return;
      }

      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.jobPosts), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for Security Guard jobs that are Open
        const securityGuardJobs = data.filter(job => 
          job.jobType === 'SecurityGuard' && job.status === 'Open'
        );
        setJobPosts(securityGuardJobs);
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (response.status === 403) {
          setError('You do not have permission to view job posts.');
        } else {
          setError(errorData.message || 'Failed to fetch job posts');
        }
      }
    } catch (err) {
      setError('Error connecting to server. Please check your internet connection.');
      console.error('Error fetching job posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch my applications
  const fetchMyApplications = async () => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const token = user.token;
      if (!token) return;
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.guardApplications), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyApplications(data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  useEffect(() => {
    fetchJobPosts();
    fetchMyApplications();
  }, []);

  // Handle application submission
  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        alert('Please log in to apply for jobs');
        setSubmitting(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      if (!token) {
        alert('Please log in to apply for jobs');
        setSubmitting(false);
        return;
      }
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.applyForJob), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobPostId: selectedJob._id,
          details: applicationData
        })
      });

      if (response.ok) {
        setShowApplicationModal(false);
        setSelectedJob(null);
        setApplicationData({
          experience: user?.experience || '',
          license: '',
          certifications: '',
          availability: '',
          previousWork: '',
          skills: '',
          coverLetter: ''
        });
        // Refresh applications
        fetchMyApplications();
        alert('Application submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to submit application');
      }
    } catch (err) {
      alert('Error submitting application');
      console.error('Error submitting application:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if user has already applied for a job
  const hasApplied = (jobId) => {
    return myApplications.some(app => app.jobPostId === jobId);
  };

  // Get application status for a job
  const getApplicationStatus = (jobId) => {
    const application = myApplications.find(app => app.jobPostId === jobId);
    return application ? application.status : null;
  };

  if (loading) {
    return (
      <div className="looking-for-job">
        <div className="loading">Loading available jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="looking-for-job">
        <div className="page-header">
          <h1>Available Security Guard Positions</h1>
          <p>Browse and apply for security guard jobs at various properties</p>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
          <button 
            className="retry-btn"
            onClick={() => {
              setError('');
              setLoading(true);
              fetchJobPosts();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="looking-for-job">
      <div className="page-header">
        <h1>Available Security Guard Positions</h1>
        <p>Browse and apply for security guard jobs at various properties</p>
      </div>

      {jobPosts.length === 0 ? (
        <div className="no-jobs">
          <div className="no-jobs-icon">🔍</div>
          <h3>No Jobs Available</h3>
          <p>There are currently no open security guard positions. Please check back later.</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobPosts.map(job => {
            const applied = hasApplied(job._id);
            const status = getApplicationStatus(job._id);
            
            return (
              <div key={job._id} className="job-card">
                <div className="job-header">
                  <h3 className="job-title">{job.title}</h3>
                  <div className="job-location">{job.location}</div>
                </div>
                
                <div className="job-details">
                  <div className="job-description">
                    <h4>Description</h4>
                    <p>{job.requirements.description}</p>
                  </div>
                  
                  <div className="job-requirements">
                    <h4>Requirements</h4>
                    <div className="requirement-item">
                      <strong>Duties:</strong> {job.requirements.duties}
                    </div>
                    <div className="requirement-item">
                      <strong>Skills:</strong> {job.requirements.skills}
                    </div>
                    <div className="requirement-item">
                      <strong>Working Hours:</strong> {job.requirements.workingHours}
                    </div>
                    <div className="requirement-item">
                      <strong>Experience Required:</strong> {job.requirements.experience}
                    </div>
                    {job.requirements.salary && (
                      <div className="requirement-item">
                        <strong>Salary:</strong> {job.requirements.salary}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="job-footer">
                  <div className="job-meta">
                    <span className="applications-count">
                      {job.applications.length} application(s)
                    </span>
                    <span className="posted-date">
                      Posted: {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="job-actions">
                    {applied ? (
                      <div className="application-status">
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </div>
                    ) : (
                      <button 
                        className="apply-btn"
                        onClick={() => {
                          setSelectedJob(job);
                          setShowApplicationModal(true);
                        }}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedJob && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Apply for {selectedJob.title}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedJob(null);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleApply} className="application-form">
              <div className="form-group">
                <label>Experience *</label>
                <textarea
                  value={applicationData.experience}
                  onChange={(e) => setApplicationData({...applicationData, experience: e.target.value})}
                  placeholder="Describe your security guard experience..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>License</label>
                <input
                  type="text"
                  value={applicationData.license}
                  onChange={(e) => setApplicationData({...applicationData, license: e.target.value})}
                  placeholder="Security license number (if any)"
                />
              </div>
              
              <div className="form-group">
                <label>Certifications</label>
                <input
                  type="text"
                  value={applicationData.certifications}
                  onChange={(e) => setApplicationData({...applicationData, certifications: e.target.value})}
                  placeholder="Relevant certifications"
                />
              </div>
              
              <div className="form-group">
                <label>Availability *</label>
                <input
                  type="text"
                  value={applicationData.availability}
                  onChange={(e) => setApplicationData({...applicationData, availability: e.target.value})}
                  placeholder="Your availability (e.g., Full-time, Part-time, Weekends)"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Previous Work</label>
                <textarea
                  value={applicationData.previousWork}
                  onChange={(e) => setApplicationData({...applicationData, previousWork: e.target.value})}
                  placeholder="Previous work experience"
                />
              </div>
              
              <div className="form-group">
                <label>Skills</label>
                <input
                  type="text"
                  value={applicationData.skills}
                  onChange={(e) => setApplicationData({...applicationData, skills: e.target.value})}
                  placeholder="Relevant skills"
                />
              </div>
              
              <div className="form-group">
                <label>Cover Letter</label>
                <textarea
                  value={applicationData.coverLetter}
                  onChange={(e) => setApplicationData({...applicationData, coverLetter: e.target.value})}
                  placeholder="Why are you interested in this position?"
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookingForJob;