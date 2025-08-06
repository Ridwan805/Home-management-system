import React, { useEffect, useState } from 'react';
import './OwnerProfile.css';

const OwnerProfile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setUserInfo(data.user || data); // support both {user: {...}} and {...}
      } catch (err) {
        setError(err.message || 'Failed to load user info');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

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
        <h1 className = "profile-name-header">Owner Profile</h1>
        <p>Welcome back, {userInfo.firstName} {userInfo.lastName}!</p>
      </div>
      <div className="dashboard-card owner-info-card">
        <div className="owner-header">
          <div className="owner-avatar"><span>👤</span></div>
          <div className="owner-details">
            <h2>{userInfo.firstName} {userInfo.lastName}</h2>
            <p className="owner-email">{userInfo.email}</p>
            <p className="owner-username">Username: {userInfo.name}</p>
            <p className="owner-role">Role: {userInfo.role}</p>
            <p className="owner-joined">Joined: {userInfo.createdAt ? new Date(userInfo.createdAt).toLocaleDateString() : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile; 