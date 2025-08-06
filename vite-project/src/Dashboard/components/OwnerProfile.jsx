import React, { useEffect, useState } from 'react';
import './OwnerProfile.css';

const OwnerProfile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    name: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) throw new Error('User not logged in');
        const user = JSON.parse(userData);
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch user info');
        const data = await res.json();
        if ((data.user || data).role === 'Tenant') {
          alert('Tenant dashboard work in progress');
          return;
        }
        const userDataToSet = data.user || data;
        setUserInfo(userDataToSet);
        setEditForm({
          firstName: userDataToSet.firstName || '',
          lastName: userDataToSet.lastName || '',
          email: userDataToSet.email || '',
          name: userDataToSet.name || ''
        });
      } catch (err) {
        setError(err.message || 'Failed to load user info');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleEditClick = () => {
    setIsEditing(true);
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      firstName: userInfo.firstName || '',
      lastName: userInfo.lastName || '',
      email: userInfo.email || '',
      name: userInfo.name || ''
    });
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) throw new Error('User not logged in');
      const user = JSON.parse(userData);

      const response = await fetch('http://localhost:5000/api/auth/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.message || 'Failed to update profile';
        if (data.field === 'email') errorMsg = `Email "${editForm.email}" already exists.`;
        if (data.field === 'name') errorMsg = `Username "${editForm.name}" already exists.`;
        throw new Error(errorMsg);
      }

      setUserInfo(data.user);
      setIsEditing(false);
      setUpdateSuccess(true);
      
      // Update localStorage with new user data
      const updatedUserData = {
        ...user,
        ...data.user
      };
      localStorage.setItem('dwellSyncUser', JSON.stringify(updatedUserData));

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);

    } catch (err) {
      setUpdateError(err.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <div className="owner-profile"><div className="dashboard-card">Loading profile...</div></div>;
  }
  if (error) {
    return <div className="owner-profile"><div className="dashboard-card error">{error}</div></div>;
  }
  if (!userInfo && !loading && !error) {
    return null;
  }

  return (
    <div className="owner-profile">
      <div className="section-header">
        <h1 className="profile-name-header">Owner Profile</h1>
        <p>Welcome back, {userInfo.firstName} {userInfo.lastName}!</p>
      </div>
      
      {updateSuccess && (
        <div className="dashboard-card success-message">
          <p>✅ Profile updated successfully!</p>
        </div>
      )}

      {updateError && (
        <div className="dashboard-card error-message">
          <p>❌ {updateError}</p>
        </div>
      )}

      <div className="dashboard-card owner-info-card">
        <div className="owner-header">
          <div className="owner-avatar"><span>👤</span></div>
          <div className="owner-details">
            {!isEditing ? (
              <>
                <h2>{userInfo.firstName} {userInfo.lastName}</h2>
                <p className="owner-email">{userInfo.email}</p>
                <p className="owner-username">Username: {userInfo.name}</p>
                <p className="owner-role">Role: {userInfo.role}</p>
                <p className="owner-joined">Joined: {userInfo.createdAt ? new Date(userInfo.createdAt).toLocaleDateString() : '-'}</p>
                <button 
                  className="edit-profile-btn"
                  onClick={handleEditClick}
                >
                  ✏️ Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="name">Username</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={updateLoading}
                  >
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={updateLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile; 