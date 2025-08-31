import React, { useState, useEffect } from 'react';
import apiConfig from '../../config/api';
import './SecurityGuardInfo.css';

const TenantSecurityGuardInfo = () => {
  const [assignedGuards, setAssignedGuards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchAssignedGuards();
  }, []);

  const fetchAssignedGuards = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAuthToken();
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.tenantAssignedGuards}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setAssignedGuards(data.assignedGuards || []);
      } else {
        setError(data.message || 'Failed to fetch assigned guards');
      }
    } catch (err) {
      console.error('Error fetching assigned guards:', err);
      setError('Failed to load assigned guards');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="security-guard-info">
        <h2 className="section-title">Security Guard Information</h2>
        <div className="loading-message">Loading assigned guards...</div>
      </div>
    );
  }

  return (
    <div className="security-guard-info">
      <h2 className="section-title">Security Guard Information</h2>
      
      {error && <div className="error-message">{error}</div>}

      <div className="tab-content">
        <div className="security-guards-container">
          <h3>Assigned Security Guards</h3>
          
          {assignedGuards.length === 0 ? (
            <div className="no-guards-message">
              <p>No security guards are currently assigned to your properties.</p>
            </div>
          ) : (
            <div className="security-guards-grid">
              {assignedGuards.map((guardAssignment) => (
                <div key={`${guardAssignment.jobPost._id}-${guardAssignment.guard._id}`} className="security-guard-card">
                  <div className="guard-image">
                    <img 
                      src={guardAssignment.guard.profilePicture || '/default-avatar.png'} 
                      alt={`${guardAssignment.guard.firstName} ${guardAssignment.guard.lastName}`}
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  <div className="guard-info">
                    <h4 className="guard-name">
                      {guardAssignment.guard.firstName} {guardAssignment.guard.lastName}
                    </h4>
                    
                    {/* Basic Contact Information */}
                    <div className="info-section">
                      <h5>Contact Information</h5>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Email:</span>
                          <span className="value">{guardAssignment.guard.email}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Phone:</span>
                          <span className="value">{guardAssignment.guard.phoneNumber || 'Not provided'}</span>
                        </div>
                        {guardAssignment.guard.emergencyContact && (
                          <div className="detail-item">
                            <span className="label">Emergency Contact:</span>
                            <span className="value">{guardAssignment.guard.emergencyContact}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="info-section">
                      <h5>Professional Details</h5>
                      <div className="detail-grid">
                        {guardAssignment.guard.experience && (
                          <div className="detail-item">
                            <span className="label">Experience:</span>
                            <span className="value">{guardAssignment.guard.experience}</span>
                          </div>
                        )}
                        {guardAssignment.guard.certifications && (
                          <div className="detail-item">
                            <span className="label">Certifications:</span>
                            <span className="value">{guardAssignment.guard.certifications}</span>
                          </div>
                        )}
                        {guardAssignment.guard.specialSkills && (
                          <div className="detail-item">
                            <span className="label">Special Skills:</span>
                            <span className="value">{guardAssignment.guard.specialSkills}</span>
                          </div>
                        )}
                        {guardAssignment.guard.availability && (
                          <div className="detail-item">
                            <span className="label">Availability:</span>
                            <span className="value">{guardAssignment.guard.availability}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Property Information */}
                    <div className="info-section">
                      <h5>Property Assignment</h5>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Property:</span>
                          <span className="value">{guardAssignment.property.address}</span>
                        </div>
                        {guardAssignment.property.propertyType && (
                          <div className="detail-item">
                            <span className="label">Property Type:</span>
                            <span className="value">{guardAssignment.property.propertyType}</span>
                          </div>
                        )}
                        {guardAssignment.property.specifications && (
                          <div className="detail-item">
                            <span className="label">Specifications:</span>
                            <span className="value">
                              {guardAssignment.property.specifications.bedrooms && `${guardAssignment.property.specifications.bedrooms} bed`}
                              {guardAssignment.property.specifications.bathrooms && `, ${guardAssignment.property.specifications.bathrooms} bath`}
                              {guardAssignment.property.specifications.squareFootage && `, ${guardAssignment.property.specifications.squareFootage} sqft`}
                            </span>
                          </div>
                        )}
                        {guardAssignment.property.location && (
                          <div className="detail-item">
                            <span className="label">Location Details:</span>
                            <span className="value">
                              {guardAssignment.property.location.city && guardAssignment.property.location.city}
                              {guardAssignment.property.location.state && `, ${guardAssignment.property.location.state}`}
                              {guardAssignment.property.location.zipCode && ` ${guardAssignment.property.location.zipCode}`}
                              {guardAssignment.property.location.country && `, ${guardAssignment.property.location.country}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="info-section">
                      <h5>Job Information</h5>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Position:</span>
                          <span className="value">{guardAssignment.jobPost.title}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Working Hours:</span>
                          <span className="value">{guardAssignment.jobPost.requirements?.workingHours || 'Not specified'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Salary:</span>
                          <span className="value">{guardAssignment.jobPost.requirements?.salary || 'Not specified'}</span>
                        </div>
                        {guardAssignment.jobDetails?.duties && (
                          <div className="detail-item">
                            <span className="label">Duties:</span>
                            <span className="value">{guardAssignment.jobDetails.duties}</span>
                          </div>
                        )}
                        {guardAssignment.jobDetails?.equipment && (
                          <div className="detail-item">
                            <span className="label">Equipment Provided:</span>
                            <span className="value">{guardAssignment.jobDetails.equipment}</span>
                          </div>
                        )}
                        {guardAssignment.jobDetails?.instructions && (
                          <div className="detail-item">
                            <span className="label">Special Instructions:</span>
                            <span className="value">{guardAssignment.jobDetails.instructions}</span>
                          </div>
                        )}
                        {guardAssignment.jobDetails?.emergencyContacts && (
                          <div className="detail-item">
                            <span className="label">Emergency Contacts:</span>
                            <span className="value">{guardAssignment.jobDetails.emergencyContacts}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Information */}
                    <div className="info-section">
                      <h5>Timeline</h5>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Hired Date:</span>
                          <span className="value">{guardAssignment.hiredDate ? formatDate(guardAssignment.hiredDate) : formatDate(guardAssignment.jobPost.updatedAt)}</span>
                        </div>
                        {guardAssignment.startDate && (
                          <div className="detail-item">
                            <span className="label">Start Date:</span>
                            <span className="value">{formatDate(guardAssignment.startDate)}</span>
                          </div>
                        )}
                        {guardAssignment.endDate && (
                          <div className="detail-item">
                            <span className="label">End Date:</span>
                            <span className="value">{formatDate(guardAssignment.endDate)}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="label">Status:</span>
                          <span className={`value status-${guardAssignment.status?.toLowerCase() || 'active'}`}>
                            {guardAssignment.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Information */}
                    {guardAssignment.owner && (
                      <div className="info-section">
                        <h5>Property Owner</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Name:</span>
                            <span className="value">{guardAssignment.owner.name || `${guardAssignment.owner.firstName || ''} ${guardAssignment.owner.lastName || ''}`.trim()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Email:</span>
                            <span className="value">{guardAssignment.owner.email}</span>
                          </div>
                          {guardAssignment.owner.phoneNumber && (
                            <div className="detail-item">
                              <span className="label">Phone:</span>
                              <span className="value">{guardAssignment.owner.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="guard-actions-readonly">
                      <div className="contact-info">
                        <p><strong>Security Contact:</strong></p>
                        <p>For any security concerns or emergencies, contact this guard using the information provided above. For non-urgent matters, you may also contact the property owner.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantSecurityGuardInfo;