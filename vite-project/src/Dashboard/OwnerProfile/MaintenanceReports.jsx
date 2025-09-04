import React, { useState, useEffect } from 'react';
import './MaintenanceReports.css';
import { getOwnerReports, updateReportStatus, resolveReport, addReportUpdate } from '../../config/api';

const MaintenanceReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getOwnerReports();
      if (response.success) {
        setReports(response.data);
        setError(''); // Clear any previous errors
      } else {
        setError(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      setError('Error fetching maintenance reports');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      setActionLoading(true);
      const response = await updateReportStatus(reportId, { status: newStatus });
      if (response.success) {
        await fetchReports(); // Refresh the list
        setError('');
      } else {
        setError(response.message || 'Failed to update status');
      }
    } catch (err) {
      setError('Error updating report status');
      console.error('Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport || !resolutionNotes.trim()) {
      setError('Resolution notes are required');
      return;
    }

    try {
      setActionLoading(true);
      const response = await resolveReport(selectedReport._id, {
        resolutionNotes: resolutionNotes.trim(),
        actualCost: actualCost ? parseFloat(actualCost) : undefined
      });
      
      if (response.success) {
        await fetchReports();
        setShowModal(false);
        setSelectedReport(null);
        setResolutionNotes('');
        setActualCost('');
        setError('');
      } else {
        setError(response.message || 'Failed to resolve report');
      }
    } catch (err) {
      setError('Error resolving report');
      console.error('Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUpdate = async (reportId) => {
    if (!updateMessage.trim()) {
      setError('Update message is required');
      return;
    }

    try {
      setActionLoading(true);
      const response = await addReportUpdate(reportId, {
        message: updateMessage.trim()
      });
      
      if (response.success) {
        await fetchReports();
        setUpdateMessage('');
        setError('');
      } else {
        setError(response.message || 'Failed to add update');
      }
    } catch (err) {
      setError('Error adding update');
      console.error('Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const statusMatch = statusFilter === 'all' || report.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || report.priority === priorityFilter;
    const searchMatch = searchTerm === '' || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.propertyId?.address && report.propertyId.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.reporterId?.name && report.reporterId.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return statusMatch && priorityMatch && searchMatch;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'low': return 'priority-low';
      case 'medium': return 'priority-medium';
      case 'high': return 'priority-high';
      case 'urgent': return 'priority-urgent';
      default: return 'priority-medium';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="maintenance-reports-loading">Loading maintenance reports...</div>;
  }

  return (
    <div className="maintenance-reports">
      <div className="maintenance-reports-header">
        <div className="header-title-section">
          <h2>Maintenance Reports</h2>
          <div className="reports-summary">
            <span className="total-reports">{filteredReports.length} of {reports.length} reports</span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
          
          <div className="reports-filters">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="reports-grid">
        {!error && filteredReports.length === 0 ? (
          <div className="no-reports">
            <p>No maintenance reports found.</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div key={report._id} className="report-card">
              <div className="report-header">
                <h3 className="report-title">{report.title}</h3>
                <div className="report-badges">
                  <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                    {report.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`priority-badge ${getPriorityBadgeClass(report.priority)}`}>
                    {report.priority.toUpperCase()}
                  </span>
                  {report.isUrgent && <span className="urgent-badge">URGENT</span>}
                </div>
              </div>

              <div className="report-details">
                <div className="detail-row">
                  <span className="detail-label">Issue Type:</span>
                  <span className="detail-value">{report.issueType.replace('_', ' ')}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Property:</span>
                  <span className="detail-value">{report.propertyId?.address || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tenant:</span>
                  <span className="detail-value">{report.reporterId?.name || 'N/A'}</span>
                </div>
                {report.floor && (
                  <div className="detail-row">
                    <span className="detail-label">Floor:</span>
                    <span className="detail-value">{report.floor}</span>
                  </div>
                )}
                {report.room && (
                  <div className="detail-row">
                    <span className="detail-label">Room:</span>
                    <span className="detail-value">{report.room}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Reported:</span>
                  <span className="detail-value">{formatDate(report.createdAt)}</span>
                </div>
              </div>

              <div className="report-description">
                <p>{report.description}</p>
              </div>

              {report.images && report.images.length > 0 && (
                <div className="report-images">
                  <h4>Attached Images:</h4>
                  <div className="images-grid">
                    {report.images.map((image, index) => (
                      <img 
                        key={index} 
                        src={`http://localhost:5001${image.url}`} 
                        alt={`Report image ${index + 1}`}
                        className="report-image"
                        onClick={() => window.open(`http://localhost:5001${image.url}`, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {report.updates && report.updates.length > 0 && (
                <div className="report-updates">
                  <h4>Updates:</h4>
                  <div className="updates-list">
                    {report.updates.slice(-3).map((update, index) => (
                      <div key={index} className="update-item">
                        <div className="update-message">{update.message}</div>
                        <div className="update-meta">
                          {formatDate(update.updatedAt)} by {update.updatedBy?.name || 'Unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="report-actions">
                {report.status === 'pending' && (
                  <button 
                    className="action-btn start-btn"
                    onClick={() => handleStatusUpdate(report._id, 'in_progress')}
                    disabled={actionLoading}
                  >
                    Start Work
                  </button>
                )}
                
                {report.status === 'in_progress' && (
                  <button 
                    className="action-btn resolve-btn"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowModal(true);
                    }}
                    disabled={actionLoading}
                  >
                    Mark Resolved
                  </button>
                )}

                {report.status !== 'resolved' && report.status !== 'cancelled' && (
                  <div className="update-section">
                    <input
                      type="text"
                      placeholder="Add update message..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      className="update-input"
                    />
                    <button 
                      className="action-btn update-btn"
                      onClick={() => handleAddUpdate(report._id)}
                      disabled={actionLoading || !updateMessage.trim()}
                    >
                      Add Update
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {showModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Resolve Report: {selectedReport.title}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                  setResolutionNotes('');
                  setActualCost('');
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Resolution Notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Actual Cost (Optional)</label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Enter actual cost if applicable"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                  setResolutionNotes('');
                  setActualCost('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleResolveReport}
                disabled={actionLoading || !resolutionNotes.trim()}
              >
                {actionLoading ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceReports;