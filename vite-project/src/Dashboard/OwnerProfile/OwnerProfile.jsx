import React, { useState, useEffect } from 'react';
import './OwnerProfile.css';

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
            userName: user.userName || user.name || '', // support both fields
            email: user.email || '',
            role: user.role || '',
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

  const handleEditClick = () => setEditMode(true);

  const handleCancel = () => {
    setEditMode(false);
    if (ownerInfo) {
      setForm({
        firstName: ownerInfo.firstName || '',
        lastName: ownerInfo.lastName || '',
        userName: ownerInfo.userName || ownerInfo.name || '',
        email: ownerInfo.email || '',
        role: ownerInfo.role || '',
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
    try {
      const storedUser = localStorage.getItem('dwellSyncUser');
      if (!storedUser) throw new Error('User not logged in');
      const user = JSON.parse(storedUser);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/auth/update`, { //fetched from the server to update profile using PUT method
        method: 'PUT', //goes to auth.routes.js
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      // Update localStorage and state
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('dwellSyncUser', JSON.stringify(updatedUser));
      setOwnerInfo(updatedUser);
      setEditMode(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="owner-profile-container">Loading owner information...</div>;
  if (error) return <div className="owner-profile-container error">{error}</div>;
  if (!ownerInfo) return <div className="owner-profile-container">No owner information available.</div>;

  return (
    <div className="owner-profile-container">
      <h2>Owner Profile</h2>
      {successMsg && <div className="success-msg">{successMsg}</div>}
      {error && <div className="error-msg">{error}</div>}

      {!editMode ? (
        <div className="profile-details">
          <p><strong>Name:</strong> {ownerInfo.firstName} {ownerInfo.lastName}</p>
          <p><strong>Username:</strong> {ownerInfo.userName || ownerInfo.name}</p>
          <p><strong>Email:</strong> {ownerInfo.email}</p>
          <p><strong>Role:</strong> {ownerInfo.role}</p>
          <button className="edit-btn" onClick={handleEditClick}>Edit Profile</button>
        </div>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            First Name:
            <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
          </label>
          <label>
            Last Name:
            <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
          </label>
          <label>
            Username:
            <input type="text" name="userName" value={form.userName} onChange={handleChange} required />
          </label>
          <label>
            Email:
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default OwnerProfile;
