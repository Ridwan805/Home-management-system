import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../config/api';
import './Payment.css';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('securityGuardPayments');
  const [loading, setLoading] = useState(false);
  const [guardPaymentLoading, setGuardPaymentLoading] = useState(false);
  const [hiredGuards, setHiredGuards] = useState([]);
  const [guardPaymentHistory, setGuardPaymentHistory] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [refreshGuards, setRefreshGuards] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState(null);
  
  // Receipt state
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState([
    { id: 1, date: '2023-06-15', description: 'Monthly Rent', amount: '$1,200.00', status: 'Paid' },
    { id: 2, date: '2023-05-15', description: 'Monthly Rent', amount: '$1,200.00', status: 'Paid' },
    { id: 3, date: '2023-04-15', description: 'Monthly Rent', amount: '$1,200.00', status: 'Paid' },
    { id: 4, date: '2023-03-15', description: 'Monthly Rent', amount: '$1,200.00', status: 'Paid' },
    { id: 5, date: '2023-02-15', description: 'Monthly Rent', amount: '$1,200.00', status: 'Paid' },
  ]);

  const [currentPayment, setCurrentPayment] = useState({
    id: 'sample-payment-id', // This would be a real payment ID in production
    description: 'Monthly Rent - July 2023',
    amount: '$1,200.00',
    dueDate: '2023-07-15',
  });
  
  // Check for payment status from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success') {
      setPaymentMessage({ type: 'success', text: 'Payment completed successfully!' });
      setActiveTab('securityGuardPayments'); // Switch to security guard payments tab
      
      // If we have a session ID, handle the payment success and get receipt
      if (sessionId) {
        handlePaymentSuccess(sessionId);
      }
      
      // Clear URL parameters
      navigate('/owner/payments', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setPaymentMessage({ type: 'error', text: 'Payment was cancelled.' });
      setActiveTab('securityGuardPayments');
      navigate('/owner/payments', { replace: true });
    }
    
    // Clear message after 5 seconds
    if (paymentMessage) {
      const timer = setTimeout(() => setPaymentMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate, paymentMessage]);

  // Get auth token helper
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

  // Fetch hired guards and payment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        
        // Fetch hired guards with payment details
        const guardsResponse = await fetch(API.getUrl('/api/security-guard-payments/hired-guards'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (guardsResponse.ok) {
          const guardsData = await guardsResponse.json();
          setHiredGuards(guardsData.guards || []);
        } else {
          console.error('API request failed:', guardsResponse.status, guardsResponse.statusText);
        }
        
        // Using sample data for regular payment history
    
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, [refreshGuards]);

  // Fetch guard payment history for selected guard
  const fetchGuardPaymentHistory = async (jobPostId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(API.getUrl(`/api/security-guard-payments/job-post/${jobPostId}/payments`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuardPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching guard payment history:', error);
      setGuardPaymentHistory([]);
    }
  };

  // Handle guard payment
  const handleGuardPayment = async (guard) => {
    if (!paymentAmount || !paymentDescription) {
      alert('Please fill in payment amount and description');
      return;
    }

    try {
      setGuardPaymentLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(API.getUrl('/api/security-guard-payments/create-payment-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobPostId: guard.jobPostId,
          amount: parseFloat(paymentAmount),
          description: paymentDescription,
          originUrl: window.location.origin
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Payment session created successfully!');
        }
      } else {
        const errorData = await response.json();
        alert(`Payment failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error processing guard payment:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setGuardPaymentLoading(false);
    }
  };

  // Generate monthly invoice for a guard
  const generateMonthlyInvoice = async (guard) => {
    try {
      setGuardPaymentLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(API.getUrl(`/api/security-guard-payments/generate-invoice/${guard.guardJobId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Monthly invoice generated successfully!');
        setRefreshGuards(prev => prev + 1); // Refresh the guards list
      } else {
        const errorData = await response.json();
        alert(`Failed to generate invoice: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setGuardPaymentLoading(false);
    }
  };

  // Handle payment success and get receipt
  const handlePaymentSuccess = async (sessionId) => {
    try {
      const response = await API.post(`/security-guard-payments/payment-success/${sessionId}`);
      
      if (response.data.success) {
        setRefreshGuards(prev => prev + 1); // Refresh the guards list
        
        // Get the payment receipt
        if (response.data.paymentId) {
          await getPaymentReceipt(response.data.paymentId);
        }
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  };

  // Get payment receipt
  const getPaymentReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      
      if (!paymentId) {
        alert('Payment ID not found. Cannot retrieve receipt.');
        return;
      }

      const token = getAuthToken();
      if (!token) {
        alert('Please log in to view receipt');
        return;
      }

      const response = await fetch(API.getUrl(`/api/security-guard-payments/receipt/${paymentId}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to retrieve receipt');
      }

      const data = await response.json();
      
      if (data.success) {
        setPaymentReceipt(data);
        
        // If there's a direct receipt URL from Stripe, open it in a new tab
        if (data.receiptUrl) {
          window.open(data.receiptUrl, '_blank');
        } else if (data.receiptData) {
          // Otherwise, display the receipt data in a modal
          setShowReceiptModal(true);
        }
      } else {
        alert(data.message || 'Failed to retrieve receipt');
      }
    } catch (err) {
      console.error('Error retrieving receipt:', err);
      alert('Failed to retrieve receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
    }
  };
  
  // Handle payment process
  const handlePayNow = async () => {
    try {
      setLoading(true);
      
      // Get Stripe publishable key
      const keyResponse = await fetch(API.getUrl(API.endpoints.getStripeKey), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!keyResponse.ok) {
        throw new Error('Failed to get payment configuration');
      }
      
      // In a real implementation, this would create a payment session
      // const sessionResponse = await fetch(API.getUrl(API.endpoints.createPayment(currentPayment.id)), {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     amount: currentPayment.amount.replace('$', '').replace(',', ''),
      //     description: currentPayment.description,
      //   }),
      // });
      
      // if (!sessionResponse.ok) {
      //   throw new Error('Failed to create payment session');
      // }
      
      // const { sessionUrl } = await sessionResponse.json();
      // window.location.href = sessionUrl;
      
      // For demo purposes, simulate success
      setTimeout(() => {
        alert('Payment processed successfully!');
        setLoading(false);
        // Refresh payment history after successful payment
        setPaymentHistory(prev => [
          {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            description: currentPayment.description,
            amount: currentPayment.amount,
            status: 'Paid'
          },
          ...prev
        ]);
      }, 1500);
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment processing failed: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      {paymentMessage && (
        <div className={`payment-message ${paymentMessage.type}`}>
          {paymentMessage.text}
          <button 
            className="close-message-btn"
            onClick={() => setPaymentMessage(null)}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="payment-header">
        <h2>Payments</h2>
        <div className="payment-tabs">
          <button 
            className={`tab-button ${activeTab === 'makePayment' ? 'active' : ''}`}
            onClick={() => setActiveTab('makePayment')}
          >
            Make Payment
          </button>
          <button 
            className={`tab-button ${activeTab === 'securityGuardPayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('securityGuardPayments')}
          >
            Security Guard Payments
          </button>
          <button 
            className={`tab-button ${activeTab === 'paymentHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('paymentHistory')}
          >
            Payment History
          </button>
        </div>
      </div>

      <div className="payment-content">
        {activeTab === 'makePayment' ? (
          <div className="make-payment-section">
            <div className="payment-summary-card">
              <h3>Payment Summary</h3>
              <div className="payment-details">
                <div className="payment-detail-row">
                  <span>Description:</span>
                  <span>{currentPayment.description}</span>
                </div>
                <div className="payment-detail-row">
                  <span>Amount:</span>
                  <span className="payment-amount">{currentPayment.amount}</span>
                </div>
                <div className="payment-detail-row">
                  <span>Due Date:</span>
                  <span>{currentPayment.dueDate}</span>
                </div>
              </div>
              <button 
                className="pay-now-button" 
                onClick={handlePayNow} 
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        ) : activeTab === 'securityGuardPayments' ? (
          <div className="security-guard-payments-section">
            <h3>Security Guard Payments</h3>
            {hiredGuards.length === 0 ? (
              <div className="no-guards">
                <p>No hired security guards found.</p>
              </div>
            ) : (
              <div className="guards-payment-grid">
                {hiredGuards.map(guard => (
                  <div key={guard.guardJobId} className="guard-payment-card">
                    <div className="guard-header">
                      <div className="guard-info">
                        <div className="guard-avatar">
                          <div className="avatar-placeholder">
                            {guard.guard?.firstName?.[0]}{guard.guard?.lastName?.[0]}
                          </div>
                        </div>
                        <div className="guard-basic-info">
                          <h4>{guard.guard?.firstName} {guard.guard?.lastName}</h4>
                          <p className="guard-position">{guard.jobDetails?.title}</p>
                          <p className="guard-property">{guard.property?.title} - {guard.property?.address}</p>
                          <p className="guard-email">{guard.guard?.email}</p>
                        </div>
                      </div>
                      <div className="payment-status-badge">
                        <span className={`status-indicator ${guard.paymentDetails?.status}`}>
                          {guard.paymentDetails?.status === 'paid' ? 'Up to Date' : 
                           guard.paymentDetails?.status === 'due' ? 'Payment Due' : 
                           guard.paymentDetails?.status === 'processing' ? 'Processing' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="payment-summary">
                      <div className="salary-info">
                        <h5>Salary Information</h5>
                        <p><strong>Amount:</strong> {guard.salary?.currency} {guard.salary?.amount}</p>
                        <p><strong>Frequency:</strong> {guard.salary?.paymentFrequency}</p>
                        <p><strong>Total Paid:</strong> {guard.salary?.currency} {guard.paymentDetails?.totalPaid || 0}</p>
                        <p><strong>Payment Count:</strong> {guard.paymentDetails?.paymentCount || 0}</p>
                      </div>
                      
                      {guard.paymentDetails?.latestPayment && (
                        <div className="latest-payment">
                          <h5>Latest Payment</h5>
                          <p><strong>Amount:</strong> {guard.salary?.currency} {guard.paymentDetails.latestPayment.amount}</p>
                          <p><strong>Date:</strong> {new Date(guard.paymentDetails.latestPayment.createdAt).toLocaleDateString()}</p>
                          <p><strong>Status:</strong> {guard.paymentDetails.latestPayment.status}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="payment-actions">
                      <div className="quick-actions">
                        <button
                          className="generate-invoice-button"
                          onClick={() => generateMonthlyInvoice(guard)}
                          disabled={guardPaymentLoading}
                        >
                          {guardPaymentLoading ? 'Processing...' : 'Generate Monthly Invoice'}
                        </button>
                        
                        <button
                          className="view-history-button"
                          onClick={() => fetchGuardPaymentHistory(guard.jobPostId)}
                        >
                          View Payment History
                        </button>
                      </div>
                      
                      <div className="custom-payment-form">
                        <h5>Custom Payment</h5>
                        <div className="form-group">
                          <label>Payment Amount ({guard.salary?.currency})</label>
                          <input
                            type="number"
                            value={selectedGuard === guard.guardJobId ? paymentAmount : ''}
                            onChange={(e) => {
                              setSelectedGuard(guard.guardJobId);
                              setPaymentAmount(e.target.value);
                            }}
                            placeholder={`Enter amount (Suggested: ${guard.salary?.amount})`}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            value={selectedGuard === guard.guardJobId ? paymentDescription : ''}
                            onChange={(e) => {
                              setSelectedGuard(guard.guardJobId);
                              setPaymentDescription(e.target.value);
                            }}
                            placeholder={`Payment for ${guard.guard?.firstName} ${guard.guard?.lastName}`}
                          />
                        </div>
                        
                        <button
                          className="pay-guard-button"
                          onClick={() => handleGuardPayment(guard)}
                          disabled={guardPaymentLoading || selectedGuard !== guard.guardJobId || !paymentAmount || !paymentDescription}
                        >
                          {guardPaymentLoading && selectedGuard === guard.guardJobId ? 'Processing...' : 'Pay Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {guardPaymentHistory.length > 0 && (
              <div className="guard-payment-history">
                <h4>Payment History</h4>
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Guard</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardPaymentHistory.map(payment => (
                      <tr key={payment._id}>
                        <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                        <td>{payment.payeeId?.name || 'N/A'}</td>
                        <td>৳{payment.amount}</td>
                        <td>{payment.description}</td>
                        <td>
                          <span className={`payment-status ${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>
                          {payment.status === 'completed' && (
                            <button
                              className="receipt-button"
                              onClick={() => getPaymentReceipt(payment._id)}
                              disabled={receiptLoading}
                              title="View Receipt"
                            >
                              {receiptLoading ? '...' : '📄'}
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
        ) : (
          <div className="payment-history-section">
            <table className="payment-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(payment => (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td>{payment.description}</td>
                    <td>{payment.amount}</td>
                    <td>
                      <span className={`payment-status ${payment.status.toLowerCase()}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
      
      {/* Receipt Modal */}
      {showReceiptModal && paymentReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <h2>Payment Receipt</h2>
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
                  
                  {paymentReceipt.receiptData?.guard && (
                    <div className="section">
                      <h4>Security Guard Details</h4>
                      <div className="detail-row">
                        <span className="label">Guard Name:</span>
                        <span>{paymentReceipt.receiptData.guard.name || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Guard Email:</span>
                        <span>{paymentReceipt.receiptData.guard.email || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Position:</span>
                        <span>{paymentReceipt.receiptData.guard.position || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                  
                  {paymentReceipt.receiptData?.property && (
                    <div className="section">
                      <h4>Property Details</h4>
                      <div className="detail-row">
                        <span className="label">Property:</span>
                        <span>{paymentReceipt.receiptData.property.title || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Address:</span>
                        <span>{paymentReceipt.receiptData.property.address || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                  
                  {paymentReceipt.receiptData?.owner && (
                    <div className="section">
                      <h4>Owner Details</h4>
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
                  <p>Thank you for using our services!</p>
                </div>
                
                <div className="receipt-actions">
                  {paymentReceipt.receiptUrl && (
                    <button
                      className="action-btn view-btn"
                      onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                    >
                      📄 View Official Receipt
                    </button>
                  )}
                  
                  <button
                    className="action-btn print-btn"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Receipt
                  </button>
                  
                  <button
                    className="action-btn download-btn"
                    onClick={() => {
                      const element = document.createElement('a');
                      const file = new Blob([document.querySelector('.receipt-content').outerHTML], {type: 'text/html'});
                      element.href = URL.createObjectURL(file);
                      element.download = `receipt-${paymentReceipt.receiptId}.html`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                  >
                    💾 Download Receipt
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

export default Payment;