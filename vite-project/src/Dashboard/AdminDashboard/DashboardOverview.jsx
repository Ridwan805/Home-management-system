import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
  RotateCw,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  CreditCard,
  Wrench,
  Check,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import API from '../../config/api';
import { DashboardCardSkeleton, TableSkeleton } from '../../components/loading';
import './adminDashboard.css';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `৳${Number(amount).toLocaleString('en-US')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const DashboardOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    approvedProperties: 0,
    rejectedProperties: 0,
    unresolvedReports: 0,
    totalReports: 0
  });

  const [recentActivity, setRecentActivity] = useState({
    recentUsers: [],
    recentProperties: [],
    recentPayments: [],
    recentReports: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const token = user.token || user.accessToken || (user.user && user.user.token) || localStorage.getItem('token');

      if (!token) {
        setError('You must be logged in as an administrator to view platform metrics.');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, activityRes] = await Promise.all([
        axios.get(API.getUrl(API.endpoints.adminStats), { headers }).catch((e) => {
          console.error('Stats error:', e);
          return { data: null };
        }),
        axios.get(API.getUrl(API.endpoints.adminRecentActivity), { headers }).catch((e) => {
          console.error('Recent activity error:', e);
          return { data: { recentUsers: [], recentProperties: [], recentPayments: [], recentReports: [] } };
        })
      ]);

      const data = statsRes?.data || {};
      if (statsRes?.data) {
        setStats({
          totalUsers: data.totalUsers || 0,
          totalProperties: data.totalProperties || 0,
          pendingProperties: data.pendingProperties || 0,
          approvedProperties: data.approvedProperties || data.activeProperties || 0,
          rejectedProperties: data.rejectedProperties || 0,
          unresolvedReports: data.unresolvedReports || data.totalBookings || 0,
          totalReports: data.totalReports || 0
        });
      } else {
        setError('Could not connect to live statistics service. Displaying cached dashboard state.');
      }

      setRecentActivity(activityRes?.data || { recentUsers: [], recentProperties: [], recentPayments: [], recentReports: [] });
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Failed to load system dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const pendingListings = recentActivity.recentProperties
    ? recentActivity.recentProperties.filter((p) => p.status === 'pending')
    : [];

  return (
    <div className="admin-overview-page">
      {/* Header */}
      <header className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>System Command Center</h1>
          <p>Real-time platform metrics, property moderation status, user oversight, and active reports</p>
        </div>
        <div className="admin-page-header-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={fetchDashboardData}
            disabled={loading}
            title="Refresh metrics"
          >
            <RotateCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/admin/pending-properties" className="admin-btn-primary">
            <span>Moderate Listings</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="admin-error-box mb-1">
          <AlertTriangle size={20} color="#DC2626" />
          <span>{error}</span>
          <button type="button" className="admin-btn-secondary btn-sm" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      )}

      {/* Metric Summary Cards Grid */}
      {loading ? (
        <div className="admin-stats-grid-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <DashboardCardSkeleton key={`admin-skel-${i}`} />
          ))}
        </div>
      ) : (
        <section className="admin-stats-grid-6">
          {/* Card 1: Pending Moderation */}
          <Link to="/admin/pending-properties" className="admin-stat-card amber clickable">
            <div className="stat-card-icon">
              <Clock size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Pending Review</span>
              <span className="stat-card-value">{stats.pendingProperties}</span>
              <span className="stat-card-sub">Requires admin evaluation</span>
            </div>
          </Link>

          {/* Card 2: Approved Properties */}
          <div className="admin-stat-card emerald">
            <div className="stat-card-icon">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Approved Listings</span>
              <span className="stat-card-value">{stats.approvedProperties}</span>
              <span className="stat-card-sub">Live in public discovery</span>
            </div>
          </div>

          {/* Card 3: Rejected Properties */}
          <div className="admin-stat-card rose">
            <div className="stat-card-icon">
              <XCircle size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Rejected Listings</span>
              <span className="stat-card-value">{stats.rejectedProperties}</span>
              <span className="stat-card-sub">Archived with notes</span>
            </div>
          </div>

          {/* Card 4: Total Properties */}
          <div className="admin-stat-card navy">
            <div className="stat-card-icon">
              <Building2 size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Total Properties</span>
              <span className="stat-card-value">{stats.totalProperties}</span>
              <span className="stat-card-sub">Entire catalog volume</span>
            </div>
          </div>

          {/* Card 5: Registered Users */}
          <Link to="/admin/users" className="admin-stat-card blue clickable">
            <div className="stat-card-icon">
              <Users size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Registered Users</span>
              <span className="stat-card-value">{stats.totalUsers}</span>
              <span className="stat-card-sub">Owners, tenants, guards</span>
            </div>
          </Link>

          {/* Card 6: Active Reports */}
          <Link to="/admin/reports" className="admin-stat-card purple clickable">
            <div className="stat-card-icon">
              <Flag size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Open Reports</span>
              <span className="stat-card-value">{stats.unresolvedReports}</span>
              <span className="stat-card-sub">Unresolved system reports</span>
            </div>
          </Link>
        </section>
      )}

      {/* Quick Action Navigation Panels */}
      <section className="admin-quick-hub-grid">
        <Link to="/admin/pending-properties" className="admin-quick-hub-card">
          <div className="hub-card-icon amber">
            <Building2 size={22} />
          </div>
          <div className="hub-card-content">
            <h3>Property Moderation Queue</h3>
            <p>Inspect specifications, floor plans, and proof of ownership to approve or reject listings.</p>
            <span className="hub-card-link">
              View Pending Approvals ({stats.pendingProperties}) <ArrowRight size={13} />
            </span>
          </div>
        </Link>

        <Link to="/admin/users" className="admin-quick-hub-card">
          <div className="hub-card-icon blue">
            <Users size={22} />
          </div>
          <div className="hub-card-content">
            <h3>User Moderation & Profiles</h3>
            <p>Manage user roles, monitor tenancy ledgers, reset passwords, or restrict abusive accounts.</p>
            <span className="hub-card-link">
              Inspect User Accounts ({stats.totalUsers}) <ArrowRight size={13} />
            </span>
          </div>
        </Link>

        <Link to="/admin/reports" className="admin-quick-hub-card">
          <div className="hub-card-icon purple">
            <Flag size={22} />
          </div>
          <div className="hub-card-content">
            <h3>Incident & Platform Reports</h3>
            <p>Investigate tenant maintenance tickets, guard disputes, and user feedback.</p>
            <span className="hub-card-link">
              Resolve Open Reports ({stats.unresolvedReports}) <ArrowRight size={13} />
            </span>
          </div>
        </Link>
      </section>

      {/* Moderation Preview: Pending Listings Awaiting Action */}
      <section className="admin-section-block">
        <div className="section-block-header">
          <div>
            <h2>Pending Listings Queue</h2>
            <p>Properties recently submitted by owners awaiting administrative approval</p>
          </div>
          <Link to="/admin/pending-properties" className="section-block-link">
            Open Full Queue <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <TableSkeleton rows={3} columns={5} />
        ) : pendingListings.length === 0 ? (
          <div className="admin-empty-callout">
            <CheckCircle2 size={32} color="#059669" />
            <div>
              <h4>Queue is clear</h4>
              <p>There are currently no property listings waiting for review. All submissions are up to date.</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-review-table">
              <thead>
                <tr>
                  <th>Property Name / Address</th>
                  <th>Owner</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingListings.map((prop) => (
                  <tr key={prop._id}>
                    <td>
                      <div className="admin-title-cell">
                        <span className="prop-name">{prop.title || prop.address}</span>
                        <span className="prop-address">{prop.address}</span>
                      </div>
                    </td>
                    <td>
                      <div className="prop-owner-cell">
                        <span className="owner-name">{prop.owner?.name || prop.owner?.firstName || (typeof prop.owner === 'string' ? prop.owner : 'Verified Owner')}</span>
                        <span className="owner-contact">{prop.owner?.email || 'Registered Contact'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="date-text">{formatDate(prop.createdAt)}</span>
                    </td>
                    <td>
                      <span className="admin-status-pill pending">
                        <Clock size={12} /> Pending Review
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn-action review"
                        onClick={() => navigate('/admin/pending-properties')}
                      >
                        <Eye size={13} />
                        <span>Review Listing</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dual Activity Feed: Recent Users & Recent Reports */}
      <section className="admin-activity-grid">
        {/* Recent Registrations */}
        <div className="activity-card">
          <div className="activity-card-header">
            <h3>Recent User Registrations</h3>
            <Link to="/admin/users" className="activity-more-link">
              View All ({stats.totalUsers})
            </Link>
          </div>
          {loading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : !recentActivity.recentUsers || recentActivity.recentUsers.length === 0 ? (
            <p className="no-activity-text">No recent user registrations recorded.</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.recentUsers.slice(0, 5).map((u) => (
                <li key={u._id} className="activity-item">
                  <div className="activity-user-avatar">
                    {(u.name?.[0] || u.email?.[0] || u.firstName?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="activity-item-info">
                    <span className="activity-item-name">{u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email) || 'Platform User'}</span>
                    <span className="activity-item-sub">
                      {u.role || 'User'} &bull; {formatDate(u.createdAt)}
                    </span>
                  </div>
                  {u.isBanned ? (
                    <span className="user-banned-pill">Banned</span>
                  ) : (
                    <span className="user-active-pill">Active</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Reports / Maintenance Tickets */}
        <div className="activity-card">
          <div className="activity-card-header">
            <h3>Recent Platform Reports</h3>
            <Link to="/admin/reports" className="activity-more-link">
              View All Reports
            </Link>
          </div>
          {loading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : !recentActivity.recentReports || recentActivity.recentReports.length === 0 ? (
            <p className="no-activity-text">No active reports filed.</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.recentReports.slice(0, 5).map((r) => (
                <li key={r._id} className="activity-item">
                  <div className="activity-report-icon">
                    <Flag size={14} />
                  </div>
                  <div className="activity-item-info">
                    <span className="activity-item-name">{r.title || 'Platform Incident Report'}</span>
                    <span className="activity-item-sub">
                      {r.category || 'General'} &bull; {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <span className={`report-status-pill ${(r.status || 'open').toLowerCase()}`}>
                    {r.status || 'Open'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
