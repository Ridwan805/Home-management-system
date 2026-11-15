import React, { useState, useEffect } from 'react';
import './OwnerProfile.css';
import apiConfig from '../../config/api';
import { ProfileSkeleton, ButtonLoader } from '../../components/loading';

const OwnerProfile = () => {
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    role: '',
  });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOwnerInfo = () => {
      setLoading(true);
      setError(null);
      try {
        const storedUser = localStorage.getItem('dwellSyncUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setOwnerInfo(user);
          setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            userName: user.userName || user.name || '',
            email: user.email || '',
            role: user.role || 'Owner',
          });
        } else {
          setError('User information not found in local storage.');
        }
      } catch (err) {
        setError('Failed to parse user information from local storage.');
        console.error('Error parsing user info from local storage:', err);
      }
      setLoading(false);
    };

    fetchOwnerInfo();
  }, []);

  const handleEditClick = () => {
    setError(null);
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    if (ownerInfo) {
      setForm({
        firstName: ownerInfo.firstName || '',
        lastName: ownerInfo.lastName || '',
        userName: ownerInfo.userName || ownerInfo.name || '',
        email: ownerInfo.email || '',
        role: ownerInfo.role || 'Owner',
      });
    }
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');
    setSaving(true);
    try {
      const storedUser = localStorage.getItem('dwellSyncUser');
      if (!storedUser) throw new Error('User not logged in');
      const user = JSON.parse(storedUser);
      const res = await fetch(apiConfig.getUrl('/api/auth/update'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('dwellSyncUser', JSON.stringify(updatedUser));
      setOwnerInfo(updatedUser);
      setEditMode(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="op-card" style={{ padding: '24px' }}>
        <ProfileSkeleton />
      </div>
    );
  }

  if (error && !ownerInfo) {
    return (
      <div className="op-card">
        <div className="op-alert-error">⚠️ {error}</div>
      </div>
    );
  }

  if (!ownerInfo) {
    return (
      <div className="op-card">
        <div style={{ color: '#64748b', fontSize: '0.95rem' }}>No owner information available.</div>
      </div>
    );
  }

  // Get user initials for avatar
  const initials = `${(ownerInfo.firstName || 'O').charAt(0)}${(ownerInfo.lastName || 'W').charAt(0)}`.toUpperCase();

  return (
    <div className="op-card">
      {successMsg && (
        <div className="op-alert-success">
          <span>✓</span> {successMsg}
        </div>
      )}
      {error && (
        <div className="op-alert-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {!editMode ? (
        <>
          {/* Header row with avatar, name, badge and edit button */}
          <div className="op-view-header">
            <div className="op-user-identity">
              <div className="op-avatar">{initials}</div>
              <div className="op-user-titles">
                <div className="op-user-name-row">
                  <h2 className="op-user-name">
                    {ownerInfo.firstName ? `${ownerInfo.firstName} ${ownerInfo.lastName}` : ownerInfo.userName || 'Owner'}
                  </h2>
                  <span className="op-role-badge">Verified {ownerInfo.role || 'Owner'}</span>
                </div>
                <p className="op-username-handle">@{ownerInfo.userName || ownerInfo.name || 'owner'}</p>
              </div>
            </div>

            <button type="button" className="op-btn op-btn-secondary" onClick={handleEditClick}>
              <span>✏️</span> Edit Profile
            </button>
          </div>

          {/* Details 4-Column Grid */}
          <div className="op-details-grid">
            <div className="op-detail-cell">
              <span className="op-detail-label">First Name</span>
              <span className="op-detail-val">{ownerInfo.firstName || '—'}</span>
            </div>

            <div className="op-detail-cell">
              <span className="op-detail-label">Last Name</span>
              <span className="op-detail-val">{ownerInfo.lastName || '—'}</span>
            </div>

            <div className="op-detail-cell">
              <span className="op-detail-label">Email Address</span>
              <span className="op-detail-val">{ownerInfo.email || '—'}</span>
            </div>

            <div className="op-detail-cell">
              <span className="op-detail-label">Username</span>
              <span className="op-detail-val">@{ownerInfo.userName || ownerInfo.name || '—'}</span>
            </div>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="op-edit-header">
            <h3 className="op-edit-title">Edit Owner Profile</h3>
            <p className="op-edit-subtitle">Update your personal identification and contact credentials.</p>
          </div>

          <div className="op-form-grid">
            <div className="op-field">
              <label>First Name</label>
              <input
                className="op-input"
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="First name"
                required
              />
            </div>

            <div className="op-field">
              <label>Last Name</label>
              <input
                className="op-input"
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Last name"
                required
              />
            </div>

            <div className="op-field">
              <label>Username</label>
              <input
                className="op-input"
                type="text"
                name="userName"
                value={form.userName}
                onChange={handleChange}
                placeholder="Username"
                required
              />
            </div>

            <div className="op-field">
              <label>Email Address</label>
              <input
                className="op-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="owner@example.com"
                required
              />
            </div>
          </div>

          <div className="op-actions">
            <button
              type="button"
              className="op-btn op-btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="op-btn op-btn-primary"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? (
                <>
                  <ButtonLoader size="small" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default OwnerProfile;
