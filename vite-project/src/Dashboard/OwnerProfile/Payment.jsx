import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../config/api';
import './Payment.css';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('makePayment');
  const [loading, setLoading] = useState(false);
  const [guardPaymentLoading, setGuardPaymentLoading] = useState(false);
  const [hiredGuards, setHiredGuards] = useState([]);
  const [guardPaymentHistory, setGuardPaymentHistory] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [paymentMessage, setPaymentMessage] = useState(null);

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
    
    if (paymentStatus === 'success') {
      setPaymentMessage({ type: 'success', text: 'Payment completed successfully!' });
      setActiveTab('securityGuardPayments'); // Switch to security guard payments tab
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

  // Fetch hired guards and payment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch hired guards
        const guardsResponse = await fetch(API.getUrl('/api/job-posts/owner/hired-guards'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (guardsResponse.ok) {
          const guardsData = await guardsResponse.json();
          setHiredGuards(guardsData.jobPosts || []);
        }
        
        // Using sample data for regular payment history
    
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Fetch guard payment history for selected guard
  const fetchGuardPaymentHistory = async (jobPostId) => {
    try {
      const response = await fetch(API.getUrl(`/api/security-guard-payments/job-post/${jobPostId}/payments`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      
      const response = await fetch(API.getUrl('/api/security-guard-payments/create-payment-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          jobPostId: guard._id,
          amount: parseFloat(paymentAmount),
          description: paymentDescription,
          frequency: paymentFrequency
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl;
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
                  <div key={guard._id} className="guard-payment-card">
                    <div className="guard-header">
                      <div className="guard-avatar">
                        <div className="avatar-placeholder">
                          {guard.hiredUserId?.firstName?.[0]}{guard.hiredUserId?.lastName?.[0]}
                        </div>
                      </div>
                      <div className="guard-basic-info">
                        <h4>{guard.hiredUserId?.firstName} {guard.hiredUserId?.lastName}</h4>
                        <p className="guard-position">{guard.title}</p>
                        <p className="guard-property">{guard.propertyId?.address || guard.propertyId?.name}</p>
                      </div>
                    </div>
                    
                    <div className="payment-form">
                      <div className="form-group">
                        <label>Payment Amount (৳)</label>
                        <input
                          type="number"
                          value={selectedGuard === guard._id ? paymentAmount : ''}
                          onChange={(e) => {
                            setSelectedGuard(guard._id);
                            setPaymentAmount(e.target.value);
                          }}
                          placeholder="Enter amount"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          value={selectedGuard === guard._id ? paymentDescription : ''}
                          onChange={(e) => {
                            setSelectedGuard(guard._id);
                            setPaymentDescription(e.target.value);
                          }}
                          placeholder="Payment description"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Frequency</label>
                        <select
                          value={selectedGuard === guard._id ? paymentFrequency : 'monthly'}
                          onChange={(e) => {
                            setSelectedGuard(guard._id);
                            setPaymentFrequency(e.target.value);
                          }}
                        >
                          <option value="one-time">One Time</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      
                      <button
                        className="pay-guard-button"
                        onClick={() => handleGuardPayment(guard)}
                        disabled={guardPaymentLoading || selectedGuard !== guard._id || !paymentAmount || !paymentDescription}
                      >
                        {guardPaymentLoading && selectedGuard === guard._id ? 'Processing...' : 'Pay Guard'}
                      </button>
                      
                      <button
                        className="view-history-button"
                        onClick={() => fetchGuardPaymentHistory(guard._id)}
                      >
                        View Payment History
                      </button>
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
    </div>
  );
};

export default Payment;