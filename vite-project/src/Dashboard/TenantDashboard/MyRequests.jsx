import React, { useState, useEffect } from 'react';
import './MyRequests.css';

const MyRequests = () => {
  // Mock data for property requests - in a real app, this would come from an API
  const [propertyRequests, setPropertyRequests] = useState([
    {
      id: 1,
      propertyId: 101,
      propertyAddress: '456 Park Avenue, Apt 7C, Cityville, State 12345',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      price: 1500,
      listingType: 'For Rent',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      requestDate: '2023-07-15',
      status: 'Approved',
      responseDate: '2023-07-18',
      moveInDate: '2023-08-01',
      notes: 'Your application has been approved. Please contact the property manager to schedule a move-in appointment.'
    },
    {
      id: 2,
      propertyId: 102,
      propertyAddress: '789 Ocean Drive, Unit 12, Beachtown, State 54321',
      propertyType: 'Condo',
      bedrooms: 3,
      bathrooms: 2,
      price: 2200,
      listingType: 'For Rent',
      image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0',
      requestDate: '2023-07-20',
      status: 'Pending',
      responseDate: null,
      moveInDate: null,
      notes: 'Your application is currently under review. We will notify you once a decision has been made.'
    },
    {
      id: 3,
      propertyId: 103,
      propertyAddress: '123 Mountain View Road, Hillside, State 67890',
      propertyType: 'House',
      bedrooms: 4,
      bathrooms: 3,
      price: 350000,
      listingType: 'For Sale',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
      requestDate: '2023-07-10',
      status: 'Rejected',
      responseDate: '2023-07-14',
      moveInDate: null,
      notes: 'We regret to inform you that your application has been declined. Please contact our office for more information.'
    }
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'status-approved';
      case 'Pending':
        return 'status-pending';
      case 'Rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const filteredRequests = statusFilter === 'All' 
    ? propertyRequests 
    : propertyRequests.filter(request => request.status === statusFilter);

  return (
    <div className="my-requests">
      <h2 className="section-title">My Property Requests</h2>
      
      <div className="filter-controls">
        <div className="status-filters">
          <button 
            className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => setStatusFilter('All')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Approved')}
          >
            Approved
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Rejected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Rejected')}
          >
            Rejected
          </button>
        </div>
      </div>
      
      {filteredRequests.length === 0 ? (
        <div className="empty-requests">
          <p>No property requests found.</p>
          {statusFilter !== 'All' && (
            <p>Try changing your filter selection to see more requests.</p>
          )}
        </div>
      ) : (
        <div className="request-list">
          {filteredRequests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-image">
                <img src={request.image} alt={request.propertyAddress} />
              </div>
              <div className="request-content">
                <div className="request-header">
                  <h3 className="property-price">
                    {formatCurrency(request.price)}
                    {request.listingType === 'For Rent' && <span className="rent-period">/month</span>}
                  </h3>
                  <span className={`request-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                
                <p className="property-address">{request.propertyAddress}</p>
                
                <div className="property-features">
                  <span>{request.bedrooms} Beds</span>
                  <span>{request.bathrooms} Baths</span>
                  <span>{request.propertyType}</span>
                  <span>{request.listingType}</span>
                </div>
                
                <div className="request-dates">
                  <div className="date-item">
                    <span className="date-label">Requested:</span>
                    <span className="date-value">{formatDate(request.requestDate)}</span>
                  </div>
                  
                  <div className="date-item">
                    <span className="date-label">Response:</span>
                    <span className="date-value">{formatDate(request.responseDate)}</span>
                  </div>
                </div>
                
                <div className="request-actions">
                  <button 
                    className="btn-primary view-details-btn"
                    onClick={() => handleViewDetails(request)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestModal && selectedRequest && (
        <div className="request-modal-overlay">
          <div className="request-modal">
            <div className="modal-header">
              <h3>Request Details</h3>
              <button 
                className="close-btn"
                onClick={() => setShowRequestModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-property-image">
                <img src={selectedRequest.image} alt={selectedRequest.propertyAddress} />
              </div>
              
              <div className="modal-property-details">
                <div className="modal-status-header">
                  <h3 className="property-price">
                    {formatCurrency(selectedRequest.price)}
                    {selectedRequest.listingType === 'For Rent' && <span className="rent-period">/month</span>}
                  </h3>
                  <span className={`request-status ${getStatusClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                
                <p className="property-address">{selectedRequest.propertyAddress}</p>
                
                <div className="property-info-grid">
                  <div className="info-item">
                    <span className="info-label">Property Type</span>
                    <span className="info-value">{selectedRequest.propertyType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Bedrooms</span>
                    <span className="info-value">{selectedRequest.bedrooms}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Bathrooms</span>
                    <span className="info-value">{selectedRequest.bathrooms}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Listing Type</span>
                    <span className="info-value">{selectedRequest.listingType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Request Date</span>
                    <span className="info-value">{formatDate(selectedRequest.requestDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Response Date</span>
                    <span className="info-value">{formatDate(selectedRequest.responseDate)}</span>
                  </div>
                  {selectedRequest.moveInDate && (
                    <div className="info-item">
                      <span className="info-label">Move-in Date</span>
                      <span className="info-value">{formatDate(selectedRequest.moveInDate)}</span>
                    </div>
                  )}
                </div>
                
                <div className="request-notes">
                  <h4>Notes</h4>
                  <p>{selectedRequest.notes}</p>
                </div>
                
                <div className="modal-actions">
                  {selectedRequest.status === 'Approved' && (
                    <button className="btn-primary">Contact Property Manager</button>
                  )}
                  {selectedRequest.status === 'Pending' && (
                    <button className="btn-secondary">Cancel Request</button>
                  )}
                  {selectedRequest.status === 'Rejected' && (
                    <button className="btn-primary">Browse Similar Properties</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;