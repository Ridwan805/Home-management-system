import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import './Payment.css';

const Payment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('makePayment');
  const [loading, setLoading] = useState(false);

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
  
  // Fetch payment history from API
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        // In a real implementation, this would fetch from your API
        // const response = await fetch(API.getUrl(API.endpoints.paymentHistory));
        // const data = await response.json();
        // if (data.success) {
        //   setPaymentHistory(data.payments);
        // }
        
        // Using sample data for now
        console.log('Payment history would be fetched from API');
      } catch (error) {
        console.error('Error fetching payment history:', error);
      }
    };
    
    fetchPaymentHistory();
  }, []);
  
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