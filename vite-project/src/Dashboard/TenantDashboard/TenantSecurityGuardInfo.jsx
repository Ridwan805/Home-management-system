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
                    <p className="guard-contact">
                      <strong>Email:</strong> {guardAssignment.guard.email}
                    </p>
                    <p className="guard-contact">
                      <strong>Phone:</strong> {guardAssignment.guard.phoneNumber || 'Not provided'}
                    </p>
                    <p className="guard-property">
                      <strong>Property:</strong> {guardAssignment.property.address}
                    </p>
                    <p className="guard-position">
                      <strong>Position:</strong> {guardAssignment.jobPost.title}
                    </p>
                    <p className="guard-hours">
                      <strong>Working Hours:</strong> {guardAssignment.jobPost.requirements.workingHours}
                    </p>
                    <p className="guard-salary">
                      <strong>Salary:</strong> {guardAssignment.jobPost.requirements.salary}
                    </p>
                    <p className="guard-hired-date">
                      <strong>Hired:</strong> {formatDate(guardAssignment.jobPost.updatedAt)}
                    </p>
                    
                    <div className="guard-actions-readonly">
                      <div className="contact-info">
                        <p><strong>Contact Information:</strong></p>
                        <p>For any security concerns or to contact this guard, please use the provided email or phone number above.</p>
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