import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import API from '../../config/api';
import { FaUsers, FaHome, FaHourglassHalf, FaCalendarCheck } from 'react-icons/fa';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    totalBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to view dashboard statistics');
        setLoading(false);
        return;
      }
      
      const res = await axios.get(API.getUrl(API.endpoints.adminStats), {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div className="dashboard-overview">
      <h2>Dashboard Overview</h2>
      {loading ? (
        <div className="loading-spinner">Loading dashboard statistics...</div>
      ) : error ? (
        <div className="error-message" style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          Failed to load dashboard statistics. Please try again later.
          <button 
            className="retry-button" 
            onClick={fetchDashboardStats}
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
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon users-icon">
              <FaUsers size={24} />
            </div>
            <div className="metric-content">
              <h3>Total Users</h3>
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
              <h3>Pending Properties</h3>
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
      )}
    </div>
  );
};

export default DashboardOverview;
