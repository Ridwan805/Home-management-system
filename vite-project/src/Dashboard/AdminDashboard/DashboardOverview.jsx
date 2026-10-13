import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API from '../../config/api';
import { 
  FaUsers, FaHome, FaHourglassHalf, FaCalendarCheck, 
  FaUserPlus, FaFileInvoiceDollar, FaTools, FaBolt, FaArrowRight 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    totalBookings: 0
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
      
      if (!user.token) {
        setError('You must be logged in to view dashboard statistics');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${user.token}` };
      
      const [statsRes, activityRes] = await Promise.all([
        axios.get(API.getUrl(API.endpoints.adminStats), { headers }).catch(e => {
          console.error('Stats error:', e);
          return { data: { totalUsers: 0, totalProperties: 0, pendingProperties: 0, totalBookings: 0 } };
        }),
        axios.get(API.getUrl(API.endpoints.adminRecentActivity), { headers }).catch(e => {
          console.error('Recent activity error:', e);
          return { data: { recentUsers: [], recentProperties: [], recentPayments: [], recentReports: [] } };
        })
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="dashboard-overview">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>System Command Center</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            Live platform overview, metrics, and user activity monitor
          </p>
        </div>
        <Link 
          to="/admin/users" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '10px 18px', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            fontWeight: 600, 
            fontSize: '0.9rem' 
          }}
        >
          Manage All Users <FaArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading platform dashboard & live feed...</div>
      ) : error ? (
        <div className="error-message" style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          Failed to load dashboard statistics. Please try again later.
          <button 
            className="retry-button" 
            onClick={fetchDashboardData}
            style={{ 
              marginTop: '15px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '8px 20px', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon users-icon">
                <FaUsers size={24} />
              </div>
              <div className="metric-content">
                <h3>Total Registered Users</h3>
                <p className="metric-value">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon properties-icon">
                <FaHome size={24} />
              </div>
              <div className="metric-content">
                <h3>Total Properties</h3>
                <p className="metric-value">{stats.totalProperties}</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon pending-icon">
                <FaHourglassHalf size={24} />
              </div>
              <div className="metric-content">
                <h3>Pending Verifications</h3>
                <p className="metric-value">{stats.pendingProperties}</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon bookings-icon">
                <FaCalendarCheck size={24} />
              </div>
              <div className="metric-content">
                <h3>Total Bookings</h3>
                <p className="metric-value">{stats.totalBookings}</p>
              </div>
            </div>
          </div>

          {/* Live Platform Activity Section */}
          <div className="live-activity-section">
            <h3>
              <span className="live-pulse-dot"></span>
              Live Platform Activity Streams
            </h3>
            
            <div className="activity-stream-grid">
              {/* Stream 1: Recent Users */}
              <div className="stream-card">
                <div className="stream-card-header">
                  <FaUserPlus color="#3b82f6" /> Recent Registrations
                </div>
                <div className="stream-list">
                  {!recentActivity.recentUsers?.length ? (
                    <div className="stream-empty">No recent registrations</div>
                  ) : (
                    recentActivity.recentUsers.map((u) => (
                      <div key={u._id} className="stream-item">
                        <div className="stream-item-main">
                          <span>{u.name}</span>
                          <span className={`status-badge ${u.isBanned ? 'status-banned' : 'status-active'}`}>
                            {u.role}
                          </span>
                        </div>
                        <span className="stream-item-sub">{u.email}</span>
                        <span className="stream-item-sub" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stream 2: Recent Properties */}
              <div className="stream-card">
                <div className="stream-card-header">
                  <FaHome color="#10b981" /> Recent Properties
                </div>
                <div className="stream-list">
                  {!recentActivity.recentProperties?.length ? (
                    <div className="stream-empty">No recent properties</div>
                  ) : (
                    recentActivity.recentProperties.map((p) => (
                      <div key={p._id} className="stream-item">
                        <div className="stream-item-main">
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title}
                          </span>
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            ${p.price}
                          </span>
                        </div>
                        <span className="stream-item-sub">{p.propertyType || 'Property'} • {p.city || p.location || 'Location'}</span>
                        <span className="stream-item-sub" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Status: {p.status || 'Pending'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stream 3: Recent Payments */}
              <div className="stream-card">
                <div className="stream-card-header">
                  <FaFileInvoiceDollar color="#8b5cf6" /> Recent Payments
                </div>
                <div className="stream-list">
                  {!recentActivity.recentPayments?.length ? (
                    <div className="stream-empty">No recent payments</div>
                  ) : (
                    recentActivity.recentPayments.map((pm) => (
                      <div key={pm._id} className="stream-item">
                        <div className="stream-item-main">
                          <span style={{ fontWeight: 600, color: '#16a34a' }}>+${pm.amount}</span>
                          <span className="status-badge status-active">
                            {pm.status || 'Paid'}
                          </span>
                        </div>
                        <span className="stream-item-sub">By: {pm.user?.name || pm.tenant?.name || 'User'}</span>
                        <span className="stream-item-sub" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(pm.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stream 4: Recent Maintenance */}
              <div className="stream-card">
                <div className="stream-card-header">
                  <FaTools color="#f59e0b" /> Recent Maintenance Reports
                </div>
                <div className="stream-list">
                  {!recentActivity.recentReports?.length ? (
                    <div className="stream-empty">No recent maintenance reports</div>
                  ) : (
                    recentActivity.recentReports.map((r) => (
                      <div key={r._id} className="stream-item">
                        <div className="stream-item-main">
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title}
                          </span>
                          <span className="status-badge">
                            {r.priority || 'Normal'}
                          </span>
                        </div>
                        <span className="stream-item-sub">{r.category || 'General'} • {r.status || 'Open'}</span>
                        <span className="stream-item-sub" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardOverview;

