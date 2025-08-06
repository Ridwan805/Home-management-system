import React, { useState, useEffect } from 'react';
import './PaymentInfo.css';

const PaymentInfo = () => {
  // Mock data for bills - in a real app, this would come from an API
  const [bills, setBills] = useState([
    {
      id: 1,
      type: 'Rent',
      amount: 1200,
      dueDate: '2023-07-01',
      status: 'Paid',
      paidDate: '2023-06-28'
    },
    {
      id: 2,
      type: 'Electricity',
      amount: 85.50,
      dueDate: '2023-07-15',
      status: 'Pending',
      paidDate: null
    },
    {
      id: 3,
      type: 'Water',
      amount: 45.75,
      dueDate: '2023-07-15',
      status: 'Pending',
      paidDate: null
    },
    {
      id: 4,
      type: 'Internet',
      amount: 60.00,
      dueDate: '2023-07-10',
      status: 'Pending',
      paidDate: null
    }
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');

  const handlePayNow = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send payment info to a payment processor
    // For this demo, we'll just update the bill status
    const updatedBills = bills.map(bill => {
      if (bill.id === selectedBill.id) {
        return {
          ...bill,
          status: 'Paid',
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
      return bill;
    });
    
    setBills(updatedBills);
    setShowPaymentModal(false);
    // Reset form
    setPaymentMethod('credit');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setNameOnCard('');
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Paid':
        return 'status-paid';
      case 'Pending':
        return 'status-pending';
      case 'Overdue':
        return 'status-overdue';
      default:
        return '';
    }
  };

  return (
    <div className="payment-info">
      <h2 className="section-title">Payment Information</h2>
      
      <div className="payment-summary">
        <div className="summary-card">
          <h3>Total Due</h3>
          <p className="amount">
            {formatCurrency(
              bills
                .filter(bill => bill.status === 'Pending' || bill.status === 'Overdue')
                .reduce((total, bill) => total + bill.amount, 0)
            )}
          </p>
        </div>
        <div className="summary-card">
          <h3>Paid This Month</h3>
          <p className="amount">
            {formatCurrency(
              bills
                .filter(bill => bill.status === 'Paid' && 
                  new Date(bill.paidDate).getMonth() === new Date().getMonth())
                .reduce((total, bill) => total + bill.amount, 0)
            )}
          </p>
        </div>
      </div>
      
      <div className="bills-container">
        <h3>Current Bills</h3>
        <table className="bills-table">
          <thead>
            <tr>
              <th>Bill Type</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => (
              <tr key={bill.id}>
                <td>{bill.type}</td>
                <td>{formatCurrency(bill.amount)}</td>
                <td>{formatDate(bill.dueDate)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(bill.status)}`}>
                    {bill.status}
                  </span>
                </td>
                <td>
                  {bill.status !== 'Paid' && (
                    <button 
                      className="btn-primary pay-btn"
                      onClick={() => handlePayNow(bill)}
                    >
                      Pay Now
                    </button>
                  )}
                  {bill.status === 'Paid' && (
                    <span className="paid-date">Paid on {formatDate(bill.paidDate)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Make Payment</h3>
              <button 
                className="close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-details">
                <p><strong>Bill Type:</strong> {selectedBill.type}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedBill.amount)}</p>
                <p><strong>Due Date:</strong> {formatDate(selectedBill.dueDate)}</p>
              </div>
              
              <form onSubmit={handlePaymentSubmit}>
                <div className="form-group">
                  <label>Payment Method</label>
                  <div className="payment-methods">
                    <label className="method-option">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="credit" 
                        checked={paymentMethod === 'credit'}
                        onChange={() => setPaymentMethod('credit')}
                      />
                      <span>Credit Card</span>
                    </label>
                    <label className="method-option">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="debit" 
                        checked={paymentMethod === 'debit'}
                        onChange={() => setPaymentMethod('debit')}
                      />
                      <span>Debit Card</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number</label>
                  <input
                    type="text"
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryDate">Expiry Date</label>
                    <input
                      type="text"
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="cvv">CVV</label>
                    <input
                      type="text"
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="nameOnCard">Name on Card</label>
                  <input
                    type="text"
                    id="nameOnCard"
                    placeholder="John Doe"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Complete Payment</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo;