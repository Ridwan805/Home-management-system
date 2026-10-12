import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import './VisitorLogging.css';

const VisitorLogging = () => {
  const [visitors, setVisitors] = useState([]);
  const [preApprovedGuests, setPreApprovedGuests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pre-approved'

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch (e) {
      return null;
    }
  };

  const [formData, setFormData] = useState({
    visitorName: '',
    unitId: '',
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
    fetchVisitors();
    fetchProperties();
    if (activeTab === 'pre-approved') {
      fetchPreApprovedGuests();
    }
  }, [filter, activeTab]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/visitor-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter
      });
      setVisitors(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      alert('Failed to fetch visitors');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreApprovedGuests = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/visitor-logs/pre-approved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreApprovedGuests(response.data.data);
    } catch (error) {
      console.error('Error fetching pre-approved guests:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      await axios.post(`${API_BASE_URL}/api/visitor-logs`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Visitor logged successfully!');
      setFormData({
        visitorName: '',
        unitId: '',
        expectedTime: '',
        visitorPhone: '',
        purpose: '',
        notes: ''
      });
      setShowForm(false);
      fetchVisitors();
      if (activeTab === 'pre-approved') {
        fetchPreApprovedGuests();
      }
    } catch (error) {
      console.error('Error logging visitor:', error);
      alert('Failed to log visitor');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (visitorId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      await axios.patch(`${API_BASE_URL}/api/visitor-logs/${visitorId}/checkin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Visitor checked in successfully!');
      fetchVisitors();
      if (activeTab === 'pre-approved') {
        fetchPreApprovedGuests();
      }
    } catch (error) {
      console.error('Error checking in visitor:', error);
      alert('Failed to check in visitor');
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      await axios.patch(`${API_BASE_URL}/api/visitor-logs/${visitorId}/checkout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Visitor checked out successfully!');
      fetchVisitors();
    } catch (error) {
      console.error('Error checking out visitor:', error);
      alert('Failed to check out visitor');
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

  const getActionButton = (visitor) => {
    if (visitor.status === 'Pending') {
      return (
        <button 
          className="btn-action btn-checkin" 
          onClick={() => handleCheckIn(visitor._id)}
        >
          Check In
        </button>
      );
    } else if (visitor.status === 'CheckedIn') {
      return (
        <button 
          className="btn-action btn-checkout" 
          onClick={() => handleCheckOut(visitor._id)}
        >
          Check Out
        </button>
      );
    }
    return null;
  };

  const currentData = activeTab === 'pre-approved' ? preApprovedGuests : visitors;

  return (
    <div className="visitor-logging">
      <div className="visitor-header">
        <h2>Visitor Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Log New Visitor'}
        </button>
      </div>

      {showForm && (
        <div className="visitor-form-container">
          <form onSubmit={handleSubmit} className="visitor-form">
            <h3>Log New Visitor</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="visitorName">Visitor Name:</label>
                <input
                  type="text"
                  id="visitorName"
                  name="visitorName"
                  value={formData.visitorName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter visitor's name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="unitId">Unit:</label>
                <select
                  id="unitId"
                  name="unitId"
                  value={formData.unitId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Unit</option>
                  {properties.map(property => (
                    <option key={property._id} value={property._id}>
                      Unit {property.unitNumber} - {property.buildingId?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
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
              <div className="form-group">
                <label htmlFor="expectedTime">Expected Time:</label>
                <input
                  type="datetime-local"
                  id="expectedTime"
                  name="expectedTime"
                  value={formData.expectedTime}
                  onChange={handleInputChange}
                />
              </div>
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
                {loading ? 'Logging...' : 'Log Visitor'}
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

      <div className="visitor-tabs">
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Visitors
        </button>
        <button 
          className={`tab-button ${activeTab === 'pre-approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('pre-approved')}
        >
          Pre-Approved Guests
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="visitor-filters">
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
          <button className="btn-refresh" onClick={fetchVisitors} disabled={loading}>
            Refresh
          </button>
        </div>
      )}

      <div className="visitor-list">
        {loading ? (
          <div className="loading">Loading visitors...</div>
        ) : currentData.length === 0 ? (
          <div className="no-data">No visitors found</div>
        ) : (
          <>
            <div className="visitor-table">
              <div className="table-header">
                <div className="col-name">Visitor</div>
                <div className="col-unit">Unit</div>
                <div className="col-purpose">Purpose</div>
                <div className="col-status">Status</div>
                <div className="col-times">Times</div>
                <div className="col-approved">Pre-Approved</div>
                <div className="col-actions">Actions</div>
              </div>
              {currentData.map(visitor => (
                <div key={visitor._id} className="table-row">
                  <div className="col-name">
                    <div className="visitor-info">
                      <div className="visitor-name">{visitor.visitorName}</div>
                      <div className="visitor-phone">{visitor.visitorPhone || '-'}</div>
                    </div>
                  </div>
                  <div className="col-unit">
                    Unit {visitor.unitId?.unitNumber}
                  </div>
                  <div className="col-purpose">{visitor.purpose || '-'}</div>
                  <div className="col-status">{getStatusBadge(visitor.status)}</div>
                  <div className="col-times">
                    <div className="time-info">
                      <div>In: {formatDate(visitor.checkInTime)}</div>
                      <div>Out: {formatDate(visitor.checkOutTime)}</div>
                    </div>
                  </div>
                  <div className="col-approved">
                    {visitor.preApproved ? (
                      <span className="pre-approved-badge">Yes</span>
                    ) : (
                      <span className="not-approved-badge">No</span>
                    )}
                  </div>
                  <div className="col-actions">
                    {getActionButton(visitor)}
                  </div>
                </div>
              ))}
            </div>

            {activeTab === 'all' && pagination.totalPages > 1 && (
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

export default VisitorLogging;