import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ParcelLogs.css';

const ParcelLogs = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  const [filter, setFilter] = useState({
    status: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchParcels();
  }, [filter]);

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      const response = await axios.get('http://localhost:5001/api/parcel-logs/tenant', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParcels(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      alert('Failed to fetch parcel logs');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCollected = async (parcelId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('dwellSyncUser');
        window.location.href = '/login';
        return;
      }
      await axios.patch(`http://localhost:5001/api/parcel-logs/${parcelId}/collect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Parcel marked as collected successfully!');
      fetchParcels();
    } catch (error) {
      console.error('Error marking parcel as collected:', error);
      alert('Failed to mark parcel as collected');
    }
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
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending': 'status-pending',
      'Collected': 'status-collected'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  const isOverdue = (parcel) => {
    if (parcel.status === 'Collected') return false;
    const daysSinceDelivery = (new Date() - new Date(parcel.timestamp)) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery > 3;
  };

  return (
    <div className="parcel-logs">
      <div className="parcel-header">
        <h2>My Parcel Logs</h2>
        <button 
          className="btn-refresh" 
          onClick={fetchParcels} 
          disabled={loading}
        >
          Refresh
        </button>
      </div>

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
                <div className="col-sender">Sender</div>
                <div className="col-description">Description</div>
                <div className="col-delivered">Delivered</div>
                <div className="col-status">Status</div>
                <div className="col-collected">Collected</div>
                <div className="col-actions">Actions</div>
              </div>
              {parcels.map(parcel => (
                <div 
                  key={parcel._id} 
                  className={`table-row ${isOverdue(parcel) ? 'overdue' : ''}`}
                >
                  <div className="col-sender">
                    <div className="sender-info">
                      <div className="sender-name">{parcel.senderName}</div>
                      {isOverdue(parcel) && (
                        <div className="overdue-badge">Overdue</div>
                      )}
                    </div>
                  </div>
                  <div className="col-description">
                    {parcel.description || 'No description'}
                  </div>
                  <div className="col-delivered">
                    {formatDate(parcel.timestamp)}
                  </div>
                  <div className="col-status">
                    {getStatusBadge(parcel.status)}
                  </div>
                  <div className="col-collected">
                    {parcel.collectedAt ? formatDate(parcel.collectedAt) : '-'}
                  </div>
                  <div className="col-actions">
                    {parcel.status === 'Pending' && (
                      <button 
                        className="btn-collect" 
                        onClick={() => handleMarkAsCollected(parcel._id)}
                      >
                        Mark as Collected
                      </button>
                    )}
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

export default ParcelLogs;