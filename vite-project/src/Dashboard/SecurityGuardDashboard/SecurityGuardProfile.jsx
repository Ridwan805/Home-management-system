import React, { useState, useEffect } from 'react';
import './SecurityGuardProfile.css';
import apiConfig from '../../config/api';

const SecurityGuardProfile = () => {
  const [user, setUser] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Payment-related state
  const [paymentData, setPaymentData] = useState({
    summary: { totalEarnings: 0, pendingPayments: 0, completedPayments: 0, currency: 'USD' },
    notifications: [],
    activeJobs: []
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', name: '', phoneNumber: '', address: '', experience: '',
    emergencyContact: '', certifications: '', specialSkills: '', availability: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  // Fetch payment notifications and receipts
  const fetchPaymentData = async () => {
    try {
      setPaymentLoading(true);
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) throw new Error("User not logged in");
      const token = JSON.parse(saved).token;

      const response = await fetch(apiConfig.getUrl('api/security-guard-payments/guard/notifications'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch payment data');

      const data = await response.json();
      if (data.success) {
        setPaymentData({
          summary: data.summary,
          notifications: data.notifications,
          activeJobs: data.activeJobs
        });
      }
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Get payment receipt
  const getPaymentReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) throw new Error("User not logged in");
      const token = JSON.parse(saved).token;

      const response = await fetch(apiConfig.getUrl(`api/security-guard-payments/receipt/${paymentId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch receipt');

      const data = await response.json();
      if (data.success) {
        if (data.receiptUrl) {
          // Open Stripe receipt URL in new tab
          window.open(data.receiptUrl, '_blank');
        } else {
          // Show receipt modal with data
          setPaymentReceipt(data);
          setShowReceiptModal(true);
        }
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err.message);
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const saved = localStorage.getItem('dwellSyncUser');
        if (!saved) throw new Error("User not logged in");
        const token = JSON.parse(saved).token;

        // Fetch user data
        const userRes = await fetch(apiConfig.getUrl(apiConfig.endpoints.profile), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userRes.ok) throw new Error('Failed to fetch user data');

        const userData = await userRes.json();
        setUser(userData);
        setFormData({ ...userData });

        // Fetch current job data
        try {
          const jobRes = await fetch(apiConfig.getUrl(apiConfig.endpoints.guardCurrentJob), {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (jobRes.ok) {
            const jobData = await jobRes.json();
            if (jobData.success) {
              setCurrentJob(jobData.data);
            }
          }
        } catch (jobErr) {
  
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser')).token;

      const res = await fetch(apiConfig.getUrl('api/auth/update'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update profile');

      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="security-guard-profile">
      <h2 className="section-title">Security Guard Profile</h2>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Personal Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'job' ? 'active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          Current Job
        </button>
        <button 
          className={`tab-btn ${activeTab === 'professional' ? 'active' : ''}`}
          onClick={() => setActiveTab('professional')}
        >
          Professional Details
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('payments');
            if (paymentData.notifications.length === 0) {
              fetchPaymentData();
            }
          }}
        >
          Payments & Earnings
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          {!isEditing ? (
            <div className="profile-info">
              <div className="profile-header">
                <div className="profile-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
                <div>
                  <h3 className="profile-name">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}</h3>
                  <p className="profile-role">{user.role}</p>
                  <p className="profile-status">{currentJob ? 'Currently Employed' : 'Available for Work'}</p>
                </div>
              </div>

              <div className="profile-details">
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item"><span className="detail-label">Email:</span><span className="detail-value">{user.email}</span></div>
                  <div className="detail-item"><span className="detail-label">Phone:</span><span className="detail-value">{user.phoneNumber || 'Not provided'}</span></div>
                  <div className="detail-item"><span className="detail-label">Address:</span><span className="detail-value">{user.address || 'Not provided'}</span></div>
                  <div className="detail-item"><span className="detail-label">Emergency Contact:</span><span className="detail-value">{user.emergencyContact || 'Not provided'}</span></div>
                </div>
              </div>

              <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
            </div>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <h4>Basic Information</h4>
                {['firstName', 'lastName', 'email', 'name', 'phoneNumber', 'address'].map(field => (
                  <div className="form-group" key={field}>
                    <label htmlFor={field}>
                      {field === 'firstName' ? 'First Name' :
                       field === 'lastName' ? 'Last Name' :
                       field === 'phoneNumber' ? 'Phone Number' :
                       field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      id={field}
                      name={field}
                      type={field === 'email' ? 'email' : 'text'}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      required={['email', 'name'].includes(field)}
                    />
                  </div>
                ))}
                
                <div className="form-group">
                  <label htmlFor="emergencyContact">Emergency Contact</label>
                  <input
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    value={formData.emergencyContact || ''}
                    onChange={handleChange}
                    placeholder="Emergency contact name and phone"
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Professional Information</h4>
                <div className="form-group">
                  <label htmlFor="experience">Experience</label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formData.experience || ''}
                    onChange={handleChange}
                    placeholder="Describe your security experience..."
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="certifications">Certifications</label>
                  <textarea
                    id="certifications"
                    name="certifications"
                    value={formData.certifications || ''}
                    onChange={handleChange}
                    placeholder="List your security certifications..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="specialSkills">Special Skills</label>
                  <textarea
                    id="specialSkills"
                    name="specialSkills"
                    value={formData.specialSkills || ''}
                    onChange={handleChange}
                    placeholder="List any special skills or training..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="availability">Availability</label>
                  <input
                    id="availability"
                    name="availability"
                    type="text"
                    value={formData.availability || ''}
                    onChange={handleChange}
                    placeholder="e.g., Full-time, Part-time, Weekends only"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Current Job Tab */}
      {activeTab === 'job' && (
        <div className="tab-content">
          {currentJob ? (
            <div className="job-details">
              <div className="job-header">
                <h3>Current Assignment</h3>
                <span className="job-status active">Active</span>
              </div>
              
              <div className="job-info">
                <div className="info-section">
                  <h4>Property Information</h4>
                  <div className="detail-item"><span className="detail-label">Property:</span><span className="detail-value">{currentJob.property?.name || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Address:</span><span className="detail-value">{currentJob.property?.address || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Property Type:</span><span className="detail-value">{currentJob.property?.propertyType || 'N/A'}</span></div>
                </div>
                
                <div className="info-section">
                  <h4>Job Details</h4>
                  <div className="detail-item"><span className="detail-label">Position:</span><span className="detail-value">{currentJob.jobPost?.title || 'Security Guard'}</span></div>
                  <div className="detail-item"><span className="detail-label">Start Date:</span><span className="detail-value">{formatDate(currentJob.startDate)}</span></div>
                  <div className="detail-item"><span className="detail-label">Working Hours:</span><span className="detail-value">{currentJob.jobPost?.requirements?.workingHours || 'N/A'}</span></div>
                  <div className="detail-item"><span className="detail-label">Salary:</span><span className="detail-value">{currentJob.jobPost?.requirements?.salary || 'N/A'}</span></div>
                </div>
                
                <div className="info-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item"><span className="detail-label">Property Owner:</span><span className="detail-value">{currentJob.owner?.firstName} {currentJob.owner?.lastName}</span></div>
                  <div className="detail-item"><span className="detail-label">Owner Email:</span><span className="detail-value">{currentJob.owner?.email}</span></div>
                  {currentJob.tenant && (
                    <>
                      <div className="detail-item"><span className="detail-label">Tenant:</span><span className="detail-value">{currentJob.tenant?.firstName} {currentJob.tenant?.lastName}</span></div>
                      <div className="detail-item"><span className="detail-label">Tenant Email:</span><span className="detail-value">{currentJob.tenant?.email}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-job-message">
              <div className="no-job-icon">📋</div>
              <h3>No Current Assignment</h3>
              <p>You are not currently assigned to any security job.</p>
              <p>Check the "Looking for Job" section to find available positions.</p>
            </div>
          )}
        </div>
      )}

      {/* Professional Details Tab */}
      {activeTab === 'professional' && (
        <div className="tab-content">
          <div className="professional-details">
            <div className="detail-section">
              <h4>Experience & Background</h4>
              <div className="detail-item"><span className="detail-label">Experience:</span><span className="detail-value">{user.experience || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Certifications:</span><span className="detail-value">{user.certifications || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Special Skills:</span><span className="detail-value">{user.specialSkills || 'Not provided'}</span></div>
              <div className="detail-item"><span className="detail-label">Availability:</span><span className="detail-value">{user.availability || 'Not provided'}</span></div>
            </div>
            
            <div className="detail-section">
              <h4>Employment Status</h4>
              <div className="detail-item">
                <span className="detail-label">Current Status:</span>
                <span className={`detail-value status ${currentJob ? 'employed' : 'available'}`}>
                  {currentJob ? 'Currently Employed' : 'Available for Work'}
                </span>
              </div>
              {currentJob && (
                <div className="detail-item">
                  <span className="detail-label">Employed Since:</span>
                  <span className="detail-value">{formatDate(currentJob.startDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments & Earnings Tab */}
      {activeTab === 'payments' && (
        <div className="tab-content">
          <div className="payments-section">
            <h3>Payments & Earnings</h3>
            
            {paymentLoading ? (
              <div className="loading">Loading payment data...</div>
            ) : (
              <>
                {/* Earnings Summary */}
                <div className="earnings-summary">
                  <div className="summary-card">
                    <div className="summary-item">
                      <span className="summary-label">Total Earnings</span>
                      <span className="summary-value">{paymentData.summary.currency} {paymentData.summary.totalEarnings.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Completed Payments</span>
                      <span className="summary-value">{paymentData.summary.completedPayments}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Pending Payments</span>
                      <span className="summary-value">{paymentData.summary.pendingPayments}</span>
                    </div>
                  </div>
                </div>

                {/* Active Jobs */}
                {paymentData.activeJobs.length > 0 && (
                  <div className="active-jobs-section">
                    <h4>Active Employment</h4>
                    <div className="jobs-grid">
                      {paymentData.activeJobs.map(job => (
                        <div key={job.id} className="job-card">
                          <div className="job-header">
                            <h5>{job.propertyTitle}</h5>
                            <span className={`job-status ${job.status.toLowerCase()}`}>{job.status}</span>
                          </div>
                          <div className="job-details">
                            <p><strong>Address:</strong> {job.propertyAddress}</p>
                            <p><strong>Salary:</strong> {job.salary?.currency} {job.salary?.amount} / {job.salary?.paymentFrequency}</p>
                            <p><strong>Hired Date:</strong> {new Date(job.hiredDate).toLocaleDateString()}</p>
                            <p><strong>Owner:</strong> {job.owner.name}</p>
                            <p><strong>Contact:</strong> {job.owner.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div className="payment-history-section">
                  <h4>Payment History</h4>
                  {paymentData.notifications.length === 0 ? (
                    <div className="no-payments">
                      <p>No payment history found.</p>
                    </div>
                  ) : (
                    <div className="payments-table">
                      <table className="payment-history-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Property</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentData.notifications.map(payment => (
                            <tr key={payment.id}>
                              <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                              <td>{payment.jobDetails?.propertyTitle || 'N/A'}</td>
                              <td>{payment.currency} {payment.amount.toLocaleString()}</td>
                              <td>
                                <span className={`payment-status ${payment.status}`}>
                                  {payment.status === 'completed' || payment.status === 'paid' ? 'Paid' :
                                   payment.status === 'pending' ? 'Pending' :
                                   payment.status === 'processing' ? 'Processing' : payment.status}
                                </span>
                              </td>
                              <td>
                                {(payment.status === 'completed' || payment.status === 'paid') && payment.hasReceipt && (
                                  <button
                                    className="receipt-button"
                                    onClick={() => getPaymentReceipt(payment.id)}
                                    disabled={receiptLoading}
                                    title="View Receipt"
                                  >
                                    📄
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && paymentReceipt && (
        <div className="receipt-modal-overlay">
          <div className="receipt-modal">
            <div className="receipt-modal-header">
              <h3>Payment Receipt</h3>
              <button
                className="close-button"
                onClick={() => setShowReceiptModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="receipt-modal-body">
              <div className="receipt-content">
                <div className="receipt-header">
                  <h3>Security Guard Payment Receipt</h3>
                  <p className="receipt-id">Receipt ID: {paymentReceipt.receiptData?.receiptId || paymentReceipt.receiptData?.paymentId || 'N/A'}</p>
                </div>
                
                <div className="receipt-details">
                  <div className="detail-row">
                    <span className="label">Amount Paid:</span>
                    <span className="amount">{paymentReceipt.receiptData?.currency || '৳'} {paymentReceipt.receiptData?.amount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Payment Date:</span>
                    <span>{paymentReceipt.receiptData?.paidAt ? new Date(paymentReceipt.receiptData.paidAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Payment Method:</span>
                    <span>{paymentReceipt.receiptData?.paymentMethod || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Transaction ID:</span>
                    <span>{paymentReceipt.receiptData?.transactionId || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Payment Status:</span>
                    <span className="status-paid">{paymentReceipt.receiptData?.paymentStatus || 'Paid'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Description:</span>
                    <span>{paymentReceipt.receiptData?.description || 'Security Guard Payment'}</span>
                  </div>
                  
                  {paymentReceipt.receiptData?.property && (
                    <div className="section">
                      <h4>Property Details</h4>
                      <div className="detail-row">
                        <span className="label">Property:</span>
                        <span>{paymentReceipt.receiptData.property.name || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Address:</span>
                        <span>{paymentReceipt.receiptData.property.address || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                  
                  {paymentReceipt.receiptData?.owner && (
                    <div className="section">
                      <h4>Property Owner Details</h4>
                      <div className="detail-row">
                        <span className="label">Owner Name:</span>
                        <span>{paymentReceipt.receiptData.owner.name || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Owner Email:</span>
                        <span>{paymentReceipt.receiptData.owner.email || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="receipt-footer">
                  <p>This is an official receipt for the security guard payment made through our platform.</p>
                  <p>Thank you for your service!</p>
                </div>
                
                <div className="receipt-actions">
                  {paymentReceipt.receiptUrl && (
                    <button
                      className="btn-primary"
                      onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                    >
                      View Official Receipt
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => window.print()}
                  >
                    Print Receipt
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowReceiptModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityGuardProfile;