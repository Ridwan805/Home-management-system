import React, { useState, useEffect } from 'react';
import apiConfig from '../../config/api';
import './MyJob.css';

const MyJob = () => {
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get authentication token
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

  // Fetch current job assignment
  const fetchCurrentJob = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.guardCurrentJob), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentJob(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch current job');
      }
    } catch (error) {
      console.error('Error fetching current job:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentJob();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="my-job-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-job-container">
        <div className="error-message">
          <h3>Error Loading Job Details</h3>
          <p>{error}</p>
          <button onClick={fetchCurrentJob} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="my-job-container">
        <div className="no-job-message">
          <div className="no-job-icon">📋</div>
          <h3>No Current Job Assignment</h3>
          <p>You don't have any active job assignments at the moment.</p>
          <p>Check the "Looking for Job" section to find available positions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-job-container">
      <div className="job-header">
        <h2>My Current Job Assignment</h2>
        <span className={`job-status ${currentJob.status.toLowerCase()}`}>
          {currentJob.status}
        </span>
      </div>

      <div className="job-details-grid">
        {/* Job Information */}
        <div className="detail-card job-info-card">
          <h3>Job Information</h3>
          <div className="detail-item">
            <span className="label">Position:</span>
            <span className="value">{currentJob.title}</span>
          </div>
          <div className="detail-item">
            <span className="label">Description:</span>
            <span className="value">{currentJob.description || 'No description provided'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Salary:</span>
            <span className="value">{currentJob.salary}</span>
          </div>
          <div className="detail-item">
            <span className="label">Working Hours:</span>
            <span className="value">{currentJob.workingHours}</span>
          </div>
          <div className="detail-item">
            <span className="label">Hired Date:</span>
            <span className="value">{formatDate(currentJob.hiredDate)}</span>
          </div>
        </div>

        {/* Property Information */}
        <div className="detail-card property-info-card">
          <h3>Property Details</h3>
          <div className="detail-item">
            <span className="label">Address:</span>
            <span className="value">{currentJob.property?.address || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Property Type:</span>
            <span className="value">{currentJob.property?.propertyType || 'N/A'}</span>
          </div>
          {currentJob.property?.specifications && (
            <div className="detail-item">
              <span className="label">Specifications:</span>
              <span className="value">
                {currentJob.property.specifications.bedrooms && `${currentJob.property.specifications.bedrooms} bed`}
                {currentJob.property.specifications.bathrooms && `, ${currentJob.property.specifications.bathrooms} bath`}
                {currentJob.property.specifications.squareFootage && `, ${currentJob.property.specifications.squareFootage} sqft`}
              </span>
            </div>
          )}
          {currentJob.property?.location && (
            <div className="detail-item">
              <span className="label">Location:</span>
              <span className="value">
                {currentJob.property.location.city && currentJob.property.location.city}
                {currentJob.property.location.state && `, ${currentJob.property.location.state}`}
                {currentJob.property.location.zipCode && ` ${currentJob.property.location.zipCode}`}
                {currentJob.property.location.country && `, ${currentJob.property.location.country}`}
              </span>
            </div>
          )}
          {currentJob.property?.contactInfo && (
            <div className="detail-item">
              <span className="label">Property Contact:</span>
              <span className="value">
                {currentJob.property.contactInfo.email && (
                  <div>Email: {currentJob.property.contactInfo.email}</div>
                )}
                {currentJob.property.contactInfo.phone && (
                  <div>Phone: {currentJob.property.contactInfo.phone}</div>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Owner Information */}
        <div className="detail-card owner-info-card">
          <h3>Property Owner</h3>
          <div className="detail-item">
            <span className="label">Name:</span>
            <span className="value">{currentJob.owner?.name || `${currentJob.owner?.firstName || ''} ${currentJob.owner?.lastName || ''}`.trim() || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="label">Email:</span>
            <span className="value">{currentJob.owner?.email || 'N/A'}</span>
          </div>
          {currentJob.owner?.phoneNumber && (
            <div className="detail-item">
              <span className="label">Phone:</span>
              <span className="value">{currentJob.owner.phoneNumber}</span>
            </div>
          )}
        </div>

        {/* Tenant Information */}
        <div className="detail-card tenant-info-card">
          <h3>Property Tenant</h3>
          {currentJob.tenant ? (
            <div className="tenant-item">
              <div className="detail-item">
                <span className="label">Name:</span>
                <span className="value">{currentJob.tenant.name || `${currentJob.tenant.firstName || ''} ${currentJob.tenant.lastName || ''}`.trim() || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{currentJob.tenant.email || 'N/A'}</span>
              </div>
              {currentJob.tenant.phoneNumber && (
                <div className="detail-item">
                  <span className="label">Phone:</span>
                  <span className="value">{currentJob.tenant.phoneNumber}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="no-tenants">No active tenant found</p>
          )}
        </div>

        {/* Rent Information */}
        {currentJob.rentDetails && (
          <div className="detail-card rent-info-card">
            <h3>Rental Information</h3>
            <div className="detail-item">
              <span className="label">Monthly Rent:</span>
              <span className="value">{currentJob.rentDetails.monthlyRent ? `$${currentJob.rentDetails.monthlyRent}` : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Lease Start:</span>
              <span className="value">{currentJob.rentDetails.startDate ? formatDate(currentJob.rentDetails.startDate) : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Lease End:</span>
              <span className="value">{currentJob.rentDetails.endDate ? formatDate(currentJob.rentDetails.endDate) : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Rent Status:</span>
              <span className="value">{currentJob.rentDetails.status || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Job Details */}
        {currentJob.jobDetails && (
          <div className="detail-card job-details-card">
            <h3>Job Requirements & Details</h3>
            {currentJob.jobDetails.duties && (
              <div className="detail-item">
                <span className="label">Duties:</span>
                <span className="value">{currentJob.jobDetails.duties}</span>
              </div>
            )}
            {currentJob.jobDetails.equipment && (
              <div className="detail-item">
                <span className="label">Equipment Provided:</span>
                <span className="value">{currentJob.jobDetails.equipment}</span>
              </div>
            )}
            {currentJob.jobDetails.instructions && (
              <div className="detail-item">
                <span className="label">Special Instructions:</span>
                <span className="value">{currentJob.jobDetails.instructions}</span>
              </div>
            )}
            {currentJob.jobDetails.emergencyContacts && (
              <div className="detail-item">
                <span className="label">Emergency Contacts:</span>
                <span className="value">{currentJob.jobDetails.emergencyContacts}</span>
              </div>
            )}
          </div>
        )}

        {/* Job Status */}
        <div className="detail-card status-card full-width">
          <h3>Job Status & Timeline</h3>
          <div className="status-grid">
            <div className="detail-item">
              <span className="label">Current Status:</span>
              <span className={`value status-${currentJob.status?.toLowerCase() || 'unknown'}`}>{currentJob.status || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Job ID:</span>
              <span className="value">{currentJob._id}</span>
            </div>
            {currentJob.startDate && (
              <div className="detail-item">
                <span className="label">Start Date:</span>
                <span className="value">{formatDate(currentJob.startDate)}</span>
              </div>
            )}
            {currentJob.endDate && (
              <div className="detail-item">
                <span className="label">End Date:</span>
                <span className="value">{formatDate(currentJob.endDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="job-actions">
        <button onClick={fetchCurrentJob} className="refresh-btn">
          Refresh Details
        </button>
      </div>
    </div>
  );
};

export default MyJob;