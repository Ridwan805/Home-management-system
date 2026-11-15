import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  RotateCw, 
  UserRound,
  ShieldAlert,
  Building2
} from 'lucide-react';
import apiConfig from '../../config/api';
import './SecurityGuardInfo.css';
import { CircularSpinner } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';

const TenantSecurityGuardInfo = () => {
  const [assignedGuards, setAssignedGuards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch {
      return null;
    }
  };

  const fetchAssignedGuards = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
      setError('Failed to load assigned guards. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignedGuards();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="tenant-guard-info-page">
      <TenantPageHeader 
        title="Security Guard Information" 
        subtitle="Assigned on-premise security personnel for your property."
        action={
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchAssignedGuards(true)}
            disabled={loading || refreshing}
            title="Refresh security personnel data"
          >
            <RotateCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {error && (
        <div className="guard-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="guard-loader-wrap">
          <CircularSpinner message="Loading assigned security personnel..." minHeight="220px" />
        </div>
      ) : assignedGuards.length === 0 ? (
        <TenantEmptyState 
          icon={ShieldCheck}
          title="No Security Guards Assigned"
          description="There are currently no security guards assigned to your active property. When the property owner assigns guards to your premises, their contact details and shifts will be displayed here."
        />
      ) : (
        <div className="guard-cards-grid">
          {assignedGuards.map((item) => {
            const guard = item.guard || {};
            const property = item.property || {};
            const jobPost = item.jobPost || {};
            const guardFullName = `${guard.firstName || ''} ${guard.lastName || ''}`.trim() || 'Security Officer';
            const workingHours = jobPost.requirements?.workingHours || guard.availability || 'Designated Shift';

            return (
              <div 
                key={`${jobPost._id || 'job'}-${guard._id || Math.random()}`} 
                className="guard-profile-card"
              >
                {/* Header Profile Section */}
                <div className="guard-card-top">
                  <div className="guard-avatar-wrap">
                    {guard.profilePicture ? (
                      <img 
                        src={guard.profilePicture} 
                        alt={guardFullName}
                        className="guard-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="guard-avatar-fallback" 
                      style={{ display: guard.profilePicture ? 'none' : 'flex' }}
                    >
                      <UserRound size={28} />
                    </div>
                  </div>

                  <div className="guard-title-info">
                    <div className="guard-name-row">
                      <h3 className="guard-name">{guardFullName}</h3>
                      <TenantStatusBadge status={item.status || 'Active'} size="sm" />
                    </div>
                    <span className="guard-role-tag">
                      {jobPost.title || 'Property Security Guard'}
                    </span>
                  </div>
                </div>

                {/* Assigned Property Bar */}
                <div className="guard-property-bar">
                  <Building2 size={16} className="bar-icon" />
                  <div className="bar-text">
                    <span className="bar-label">Assigned Property</span>
                    <span className="bar-val">{property.address || 'Assigned Residence'}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="guard-details-grid">
                  <div className="guard-spec-item">
                    <Clock size={16} className="spec-icon" />
                    <div>
                      <span className="spec-label">Working Hours / Shift</span>
                      <span className="spec-val">{workingHours}</span>
                    </div>
                  </div>

                  <div className="guard-spec-item">
                    <Calendar size={16} className="spec-icon" />
                    <div>
                      <span className="spec-label">Assignment Date</span>
                      <span className="spec-val">
                        {item.startDate ? formatDate(item.startDate) : formatDate(jobPost.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {guard.phoneNumber && (
                    <div className="guard-spec-item">
                      <Phone size={16} className="spec-icon" />
                      <div>
                        <span className="spec-label">Phone</span>
                        <a href={`tel:${guard.phoneNumber}`} className="spec-link">
                          {guard.phoneNumber}
                        </a>
                      </div>
                    </div>
                  )}

                  {guard.email && (
                    <div className="guard-spec-item">
                      <Mail size={16} className="spec-icon" />
                      <div>
                        <span className="spec-label">Email</span>
                        <a href={`mailto:${guard.email}`} className="spec-link">
                          {guard.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {guard.emergencyContact && (
                    <div className="guard-spec-item emergency-item">
                      <AlertCircle size={16} className="spec-icon-danger" />
                      <div>
                        <span className="spec-label">Emergency Line</span>
                        <span className="spec-val">{guard.emergencyContact}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Action Footer */}
                <div className="guard-card-footer">
                  {guard.phoneNumber ? (
                    <a 
                      href={`tel:${guard.phoneNumber}`}
                      className="ds-btn ds-btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Phone size={15} />
                      <span>Call Security</span>
                    </a>
                  ) : null}

                  {guard.email ? (
                    <a 
                      href={`mailto:${guard.email}`}
                      className="ds-btn ds-btn-secondary"
                    >
                      <Mail size={15} />
                      <span>Email</span>
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TenantSecurityGuardInfo;
