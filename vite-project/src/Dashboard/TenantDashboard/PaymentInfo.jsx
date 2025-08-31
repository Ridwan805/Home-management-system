import React from 'react';
import './PaymentInfo.css';

const PaymentInfo = () => {
<<<<<<< Updated upstream
=======
  const [invoices, setInvoices] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices'); // New state for tab management
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const navigate = useNavigate();

  // Function to fetch all payment data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user is logged in
      const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
      if (!user || !user.token) {
        console.error('❌ No authentication data found');
        setError('Please log in to view your payment information.');
        navigate('/login');
        return;
      }
      
      console.log('🔄 Fetching payment data for user:', user.userId);
      
      const response = await authenticatedFetch(
        'http://localhost:5001/api/payments/my-payments',
        { method: 'GET' },
        navigate
      );
      
      console.log('🔍 Payment API Response:', response);
      console.log('📄 Invoices:', response.data?.pendingInvoices);
      console.log('💰 Payment History:', response.data?.paymentHistory);
      
      setInvoices(response.data?.pendingInvoices || []);
      setPaymentHistory(response.data?.paymentHistory || []);
      setError(null);
      setSuccessMessage('Data loaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      
      if (err.message === 'Authentication required') {
        setError('Please log in to view your payment information.');
        navigate('/login');
      } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('dwellSyncUser');
        navigate('/login');
      } else {
        setError('Failed to refresh data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    fetchAllData();
    
    // Handle Stripe checkout return
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const sessionId = urlParams.get('session_id');
    const paymentId = urlParams.get('payment_id');
    
    if (status === 'success' && sessionId) {
      setError('');
      setSuccessMessage('Payment completed successfully! Your invoice has been updated.');
      // Refresh data after successful payment
      setTimeout(() => {
        fetchAllData();
      }, 1000);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/payments/my-payments',
        { method: 'GET' },
        navigate
      );
      setInvoices(response.data?.pendingInvoices || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try refreshing the page.');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/payments/my-payments',
        { method: 'GET' },
        navigate
      );
      setPaymentHistory(response.data?.paymentHistory || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Failed to load payment history. Please try refreshing the page.');
    } finally {
      setLoadingHistory(false);
      setLoading(false);
    }
  };

  const handlePayInvoice = (invoice) => {
    if (invoice.payment && invoice.payment._id) {
      // Direct payment processing for invoices with payment objects
      processPaymentDirect(invoice.payment._id);
    } else {
      // Fallback to modal for legacy invoices
      setSelectedInvoice(invoice);
      setShowPaymentModal(true);
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const processPayment = async () => {
    if (!selectedInvoice) return;
    
    setProcessingPayment(true);
    try {
      const response = await authenticatedFetch(
        `http://localhost:5001/api/invoices/${selectedInvoice._id}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: selectedInvoice.total,
            currency: 'USD'
          })
        },
        navigate
      );
      
      if (response.success && response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else {
        setError('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
      setShowPaymentModal(false);
    }
  };

  const processPaymentDirect = async (paymentId) => {
    setProcessingPayment(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/stripe/create-invoice-payment-session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ paymentId })
        },
        navigate
      );
      
      if (response.success && response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else {
        setError('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'succeeded':
        return 'status-badge status-paid';
      case 'overdue':
        return 'status-badge status-overdue';
      case 'pending':
      case 'processing':
        return 'status-badge status-pending';
      case 'failed':
      case 'cancelled':
        return 'status-badge status-overdue';
      default:
        return 'status-badge status-pending';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateSummary = () => {
    const totalOutstanding = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const totalPaid = paymentHistory
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { totalOutstanding, totalPaid, overdueAmount };
  };

  // Add a refresh button to manually refresh invoices and payment history
  const refreshData = () => {
    console.log('🔄 Manual refresh triggered');
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="payment-info">
        <LoadingSpinner />
      </div>
    );
  }

  const { totalOutstanding, totalPaid, overdueAmount } = calculateSummary();

>>>>>>> Stashed changes
  return (
    <div className="payment-info">
      <h2 className="section-title">Payment Information</h2>
      <div className="construction-message">
        <h3>Page Under Construction</h3>
      </div>
    </div>
  );
};

export default PaymentInfo;