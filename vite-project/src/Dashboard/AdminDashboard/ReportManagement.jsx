import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
        const res = await axios.get('http://localhost:5000/api/admin/reports', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setReports(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDeleteReport = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.delete(`http://localhost:5000/api/admin/reports/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setReports(reports.filter(report => report._id !== id));
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report. Please try again.');
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
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
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user. Please try again.');
    }
  };
  
  const handleEscalateToLegal = async (reportId) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
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
    } catch (err) {
      console.error('Error escalating report:', err);
      setError('Failed to escalate report. Please try again.');
    }
  };

  return (
    <div className="report-management">
      <h2>Report Management</h2>
      {loading ? (
        <div className="loading-spinner">Loading reports...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="reports-list">
          {reports.length === 0 ? (
            <p className="no-reports">No reports found.</p>
          ) : (
            reports.map((report) => (
              <div key={report._id} className="report-card">
                <h3>Report Type: {report.type}</h3>
                <p><strong>Reported by:</strong> {report.reportedBy?.name || 'Unknown'}</p>
                <p><strong>Reported User:</strong> {report.reportedUser?.name || 'Unknown'}</p>
                <p><strong>Description:</strong> {report.description}</p>
                <p><strong>Status:</strong> <span className={`status-${report.status || 'pending'}`}>{report.status || 'pending'}</span></p>
                <div className="report-actions">
                  <button 
                    onClick={() => handleDeleteReport(report._id)} 
                    className="delete-btn"
                  >
                    Delete Report
                  </button>
                  <button 
                    onClick={() => handleBanUser(report.reportedUser?._id)} 
                    className="ban-btn"
                    disabled={!report.reportedUser || report.reportedUser.isBanned}
                  >
                    {report.reportedUser?.isBanned ? 'User Banned' : 'Ban User'}
                  </button>
                  <button 
                    onClick={() => handleEscalateToLegal(report._id)} 
                    className="escalate-btn"
                    disabled={report.status === 'escalated'}
                  >
                    {report.status === 'escalated' ? 'Escalated' : 'Escalate to Legal'}
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
