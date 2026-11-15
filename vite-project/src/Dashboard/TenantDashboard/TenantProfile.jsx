import React, { useState, useEffect } from 'react';
import { 
  UserRound, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Pencil, 
  Check, 
  X, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import './TenantProfile.css';
import apiConfig from '../../config/api';
import { ProfileSkeleton, ButtonLoader } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatusBadge from './components/TenantStatusBadge';

const TenantProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    name: '',
    phoneNumber: '',
    address: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const saved = localStorage.getItem('dwellSyncUser');
        if (!saved) throw new Error("User not logged in");
        const token = JSON.parse(saved).token;

        const res = await fetch(apiConfig.getUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch user data');

        const data = await res.json();
        setUser(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          name: data.name || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || ''
        });
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
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg('');

    try {
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) throw new Error("User session expired");
      const token = JSON.parse(saved).token;

      const res = await fetch(apiConfig.getUrl('/api/auth/update'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update profile');
      }

      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="tenant-profile-page">
        <TenantPageHeader 
          title="My Profile" 
          subtitle="Manage your personal details and contact information" 
        />
        <ProfileSkeleton />
      </div>
    );
  }

  const displayName = user
    ? (user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.name || 'Tenant User')
    : 'Tenant User';

  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="tenant-profile-page">
      <TenantPageHeader 
        title="My Profile" 
        subtitle="Manage your personal details and contact information"
        action={
          !isEditing && (
            <button 
              type="button" 
              className="ds-btn ds-btn-primary" 
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} />
              <span>Edit Profile</span>
            </button>
          )
        }
      />

      {error && (
        <div className="profile-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="profile-alert alert-success" role="status">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="profile-view-layout">
          {/* Main Profile Summary Card */}
          <div className="profile-hero-card">
            <div className="profile-hero-avatar-wrap">
              <div className="profile-avatar-circle">
                {userInitial}
              </div>
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h2 className="profile-hero-name">{displayName}</h2>
                <TenantStatusBadge status={user?.role || 'Tenant'} size="md" />
              </div>
              <p className="profile-hero-email">{user?.email}</p>
            </div>
          </div>

          {/* Detailed Info Card */}
          <div className="profile-details-card">
            <h3 className="details-card-title">Personal & Contact Information</h3>

            <div className="profile-details-grid">
              <div className="profile-field-item">
                <div className="field-icon-circle">
                  <UserRound size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Full Name</span>
                  <span className="field-value">{displayName}</span>
                </div>
              </div>

              <div className="profile-field-item">
                <div className="field-icon-circle">
                  <Mail size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Email Address</span>
                  <span className="field-value">{user?.email || 'Not provided'}</span>
                </div>
              </div>

              <div className="profile-field-item">
                <div className="field-icon-circle">
                  <Phone size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Phone Number</span>
                  <span className="field-value">{user?.phoneNumber || 'Not provided'}</span>
                </div>
              </div>

              <div className="profile-field-item">
                <div className="field-icon-circle">
                  <MapPin size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Residential Address</span>
                  <span className="field-value">{user?.address || 'Not provided'}</span>
                </div>
              </div>

              <div className="profile-field-item">
                <div className="field-icon-circle">
                  <ShieldCheck size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Account Role</span>
                  <span className="field-value">{user?.role || 'Tenant'}</span>
                </div>
              </div>

              {user?.createdAt && (
                <div className="profile-field-item">
                  <div className="field-icon-circle">
                    <Calendar size={18} />
                  </div>
                  <div className="field-content">
                    <span className="field-label">Member Since</span>
                    <span className="field-value">{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Form Card */
        <div className="profile-edit-card">
          <div className="edit-card-header">
            <h3 className="details-card-title">Edit Personal Details</h3>
            <p className="edit-card-subtitle">Update your personal and contact information below.</p>
          </div>

          <form className="profile-form-grid" onSubmit={handleSubmit}>
            <div className="ds-form-group">
              <label htmlFor="firstName" className="ds-form-label">First Name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className="ds-form-input"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>

            <div className="ds-form-group">
              <label htmlFor="lastName" className="ds-form-label">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className="ds-form-input"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div className="ds-form-group">
              <label htmlFor="name" className="ds-form-label">Username / Display Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="ds-form-input"
                placeholder="Display name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="ds-form-group">
              <label htmlFor="email" className="ds-form-label">Email Address *</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="ds-form-input"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="ds-form-group">
              <label htmlFor="phoneNumber" className="ds-form-label">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                className="ds-form-input"
                placeholder="+880 1..."
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            <div className="ds-form-group">
              <label htmlFor="address" className="ds-form-label">Address</label>
              <input
                id="address"
                name="address"
                type="text"
                className="ds-form-input"
                placeholder="House, Street, City"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-action-row">
              <button
                type="submit"
                className="ds-btn ds-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ButtonLoader size="small" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="ds-btn ds-btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TenantProfile;
