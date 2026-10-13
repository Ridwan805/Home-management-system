import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API from '../../config/api';
import { 
  FaUserAlt, FaEnvelope, FaUserShield, FaBan, FaUnlock, FaTrash, 
  FaEye, FaEdit, FaKey, FaSearch, FaFilter, FaHome, FaFileInvoiceDollar, 
  FaTools, FaPhone, FaMapMarkerAlt, FaTimes, FaCheck, FaCalendarAlt, FaExchangeAlt
} from 'react-icons/fa';

const UserModeration = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal States
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('overview');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    role: 'Tenant'
  });

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in as admin to view users');
        setLoading(false);
        return;
      }
      
      const res = await axios.get(API.getUrl(API.endpoints.adminUsers), {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Inspect full user activity dossier
  const handleInspectUser = async (userId) => {
    try {
      setLoadingActivity(true);
      setInspectModalOpen(true);
      setActiveActivityTab('overview');
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      const res = await axios.get(API.getUrl(API.endpoints.adminUserActivity(userId)), {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSelectedUserActivity(res.data);
    } catch (err) {
      console.error('Error fetching user activity dossier:', err);
      setError('Failed to load user activity details.');
    } finally {
      setLoadingActivity(false);
    }
  };

  // Open Edit Profile modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      role: user.role || 'Tenant'
    });
    setEditModalOpen(true);
  };

  // Save Edit Profile
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      const res = await axios.put(
        API.getUrl(API.endpoints.updateUserByAdmin(editingUser._id)),
        editFormData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setUsers(users.map(u => u._id === editingUser._id ? { ...u, ...res.data.user } : u));
      setEditModalOpen(false);
      showNotification(`Profile for ${editFormData.name} updated successfully!`);
    } catch (err) {
      console.error('Error saving user edit:', err);
      alert('Failed to update user profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionInProgress(false);
    }
  };

  // Open Reset Password modal
  const handleOpenPasswordReset = (user) => {
    setPasswordTargetUser(user);
    setNewAdminPassword('');
    setPasswordModalOpen(true);
  };

  // Save Reset Password
  const handleSavePasswordReset = async (e) => {
    e.preventDefault();
    if (!passwordTargetUser || !newAdminPassword) return;
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.put(
        API.getUrl(API.endpoints.resetUserPasswordByAdmin(passwordTargetUser._id)),
        { newPassword: newAdminPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setPasswordModalOpen(false);
      showNotification(`Password for ${passwordTargetUser.name} reset successfully!`);
    } catch (err) {
      console.error('Error resetting user password:', err);
      alert('Failed to reset password: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionInProgress(false);
    }
  };

  // Ban User
  const handleBanUser = async (id, userName) => {
    if (!window.confirm(`Are you sure you want to ban user "${userName}"?`)) return;
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.put(API.getUrl(API.endpoints.banUser(id)), {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(u => u._id === id ? { ...u, isBanned: true } : u));
      showNotification(`User "${userName}" has been banned.`);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Unban User
  const handleUnbanUser = async (id, userName) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.put(API.getUrl(API.endpoints.unbanUser(id)), {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(u => u._id === id ? { ...u, isBanned: false } : u));
      showNotification(`User "${userName}" has been unbanned.`);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to unban user.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id, userName) => {
    if (!window.confirm(`⚠️ DANGER: Permanently delete user "${userName}" and all their properties, rents, and reports? This cannot be undone.`)) {
      return;
    }
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.delete(API.getUrl(API.endpoints.deleteUser(id)), {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.filter(u => u._id !== id));
      showNotification(`User "${userName}" was permanently deleted.`);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.lastName && u.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phoneNumber && u.phoneNumber.includes(searchTerm));

    const matchesRole = selectedRole === 'All' || u.role === selectedRole;
    const matchesStatus = 
      selectedStatus === 'All' || 
      (selectedStatus === 'Active' && !u.isBanned) || 
      (selectedStatus === 'Banned' && u.isBanned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate statistics
  const totalOwners = users.filter(u => u.role === 'Owner').length;
  const totalTenants = users.filter(u => u.role === 'Tenant').length;
  const totalGuards = users.filter(u => u.role === 'Security Guard').length;
  const totalBanned = users.filter(u => u.isBanned).length;

  return (
    <div className="user-moderation">
      <div className="moderation-header">
        <div>
          <h2>User Command Center & Activity Control</h2>
          <p className="moderation-subtitle">
            Inspect live activities, manage user permissions, and control accounts across the platform.
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
          ↻ Refresh Users
        </button>
      </div>

      {actionSuccess && (
        <div className="success-banner">
          <FaCheck /> {actionSuccess}
        </div>
      )}

      {/* Quick Summary Counter Cards */}
      <div className="user-stats-strip">
        <div className="stat-pill">
          <span className="stat-label">Total Users</span>
          <span className="stat-number">{users.length}</span>
        </div>
        <div className="stat-pill owner">
          <span className="stat-label">Owners</span>
          <span className="stat-number">{totalOwners}</span>
        </div>
        <div className="stat-pill tenant">
          <span className="stat-label">Tenants</span>
          <span className="stat-number">{totalTenants}</span>
        </div>
        <div className="stat-pill guard">
          <span className="stat-label">Security Guards</span>
          <span className="stat-number">{totalGuards}</span>
        </div>
        <div className="stat-pill banned">
          <span className="stat-label">Banned</span>
          <span className="stat-number">{totalBanned}</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="moderation-toolbar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-item">
            <FaFilter className="filter-icon" />
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option value="All">All Roles</option>
              <option value="Owner">Owners</option>
              <option value="Tenant">Tenants</option>
              <option value="Security Guard">Security Guards</option>
              <option value="Service Provider">Service Providers</option>
            </select>
          </div>

          <div className="filter-item">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Banned">Banned Only</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading users and activity data...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button className="retry-button" onClick={fetchUsers}>Retry</button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="no-users-box">
          <FaUserAlt size={36} color="#94a3b8" />
          <p>No users found matching your filters.</p>
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.map((user) => {
            const roleClass = (user.role || 'tenant').toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={user._id} className={`user-management-card ${user.isBanned ? 'is-banned' : ''}`}>
                <div className="card-top">
                  <div className="user-avatar-badge">
                    {(user.name || user.firstName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="user-title-area">
                    <h3 className="user-fullname" title={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}>
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                    </h3>
                    <span className="user-username">@{user.name}</span>
                  </div>
                  <div className="user-badges-stack">
                    <span className={`user-role-pill role-${roleClass}`}>
                      {user.role}
                    </span>
                    <span className={`user-status-pill ${user.isBanned ? 'status-banned' : 'status-active'}`}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="user-meta-info">
                  <div className="meta-line">
                    <FaEnvelope className="meta-icon" />
                    <span>{user.email}</span>
                  </div>
                  {user.phoneNumber && (
                    <div className="meta-line">
                      <FaPhone className="meta-icon" />
                      <span>{user.phoneNumber}</span>
                    </div>
                  )}
                  {user.address && (
                    <div className="meta-line">
                      <FaMapMarkerAlt className="meta-icon" />
                      <span>{user.address}</span>
                    </div>
                  )}
                  <div className="meta-line">
                    <FaCalendarAlt className="meta-icon" />
                    <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Live Activity Counter Badges */}
                <div className="user-activity-badges">
                  <div className="activity-badge" title="Properties Owned">
                    <FaHome /> <span>{user.stats?.properties || 0} Props</span>
                  </div>
                  <div className="activity-badge" title="Active Rents / Leases">
                    <FaExchangeAlt /> <span>{user.stats?.rents || 0} Rents</span>
                  </div>
                  <div className="activity-badge" title="Requests">
                    <FaEnvelope /> <span>{user.stats?.requests || 0} Reqs</span>
                  </div>
                  <div className="activity-badge" title="Payments Made">
                    <FaFileInvoiceDollar /> <span>{user.stats?.payments || 0} Pays</span>
                  </div>
                  <div className="activity-badge" title="Maintenance Reports">
                    <FaTools /> <span>{user.stats?.maintenanceReports || 0} Reports</span>
                  </div>
                </div>

                {/* Admin Actions Bar */}
                <div className="card-actions-bar">
                  <button 
                    className="action-btn inspect-btn"
                    onClick={() => handleInspectUser(user._id)}
                    title="View full user activity dossier"
                  >
                    <FaEye /> Activity
                  </button>
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleOpenEdit(user)}
                    title="Edit profile & role"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button 
                    className="action-btn pass-btn"
                    onClick={() => handleOpenPasswordReset(user)}
                    title="Directly reset password"
                  >
                    <FaKey />
                  </button>
                  {user.isBanned ? (
                    <button 
                      className="action-btn unban-btn"
                      onClick={() => handleUnbanUser(user._id, user.name)}
                      disabled={actionInProgress}
                      title="Restore access"
                    >
                      <FaUnlock />
                    </button>
                  ) : (
                    <button 
                      className="action-btn ban-btn"
                      onClick={() => handleBanUser(user._id, user.name)}
                      disabled={actionInProgress}
                      title="Ban account"
                    >
                      <FaBan />
                    </button>
                  )}
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteUser(user._id, user.name)}
                    disabled={actionInProgress}
                    title="Permanently delete user"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 360-DEGREE USER ACTIVITY DOSSIER MODAL */}
      {/* ========================================================= */}
      {inspectModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setInspectModalOpen(false)}>
          <div className="admin-modal dossier-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h3>User Activity Dossier</h3>
                {selectedUserActivity?.user && (
                  <span className="modal-user-tag">
                    {selectedUserActivity.user.name} ({selectedUserActivity.user.role})
                  </span>
                )}
              </div>
              <button className="close-modal-btn" onClick={() => setInspectModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            {loadingActivity ? (
              <div className="modal-loading">Aggregating live user activity...</div>
            ) : !selectedUserActivity ? (
              <div className="modal-error">Failed to load activity details.</div>
            ) : (
              <div className="dossier-body">
                {/* Dossier Tabs */}
                <div className="dossier-tabs">
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('overview')}
                  >
                    Overview
                  </button>
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'properties' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('properties')}
                  >
                    Properties ({selectedUserActivity.activity?.properties?.length || 0})
                  </button>
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'rents' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('rents')}
                  >
                    Rents & Leases ({selectedUserActivity.activity?.rents?.length || 0})
                  </button>
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('payments')}
                  >
                    Payments ({selectedUserActivity.activity?.payments?.length || 0})
                  </button>
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('requests')}
                  >
                    Requests ({selectedUserActivity.activity?.requests?.length || 0})
                  </button>
                  <button 
                    className={`dossier-tab ${activeActivityTab === 'maintenance' ? 'active' : ''}`}
                    onClick={() => setActiveActivityTab('maintenance')}
                  >
                    Maintenance ({selectedUserActivity.activity?.maintenanceReports?.length || 0})
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeActivityTab === 'overview' && (
                  <div className="tab-pane">
                    <div className="overview-details-grid">
                      <div className="info-card">
                        <h4>Account Information</h4>
                        <p><strong>First Name:</strong> {selectedUserActivity.user.firstName || 'N/A'}</p>
                        <p><strong>Last Name:</strong> {selectedUserActivity.user.lastName || 'N/A'}</p>
                        <p><strong>Username:</strong> {selectedUserActivity.user.name}</p>
                        <p><strong>Email Address:</strong> {selectedUserActivity.user.email}</p>
                        <p><strong>Phone:</strong> {selectedUserActivity.user.phoneNumber || 'Not provided'}</p>
                        <p><strong>Address:</strong> {selectedUserActivity.user.address || 'Not provided'}</p>
                        <p><strong>Account Role:</strong> <span className="badge">{selectedUserActivity.user.role}</span></p>
                        <p><strong>Account Status:</strong> {selectedUserActivity.user.isBanned ? '🚫 Banned' : '✅ Active'}</p>
                        <p><strong>Registered On:</strong> {new Date(selectedUserActivity.user.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="info-card">
                        <h4>Live Activity Summary</h4>
                        <ul className="activity-bullets">
                          <li>Owned Properties: <strong>{selectedUserActivity.activity?.properties?.length || 0}</strong></li>
                          <li>Active Lease Agreements: <strong>{selectedUserActivity.activity?.rents?.length || 0}</strong></li>
                          <li>Rental & Booking Requests: <strong>{selectedUserActivity.activity?.requests?.length || 0}</strong></li>
                          <li>Transactions Logged: <strong>{selectedUserActivity.activity?.payments?.length || 0}</strong></li>
                          <li>Maintenance Reports: <strong>{selectedUserActivity.activity?.maintenanceReports?.length || 0}</strong></li>
                          <li>Visitor Logs Recorded: <strong>{selectedUserActivity.activity?.visitorLogs?.length || 0}</strong></li>
                          <li>Parcel Logs Recorded: <strong>{selectedUserActivity.activity?.parcelLogs?.length || 0}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PROPERTIES */}
                {activeActivityTab === 'properties' && (
                  <div className="tab-pane">
                    {selectedUserActivity.activity?.properties?.length === 0 ? (
                      <p className="empty-tab-text">No properties owned or submitted by this user.</p>
                    ) : (
                      <div className="dossier-items-list">
                        {selectedUserActivity.activity.properties.map((p) => (
                          <div key={p._id} className="dossier-item">
                            <div className="item-header">
                              <h5>{p.title}</h5>
                              <span className={`status-pill status-${(p.status || '').toLowerCase()}`}>{p.status}</span>
                            </div>
                            <p className="item-sub">📍 {p.address}, {p.city}</p>
                            <p className="item-sub">💰 Rent: ${p.rent} / month | Type: {p.type} | Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: RENTS & LEASES */}
                {activeActivityTab === 'rents' && (
                  <div className="tab-pane">
                    {selectedUserActivity.activity?.rents?.length === 0 ? (
                      <p className="empty-tab-text">No active or historical rent agreements found.</p>
                    ) : (
                      <div className="dossier-items-list">
                        {selectedUserActivity.activity.rents.map((r) => (
                          <div key={r._id} className="dossier-item">
                            <div className="item-header">
                              <h5>Lease Agreement #{r._id.slice(-6)}</h5>
                              <span className="status-pill status-active">{r.status || 'Active'}</span>
                            </div>
                            <p className="item-sub">🏠 Property: {r.propertyId?.title || r.propertyId?.address || 'Assigned Property'}</p>
                            <p className="item-sub">💵 Rent Amount: ${r.rentAmount} | Due Date: Day {r.dueDate || 1}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PAYMENTS */}
                {activeActivityTab === 'payments' && (
                  <div className="tab-pane">
                    {selectedUserActivity.activity?.payments?.length === 0 ? (
                      <p className="empty-tab-text">No payment records found for this user.</p>
                    ) : (
                      <div className="dossier-items-list">
                        {selectedUserActivity.activity.payments.map((pm) => (
                          <div key={pm._id} className="dossier-item">
                            <div className="item-header">
                              <h5>Payment: ${pm.amount}</h5>
                              <span className={`status-pill status-${(pm.status || '').toLowerCase()}`}>{pm.status}</span>
                            </div>
                            <p className="item-sub">💳 Method: {pm.paymentMethod || 'Stripe'} | Date: {new Date(pm.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: REQUESTS */}
                {activeActivityTab === 'requests' && (
                  <div className="tab-pane">
                    {selectedUserActivity.activity?.requests?.length === 0 ? (
                      <p className="empty-tab-text">No inquiries or booking requests found.</p>
                    ) : (
                      <div className="dossier-items-list">
                        {selectedUserActivity.activity.requests.map((rq) => (
                          <div key={rq._id} className="dossier-item">
                            <div className="item-header">
                              <h5>Request: {rq.type || 'Inquiry'}</h5>
                              <span className="status-pill">{rq.status || 'Pending'}</span>
                            </div>
                            <p className="item-sub">Message: {rq.message || 'No message'}</p>
                            <p className="item-sub">Date: {new Date(rq.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: MAINTENANCE */}
                {activeActivityTab === 'maintenance' && (
                  <div className="tab-pane">
                    {selectedUserActivity.activity?.maintenanceReports?.length === 0 ? (
                      <p className="empty-tab-text">No maintenance reports logged by this user.</p>
                    ) : (
                      <div className="dossier-items-list">
                        {selectedUserActivity.activity.maintenanceReports.map((m) => (
                          <div key={m._id} className="dossier-item">
                            <div className="item-header">
                              <h5>{m.title}</h5>
                              <span className={`status-pill status-${(m.status || '').toLowerCase()}`}>{m.status}</span>
                            </div>
                            <p className="item-sub">Category: {m.category} | Priority: {m.priority}</p>
                            <p className="item-sub">Date: {new Date(m.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT USER PROFILE & ROLE MODAL */}
      {/* ========================================================= */}
      {editModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="admin-modal form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User: {editingUser?.name}</h3>
              <button className="close-modal-btn" onClick={() => setEditModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="admin-modal-form">
              <div className="form-row-2">
                <div className="modal-field">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    value={editFormData.firstName} 
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    value={editFormData.lastName} 
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="modal-field">
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={editFormData.name} 
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={editFormData.email} 
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="modal-field">
                  <label>User Role</label>
                  <select 
                    value={editFormData.role} 
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  >
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                    <option value="Security Guard">Security Guard</option>
                    <option value="Service Provider">Service Provider</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    value={editFormData.phoneNumber} 
                    onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-field">
                <label>Address</label>
                <input 
                  type="text" 
                  value={editFormData.address} 
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={actionInProgress}>
                  {actionInProgress ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIRECT PASSWORD RESET MODAL */}
      {/* ========================================================= */}
      {passwordModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setPasswordModalOpen(false)}>
          <div className="admin-modal small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password: {passwordTargetUser?.name}</h3>
              <button className="close-modal-btn" onClick={() => setPasswordModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSavePasswordReset} className="admin-modal-form">
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                Enter a new password for <strong>{passwordTargetUser?.email}</strong>. The user can immediately log in with this new password.
              </p>
              <div className="modal-field">
                <label>New Password (min 6 characters)</label>
                <input 
                  type="password" 
                  value={newAdminPassword} 
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength="6"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={actionInProgress || newAdminPassword.length < 6}>
                  {actionInProgress ? 'Resetting...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserModeration;
