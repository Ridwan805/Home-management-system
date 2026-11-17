import React, { useState, useEffect, useContext } from 'react';
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Calendar,
  Check,
  Pencil,
  X,
  AlertCircle,
  Building,
  KeyRound,
  BadgeCheck
} from 'lucide-react';
import { AuthContext } from '../../../App';
import apiConfig from '../../../config/api';
import { ProfileSkeleton, ButtonLoader } from '../../../components/loading';
import './UnifiedProfileView.css';

const UnifiedProfileView = ({ onNavigateSection }) => {
  const { currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    name: '',
    phoneNumber: '',
    address: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const saved = localStorage.getItem('dwellSyncUser');
        if (!saved) throw new Error('User not logged in');
        const token = JSON.parse(saved).token;

        const res = await fetch(apiConfig.getUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          // Fallback to stored user data if /api/auth/me is unavailable
          const stored = JSON.parse(saved);
          setUser(stored);
          setFormData({
            firstName: stored.firstName || '',
            lastName: stored.lastName || '',
            email: stored.email || '',
            name: stored.name || stored.userName || '',
            phoneNumber: stored.phoneNumber || '',
            address: stored.address || ''
          });
          return;
        }

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
        console.warn('Error fetching user profile:', err);
        const saved = localStorage.getItem('dwellSyncUser');
        if (saved) {
          try {
            const stored = JSON.parse(saved);
            setUser(stored);
            setFormData({
              firstName: stored.firstName || '',
              lastName: stored.lastName || '',
              email: stored.email || '',
              name: stored.name || stored.userName || '',
              phoneNumber: stored.phoneNumber || '',
              address: stored.address || ''
            });
          } catch {
            setError(err.message);
          }
        } else {
          setError(err.message);
        }
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
      if (!saved) throw new Error('User session expired');
      const stored = JSON.parse(saved);
      const token = stored.token;

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

      // Also update stored user in localStorage
      const updatedStorage = {
        ...stored,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: formData.name || `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address
      };
      localStorage.setItem('dwellSyncUser', JSON.stringify(updatedStorage));

      setIsEditing(false);
      setSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="unified-profile-page">
        <div className="unified-view-header">
          <div>
            <h1 className="unified-view-title">My Profile</h1>
            <p className="unified-view-subtitle">Manage your personal credentials, contact info, and account preferences</p>
          </div>
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  const displayName = user
    ? (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.userName || 'DwellSync Member')
    : 'DwellSync Member';

  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Active Member';

  return (
    <div className="unified-profile-page">
      {/* Top Header */}
      <div className="unified-view-header">
        <div>
          <h1 className="unified-view-title">My Profile</h1>
          <p className="unified-view-subtitle">
            Manage your personal profile, contact information, and verified credentials across DwellSync
          </p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            className="unified-btn unified-btn-primary"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="profile-action-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              className="unified-btn unified-btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ButtonLoader size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="unified-alert success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="unified-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Card Banner */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar">
          <span>{userInitial}</span>
        </div>
        <div className="profile-hero-info">
          <div className="hero-name-row">
            <h2 className="hero-name">{displayName}</h2>
            <span className="hero-verified-badge">
              <BadgeCheck size={15} />
              <span>Verified Account</span>
            </span>
          </div>
          <div className="hero-meta-row">
            <span className="hero-meta-item">
              <Mail size={14} />
              <span>{user?.email || 'No email registered'}</span>
            </span>
            <span className="hero-meta-item">
              <Calendar size={14} />
              <span>Member since {memberSince}</span>
            </span>
            <span className="hero-role-pill">
              {user?.role === 'Security Guard' ? 'Security Guard' : (user?.role === 'Service Provider' ? 'Service Provider' : 'Resident / Property Owner')}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form / Details View */}
      <div className="profile-details-card">
        <div className="profile-card-header">
          <h3 className="card-section-title">Personal Information</h3>
          <p className="card-section-desc">Keep your contact and address details up-to-date for agreements, notices, and payment receipts.</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-form-grid">
          <div className="profile-field">
            <label className="field-label">First Name</label>
            {isEditing ? (
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="field-input"
                placeholder="First name"
                required
              />
            ) : (
              <div className="field-display-value">{user?.firstName || 'Not specified'}</div>
            )}
          </div>

          <div className="profile-field">
            <label className="field-label">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="field-input"
                placeholder="Last name"
                required
              />
            ) : (
              <div className="field-display-value">{user?.lastName || 'Not specified'}</div>
            )}
          </div>

          <div className="profile-field">
            <label className="field-label">Email Address</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="field-input"
                placeholder="name@example.com"
                required
              />
            ) : (
              <div className="field-display-value">
                <Mail size={14} className="field-icon" />
                <span>{user?.email || 'Not specified'}</span>
              </div>
            )}
          </div>

          <div className="profile-field">
            <label className="field-label">Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="field-input"
                placeholder="+880 1XXXXXXXXX"
              />
            ) : (
              <div className="field-display-value">
                <Phone size={14} className="field-icon" />
                <span>{user?.phoneNumber || 'No phone number provided'}</span>
              </div>
            )}
          </div>

          <div className="profile-field full-width">
            <label className="field-label">Current Address</label>
            {isEditing ? (
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="field-input"
                placeholder="House, Road, Area, City"
              />
            ) : (
              <div className="field-display-value">
                <MapPin size={14} className="field-icon" />
                <span>{user?.address || 'No residential address specified'}</span>
              </div>
            )}
          </div>

          <div className="profile-field full-width">
            <label className="field-label">System Account ID</label>
            <div className="field-display-value account-id-value">
              <code>{user?._id || user?.id || user?.userId || 'N/A'}</code>
            </div>
          </div>
        </form>
      </div>

      {/* Account Roles & Unified Capabilities */}
      <div className="profile-capabilities-card">
        <h3 className="card-section-title">Unified Account Privileges</h3>
        <p className="card-section-desc">Your DwellSync account automatically supports both property ownership and tenancy features.</p>
        
        <div className="capabilities-grid">
          <div className="capability-box">
            <div className="capability-icon-wrap landlord">
              <Building size={20} />
            </div>
            <div className="capability-text">
              <h4>Property Ownership</h4>
              <p>Publish listings, screen tenant applications, manage security deposits, and receive BDT rent directly.</p>
            </div>
          </div>

          <div className="capability-box">
            <div className="capability-icon-wrap resident">
              <KeyRound size={20} />
            </div>
            <div className="capability-text">
              <h4>Tenancy & Renting</h4>
              <p>Apply for properties, track leases, submit maintenance requests, and pay monthly rent with Stripe verification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedProfileView;
