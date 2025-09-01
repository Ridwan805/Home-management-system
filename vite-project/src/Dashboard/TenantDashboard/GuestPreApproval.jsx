import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GuestPreApproval.css';

const GuestPreApproval = () => {
  const [guests, setGuests] = useState([]);
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pre-approved'); // 'pre-approved', 'visitor-logs'
  const [formData, setFormData] = useState({
    visitorName: '',
    expectedTime: '',
    visitorPhone: '',
    purpose: '',
    notes: ''
  });
  const [filter, setFilter] = useState({
    status: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    if (activeTab === 'pre-approved') {
      fetchPreApprovedGuests();
    } else {
      fetchVisitorLogs();
    }
  }, [activeTab, filter]);

  const fetchPreApprovedGuests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/visitor-logs/pre-approved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(response.data.data);
    } catch (error) {
      console.error('Error fetching pre-approved guests:', error);
      alert('Failed to fetch pre-approved guests');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitorLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/visitor-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: filter
      });
      setVisitorLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching visitor logs:', error);
      alert('Failed to fetch visitor logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/visitor-logs/pre-approve', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Guest pre-approved successfully!');
      setFormData({
        visitorName: '',
        expectedTime: '',
        visitorPhone: '',
        purpose: '',
        notes: ''
      });
      setShowForm(false);
      fetchPreApprovedGuests();
    } catch (error) {
      console.error('Error pre-approving guest:', error);
      alert('Failed to pre-approve guest');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterChange = (e) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value,
      page: 1
    });
  };

  const handlePageChange = (newPage) => {
    setFilter({ ...filter, page: newPage });
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : '-';
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending': 'status-pending',
      'CheckedIn': 'status-checked-in',
      'CheckedOut': 'status-checked-out'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  const currentData = activeTab === 'pre-approved' ? guests : visitorLogs;

  return (
    <div className="guest-pre-approval">
      <div className="guest-header">
        <h2>Guest Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Pre-Approve Guest'}
        </button>
      </div>

      {showForm && (
        <div className="guest-form-container">
          <form onSubmit={handleSubmit} className="guest-form">
            <h3>Pre-Approve Guest</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="visitorName">Guest Name:</label>
                <input
                  type="text"
                  id="visitorName"
                  name="visitorName"
                  value={formData.visitorName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter guest's name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="visitorPhone">Phone Number:</label>
                <input
                  type="tel"
                  id="visitorPhone"
                  name="visitorPhone"
                  value={formData.visitorPhone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expectedTime">Expected Arrival Time:</label>
                <input
                  type="datetime-local"
                  id="expectedTime"
                  name="expectedTime"
                  value={formData.expectedTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="purpose">Purpose of Visit:</label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Enter purpose of visit"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes:</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any additional notes"
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Pre-Approving...' : 'Pre-Approve Guest'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="guest-tabs">
        <button 
          className={`tab-button ${activeTab === 'pre-approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('pre-approved')}
        >
          Pre-Approved Guests
        </button>
        <button 
          className={`tab-button ${activeTab === 'visitor-logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitor-logs')}
        >
          My Visitor Logs
        </button>
      </div>

      {activeTab === 'visitor-logs' && (
        <div className="guest-filters">
          <div className="filter-group">
            <label htmlFor="status">Filter by Status:</label>
            <select
              id="status"
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="CheckedIn">Checked In</option>
              <option value="CheckedOut">Checked Out</option>
            </select>
          </div>
          <button 
            className="btn-refresh" 
            onClick={fetchVisitorLogs} 
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      )}

      <div className="guest-list">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : currentData.length === 0 ? (
          <div className="no-data">
            {activeTab === 'pre-approved' ? 'No pre-approved guests found' : 'No visitor logs found'}
          </div>
        ) : (
          <>
            <div className="guest-table">
              <div className="table-header">
                <div className="col-name">Guest Name</div>
                <div className="col-phone">Phone</div>
                <div className="col-purpose">Purpose</div>
                <div className="col-expected">Expected Time</div>
                <div className="col-status">Status</div>
                <div className="col-times">Check In/Out</div>
              </div>
              {currentData.map(guest => (
                <div key={guest._id} className="table-row">
                  <div className="col-name">
                    <div className="guest-info">
                      <div className="guest-name">{guest.visitorName}</div>
                      {guest.preApproved && (
                        <div className="pre-approved-badge">Pre-Approved</div>
                      )}
                    </div>
                  </div>
                  <div className="col-phone">{guest.visitorPhone || '-'}</div>
                  <div className="col-purpose">{guest.purpose || '-'}</div>
                  <div className="col-expected">
                    {formatDate(guest.expectedTime)}
                  </div>
                  <div className="col-status">{getStatusBadge(guest.status)}</div>
                  <div className="col-times">
                    <div className="time-info">
                      <div>In: {formatDate(guest.checkInTime)}</div>
                      <div>Out: {formatDate(guest.checkOutTime)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeTab === 'visitor-logs' && pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="btn-page"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="btn-page"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestPreApproval;