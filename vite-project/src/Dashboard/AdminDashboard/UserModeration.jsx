import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UserModeration = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
        const res = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleBanUser = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.put(`http://localhost:5000/api/admin/users/${id}/ban`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(user => {
        if (user._id === id) {
          return { ...user, isBanned: true };
        }
        return user;
      }));
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user. Please try again.');
    }
  };

  const handleUnbanUser = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.put(`http://localhost:5000/api/admin/users/${id}/unban`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(user => {
        if (user._id === id) {
          return { ...user, isBanned: false };
        }
        return user;
      }));
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to unban user. Please try again.');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.filter(user => user._id !== id));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    }
  };

  return (
    <div className="user-moderation">
      <h2>User Moderation</h2>
      {loading ? (
        <div className="loading-spinner">Loading users...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="users-list">
          {users.length === 0 ? (
            <p className="no-users">No users found.</p>
          ) : (
            users.map((user) => (
              <div key={user._id} className="user-card">
                <h3>{user.name}</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Status:</strong> <span className={user.isBanned ? 'status-banned' : 'status-active'}>{user.isBanned ? 'Banned' : 'Active'}</span></p>
                <div className="user-actions">
                  {user.isBanned ? (
                    <button onClick={() => handleUnbanUser(user._id)} className="unban-btn">
                      Unban User
                    </button>
                  ) : (
                    <button onClick={() => handleBanUser(user._id)} className="ban-btn">
                      Ban User
                    </button>
                  )}
                  <button onClick={() => handleDeleteUser(user._id)} className="delete-btn">
                    Delete User
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
