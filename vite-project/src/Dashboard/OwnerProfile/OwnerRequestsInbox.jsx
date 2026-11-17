import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import './OwnerRequestsInbox.css';
import { ListItemSkeleton, ButtonLoader, CircularSpinner } from '../../components/loading';
import {
  Search,
  X,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  Home,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Info,
  Receipt,
  Printer,
  Send,
  Paperclip,
  RefreshCw,
  Layers,
  DoorClosed,
  Users,
  Briefcase,
  AlertTriangle,
  CreditCard,
  Check
} from 'lucide-react';

const OwnerRequestsInbox = () => {
  const navigate = useNavigate();

  // Primary data states
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active'); // 'Active' (default action queue) | 'Completed' | 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'All'
  const [granularStatus, setGranularStatus] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Rent' | 'Buy'

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Approve Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState(null);
  const [approveForm, setApproveForm] = useState({
    monthlyRent: '',
    securityDeposit: '',
    advanceAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    noticeDays: 60,
    paymentDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16),
    refundTerms: 'Security deposit is fully refundable at tenancy conclusion subject to final inspection and resolution of outstanding utility dues or damages.',
    note: ''
  });
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState('');

  // Reject Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Detail Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailTab, setDetailTab] = useState('dossier'); // 'dossier' | 'property' | 'messages' | 'timeline'
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Advance Payment Modal states
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState(null);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    currency: 'BDT',
    dueDate: '',
    instructions: '',
    note: ''
  });
  const [_amountError, setAmountError] = useState('');

  // Receipt Modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Auth helper
  const getAuthToken = useCallback(() => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user.token || null;
    } catch {
      return null;
    }
  }, []);

  const getCurrentUserId = useCallback(() => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) return null;
      const user = JSON.parse(userData);
      return user.userId || user.id || null;
    } catch {
      return null;
    }
  }, []);

  // Fetch Requests
  const fetchOwnerRequests = useCallback(async (isSilentRefresh = false) => {
    try {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const token = getAuthToken();
      if (!token) {
        setError('Please log in to view property requests.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch(API.getUrl(API.endpoints.ownerRequests), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error('Error fetching owner requests:', err);
      setError('Could not load property requests. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchOwnerRequests();
  }, [fetchOwnerRequests]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Accessibility: Lock Body Scroll when any modal is open
  const isAnyModalOpen = showApproveModal || showDetailModal || showRejectModal || showAdvancePaymentModal || showReceiptModal;
  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // Accessibility: Escape Key to dismiss active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showApproveModal && !approveLoading) {
          setShowApproveModal(false);
        } else if (showRejectModal && !rejectLoading) {
          setShowRejectModal(false);
        } else if (showDetailModal) {
          setShowDetailModal(false);
        } else if (showAdvancePaymentModal && !actionLoading) {
          setShowAdvancePaymentModal(false);
        } else if (showReceiptModal) {
          setShowReceiptModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showApproveModal, showRejectModal, showDetailModal, showAdvancePaymentModal, showReceiptModal, approveLoading, rejectLoading, actionLoading]);

  // Mark messages as read for active request
  const markMessagesAsRead = useCallback(async (requestId) => {
    try {
      const token = getAuthToken();
      if (!token || !requestId) return;
      await fetch(API.getUrl(API.endpoints.readMessages(requestId)), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // Locally reset unreadMessagesCount on this request
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, unreadMessagesCount: 0 } : r));
      setSelectedRequest(prev => prev?._id === requestId ? { ...prev, unreadMessagesCount: 0 } : prev);
    } catch (err) {
      console.warn('Error marking messages as read:', err.message);
    }
  }, [getAuthToken]);

  // Auto-refresh messages and mark read when Detail Modal Messages tab is active
  useEffect(() => {
    let messagePollInterval = null;
    if (showDetailModal && detailTab === 'messages' && selectedRequest?._id) {
      markMessagesAsRead(selectedRequest._id);
      fetchMessages(selectedRequest._id, false);

      messagePollInterval = setInterval(() => {
        fetchMessages(selectedRequest._id, true);
      }, 5000);
    }
    return () => {
      if (messagePollInterval) clearInterval(messagePollInterval);
    };
  }, [showDetailModal, detailTab, selectedRequest?._id, markMessagesAsRead]);

  // Format Helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '৳0';
    return `৳${Number(val).toLocaleString()}`;
  };

  const getInitials = (firstName, lastName, fallback) => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    return 'AP';
  };

  // Helper: Authoritatively determine whether application is an active tenancy
  const isRentalTenancyActive = useCallback((request) => {
    if (!request || request.requestType === 'Buy') return false;
    return Boolean(request.rentId || request.status === 'Paid/Completed');
  }, []);

  // Status Counts Calculation for Tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: requests.length,
      activeQueue: 0,
      completed: 0,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0
    };

    requests.forEach(r => {
      const s = r.status || '';
      const isCompletedTenancy = isRentalTenancyActive(r) || (r.requestType === 'Buy' && ['AdvancePaid', 'Confirmed for Sale'].includes(s));

      if (isCompletedTenancy) {
        counts.completed += 1;
      } else if (!['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(s)) {
        counts.activeQueue += 1;
      }

      if (['Submitted', 'Info Requested', 'Pending'].includes(s)) {
        counts.pending += 1;
      } else if (s === 'Under Review') {
        counts.underReview += 1;
      } else if (['Approved', 'Approved – Pay Advance', 'Offer Sent'].includes(s) && !isCompletedTenancy) {
        counts.approved += 1;
      } else if (['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(s)) {
        counts.rejected += 1;
      }
    });

    return counts;
  }, [requests, isRentalTenancyActive]);

  // Filtered Requests Logic
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const tenantName = `${request.tenantId?.firstName || ''} ${request.tenantId?.lastName || ''} ${request.tenantId?.name || ''}`.toLowerCase();
        const tenantEmail = (request.tenantId?.email || '').toLowerCase();
        const tenantPhone = (request.tenantId?.phoneNumber || request.payload?.identity?.phone || '').toLowerCase();
        const propertyTitle = (request.propertyId?.title || '').toLowerCase();
        const propertyAddress = (request.propertyId?.address || '').toLowerCase();
        const unitNumber = String(request.propertyId?.unitNumber || request.propertyId?.specifications?.unitNumber || '').toLowerCase();
        const requestId = (request.requestId || '').toLowerCase();

        const matchesSearch =
          tenantName.includes(query) ||
          tenantEmail.includes(query) ||
          tenantPhone.includes(query) ||
          propertyTitle.includes(query) ||
          propertyAddress.includes(query) ||
          unitNumber.includes(query) ||
          requestId.includes(query);

        if (!matchesSearch) return false;
      }

      // 2. Request Type Filter
      if (typeFilter !== 'All') {
        if ((request.requestType || '').toLowerCase() !== typeFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Status Tab Filter
      if (statusFilter !== 'All') {
        const s = request.status || '';
        const isCompletedTenancy = isRentalTenancyActive(request) || (request.requestType === 'Buy' && ['AdvancePaid', 'Confirmed for Sale'].includes(s));

        if (statusFilter === 'Active') {
          // Default Active Queue: only applications requiring owner action or awaiting applicant advance
          if (isCompletedTenancy || ['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(s)) {
            return false;
          }
        } else if (statusFilter === 'Completed') {
          // Completed / Tenancy Active filter
          if (!isCompletedTenancy) return false;
        } else if (statusFilter === 'Pending') {
          if (!['Submitted', 'Info Requested', 'Pending'].includes(s)) return false;
        } else if (statusFilter === 'Under Review') {
          if (s !== 'Under Review') return false;
        } else if (statusFilter === 'Approved') {
          if (!['Approved', 'Approved – Pay Advance', 'Offer Sent'].includes(s) || isCompletedTenancy) return false;
        } else if (statusFilter === 'Rejected') {
          if (!['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(s)) return false;
        }
      }

      // 4. Granular Status Filter (if picked)
      if (granularStatus !== 'All') {
        if (request.status !== granularStatus) return false;
      }

      return true;
    });
  }, [requests, searchTerm, statusFilter, granularStatus, typeFilter, isRentalTenancyActive]);

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Paid/Completed':
        return (
          <span className="card-status-badge badge-approved">
            <CheckCircle2 size={13} /> {status === 'Paid/Completed' ? 'Completed' : 'Approved'}
          </span>
        );
      case 'Submitted':
      case 'Pending':
        return (
          <span className="card-status-badge badge-submitted">
            <Clock size={13} /> {status === 'Submitted' ? 'Submitted' : 'Pending'}
          </span>
        );
      case 'Under Review':
        return (
          <span className="card-status-badge badge-under-review">
            <Clock size={13} /> Under Review
          </span>
        );
      case 'Info Requested':
        return (
          <span className="card-status-badge badge-info-requested">
            <AlertCircle size={13} /> Info Requested
          </span>
        );
      case 'AdvancePaid':
      case 'Approved – Pay Advance':
        return (
          <span className="card-status-badge badge-advance-paid">
            <CreditCard size={13} /> {status === 'AdvancePaid' ? 'Advance Paid' : 'Pay Advance'}
          </span>
        );
      case 'Rejected':
        return (
          <span className="card-status-badge badge-rejected">
            <XCircle size={13} /> Rejected
          </span>
        );
      case 'Canceled':
      case 'Withdrawn':
        return (
          <span className="card-status-badge badge-canceled">
            <X size={13} /> {status}
          </span>
        );
      default:
        return (
          <span className="card-status-badge badge-neutral">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  // ==========================================================================
  // APPROVAL & OFFER ISSUANCE MODAL HANDLERS
  // ==========================================================================
  const handleOpenApproveModal = (request) => {
    const reqObj = typeof request === 'string' ? requests.find(r => r._id === request) : request;
    if (!reqObj) return;

    setSelectedRequestForApprove(reqObj);
    setApproveError('');

    const defaultRent =
      reqObj.propertyId?.pricing?.rent ||
      reqObj.propertyId?.pricing?.monthlyRent ||
      reqObj.propertyId?.price ||
      '';

    const defaultDeposit =
      reqObj.propertyId?.pricing?.securityDeposit ||
      reqObj.propertyId?.pricing?.deposit ||
      defaultRent ||
      '';

    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deadlineDefault = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16);

    setApproveForm({
      monthlyRent: defaultRent,
      securityDeposit: defaultDeposit,
      advanceAmount: defaultDeposit,
      startDate: today,
      endDate: oneYearLater,
      noticeDays: 60,
      paymentDeadline: deadlineDefault,
      refundTerms: 'Security deposit is fully refundable at tenancy conclusion subject to final inspection and resolution of outstanding utility dues or damages.',
      note: ''
    });

    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequestForApprove) return;
    setApproveError('');

    // Client Validation
    const rentNum = parseFloat(approveForm.monthlyRent);
    if (isNaN(rentNum) || rentNum <= 0) {
      setApproveError('Please enter a valid monthly rent amount greater than 0.');
      return;
    }

    if (!approveForm.startDate) {
      setApproveError('Lease start date is required.');
      return;
    }

    if (approveForm.endDate && new Date(approveForm.endDate) <= new Date(approveForm.startDate)) {
      setApproveError('Lease end date must be after the lease start date.');
      return;
    }

    if (!approveForm.paymentDeadline) {
      setApproveError('Payment deadline is required.');
      return;
    }

    if (new Date(approveForm.paymentDeadline) <= new Date()) {
      setApproveError('Payment deadline must be a future date and time.');
      return;
    }

    try {
      setApproveLoading(true);
      const token = getAuthToken();
      if (!token) {
        setApproveError('Authentication session expired. Please log in again.');
        return;
      }

      const response = await fetch(API.getUrl(API.endpoints.approveRequest(selectedRequestForApprove._id)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthlyRent: rentNum,
          securityDeposit: parseFloat(approveForm.securityDeposit) || 0,
          advanceAmount: parseFloat(approveForm.advanceAmount) || parseFloat(approveForm.securityDeposit) || rentNum,
          startDate: approveForm.startDate,
          endDate: approveForm.endDate || null,
          noticeDays: parseInt(approveForm.noticeDays) || 60,
          paymentDeadline: approveForm.paymentDeadline,
          refundTerms: approveForm.refundTerms?.trim(),
          note: approveForm.note?.trim() || ''
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update status locally: 'Approved – Pay Advance'
        setRequests(prev => prev.map(r => r._id === selectedRequestForApprove._id ? {
          ...r,
          status: 'Approved – Pay Advance',
          offer: data.offer,
          reservation: data.reservation
        } : r));
        setShowApproveModal(false);
        setSelectedRequestForApprove(null);
        if (showDetailModal) setShowDetailModal(false);

        setToast({
          type: 'success',
          message: 'Formal offer issued and unit temporarily reserved until payment deadline! Tenancy will activate upon verified payment.'
        });

        // Background refresh to sync database states
        fetchOwnerRequests(true);
      } else {
        setApproveError(data.message || 'Failed to approve application. Please try again.');
      }
    } catch (err) {
      console.error('Error approving application:', err);
      setApproveError('A network error occurred while approving the application: ' + err.message);
    } finally {
      setApproveLoading(false);
    }
  };

  // ==========================================================================
  // REJECT MODAL HANDLERS
  // ==========================================================================
  const handleOpenRejectModal = (request) => {
    const reqObj = typeof request === 'string' ? requests.find(r => r._id === request) : request;
    setSelectedRequestForReject(reqObj);
    setRejectReason('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequestForReject) return;
    const reqId = selectedRequestForReject._id || selectedRequestForReject;
    setRejectError('');

    if (!rejectReason.trim()) {
      setRejectError('Please specify a reason for rejecting this application.');
      return;
    }

    try {
      setRejectLoading(true);
      const token = getAuthToken();
      if (!token) {
        setRejectError('Authentication session expired. Please log in again.');
        return;
      }

      const response = await fetch(API.getUrl(API.endpoints.rejectRequest(reqId)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'Rejected' } : r));
        setShowRejectModal(false);
        setSelectedRequestForReject(null);
        if (showDetailModal) setShowDetailModal(false);

        setToast({
          type: 'info',
          message: 'Application has been rejected. The applicant has been notified.'
        });

        fetchOwnerRequests(true);
      } else {
        setRejectError(data.message || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setRejectError('Failed to reject application: ' + err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // ==========================================================================
  // DETAIL MODAL & MESSAGING HANDLERS
  // ==========================================================================
  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setDetailTab('dossier');
    setShowDetailModal(true);
    await fetchMessages(request._id);
  };

  const fetchMessages = async (requestId, isSilent = false) => {
    try {
      if (!isSilent) setMessagesLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(API.endpoints.requestMessages(requestId)), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Error fetching request messages:', err);
    } finally {
      if (!isSilent) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedRequest?._id || sendingMessage) return;

    try {
      setSendingMessage(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(API.endpoints.requestMessages(selectedRequest._id)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.newMessage) {
          setMessages(prev => [...prev, data.newMessage]);
          setNewMessage('');
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // ==========================================================================
  // ADVANCE PAYMENT & RECEIPT HANDLERS
  // ==========================================================================
  const _handleOpenAdvancePaymentModal = (request) => {
    const reqObj = typeof request === 'string' ? requests.find(r => r._id === request) : request;
    setSelectedRequestForPayment(reqObj);
    setAmountError('');
    setAdvancePaymentForm({
      amount: '',
      currency: 'BDT',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      instructions: 'Please submit advance deposit via Stripe or bank transfer.',
      note: ''
    });
    setShowAdvancePaymentModal(true);
  };

  const _handleAdvancePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequestForPayment) return;

    const amt = parseFloat(advancePaymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(API.endpoints.advancePayment(selectedRequestForPayment._id)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(advancePaymentForm)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowAdvancePaymentModal(false);
        setToast({ type: 'success', message: 'Advance payment instructions sent to tenant.' });
        fetchOwnerRequests(true);
      } else {
        alert(data.message || 'Failed to setup advance payment');
      }
    } catch (err) {
      console.error('Error setting advance payment:', err);
      alert('An error occurred while setting up advance payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGetReceipt = async (paymentId) => {
    if (!paymentId) {
      alert('No receipt or payment ID found for this request.');
      return;
    }

    try {
      setReceiptLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(`/api/stripe/receipt/${paymentId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.receiptUrl) {
          window.open(data.receiptUrl, '_blank');
        } else if (data.receiptData) {
          setPaymentReceipt(data);
          setShowReceiptModal(true);
        } else {
          alert('Receipt data currently unavailable.');
        }
      } else {
        alert('Could not retrieve payment receipt.');
      }
    } catch (err) {
      console.error('Error retrieving receipt:', err);
      alert('Failed to retrieve receipt.');
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <div className="owner-requests-container">
      {/* 1. Header Banner */}
      <div className="requests-header-banner">
        <div className="requests-header-info">
          <h1>Property Requests</h1>
          <p>Review and manage rental applications and inquiries for your properties</p>
        </div>

        <div className="requests-header-actions">
          <span className="requests-count-badge">
            <Layers size={14} />
            {filteredRequests.length} {filteredRequests.length === 1 ? 'Application' : 'Applications'}
          </span>

          <button
            onClick={() => fetchOwnerRequests(true)}
            className="requests-refresh-btn"
            disabled={loading || refreshing}
            title="Refresh application list"
          >
            <RefreshCw size={14} className={refreshing ? 'refresh-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Toast Alert Notification */}
      {toast && (
        <div className={`requests-alert-banner ${toast.type}`}>
          <div className="alert-content">
            {toast.type === 'success' && <CheckCircle2 size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="alert-close-btn" aria-label="Close notification">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Controls & Search Filter Card */}
      <div className="requests-controls-card">
        {/* Top Search & Type Row */}
        <div className="requests-search-row">
          <div className="requests-search-box">
            <Search size={16} className="requests-search-icon" />
            <input
              type="text"
              placeholder="Search by applicant name, email, phone, property or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="requests-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="requests-search-clear"
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="requests-type-filter">
            <Filter size={14} />
            <span>Listing Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="requests-type-select"
            >
              <option value="All">All Types</option>
              <option value="Rent">For Rent</option>
              <option value="Buy">For Sale</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs / Pills */}
        <div className="requests-status-tabs">
          <button
            onClick={() => { setStatusFilter('Active'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Active' ? 'active' : ''}`}
            title="Applications requiring owner action or awaiting applicant payment"
          >
            Active Queue
            <span className="status-tab-count">{statusCounts.activeQueue}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('Completed'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Completed' ? 'active' : ''}`}
            title="Completed applications with activated tenancies"
          >
            Completed & Tenancies
            <span className="status-tab-count">{statusCounts.completed}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('Pending'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
          >
            Pending
            <span className="status-tab-count">{statusCounts.pending}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('Under Review'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Under Review' ? 'active' : ''}`}
          >
            Under Review
            <span className="status-tab-count">{statusCounts.underReview}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('Approved'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Approved' ? 'active' : ''}`}
          >
            Approved / Offers
            <span className="status-tab-count">{statusCounts.approved}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('Rejected'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'Rejected' ? 'active' : ''}`}
          >
            Archived / Rejected
            <span className="status-tab-count">{statusCounts.rejected}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('All'); setGranularStatus('All'); }}
            className={`status-tab-btn ${statusFilter === 'All' && granularStatus === 'All' ? 'active' : ''}`}
          >
            All Applications
            <span className="status-tab-count">{statusCounts.all}</span>
          </button>

          {/* Granular status selector */}
          <div className="granular-status-wrapper">
            <span>Status:</span>
            <select
              value={granularStatus}
              onChange={(e) => {
                setGranularStatus(e.target.value);
                if (e.target.value !== 'All') setStatusFilter('All');
              }}
              className="granular-select"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Info Requested">Info Requested</option>
              <option value="Approved">Approved</option>
              <option value="Approved – Pay Advance">Approved – Pay Advance</option>
              <option value="AdvancePaid">AdvancePaid</option>
              <option value="Paid/Completed">Paid/Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Requests Content */}
      {loading ? (
        <div className="requests-list-container">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="requests-empty-state">
          <div className="empty-state-icon-wrap" style={{ color: '#DC2626', background: '#FEF2F2' }}>
            <AlertCircle size={28} />
          </div>
          <h3>Failed to Load Requests</h3>
          <p>{error}</p>
          <button onClick={() => fetchOwnerRequests()} className="btn-primary-blue">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="requests-empty-state">
          <div className="empty-state-icon-wrap">
            <Building2 size={28} />
          </div>
          <h3>No Requests Found</h3>
          <p>
            {searchTerm || statusFilter !== 'All' || granularStatus !== 'All' || typeFilter !== 'All'
              ? 'No property applications match your active search and filter criteria.'
              : 'You have no applications or inquiries for your properties at this time.'}
          </p>
          {(searchTerm || statusFilter !== 'All' || granularStatus !== 'All' || typeFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setGranularStatus('All');
                setTypeFilter('All');
              }}
              className="btn-secondary-outline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="requests-list-container">
          {filteredRequests.map((request) => {
            const applicantFirst = request.tenantId?.firstName || '';
            const applicantLast = request.tenantId?.lastName || '';
            const applicantName = `${applicantFirst} ${applicantLast}`.trim() || request.tenantId?.name || 'Applicant';
            const applicantInitials = getInitials(applicantFirst, applicantLast, applicantName);
            const applicantEmail = request.tenantId?.email || 'Not provided';
            const applicantPhone = request.tenantId?.phoneNumber || request.payload?.identity?.phone || 'Not provided';

            const propertyTitle = request.propertyId?.title || request.propertyId?.address || 'Property Listing';
            const propertyCity = request.propertyId?.city ? `, ${request.propertyId.city}` : '';
            const propertyAddress = `${request.propertyId?.address || ''}${propertyCity}`.trim() || 'Address not listed';
            const unitNumber =
              request.propertyId?.unitNumber ||
              request.propertyId?.specifications?.unitNumber ||
              (request.propertyId?.floorNumber ? `Floor ${request.propertyId.floorNumber}` : 'Standard Unit');

            const listedRent =
              request.propertyId?.pricing?.rent ||
              request.propertyId?.pricing?.monthlyRent ||
              request.propertyId?.price ||
              0;

            const isTenancyActive = isRentalTenancyActive(request);
            const isPendingApproval = ['Submitted', 'Under Review', 'Info Requested'].includes(request.status) && !isTenancyActive;
            const isAdvancePaid = request.status === 'AdvancePaid' && request.requestType === 'Buy';
            const isRejected = ['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(request.status);

            return (
              <div key={request._id} className="inbox-request-card">
                {/* Card Header Bar */}
                <div className="card-header-bar">
                  <div className="card-header-left">
                    <span className="request-id-tag">#{request.requestId || request._id.slice(-8)}</span>
                    <span className={`request-type-pill ${(request.requestType || 'rent').toLowerCase()}`}>
                      {request.requestType === 'Buy' ? 'For Sale' : 'For Rent'}
                    </span>
                    <span className="request-date-tag">
                      <Calendar size={13} />
                      Applied on {formatDate(request.createdAt)}
                    </span>
                  </div>

                  <div className="card-header-right">
                    {renderStatusBadge(request.status)}
                  </div>
                </div>

                {/* Card Body Grid */}
                <div className="card-body-grid">
                  {/* Column 1: Applicant Information */}
                  <div className="applicant-col">
                    <div className="applicant-avatar-circle">
                      {applicantInitials}
                    </div>
                    <div className="applicant-text-info">
                      <h4 className="applicant-name">{applicantName}</h4>
                      <span className="applicant-contact-line" title={applicantEmail}>
                        <Mail size={13} /> {applicantEmail}
                      </span>
                      <span className="applicant-contact-line" title={applicantPhone}>
                        <Phone size={13} /> {applicantPhone}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Property and Unit Information */}
                  <div className="property-col">
                    <div className="property-title-row" title={propertyTitle}>
                      <Building2 size={15} color="#2563EB" />
                      <span>{propertyTitle}</span>
                    </div>
                    <div className="property-address-row" title={propertyAddress}>
                      <span>{propertyAddress}</span>
                    </div>
                    <div className="property-tags-row">
                      <span className="unit-tag">
                        <DoorClosed size={12} />
                        {unitNumber.includes('Unit') || unitNumber.includes('Floor') ? unitNumber : `Unit ${unitNumber}`}
                      </span>
                      <span className="price-tag">
                        {request.requestType === 'Buy' ? formatCurrency(request.propertyId?.price || request.propertyId?.pricing?.sale) : `${formatCurrency(listedRent)} / mo`}
                      </span>
                    </div>
                  </div>

                  {/* Column 3: Application Dossier Highlights */}
                  <div className="snapshot-col">
                    {request.payload?.occupation?.role ? (
                      <div className="snapshot-item" title="Occupation">
                        <Briefcase size={13} />
                        <span>{request.payload.occupation.role}</span>
                        {request.payload.occupation.companyName && (
                          <span style={{ color: '#94A3B8' }}>• {request.payload.occupation.companyName}</span>
                        )}
                      </div>
                    ) : (
                      <div className="snapshot-item">
                        <Briefcase size={13} />
                        <span>Occupation: Not specified</span>
                      </div>
                    )}

                    {request.payload?.familyMembers && request.payload.familyMembers.length > 0 && (
                      <div className="snapshot-item">
                        <Users size={13} />
                        <span>{request.payload.familyMembers.length} {request.payload.familyMembers.length === 1 ? 'Household Member' : 'Household Members'}</span>
                      </div>
                    )}

                    {request.payload?.financials?.monthlyIncome && (
                      <div className="snapshot-item">
                        <DollarSign size={13} />
                        <span>Income: {formatCurrency(request.payload.financials.monthlyIncome)} / mo</span>
                      </div>
                    )}

                    {request.payload?.letterToOwner && (
                      <div className="snapshot-note" title={request.payload.letterToOwner}>
                        "{request.payload.letterToOwner}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer Bar */}
                <div className="card-actions-bar">
                  <div className="card-actions-left">
                    <span>
                      {request.timeline && request.timeline.length > 0
                        ? `Last event: ${request.timeline[request.timeline.length - 1].event}`
                        : 'Application filed'}
                    </span>
                  </div>

                  <div className="card-actions-right">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="btn-secondary-outline"
                    >
                      <Eye size={14} /> View Details
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setDetailTab('messages');
                        setShowDetailModal(true);
                        fetchMessages(request._id, false);
                      }}
                      className={`btn-secondary-outline ${request.unreadMessagesCount > 0 ? 'btn-has-unread' : ''}`}
                      title={request.unreadMessagesCount > 0 ? `${request.unreadMessagesCount} unread message(s)` : 'Direct communication'}
                    >
                      <Mail size={14} /> Messages
                      {request.unreadMessagesCount > 0 ? (
                        <span className="owner-unread-badge">{request.unreadMessagesCount}</span>
                      ) : (request.messagesCount > 0 ? (
                        <span className="owner-count-subtle">{request.messagesCount}</span>
                      ) : null)}
                    </button>

                    {/* Pending Actions */}
                    {isPendingApproval && (
                      <>
                        <button
                          onClick={() => handleOpenApproveModal(request)}
                          className="btn-primary-blue"
                          disabled={actionLoading || approveLoading}
                        >
                          <CheckCircle2 size={14} /> Approve & Send Offer
                        </button>

                        <button
                          onClick={() => handleOpenRejectModal(request)}
                          className="btn-danger-outline"
                          disabled={actionLoading || approveLoading}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}

                    {/* Approved Actions */}
                    {isTenancyActive && (
                      <>
                        <span className="active-tenancy-indicator">
                          <CheckCircle2 size={14} /> Tenancy Active
                        </span>
                        <button
                          onClick={() => navigate('/tenant-info')}
                          className="btn-navy"
                        >
                          View in Tenant Info <ArrowRight size={14} />
                        </button>
                      </>
                    )}

                    {/* Offer Sent / Awaiting Advance Actions */}
                    {request.status === 'Approved – Pay Advance' && (
                      <>
                        <span className="card-status-badge badge-advance-paid" style={{ padding: '0.4375rem 0.875rem' }}>
                          <Clock size={13} /> Offer Sent (Reserved)
                        </span>
                        {request.offer?.paymentDeadline && (
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Expires: {new Date(request.offer.paymentDeadline).toLocaleDateString()} {new Date(request.offer.paymentDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </>
                    )}

                    {/* Advance Paid Actions */}
                    {isAdvancePaid && (
                      <>
                        <button
                          onClick={() => handleGetReceipt(request.advancePayment?.paymentId)}
                          className="btn-secondary-outline"
                          disabled={receiptLoading}
                        >
                          <Receipt size={14} /> {receiptLoading ? 'Loading...' : 'Show Receipt'}
                        </button>
                      </>
                    )}

                    {/* Rejected Indicator */}
                    {isRejected && (
                      <span className="card-status-badge badge-rejected" style={{ padding: '0.4375rem 0.875rem' }}>
                        <XCircle size={14} /> Application Declined
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          REDESIGNED APPROVE RENTAL APPLICATION MODAL
          Strict focus: 42rem-48rem, 90dvh, Sticky Header, Scrollable Body, Sticky Footer
          ===================================================================== */}
      {showApproveModal && selectedRequestForApprove && (
        <div
          className="ds-modal-backdrop"
          onClick={() => { if (!approveLoading) setShowApproveModal(false); }}
          role="presentation"
        >
          <div
            className="ds-modal-dialog modal-approve-width"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-modal-title"
          >
            {/* 1. FIXED STICKY HEADER */}
            <div className="ds-modal-header">
              <div className="ds-modal-header-content">
                <h2 id="approve-modal-title">Approve Application & Issue Offer</h2>
                <p>Review terms, set deposit & payment deadline, and issue formal offer with unit reservation</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="ds-modal-close-btn"
                aria-label="Close approval modal"
                disabled={approveLoading}
              >
                <X size={18} />
              </button>
            </div>

            {/* 2. SCROLLABLE MIDDLE BODY */}
            <form id="approve-application-form" onSubmit={handleApproveSubmit} className="ds-modal-body">
              {/* Informational Explanation Banner */}
              <div className="approve-info-banner">
                <ShieldCheck size={20} className="banner-icon" />
                <div className="banner-text">
                  <h4>Unit Reservation & Advance Deposit Notice</h4>
                  <p>
                    Issuing this offer temporarily reserves the property/unit for{' '}
                    <strong>
                      {selectedRequestForApprove.tenantId?.firstName} {selectedRequestForApprove.tenantId?.lastName || selectedRequestForApprove.tenantId?.name}
                    </strong>{' '}
                    until the payment deadline. Tenancy activates automatically upon verified advance deposit payment.
                    If the advance payment is not received before the deadline, the reservation automatically expires and releases the unit back to Available.
                  </p>
                </div>
              </div>

              {/* Inline Error Alert */}
              {approveError && (
                <div className="modal-error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{approveError}</span>
                </div>
              )}

              {/* Section 1: Applicant Information (Compact Read-Only Card) */}
              <div className="modal-section-card">
                <div className="modal-section-heading">
                  <UserCheck size={14} /> Applicant Information
                </div>
                <div className="applicant-dossier-grid">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">
                      {selectedRequestForApprove.tenantId?.firstName} {selectedRequestForApprove.tenantId?.lastName || selectedRequestForApprove.tenantId?.name}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email Address</span>
                    <span className="info-value">
                      {selectedRequestForApprove.tenantId?.email || 'N/A'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone Number</span>
                    <span className="info-value">
                      {selectedRequestForApprove.tenantId?.phoneNumber || selectedRequestForApprove.payload?.identity?.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Application Reference</span>
                    <span className="info-value" style={{ fontFamily: 'monospace' }}>
                      #{selectedRequestForApprove.requestId || selectedRequestForApprove._id.slice(-8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Property & Unit Details (Compact Read-Only Card) */}
              <div className="modal-section-card">
                <div className="modal-section-heading">
                  <Building2 size={14} /> Property & Unit Details
                </div>
                <div className="property-summary-grid">
                  <div className="info-item">
                    <span className="info-label">Property Title / Location</span>
                    <span className="info-value">
                      {selectedRequestForApprove.propertyId?.title || selectedRequestForApprove.propertyId?.address}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Full Address</span>
                    <span className="info-value">
                      {selectedRequestForApprove.propertyId?.address}{selectedRequestForApprove.propertyId?.city ? `, ${selectedRequestForApprove.propertyId.city}` : ''}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Assigned Apartment / Unit</span>
                    <span className="info-value">
                      {selectedRequestForApprove.propertyId?.unitNumber
                        ? `Unit ${selectedRequestForApprove.propertyId.unitNumber}`
                        : selectedRequestForApprove.propertyId?.floorNumber
                        ? `Floor ${selectedRequestForApprove.propertyId.floorNumber}`
                        : 'Unit 1 (Standard Unit)'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Listed Price Reference</span>
                    <span className="info-value">
                      {formatCurrency(
                        selectedRequestForApprove.propertyId?.pricing?.rent ||
                        selectedRequestForApprove.propertyId?.pricing?.monthlyRent ||
                        selectedRequestForApprove.propertyId?.price || 0
                      )} / month
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Rental Terms & Offer Parameters (2-Column Desktop Layout) */}
              <div className="modal-section-card" style={{ background: '#FFFFFF' }}>
                <div className="modal-section-heading" style={{ color: '#0F172A' }}>
                  <DollarSign size={14} /> Formal Offer Terms & Payment Deadline
                </div>

                <div className="rental-terms-grid">
                  {/* Field 1: Monthly Rent */}
                  <div className="form-field-group">
                    <label htmlFor="approve-rent">
                      Monthly Rent (BDT ৳) <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      id="approve-rent"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 65000"
                      value={approveForm.monthlyRent}
                      onChange={(e) => setApproveForm({ ...approveForm, monthlyRent: e.target.value })}
                    />
                    <p className="field-hint">Agreed recurring rent per month</p>
                  </div>

                  {/* Field 2: Security Deposit */}
                  <div className="form-field-group">
                    <label htmlFor="approve-deposit">
                      Security Deposit (BDT ৳)
                    </label>
                    <input
                      type="number"
                      id="approve-deposit"
                      min="0"
                      step="1"
                      placeholder="e.g. 130000"
                      value={approveForm.securityDeposit}
                      onChange={(e) => setApproveForm({
                        ...approveForm,
                        securityDeposit: e.target.value,
                        advanceAmount: approveForm.advanceAmount === approveForm.securityDeposit ? e.target.value : approveForm.advanceAmount
                      })}
                    />
                    <p className="field-hint">Refundable deposit held under lease terms</p>
                  </div>

                  {/* Field 3: Advance Payment Required */}
                  <div className="form-field-group">
                    <label htmlFor="approve-advance">
                      Advance Payment Required (BDT ৳) <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      id="approve-advance"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 130000"
                      value={approveForm.advanceAmount}
                      onChange={(e) => setApproveForm({ ...approveForm, advanceAmount: e.target.value })}
                    />
                    <p className="field-hint">Required deposit to activate lease before deadline</p>
                  </div>

                  {/* Field 4: Payment Deadline */}
                  <div className="form-field-group">
                    <label htmlFor="approve-deadline">
                      Payment Deadline <span className="req-star">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="approve-deadline"
                      required
                      value={approveForm.paymentDeadline}
                      onChange={(e) => setApproveForm({ ...approveForm, paymentDeadline: e.target.value })}
                    />
                    <p className="field-hint">Authoritative deadline (default: 72 hours from now)</p>
                  </div>

                  {/* Field 5: Move-Out Notice Period */}
                  <div className="form-field-group">
                    <label htmlFor="approve-notice">
                      Move-Out Notice Period (Days) <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      id="approve-notice"
                      required
                      min="1"
                      step="1"
                      placeholder="60"
                      value={approveForm.noticeDays}
                      onChange={(e) => setApproveForm({ ...approveForm, noticeDays: e.target.value })}
                    />
                    <p className="field-hint">Standard advance move-out notice requirement (default 60 days)</p>
                  </div>

                  {/* Field 6: Lease Start Date */}
                  <div className="form-field-group">
                    <label htmlFor="approve-start">
                      Lease Start Date <span className="req-star">*</span>
                    </label>
                    <input
                      type="date"
                      id="approve-start"
                      required
                      value={approveForm.startDate}
                      onChange={(e) => setApproveForm({ ...approveForm, startDate: e.target.value })}
                    />
                    <p className="field-hint">Date occupancy and lease begins</p>
                  </div>

                  {/* Field 7: Lease End Date */}
                  <div className="form-field-group">
                    <label htmlFor="approve-end">
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      id="approve-end"
                      value={approveForm.endDate}
                      min={approveForm.startDate || undefined}
                      onChange={(e) => setApproveForm({ ...approveForm, endDate: e.target.value })}
                    />
                    <p className="field-hint">Fixed expiration date (typically 1 year)</p>
                  </div>
                </div>
              </div>

              {/* Section 4: Refund Terms & Conditions */}
              <div className="form-field-group">
                <label htmlFor="approve-refund">
                  Security Deposit Refund Terms
                </label>
                <textarea
                  id="approve-refund"
                  rows="2"
                  value={approveForm.refundTerms}
                  onChange={(e) => setApproveForm({ ...approveForm, refundTerms: e.target.value })}
                />
                <p className="field-hint">Explicit terms detailing deposit return conditions upon lease conclusion.</p>
              </div>

              {/* Section 5: Welcome Note / Special Terms */}
              <div className="form-field-group">
                <label htmlFor="approve-note">
                  Welcome Note / Special Lease Terms
                </label>
                <textarea
                  id="approve-note"
                  rows="3"
                  placeholder="Include welcome instructions, key pickup arrangements, parking terms, or house rules..."
                  value={approveForm.note}
                  onChange={(e) => setApproveForm({ ...approveForm, note: e.target.value })}
                />
                <p className="field-hint">Communicated to tenant with formal offer details.</p>
              </div>
            </form>

            {/* 3. FIXED STICKY FOOTER (Always visible) */}
            <div className="ds-modal-footer">
              <span className="footer-note">Property will be reserved until the payment deadline.</span>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="btn-secondary-outline"
                disabled={approveLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="approve-application-form"
                className="btn-primary-blue"
                disabled={approveLoading}
              >
                {approveLoading ? (
                  <>
                    <ButtonLoader size="small" /> Issuing Offer...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Approve & Send Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          REDESIGNED REJECT APPLICATION MODAL
          ===================================================================== */}
      {showRejectModal && selectedRequestForReject && (
        <div
          className="ds-modal-backdrop"
          onClick={() => { if (!rejectLoading) setShowRejectModal(false); }}
          role="presentation"
        >
          <div
            className="ds-modal-dialog modal-small-width"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
          >
            <div className="ds-modal-header">
              <div className="ds-modal-header-content">
                <h2 id="reject-modal-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} /> Reject Rental Application
                </h2>
                <p>This action will decline the application and notify the applicant.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="ds-modal-close-btn"
                disabled={rejectLoading}
              >
                <X size={18} />
              </button>
            </div>

            <form id="reject-form" onSubmit={handleRejectSubmit} className="ds-modal-body">
              {rejectError && (
                <div className="modal-error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{rejectError}</span>
                </div>
              )}

              <div className="modal-section-card" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p style={{ margin: 0, fontSize: '0.84375rem', color: '#991B1B', lineHeight: 1.5 }}>
                  Are you sure you want to decline the rental request for{' '}
                  <strong>
                    {selectedRequestForReject.tenantId?.firstName} {selectedRequestForReject.tenantId?.lastName || selectedRequestForReject.tenantId?.name || 'this applicant'}
                  </strong>?
                </p>
              </div>

              <div className="form-field-group">
                <label htmlFor="reject-reason">
                  Reason for Rejection <span className="req-star">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  required
                  rows="4"
                  placeholder="Please state why this application cannot be accepted at this time..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </form>

            <div className="ds-modal-footer">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary-outline"
                disabled={rejectLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="reject-form"
                className="btn-danger-outline"
                style={{ background: '#DC2626', color: '#FFFFFF', border: 'none' }}
                disabled={rejectLoading}
              >
                {rejectLoading ? (
                  <>
                    <ButtonLoader size="small" /> Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          REDESIGNED DETAILS MODAL (Applicant Dossier, Specs, Chat, Timeline)
          ===================================================================== */}
      {showDetailModal && selectedRequest && (
        <div
          className="ds-modal-backdrop"
          onClick={() => setShowDetailModal(false)}
          role="presentation"
        >
          <div
            className="ds-modal-dialog modal-detail-width"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-modal-title"
          >
            {/* Modal Header */}
            <div className="ds-modal-header">
              <div className="ds-modal-header-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <h2 id="detail-modal-title">Application Dossier</h2>
                  <span className="request-id-tag">#{selectedRequest.requestId || selectedRequest._id.slice(-8)}</span>
                </div>
                <p>
                  Applicant: {selectedRequest.tenantId?.firstName} {selectedRequest.tenantId?.lastName || selectedRequest.tenantId?.name} • Property: {selectedRequest.propertyId?.title || selectedRequest.propertyId?.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="ds-modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="detail-tabs-bar">
              <button
                onClick={() => setDetailTab('dossier')}
                className={`detail-tab-btn ${detailTab === 'dossier' ? 'active' : ''}`}
              >
                <UserCheck size={14} /> Applicant Dossier
              </button>
              <button
                onClick={() => setDetailTab('property')}
                className={`detail-tab-btn ${detailTab === 'property' ? 'active' : ''}`}
              >
                <Building2 size={14} /> Property & Terms
              </button>
              <button
                onClick={() => setDetailTab('messages')}
                className={`detail-tab-btn ${detailTab === 'messages' ? 'active' : ''}`}
              >
                <Mail size={14} /> Messages ({messages.length})
                {selectedRequest?.unreadMessagesCount > 0 && (
                  <span className="unread-pill-bubble">{selectedRequest.unreadMessagesCount}</span>
                )}
              </button>
              <button
                onClick={() => setDetailTab('timeline')}
                className={`detail-tab-btn ${detailTab === 'timeline' ? 'active' : ''}`}
              >
                <Clock size={14} /> Timeline
              </button>
            </div>

            {/* Modal Body */}
            <div className="ds-modal-body">
              {detailTab === 'dossier' && (
                <>
                  {/* Personal & Contact Summary */}
                  <div className="modal-section-card">
                    <div className="modal-section-heading">
                      <User size={14} /> Personal Identity
                    </div>
                    <div className="applicant-dossier-grid">
                      <div className="info-item">
                        <span className="info-label">Full Legal Name</span>
                        <span className="info-value">
                          {selectedRequest.tenantId?.firstName} {selectedRequest.tenantId?.lastName || selectedRequest.tenantId?.name}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email Address</span>
                        <span className="info-value">{selectedRequest.tenantId?.email || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Phone Contact</span>
                        <span className="info-value">
                          {selectedRequest.tenantId?.phoneNumber || selectedRequest.payload?.identity?.phone || 'Not provided'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Application Date</span>
                        <span className="info-value">{formatDate(selectedRequest.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Occupation & Employment */}
                  {selectedRequest.payload?.occupation && (
                    <div className="modal-section-card">
                      <div className="modal-section-heading">
                        <Briefcase size={14} /> Occupation & Employment
                      </div>
                      <div className="applicant-dossier-grid">
                        <div className="info-item">
                          <span className="info-label">Job Title / Role</span>
                          <span className="info-value">{selectedRequest.payload.occupation.role || selectedRequest.payload.occupation.jobTitle || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Company / Employer</span>
                          <span className="info-value">{selectedRequest.payload.occupation.companyName || selectedRequest.payload.occupation.company || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Employment Type</span>
                          <span className="info-value" style={{ textTransform: 'capitalize' }}>
                            {selectedRequest.payload.occupation.employmentType || 'Employed'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Monthly Declared Income</span>
                          <span className="info-value">
                            {formatCurrency(selectedRequest.payload.financials?.monthlyIncome || selectedRequest.payload.occupation.monthlyIncome)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Household Members */}
                  {selectedRequest.payload?.familyMembers && selectedRequest.payload.familyMembers.length > 0 && (
                    <div className="modal-section-card">
                      <div className="modal-section-heading">
                        <Users size={14} /> Household Members ({selectedRequest.payload.familyMembers.length})
                      </div>
                      <div className="family-grid">
                        {selectedRequest.payload.familyMembers.map((member, idx) => (
                          <div key={idx} className="family-card">
                            <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '0.25rem' }}>{member.name}</div>
                            <div style={{ color: '#64748B' }}>Relation: {member.relation}</div>
                            <div style={{ color: '#64748B' }}>Age: {member.age} yrs</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Belongings & Vehicles */}
                  {selectedRequest.payload?.belongings && (
                    <div className="modal-section-card">
                      <div className="modal-section-heading">
                        <DoorClosed size={14} /> Belongings, Pets & Vehicles
                      </div>
                      <div>
                        {selectedRequest.payload.belongings.items?.map((item, idx) => (
                          <span key={idx} className="belonging-chip">{item}</span>
                        ))}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#475569' }}>
                          <div><strong>Pets:</strong> {selectedRequest.payload.belongings.hasPets ? 'Yes (Has pets)' : 'None'}</div>
                          <div><strong>Vehicle / Parking:</strong> {selectedRequest.payload.belongings.hasVehicle ? `Yes (${selectedRequest.payload.belongings.vehicleDetails || 'Parking space requested'})` : 'None'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Letter to Owner */}
                  {selectedRequest.payload?.letterToOwner && (
                    <div className="modal-section-card">
                      <div className="modal-section-heading">
                        <FileText size={14} /> Note to Landlord
                      </div>
                      <blockquote style={{ margin: 0, fontStyle: 'italic', color: '#334155', background: '#FFFFFF', padding: '0.875rem 1rem', borderRadius: '0.375rem', borderLeft: '3px solid #2563EB', lineHeight: 1.5 }}>
                        "{selectedRequest.payload.letterToOwner}"
                      </blockquote>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'property' && (
                <>
                  <div className="modal-section-card">
                    <div className="modal-section-heading">
                      <Building2 size={14} /> Property Details
                    </div>
                    <div className="applicant-dossier-grid">
                      <div className="info-item">
                        <span className="info-label">Title / Name</span>
                        <span className="info-value">{selectedRequest.propertyId?.title || selectedRequest.propertyId?.address}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Address</span>
                        <span className="info-value">{selectedRequest.propertyId?.address}{selectedRequest.propertyId?.city ? `, ${selectedRequest.propertyId.city}` : ''}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Unit Number</span>
                        <span className="info-value">{selectedRequest.propertyId?.unitNumber || 'Standard Unit'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Listed Price</span>
                        <span className="info-value">
                          {formatCurrency(selectedRequest.propertyId?.pricing?.rent || selectedRequest.propertyId?.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {detailTab === 'messages' && (
                <div>
                  <div className="messages-box">
                    {messagesLoading ? (
                      <CircularSpinner size="small" message="Loading conversation..." minHeight="8rem" />
                    ) : messages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.875rem' }}>
                        No direct messages yet. Send a message to start communicating with the applicant.
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const senderIdStr = typeof msg.senderId === 'object'
                          ? (msg.senderId?._id || msg.senderId?.id)?.toString()
                          : msg.senderId?.toString();
                        const currentOwnerId = getCurrentUserId()?.toString();
                        const isOwner = senderIdStr === currentOwnerId;
                        const senderName = typeof msg.senderId === 'object'
                          ? `${msg.senderId?.firstName || ''} ${msg.senderId?.lastName || ''}`.trim()
                          : (isOwner ? 'You' : 'Applicant');

                        return (
                          <div key={msg._id || idx} className={`message-bubble ${isOwner ? 'owner' : 'tenant'}`}>
                            <div className="message-sender-tag">{isOwner ? 'You' : (senderName || 'Applicant')}</div>
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message}</div>
                            <div className="message-meta">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="message-send-row">
                    <textarea
                      rows="2"
                      placeholder="Type a message to applicant..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-primary-blue"
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send size={15} /> Send
                    </button>
                  </form>
                </div>
              )}

              {detailTab === 'timeline' && (
                <div className="detail-timeline">
                  {selectedRequest.timeline?.map((evt, idx) => (
                    <div key={idx} className="timeline-step">
                      <div className="timeline-title">{evt.event}</div>
                      <div className="timeline-time">{formatDate(evt.timestamp)}</div>
                      {evt.note && <div className="timeline-note">{evt.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="ds-modal-footer">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary-outline"
              >
                Close
              </button>

              {['Submitted', 'Under Review', 'Info Requested'].includes(selectedRequest.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequest;
                      setShowDetailModal(false);
                      handleOpenRejectModal(req);
                    }}
                    className="btn-danger-outline"
                  >
                    <XCircle size={14} /> Reject Application
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequest;
                      setShowDetailModal(false);
                      handleOpenApproveModal(req);
                    }}
                    className="btn-primary-blue"
                  >
                    <CheckCircle2 size={14} /> Approve & Send Offer
                  </button>
                </>
              )}

              {['Approved', 'Paid/Completed'].includes(selectedRequest.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    navigate('/tenant-info');
                  }}
                  className="btn-navy"
                >
                  View in Tenant Info <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          RECEIPT MODAL
          ===================================================================== */}
      {showReceiptModal && paymentReceipt && (
        <div
          className="ds-modal-backdrop"
          onClick={() => setShowReceiptModal(false)}
          role="presentation"
        >
          <div
            className="ds-modal-dialog modal-small-width"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ds-modal-header">
              <div className="ds-modal-header-content">
                <h2>Payment Receipt</h2>
                <p>Official verified transaction record</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="ds-modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ds-modal-body">
              <div className="receipt-paper">
                <div className="receipt-title-box">
                  <h3>DwellSync Official Receipt</h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748B' }}>
                    ID: {paymentReceipt.receiptData?.receiptId || paymentReceipt.receiptData?.paymentId || 'N/A'}
                  </p>
                </div>

                <div className="receipt-row">
                  <span className="label">Amount Paid:</span>
                  <span className="val" style={{ color: '#059669', fontSize: '1rem' }}>
                    {formatCurrency(paymentReceipt.receiptData?.amount)}
                  </span>
                </div>

                <div className="receipt-row">
                  <span className="label">Date:</span>
                  <span className="val">{formatDate(paymentReceipt.receiptData?.paidAt)}</span>
                </div>

                <div className="receipt-row">
                  <span className="label">Method:</span>
                  <span className="val">{paymentReceipt.receiptData?.paymentMethod || 'Stripe Electronic'}</span>
                </div>

                <div className="receipt-row">
                  <span className="label">Payer:</span>
                  <span className="val">{paymentReceipt.receiptData?.tenant?.name || 'Tenant'}</span>
                </div>
              </div>
            </div>

            <div className="ds-modal-footer">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary-outline"
              >
                <Printer size={14} /> Print
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="btn-primary-blue"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerRequestsInbox;
