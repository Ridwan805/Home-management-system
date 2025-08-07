import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaTrash, FaBan, FaExclamationTriangle, FaFlag, FaUser, FaExclamationCircle } from 'react-icons/fa';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to view reports');
        setLoading(false);
        return;
      }
      
      const res = await axios.get('http://localhost:5000/api/admin/reports', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDeleteReport = async (id) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.delete(`http://localhost:5000/api/admin/reports/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setReports(reports.filter(report => report._id !== id));
      setError(null);
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`http://localhost:5000/api/admin/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Update UI to show user is banned
      setReports(reports.map(report => {
        if (report.reportedUser?._id === userId) {
          return { ...report, reportedUser: { ...report.reportedUser, isBanned: true } };
        }
        return report;
      }));
      setError(null);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };
  
  const handleEscalateToLegal = async (reportId) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`http://localhost:5000/api/admin/reports/${reportId}/escalate`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Update UI to show report is escalated
      setReports(reports.map(report => {
        if (report._id === reportId) {
          return { ...report, status: 'escalated' };
        }
        return report;
      }));
      setError(null);
    } catch (err) {
      console.error('Error escalating report:', err);
      setError('Failed to escalate report. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="report-management">
      <h2>Report Management</h2>
      {loading ? (
        <div className="loading-spinner">Loading reports...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button className="retry-button" onClick={fetchReports}>
            Retry
          </button>
        </div>
      ) : (
        <div className="reports-list">
          {reports.length === 0 ? (
            <p className="no-reports">No reports found.</p>
          ) : (
            reports.map((report) => (
              <div key={report._id} className={`report-card ${actionInProgress ? 'action-in-progress' : ''}`}>
                <div className="report-header">
                  <div className="report-type">
                    <FaFlag className="report-icon" />
                    <h3>Report Type: {report.type}</h3>
                  </div>
                  <div className="report-status">
                    <span className={`status-badge status-${report.status || 'pending'}`}>
                      {report.status === 'escalated' ? <FaExclamationTriangle /> : <FaExclamationCircle />}
                      {report.status || 'pending'}
                    </span>
                  </div>
                </div>
                
                <div className="report-details">
                  <div className="report-detail-item">
                    <FaUser className="detail-icon" />
                    <p><strong>Reported by:</strong> {report.reportedBy?.name || 'Unknown'}</p>
                  </div>
                  
                  <div className="report-detail-item">
                    <FaUser className="detail-icon" />
                    <p><strong>Reported User:</strong> {report.reportedUser?.name || 'Unknown'}</p>
                    {report.reportedUser?.isBanned && <span className="user-banned-tag">Banned</span>}
                  </div>
                </div>
                
                <div className="report-description">
                  <p><strong>Description:</strong></p>
                  <p>{report.description}</p>
                </div>
                
                <div className="report-actions">
                  <button 
                    onClick={() => handleDeleteReport(report._id)} 
                    className="delete-btn"
                    disabled={actionInProgress}
                  >
                    <FaTrash className="btn-icon" /> Delete Report
                  </button>
                  <button 
                    onClick={() => handleBanUser(report.reportedUser?._id)} 
                    className="ban-btn"
                    disabled={actionInProgress || !report.reportedUser || report.reportedUser.isBanned}
                  >
                    <FaBan className="btn-icon" /> {report.reportedUser?.isBanned ? 'User Banned' : 'Ban User'}
                  </button>
                  <button 
                    onClick={() => handleEscalateToLegal(report._id)} 
                    className="escalate-btn"
                    disabled={actionInProgress || report.status === 'escalated'}
                  >
                    <FaExclamationTriangle className="btn-icon" /> {report.status === 'escalated' ? 'Escalated' : 'Escalate to Legal'}
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

export default ReportManagement;
