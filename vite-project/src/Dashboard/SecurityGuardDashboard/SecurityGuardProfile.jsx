import React, { useState, useEffect } from 'react';
import './SecurityGuardProfile.css';
import apiConfig from '../../config/api';

const SecurityGuardProfile = () => {
  const [user, setUser] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', name: '', phoneNumber: '', address: '', experience: '',
    emergencyContact: '', certifications: '', specialSkills: '', availability: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const saved = localStorage.getItem('dwellSyncUser');
        if (!saved) throw new Error("User not logged in");
        const token = JSON.parse(saved).token;

        // Fetch user data
        const userRes = await fetch(apiConfig.getUrl(apiConfig.endpoints.profile), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userRes.ok) throw new Error('Failed to fetch user data');

        const userData = await userRes.json();
        setUser(userData);
        setFormData({ ...userData });

        // Fetch current job data
        try {
          const jobRes = await fetch(apiConfig.getUrl(apiConfig.endpoints.guardCurrentJob), {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (jobRes.ok) {
            const jobData = await jobRes.json();
            if (jobData.success) {
              setCurrentJob(jobData.data);
            }
          }
        } catch (jobErr) {
  
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser')).token;

      const res = await fetch(apiConfig.getUrl('api/auth/update'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update profile');

      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="security-guard-profile">
      <h2 className="section-title">Security Guard Profile</h2>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Personal Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'job' ? 'active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          Current Job
        </button>
        <button 
          className={`tab-btn ${activeTab === 'professional' ? 'active' : ''}`}
          onClick={() => setActiveTab('professional')}
        >
          Professional Details
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          {!isEditing ? (
            <div className="profile-info">
              <div className="profile-header">
                <div className="profile-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
                <div>
                  <h3 className="profile-name">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}</h3>
                  <p className="profile-role">{user.role}</p>
                  <p className="profile-status">{currentJob ? 'Currently Employed' : 'Available for Work'}</p>
                </div>
              </div>

              <div className="profile-details">
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item"><span className="detail-label">Email:</span><span className="detail-value">{user.email}</span></div>
                  <div className="detail-item"><span className="detail-label">Phone:</span><span className="detail-value">{user.phoneNumber || 'Not provided'}</span></div>
                  <div className="detail-item"><span className="detail-label">Address:</span><span className="detail-value">{user.address || 'Not provided'}</span></div>
                  <div className="detail-item"><span className="detail-label">Emergency Contact:</span><span className="detail-value">{user.emergencyContact || 'Not provided'}</span></div>
                </div>
              </div>

              <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
            </div>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <h4>Basic Information</h4>
                {['firstName', 'lastName', 'email', 'name', 'phoneNumber', 'address'].map(field => (
                  <div className="form-group" key={field}>
                    <label htmlFor={field}>
                      {field === 'firstName' ? 'First Name' :
                       field === 'lastName' ? 'Last Name' :
                       field === 'phoneNumber' ? 'Phone Number' :
                       field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      id={field}
                      name={field}
                      type={field === 'email' ? 'email' : 'text'}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      required={['email', 'name'].includes(field)}
                    />
                  </div>
                ))}
                
                <div className="form-group">
                  <label htmlFor="emergencyContact">Emergency Contact</label>
                  <input
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    value={formData.emergencyContact || ''}
                    onChange={handleChange}
                    placeholder="Emergency contact name and phone"
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Professional Information</h4>
                <div className="form-group">
                  <label htmlFor="experience">Experience</label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formData.experience || ''}
                    onChange={handleChange}
                    placeholder="Describe your security experience..."
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="certifications">Certifications</label>
                  <textarea
                    id="certifications"
                    name="certifications"
                    value={formData.certifications || ''}
                    onChange={handleChange}
                    placeholder="List your security certifications..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="specialSkills">Special Skills</label>
                  <textarea
                    id="specialSkills"
                    name="specialSkills"
                    value={formData.specialSkills || ''}
                    onChange={handleChange}
                    placeholder="List any special skills or training..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="availability">Availability</label>
                  <input
                    id="availability"
                    name="availability"
                    type="text"
                    value={formData.availability || ''}
                    onChange={handleChange}
                    placeholder="e.g., Full-time, Part-time, Weekends only"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Current Job Tab */}
      {activeTab === 'job' && (
        <div className="tab-content">
          {currentJob ? (
            <div className="job-details">
              <div className="job-header">
                <h3>Current Assignment</h3>
                <span className="job-status active">Active</span>
              </div>
              
              <div className="job-info">
                <div className="info-section">
                  <h4>Property Information</h4>
                  <div className="detail-item"><span className="detail-label">Property:</span><span className="detail-value">{currentJob.property?.name || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Address:</span><span className="detail-value">{currentJob.property?.address || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Property Type:</span><span className="detail-value">{currentJob.property?.propertyType || 'N/A'}</span></div>
                </div>
                
                <div className="info-section">
                  <h4>Job Details</h4>
                  <div className="detail-item"><span className="detail-label">Position:</span><span className="detail-value">{currentJob.jobPost?.title || 'Security Guard'}</span></div>
                  <div className="detail-item"><span className="detail-label">Start Date:</span><span className="detail-value">{formatDate(currentJob.startDate)}</span></div>
                  <div className="detail-item"><span className="detail-label">Working Hours:</span><span className="detail-value">{currentJob.jobPost?.requirements?.workingHours || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Salary:</span><span className="detail-value">{currentJob.jobPost?.requirements?.salary || 'N/A'}</span></div>
                </div>
                
                <div className="info-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item"><span className="detail-label">Property Owner:</span><span className="detail-value">{currentJob.owner?.firstName} {currentJob.owner?.lastName}</span></div>
                  <div className="detail-item"><span className="detail-label">Owner Email:</span><span className="detail-value">{currentJob.owner?.email}</span></div>
                  {currentJob.tenant && (
                    <>
                      <div className="detail-item"><span className="detail-label">Tenant:</span><span className="detail-value">{currentJob.tenant?.firstName} {currentJob.tenant?.lastName}</span></div>
                      <div className="detail-item"><span className="detail-label">Tenant Email:</span><span className="detail-value">{currentJob.tenant?.email}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-job-message">
              <div className="no-job-icon">📋</div>
              <h3>No Current Assignment</h3>
              <p>You are not currently assigned to any security job.</p>
              <p>Check the "Looking for Job" section to find available positions.</p>
            </div>
          )}
        </div>
      )}

      {/* Professional Details Tab */}
      {activeTab === 'professional' && (
        <div className="tab-content">
          <div className="professional-details">
            <div className="detail-section">
              <h4>Experience & Background</h4>
              <div className="detail-item"><span className="detail-label">Experience:</span><span className="detail-value">{user.experience || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Certifications:</span><span className="detail-value">{user.certifications || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Special Skills:</span><span className="detail-value">{user.specialSkills || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Availability:</span><span className="detail-value">{user.availability || 'Not provided'}</span></div>
            </div>
            
            <div className="detail-section">
              <h4>Employment Status</h4>
              <div className="detail-item">
                <span className="detail-label">Current Status:</span>
                <span className={`detail-value status ${currentJob ? 'employed' : 'available'}`}>
                  {currentJob ? 'Currently Employed' : 'Available for Work'}
                </span>
              </div>
              {currentJob && (
                <div className="detail-item">
                  <span className="detail-label">Employed Since:</span>
                  <span className="detail-value">{formatDate(currentJob.startDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityGuardProfile;