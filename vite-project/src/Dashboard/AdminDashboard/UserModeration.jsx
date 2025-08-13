import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaUserAlt, FaEnvelope, FaUserShield, FaBan, FaUnlock, FaTrash } from 'react-icons/fa';

const UserModeration = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to view users');
        setLoading(false);
        return;
      }
      
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBanUser = async (id) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/users/${id}/ban`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(user => {
        if (user._id === id) {
          return { ...user, isBanned: true };
        }
        return user;
      }));
      setError(null);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnbanUser = async (id) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/users/${id}/unban`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(user => {
        if (user._id === id) {
          return { ...user, isBanned: false };
        }
        return user;
      }));
      setError(null);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to unban user. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.filter(user => user._id !== id));
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="user-moderation">
      <h2>User Moderation</h2>
      {loading ? (
        <div className="loading-spinner">Loading users...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button className="retry-button" onClick={fetchUsers}>
            Retry
          </button>
        </div>
      ) : (
        <div className="users-list">
          {users.length === 0 ? (
            <p className="no-users">No users found.</p>
          ) : (
            users.map((user) => (
              <div key={user._id} className={`user-card ${actionInProgress ? 'action-in-progress' : ''}`}>
                <div className="user-header">
                  <h3>
                    <FaUserAlt className="user-icon" /> {user.name}
                  </h3>
                  <div className="user-status">
                    <span className={`status-badge ${user.isBanned ? 'status-banned' : 'status-active'}`}>
                      {user.isBanned ? <FaBan /> : <FaUnlock />}
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </div>
                </div>
                
                <div className="user-details">
                  <div className="user-detail-item">
                    <FaEnvelope className="detail-icon" />
                    <p><strong>Email:</strong> {user.email}</p>
                  </div>
                  
                  <div className="user-detail-item">
                    <FaUserShield className="detail-icon" />
                    <p><strong>Role:</strong> {user.role}</p>
                  </div>
                </div>
                
                <div className="user-actions">
                  {user.isBanned ? (
                    <button 
                      onClick={() => handleUnbanUser(user._id)} 
                      className="unban-btn"
                      disabled={actionInProgress}
                    >
                      <FaUnlock className="btn-icon" /> Unban User
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBanUser(user._id)} 
                      className="ban-btn"
                      disabled={actionInProgress}
                    >
                      <FaBan className="btn-icon" /> Ban User
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteUser(user._id)} 
                    className="delete-btn"
                    disabled={actionInProgress}
                  >
                    <FaTrash className="btn-icon" /> Delete User
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserModeration;
