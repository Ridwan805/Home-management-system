import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DashboardHome = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
        const res = await axios.get('http://localhost:5000/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setMetrics(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load dashboard metrics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="dashboard-overview">
      <h2>Dashboard Overview</h2>
      {loading ? (
        <div className="loading-spinner">Loading metrics...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : metrics ? (
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Total Users</h3>
            <p className="metric-value">{metrics.totalUsers}</p>
          </div>
          <div className="metric-card">
            <h3>Active Properties</h3>
            <p className="metric-value">{metrics.activeProperties}</p>
          </div>
          <div className="metric-card">
            <h3>Pending Properties</h3>
            <p className="metric-value">{metrics.pendingProperties}</p>
          </div>
          <div className="metric-card">
            <h3>Unresolved Reports</h3>
            <p className="metric-value">{metrics.unresolvedReports}</p>
          </div>
        </div>
      ) : (
        <p>No metrics available</p>
      )}
    </div>
  );
};

export default DashboardHome;
