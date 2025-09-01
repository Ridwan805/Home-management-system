import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ParcelLogging.css';

const ParcelLogging = () => {
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    recipientId: '',
    senderName: '',
    description: ''
  });
  const [filter, setFilter] = useState({
    status: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchParcels();
    fetchUsers();
  }, [filter]);

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/parcel-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: filter
      });
      setParcels(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      alert('Failed to fetch parcels');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/parcel-logs', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Parcel logged successfully!');
      setFormData({ recipientId: '', senderName: '', description: '' });
      setShowForm(false);
      fetchParcels();
    } catch (error) {
      console.error('Error logging parcel:', error);
      alert('Failed to log parcel');
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
      page: 1 // Reset to first page when filtering
    });
  };

  const handlePageChange = (newPage) => {
    setFilter({ ...filter, page: newPage });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'Collected' ? 'status-collected' : 'status-pending';
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  return (
    <div className="parcel-logging">
      <div className="parcel-header">
        <h2>Parcel Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Log New Parcel'}
        </button>
      </div>

      {showForm && (
        <div className="parcel-form-container">
          <form onSubmit={handleSubmit} className="parcel-form">
            <h3>Log New Parcel</h3>
            <div className="form-group">
              <label htmlFor="recipientId">Recipient:</label>
              <select
                id="recipientId"
                name="recipientId"
                value={formData.recipientId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Recipient</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="senderName">Sender Name:</label>
              <input
                type="text"
                id="senderName"
                name="senderName"
                value={formData.senderName}
                onChange={handleInputChange}
                required
                placeholder="Enter sender's name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description (Optional):</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter parcel description"
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging...' : 'Log Parcel'}
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

      <div className="parcel-filters">
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
            <option value="Collected">Collected</option>
          </select>
        </div>
        <button className="btn-refresh" onClick={fetchParcels} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="parcel-list">
        {loading ? (
          <div className="loading">Loading parcels...</div>
        ) : parcels.length === 0 ? (
          <div className="no-data">No parcels found</div>
        ) : (
          <>
            <div className="parcel-table">
              <div className="table-header">
                <div className="col-recipient">Recipient</div>
                <div className="col-sender">Sender</div>
                <div className="col-timestamp">Received</div>
                <div className="col-status">Status</div>
                <div className="col-collected">Collected At</div>
                <div className="col-description">Description</div>
              </div>
              {parcels.map(parcel => (
                <div key={parcel._id} className="table-row">
                  <div className="col-recipient">
                    <div className="recipient-info">
                      <div className="recipient-name">{parcel.recipientId?.name}</div>
                      <div className="recipient-email">{parcel.recipientId?.email}</div>
                    </div>
                  </div>
                  <div className="col-sender">{parcel.senderName}</div>
                  <div className="col-timestamp">{formatDate(parcel.timestamp)}</div>
                  <div className="col-status">{getStatusBadge(parcel.status)}</div>
                  <div className="col-collected">
                    {parcel.collectedAt ? formatDate(parcel.collectedAt) : '-'}
                  </div>
                  <div className="col-description">
                    {parcel.description || '-'}
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
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

export default ParcelLogging;