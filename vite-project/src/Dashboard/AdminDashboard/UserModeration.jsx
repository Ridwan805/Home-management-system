import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import API from '../../config/api';
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, Ban, Unlock, Trash2, 
  Eye, Edit, Key, Search, Filter, Home, FileText, 
  Wrench, ArrowLeftRight, RotateCw, MoreVertical, X, Check, Building2, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { TableSkeleton, PageLoader, ButtonLoader } from '../../components/loading';
import './adminDashboard.css';

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

  // Selected User for Right-Side Panel
  const [selectedUser, setSelectedUser] = useState(null);

  // Action Dropdown Menu State
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation: Escape key closes active drawer or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (actionMenuOpenId) {
          setActionMenuOpenId(null);
        } else if (inspectModalOpen) {
          setInspectModalOpen(false);
        } else if (editModalOpen) {
          setEditModalOpen(false);
        } else if (passwordModalOpen) {
          setPasswordModalOpen(false);
        } else if (selectedUser) {
          setSelectedUser(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionMenuOpenId, inspectModalOpen, editModalOpen, passwordModalOpen, selectedUser]);

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
      const data = Array.isArray(res.data) ? res.data : [];
      setUsers(data);

      // Keep selected user in sync with fresh data
      setSelectedUser((prev) => {
        if (!prev) return null;
        return data.find((u) => u._id === prev._id) || null;
      });
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

  // Inspect full user activity dossier modal
  const handleInspectUser = async (userId) => {
    try {
      setLoadingActivity(true);
      setInspectModalOpen(true);
      setActiveActivityTab('overview');
      setActionMenuOpenId(null);
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
    setActionMenuOpenId(null);
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

      const updatedUser = { ...editingUser, ...res.data.user };
      setUsers(users.map(u => u._id === editingUser._id ? updatedUser : u));
      if (selectedUser?._id === editingUser._id) {
        setSelectedUser(updatedUser);
      }
      setEditModalOpen(false);
      showNotification(`Profile for ${editFormData.name || editFormData.firstName} updated successfully!`);
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
    setActionMenuOpenId(null);
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
    setActionMenuOpenId(null);
    if (!window.confirm(`Are you sure you want to suspend/ban user "${userName}"?`)) return;
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.put(API.getUrl(API.endpoints.banUser(id)), {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(u => u._id === id ? { ...u, isBanned: true } : u));
      if (selectedUser?._id === id) {
        setSelectedUser(prev => prev ? { ...prev, isBanned: true } : null);
      }
      showNotification(`User "${userName}" has been suspended.`);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to suspend user.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Unban User
  const handleUnbanUser = async (id, userName) => {
    setActionMenuOpenId(null);
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.put(API.getUrl(API.endpoints.unbanUser(id)), {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.map(u => u._id === id ? { ...u, isBanned: false } : u));
      if (selectedUser?._id === id) {
        setSelectedUser(prev => prev ? { ...prev, isBanned: false } : null);
      }
      showNotification(`User "${userName}" has been reactivated.`);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to reactivate user.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id, userName) => {
    setActionMenuOpenId(null);
    if (!window.confirm(`DANGER: Permanently delete user "${userName}" and associated database records? This action cannot be undone.`)) {
      return;
    }
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      await axios.delete(API.getUrl(API.endpoints.deleteUser(id)), {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(users.filter(u => u._id !== id));
      if (selectedUser?._id === id) {
        setSelectedUser(null);
      }
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

  const getUserInitials = (u) => {
    if (u.firstName && u.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    return (u.name || u.email || 'U').substring(0, 2).toUpperCase();
  };

  const getRoleBadgeClass = (role) => {
    const r = (role || '').toLowerCase().replace(/\s+/g, '-');
    if (r === 'owner') return 'role-owner';
    if (r === 'tenant') return 'role-tenant';
    if (r.includes('guard')) return 'role-guard';
    if (r === 'admin') return 'role-admin';
    return 'role-default';
  };

  return (
    <div className="admin-crm-workspace">
      {/* =====================================================================
          CENTRAL CONTENT & DIRECTORY PANEL
          ===================================================================== */}
      <div className="admin-crm-central-panel">
        {/* Page Header */}
        <header className="admin-page-header">
          <div className="admin-page-title-group">
            <h1>User Moderation & Directory</h1>
            <p>Inspect platform accounts, review live tenant/owner activity, and moderate permissions</p>
          </div>
          <div className="admin-page-header-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={fetchUsers}
              disabled={loading}
              title="Refresh users directory"
            >
              <RotateCw size={15} className={loading ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Feedback Alert */}
        {actionSuccess && (
          <div className="admin-feedback-banner success">
            <div className="feedback-content">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              className="feedback-dismiss-btn"
              onClick={() => setActionSuccess(null)}
              aria-label="Dismiss feedback"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Admin KPI Summary Statistics */}
        <section className="admin-stats-row">
          <div
            className={`admin-stat-card navy ${selectedRole === 'All' ? 'active-filter' : ''}`}
            onClick={() => { setSelectedRole('All'); setSelectedStatus('All'); }}
            role="button"
            tabIndex={0}
            title="All Registered Users"
          >
            <div className="stat-card-icon">
              <Layers size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Total Users</span>
              <span className="stat-card-value">{loading ? '—' : users.length}</span>
              <span className="stat-card-sub">Platform-wide</span>
            </div>
          </div>

          <div
            className={`admin-stat-card amber ${selectedRole === 'Owner' ? 'active-filter' : ''}`}
            onClick={() => setSelectedRole('Owner')}
            role="button"
            tabIndex={0}
            title="Filter by Property Owners"
          >
            <div className="stat-card-icon">
              <Building2 size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Property Owners</span>
              <span className="stat-card-value">{loading ? '—' : totalOwners}</span>
              <span className="stat-card-sub">Listing landlords</span>
            </div>
          </div>

          <div
            className={`admin-stat-card emerald ${selectedRole === 'Tenant' ? 'active-filter' : ''}`}
            onClick={() => setSelectedRole('Tenant')}
            role="button"
            tabIndex={0}
            title="Filter by Tenants"
          >
            <div className="stat-card-icon">
              <User size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Active Tenants</span>
              <span className="stat-card-value">{loading ? '—' : totalTenants}</span>
              <span className="stat-card-sub">Renters & buyers</span>
            </div>
          </div>

          <div
            className={`admin-stat-card blue ${selectedRole === 'Security Guard' ? 'active-filter' : ''}`}
            onClick={() => setSelectedRole('Security Guard')}
            role="button"
            tabIndex={0}
            title="Filter by Security Guards"
          >
            <div className="stat-card-icon">
              <Shield size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Security Guards</span>
              <span className="stat-card-value">{loading ? '—' : totalGuards}</span>
              <span className="stat-card-sub">Building staff</span>
            </div>
          </div>

          <div
            className={`admin-stat-card rose ${selectedStatus === 'Banned' ? 'active-filter' : ''}`}
            onClick={() => setSelectedStatus(selectedStatus === 'Banned' ? 'All' : 'Banned')}
            role="button"
            tabIndex={0}
            title="Filter by Suspended Users"
          >
            <div className="stat-card-icon">
              <Ban size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Suspended</span>
              <span className="stat-card-value">{loading ? '—' : totalBanned}</span>
              <span className="stat-card-sub">Access revoked</span>
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section className="admin-filters-card">
          <div className="admin-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by full name, email, username, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="admin-filter-controls">
            {/* Role Filter */}
            <div className="filter-group">
              <select
                className="admin-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                aria-label="Filter by role"
              >
                <option value="All">All Roles</option>
                <option value="Owner">Owners</option>
                <option value="Tenant">Tenants</option>
                <option value="Security Guard">Security Guards</option>
                <option value="Service Provider">Service Providers</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <select
                className="admin-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by account status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Banned">Suspended Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Records Section */}
        <section className="admin-records-section">
          {loading ? (
            <TableSkeleton rows={7} columns={7} />
          ) : error ? (
            <div className="admin-error-box">
              <AlertTriangle size={32} color="#DC2626" />
              <h3>Unable to Load User Directory</h3>
              <p>{error}</p>
              <button type="button" className="admin-btn-primary" onClick={fetchUsers}>
                <RotateCw size={14} /> Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty-box">
              <div className="empty-icon-wrap">
                <User size={36} color="#64748B" />
              </div>
              <h3>No Users Found</h3>
              <p>No user records match your selected search or filter criteria.</p>
              {(searchTerm || selectedRole !== 'All' || selectedStatus !== 'All') && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedRole('All');
                    setSelectedStatus('All');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ================= DESKTOP USER DIRECTORY TABLE ================= */}
              <div className="admin-table-container">
                <table className="admin-review-table admin-users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Activity / Portfolio</th>
                      <th>Joined</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUser?._id === u._id;
                      const fullName = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.name || 'Anonymous User');
                      const initials = getUserInitials(u);
                      const isDropdownOpen = actionMenuOpenId === u._id;

                      return (
                        <tr
                          key={u._id}
                          className={`admin-table-row ${isSelected ? 'selected' : ''} ${u.isBanned ? 'row-banned' : ''}`}
                          onClick={() => setSelectedUser(u)}
                        >
                          {/* User Avatar & Name */}
                          <td className="admin-col-user">
                            <div className="admin-user-cell">
                              <div className={`admin-user-avatar ${getRoleBadgeClass(u.role)}`}>
                                <span>{initials}</span>
                              </div>
                              <div className="admin-user-identity">
                                <span className="admin-user-name" title={fullName}>
                                  {fullName}
                                </span>
                                <span className="admin-user-handle">@{u.name || u.email?.split('@')[0]}</span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="admin-col-contact">
                            <div className="admin-contact-cell">
                              <span className="contact-line" title={u.email}>
                                <Mail size={12} className="contact-icon" />
                                <span>{u.email}</span>
                              </span>
                              {u.phoneNumber && (
                                <span className="contact-line">
                                  <Phone size={12} className="contact-icon" />
                                  <span>{u.phoneNumber}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="admin-col-role">
                            <span className={`admin-role-pill ${getRoleBadgeClass(u.role)}`}>
                              {u.role || 'Tenant'}
                            </span>
                          </td>

                          {/* Account Status */}
                          <td className="admin-col-status">
                            {u.isBanned ? (
                              <span className="admin-status-pill rejected">
                                <Ban size={12} />
                                <span>Suspended</span>
                              </span>
                            ) : (
                              <span className="admin-status-pill approved">
                                <CheckCircle2 size={12} />
                                <span>Active</span>
                              </span>
                            )}
                          </td>

                          {/* Activity / Portfolio */}
                          <td className="admin-col-portfolio">
                            <div className="admin-portfolio-pills">
                              {u.role === 'Owner' && (
                                <span className="portfolio-pill" title="Properties listed">
                                  <Building2 size={11} /> {u.stats?.properties || 0} Props
                                </span>
                              )}
                              {u.role === 'Tenant' && (
                                <span className="portfolio-pill" title="Active leases">
                                  <ArrowLeftRight size={11} /> {u.stats?.rents || 0} Leases
                                </span>
                              )}
                              <span className="portfolio-pill" title="Requests & inquiries">
                                <Mail size={11} /> {u.stats?.requests || 0} Reqs
                              </span>
                              {u.stats?.payments > 0 && (
                                <span className="portfolio-pill" title="Payment transactions">
                                  <FileText size={11} /> {u.stats.payments} Pays
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td className="admin-col-date">
                            <span className="date-text">
                              {new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </td>

                          {/* Actions Menu */}
                          <td className="admin-col-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-user-actions-group">
                              <button
                                type="button"
                                className="admin-btn-action review"
                                onClick={() => setSelectedUser(u)}
                                title="Inspect user details"
                              >
                                <Eye size={13} />
                                <span>Activity</span>
                              </button>

                              <button
                                type="button"
                                className="admin-btn-action edit"
                                onClick={() => handleOpenEdit(u)}
                                title="Edit user profile"
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>

                              {/* Three-dot dropdown menu */}
                              <div className="admin-dropdown-wrap" ref={isDropdownOpen ? dropdownRef : null}>
                                <button
                                  type="button"
                                  className="admin-btn-action more"
                                  onClick={() => setActionMenuOpenId(isDropdownOpen ? null : u._id)}
                                  title="More actions"
                                  aria-expanded={isDropdownOpen}
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {isDropdownOpen && (
                                  <div className="admin-actions-dropdown">
                                    <button
                                      type="button"
                                      className="admin-dropdown-item"
                                      onClick={() => handleInspectUser(u._id)}
                                    >
                                      <FileText size={13} />
                                      <span>View Full Dossier</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-dropdown-item"
                                      onClick={() => handleOpenPasswordReset(u)}
                                    >
                                      <Key size={13} />
                                      <span>Reset Password</span>
                                    </button>

                                    {u.isBanned ? (
                                      <button
                                        type="button"
                                        className="admin-dropdown-item emerald-item"
                                        onClick={() => handleUnbanUser(u._id, u.name)}
                                        disabled={actionInProgress}
                                      >
                                        <Unlock size={13} />
                                        <span>Reactivate Account</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="admin-dropdown-item amber-item"
                                        onClick={() => handleBanUser(u._id, u.name)}
                                        disabled={actionInProgress}
                                      >
                                        <Ban size={13} />
                                        <span>Suspend Account</span>
                                      </button>
                                    )}

                                    <div className="admin-dropdown-divider" />

                                    <button
                                      type="button"
                                      className="admin-dropdown-item danger-item"
                                      onClick={() => handleDeleteUser(u._id, u.name)}
                                      disabled={actionInProgress}
                                    >
                                      <Trash2 size={13} />
                                      <span>Delete User</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ================= RESPONSIVE STACKED CARDS (Tablet & Mobile) ================= */}
              <div className="admin-stacked-cards-list">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUser?._id === u._id;
                  const fullName = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.name || 'Anonymous User');
                  const initials = getUserInitials(u);
                  const isDropdownOpen = actionMenuOpenId === `mobile-${u._id}`;

                  return (
                    <div
                      key={`stacked-user-${u._id}`}
                      className={`admin-stacked-card ${isSelected ? 'selected' : ''} ${u.isBanned ? 'row-banned' : ''}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="stacked-card-main">
                        <div className={`admin-user-avatar large ${getRoleBadgeClass(u.role)}`}>
                          <span>{initials}</span>
                        </div>

                        <div className="stacked-card-info">
                          <div className="stacked-card-title-row">
                            <h4 className="stacked-prop-title">{fullName}</h4>
                            <div className="stacked-badges-cluster">
                              <span className={`admin-role-pill ${getRoleBadgeClass(u.role)}`}>
                                {u.role || 'Tenant'}
                              </span>
                              {u.isBanned ? (
                                <span className="admin-status-pill rejected">Suspended</span>
                              ) : (
                                <span className="admin-status-pill approved">Active</span>
                              )}
                            </div>
                          </div>

                          <div className="stacked-user-meta-lines">
                            <div className="meta-line">
                              <Mail size={12} className="meta-icon" />
                              <span>{u.email}</span>
                            </div>
                            {u.phoneNumber && (
                              <div className="meta-line">
                                <Phone size={12} className="meta-icon" />
                                <span>{u.phoneNumber}</span>
                              </div>
                            )}
                            <div className="meta-line">
                              <Calendar size={12} className="meta-icon" />
                              <span>Joined {new Date(u.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="stacked-activity-pills-row">
                            <span className="portfolio-pill">
                              <Building2 size={11} /> {u.stats?.properties || 0} Props
                            </span>
                            <span className="portfolio-pill">
                              <ArrowLeftRight size={11} /> {u.stats?.rents || 0} Leases
                            </span>
                            <span className="portfolio-pill">
                              <Mail size={11} /> {u.stats?.requests || 0} Reqs
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="stacked-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="admin-btn-action review"
                          onClick={() => setSelectedUser(u)}
                        >
                          <Eye size={13} />
                          <span>View Profile</span>
                        </button>

                        <button
                          type="button"
                          className="admin-btn-action edit"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>

                        <div className="admin-dropdown-wrap" ref={isDropdownOpen ? dropdownRef : null}>
                          <button
                            type="button"
                            className="admin-btn-action more"
                            onClick={() => setActionMenuOpenId(isDropdownOpen ? null : `mobile-${u._id}`)}
                          >
                            <MoreVertical size={14} />
                          </button>

                          {isDropdownOpen && (
                            <div className="admin-actions-dropdown">
                              <button
                                type="button"
                                className="admin-dropdown-item"
                                onClick={() => handleInspectUser(u._id)}
                              >
                                <FileText size={13} />
                                <span>Full Dossier</span>
                              </button>
                              <button
                                type="button"
                                className="admin-dropdown-item"
                                onClick={() => handleOpenPasswordReset(u)}
                              >
                                <Key size={13} />
                                <span>Reset Password</span>
                              </button>
                              {u.isBanned ? (
                                <button
                                  type="button"
                                  className="admin-dropdown-item emerald-item"
                                  onClick={() => handleUnbanUser(u._id, u.name)}
                                >
                                  <Unlock size={13} />
                                  <span>Reactivate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-dropdown-item amber-item"
                                  onClick={() => handleBanUser(u._id, u.name)}
                                >
                                  <Ban size={13} />
                                  <span>Suspend</span>
                                </button>
                              )}
                              <div className="admin-dropdown-divider" />
                              <button
                                type="button"
                                className="admin-dropdown-item danger-item"
                                onClick={() => handleDeleteUser(u._id, u.name)}
                              >
                                <Trash2 size={13} />
                                <span>Delete User</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* =====================================================================
          RIGHT-SIDE CONTEXTUAL USER INFORMATION PANEL
          Rendered only when a user is actively selected
          ===================================================================== */}
      {selectedUser && (
        <>
          {/* Drawer backdrop for tablet/mobile overlays */}
          <div
            className="admin-crm-drawer-backdrop"
            onClick={() => setSelectedUser(null)}
            aria-hidden="true"
          />

          <aside className="admin-crm-detail-panel open">
            {/* Detail Header */}
            <div className="crm-detail-header">
              <div className="crm-detail-header-main">
                <div className="crm-detail-badges-row">
                  <span className={`admin-role-pill ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role || 'Tenant'}
                  </span>
                  {selectedUser.isBanned ? (
                    <span className="admin-status-pill rejected">
                      <Ban size={12} />
                      <span>Suspended</span>
                    </span>
                  ) : (
                    <span className="admin-status-pill approved">
                      <CheckCircle2 size={12} />
                      <span>Active</span>
                    </span>
                  )}
                </div>
                <h2 className="crm-detail-title">
                  {selectedUser.firstName && selectedUser.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : (selectedUser.name || 'Anonymous User')}
                </h2>
                <p className="crm-detail-address">
                  <User size={13} /> @{selectedUser.name || selectedUser.email?.split('@')[0]}
                </p>
              </div>
              <button
                type="button"
                className="crm-detail-close-btn"
                onClick={() => setSelectedUser(null)}
                aria-label="Close detail panel"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="crm-detail-body">
              {/* User Avatar & Headline Card */}
              <div className="crm-detail-card user-hero-card">
                <div className="user-hero-top">
                  <div className={`admin-user-avatar hero-size ${getRoleBadgeClass(selectedUser.role)}`}>
                    <span>{getUserInitials(selectedUser)}</span>
                  </div>
                  <div className="user-hero-titles">
                    <h3>
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : (selectedUser.name || 'Anonymous User')}
                    </h3>
                    <span className="user-hero-email">{selectedUser.email}</span>
                    <span className="user-hero-joined">
                      Member since {new Date(selectedUser.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Profile Key-Values */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">User Profile Details</h3>
                <div className="crm-key-value-grid">
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Full Name</span>
                    <span className="crm-kv-val">
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : (selectedUser.name || '—')}
                    </span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Username</span>
                    <span className="crm-kv-val">@{selectedUser.name || '—'}</span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Email Address</span>
                    <span className="crm-kv-val text-break">{selectedUser.email || '—'}</span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Phone Number</span>
                    <span className="crm-kv-val">{selectedUser.phoneNumber || 'Not provided'}</span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Residential Address</span>
                    <span className="crm-kv-val">{selectedUser.address || 'Not provided'}</span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Account Role</span>
                    <span className="crm-kv-val">{selectedUser.role || 'Tenant'}</span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Account Status</span>
                    <span className={`crm-kv-val ${selectedUser.isBanned ? 'text-danger' : 'text-success'}`}>
                      {selectedUser.isBanned ? 'Suspended (Access Revoked)' : 'Active & Verified'}
                    </span>
                  </div>

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Registration Date</span>
                    <span className="crm-kv-val">
                      {new Date(selectedUser.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Activity Overview Tiles */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Activity Overview</h3>
                <div className="crm-specs-tiles-grid">
                  <div className="crm-spec-tile">
                    <Building2 size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Properties</span>
                    <span className="spec-tile-val">{selectedUser.stats?.properties || 0}</span>
                  </div>

                  <div className="crm-spec-tile">
                    <ArrowLeftRight size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Active Rents</span>
                    <span className="spec-tile-val">{selectedUser.stats?.rents || 0}</span>
                  </div>

                  <div className="crm-spec-tile">
                    <Mail size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Requests</span>
                    <span className="spec-tile-val">{selectedUser.stats?.requests || 0}</span>
                  </div>

                  <div className="crm-spec-tile">
                    <FileText size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Payments</span>
                    <span className="spec-tile-val">{selectedUser.stats?.payments || 0}</span>
                  </div>
                </div>

                <div className="mt-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div className="crm-spec-tile" style={{ flex: 1, minWidth: '8rem' }}>
                    <Wrench size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Maintenance Reports</span>
                    <span className="spec-tile-val">{selectedUser.stats?.maintenanceReports || 0}</span>
                  </div>
                </div>
              </div>

              {/* Administrative Actions Section */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Administrative Actions</h3>
                <div className="admin-actions-stack">
                  <button
                    type="button"
                    className="admin-panel-action-btn primary"
                    onClick={() => handleInspectUser(selectedUser._id)}
                  >
                    <Eye size={15} />
                    <span>View Complete Activity Dossier</span>
                  </button>

                  <button
                    type="button"
                    className="admin-panel-action-btn secondary"
                    onClick={() => handleOpenEdit(selectedUser)}
                  >
                    <Edit size={15} />
                    <span>Edit Profile & Role</span>
                  </button>

                  <button
                    type="button"
                    className="admin-panel-action-btn secondary"
                    onClick={() => handleOpenPasswordReset(selectedUser)}
                  >
                    <Key size={15} />
                    <span>Reset User Password</span>
                  </button>

                  {selectedUser.isBanned ? (
                    <button
                      type="button"
                      className="admin-panel-action-btn emerald"
                      onClick={() => handleUnbanUser(selectedUser._id, selectedUser.name)}
                      disabled={actionInProgress}
                    >
                      <Unlock size={15} />
                      <span>Reactivate Account Access</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-panel-action-btn amber"
                      onClick={() => handleBanUser(selectedUser._id, selectedUser.name)}
                      disabled={actionInProgress}
                    >
                      <Ban size={15} />
                      <span>Suspend Account Access</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="admin-panel-action-btn danger"
                    onClick={() => handleDeleteUser(selectedUser._id, selectedUser.name)}
                    disabled={actionInProgress}
                  >
                    <Trash2 size={15} />
                    <span>Permanently Delete User</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Detail Sticky Footer */}
            <div className="crm-detail-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => handleInspectUser(selectedUser._id)}
              >
                <Eye size={14} /> Full Dossier
              </button>
            </div>
          </aside>
        </>
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
                <X size={16} />
              </button>
            </div>

            {loadingActivity ? (
              <div style={{ padding: '2.5rem 0' }}>
                <PageLoader message="Aggregating live user activity..." minHeight="200px" />
              </div>
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
                        <p><strong>Account Status:</strong> {selectedUserActivity.user.isBanned ? 'Banned' : 'Active'}</p>
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
                            <p className="item-sub">Address: {p.address}, {p.city}</p>
                            <p className="item-sub">Rent: ৳{p.rent} / month | Type: {p.type} | Created: {new Date(p.createdAt).toLocaleDateString()}</p>
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
                            <p className="item-sub">Property: {r.propertyId?.title || r.propertyId?.address || 'Assigned Property'}</p>
                            <p className="item-sub">Rent Amount: ৳{r.rentAmount} | Due Date: Day {r.dueDate || 1}</p>
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
                            <p className="item-sub">Method: {pm.paymentMethod || 'Stripe'} | Date: {new Date(pm.createdAt).toLocaleString()}</p>
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
                <X size={16} />
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
                  <label>Role</label>
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
                <button
                  type="submit"
                  className="btn-save"
                  disabled={actionInProgress}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {actionInProgress ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Profile Changes'
                  )}
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
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSavePasswordReset} className="admin-modal-form">
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
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
                <button
                  type="submit"
                  className="btn-save"
                  disabled={actionInProgress || newAdminPassword.length < 6}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {actionInProgress ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Set New Password'
                  )}
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
