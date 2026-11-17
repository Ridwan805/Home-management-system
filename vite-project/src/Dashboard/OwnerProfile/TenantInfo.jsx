import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantInfo.css';
import { authenticatedFetch, API_BASE_URL } from '../../config/api';
import ApplicationMessagesModal from '../../components/ApplicationMessaging/ApplicationMessagesModal';
import {
  DashboardCardSkeleton,
  TableSkeleton,
  CircularSpinner,
  ButtonLoader
} from '../../components/loading';
import {
  CreditCard,
  AlertTriangle,
  Users,
  Wrench,
  Search,
  Megaphone,
  AlertCircle,
  Scale,
  CheckCircle2,
  Calendar,
  Plus,
  RotateCw,
  User,
  Home,
  Banknote,
  Receipt,
  X,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
  FileText,
  Info,
  MessageCircle,
  Eye,
  Download,
  Clock,
  ChevronDown,
  Landmark
} from 'lucide-react';

const NOTICE_TYPES = [
  { id: 'rent_reminder', label: 'Rent Reminder', icon: <CreditCard size={18} /> },
  { id: 'overdue_payment', label: 'Overdue Rent Notice', icon: <AlertTriangle size={18} /> },
  { id: 'meeting', label: 'Meeting Notice', icon: <Users size={18} /> },
  { id: 'maintenance', label: 'Maintenance Notice', icon: <Wrench size={18} /> },
  { id: 'inspection', label: 'Inspection Notice', icon: <Search size={18} /> },
  { id: 'general', label: 'General Announcement', icon: <Megaphone size={18} /> },
  { id: 'emergency', label: 'Emergency Alert', icon: <AlertCircle size={18} /> },
  { id: 'eviction_warning', label: 'Eviction / Lease Termination', icon: <Scale size={18} /> },
];

const TenantInfo = () => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tenants' | 'buyers'
  const [summary, setSummary] = useState({
    totalClients: 0,
    totalTenants: 0,
    propertyBuyers: 0,
    occupiedApartments: 0,
    outstandingRent: 0,
    outstandingPurchaseBalance: 0,
    totalOutstanding: 0,
    activeNotices: 0
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('all');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenantRecord, setSelectedTenantRecord] = useState(null);

  // Profile View Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('overview'); // 'overview' | 'payments' | 'notices'
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Issue Monthly Rent Invoice Modal (Online Stripe Workflow)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    amount: '',
    rentMonth: '',
    dueDate: '',
    notes: ''
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Global Page Notification (Inline Banner instead of alert)
  const [pageNotification, setPageNotification] = useState(null);

  // Two-way Application Messaging Modal
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedTenantForMessages, setSelectedTenantForMessages] = useState(null);

  // Active Dropdown for Table Actions ('More' Menu)
  const [activeDropdownTenantId, setActiveDropdownTenantId] = useState(null);

  // Close actions dropdown menu on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.tenant-actions-more-wrap')) {
        setActiveDropdownTenantId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveDropdownTenantId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenMessages = (tenant) => {
    if (!tenant.requestId) {
      setPageNotification({
        type: 'error',
        message: 'No linked application conversation record found for this tenancy.'
      });
      return;
    }
    setSelectedTenantForMessages(tenant);
    setShowMessagesModal(true);
  };

  // Notice Composer Modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeFormData, setNoticeFormData] = useState({
    noticeType: 'rent_reminder',
    recipientType: 'individual',
    tenantId: '',
    propertyId: '',
    subject: '',
    message: '',
    priority: 'normal',
    dueDate: '',
    legalDisclaimerAcknowledged: false
  });
  const [noticeSubmitting, setNoticeSubmitting] = useState(false);

  // Move-Out & Deposit Settlement Modal
  const [showMoveOutSettlementModal, setShowMoveOutSettlementModal] = useState(false);
  const [selectedTenantForSettlement, setSelectedTenantForSettlement] = useState(null);
  const [settlementStep, setSettlementStep] = useState('acknowledge'); // 'acknowledge' | 'handover' | 'settlement'
  const [handoverDate, setHandoverDate] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [deductions, setDeductions] = useState([]);
  const [newDeduction, setNewDeduction] = useState({ description: '', amount: '', category: 'repairs' });
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [terminateTenancy, setTerminateTenancy] = useState(true);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState('');
  const [settlementError, setSettlementError] = useState('');

  // Form State for Add / Edit Tenant
  const [tenantFormData, setTenantFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    propertyId: '',
    unitNumber: '',
    monthlyRent: '',
    securityDeposit: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'Active',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Load Tenants & Buyers Data
  const fetchTenantsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (propertyFilter !== 'all') queryParams.append('propertyId', propertyFilter);
      if (leaseStatusFilter !== 'all') queryParams.append('status', leaseStatusFilter);
      if (paymentStatusFilter !== 'all') queryParams.append('paymentStatus', paymentStatusFilter);

      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants?${queryParams.toString()}`);
      if (res && res.success) {
        setSummary(res.summary || {
          totalClients: 0,
          totalTenants: 0,
          propertyBuyers: 0,
          occupiedApartments: 0,
          outstandingRent: 0,
          outstandingPurchaseBalance: 0,
          totalOutstanding: 0,
          activeNotices: 0
        });
        setTenants(res.clients || res.tenants || []);
        if (res.properties && res.properties.length > 0) {
          setProperties(res.properties);
        }
      } else {
        setError(res?.message || 'Failed to load client directory');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err.message || 'Error loading client information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyFilter, paymentStatusFilter, leaseStatusFilter]);

  // Open Detailed Profile / Dossier
  const handleOpenProfile = async (tenantRecord) => {
    setSelectedTenantRecord(tenantRecord);
    setShowProfileModal(true);
    setActiveProfileTab('overview');
    try {
      setProfileLoading(true);
      const lookupId = tenantRecord.rentId || tenantRecord.requestId || tenantRecord._id;
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${lookupId}`);
      if (res && res.success) {
        setProfileData(res);
      }
    } catch (err) {
      console.error('Error loading client profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Open Edit Tenancy Agreement
  const handleOpenEditTenant = (tenant) => {
    setSelectedTenantRecord(tenant);
    setTenantFormData({
      firstName: tenant.firstName || '',
      lastName: tenant.lastName || '',
      email: tenant.email || '',
      phoneNumber: tenant.phoneNumber || '',
      address: tenant.address || '',
      propertyId: tenant.propertyId || '',
      unitNumber: tenant.unitNumber || '',
      monthlyRent: tenant.monthlyRent || '',
      securityDeposit: tenant.securityDeposit || '',
      startDate: tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toISOString().split('T')[0] : '',
      endDate: tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toISOString().split('T')[0] : '',
      status: tenant.leaseStatus || 'Active',
      notes: tenant.notes || ''
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Submit Edit Tenancy Form (Updates existing lease / contact terms)
  const handleSubmitTenantForm = async (e) => {
    e.preventDefault();
    if (!selectedTenantRecord?.rentId) return;

    try {
      setFormSubmitting(true);
      setFormError(null);

      const url = `${API_BASE_URL}/api/owner/tenants/${selectedTenantRecord.rentId}`;

      const res = await authenticatedFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantFormData)
      });

      if (res && res.success) {
        setShowEditModal(false);
        await fetchTenantsData();
      } else {
        setFormError(res?.message || 'Failed to save tenancy information');
      }
    } catch (err) {
      console.error('Error updating tenancy:', err);
      setFormError(err.message || 'Error occurred while updating tenancy.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Move-Out Notice & Deposit Settlement Handlers
  const handleOpenMoveOutSettlement = (tenant) => {
    setSelectedTenantForSettlement(tenant);
    setSettlementError('');
    setSettlementSuccess('');
    const defaultDate = tenant.moveOut?.handoverScheduledDate
      ? new Date(tenant.moveOut.handoverScheduledDate).toISOString().split('T')[0]
      : (tenant.moveOut?.intendedMoveOutDate ? new Date(tenant.moveOut.intendedMoveOutDate).toISOString().split('T')[0] : '');
    setHandoverDate(defaultDate);
    setHandoverNotes(tenant.moveOut?.handoverNotes || '');
    const existingDeductions = tenant.securityDepositDetails?.deductions || [];
    setDeductions(existingDeductions);
    const deposit = Number(tenant.securityDeposit || 0);
    const existingDedTotal = existingDeductions.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - existingDedTotal));
    setTerminateTenancy(true);

    if (!tenant.moveOut?.ownerAcknowledged) {
      setSettlementStep('acknowledge');
    } else if (!tenant.moveOut?.handoverCompletedDate) {
      setSettlementStep('handover');
    } else {
      setSettlementStep('settlement');
    }
    setShowMoveOutSettlementModal(true);
  };

  const handleAcknowledgeNotice = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/acknowledge-move-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverScheduledDate: handoverDate,
          notes: handoverNotes
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Move-out notice acknowledged and handover inspection scheduled!');
        fetchTenantsData();
        setTimeout(() => {
          setSettlementSuccess('');
          setSettlementStep('handover');
        }, 1000);
      } else {
        setSettlementError(res?.message || 'Failed to acknowledge move-out notice');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error acknowledging notice');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleRecordHandover = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/record-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverCompletedDate: new Date().toISOString(),
          handoverNotes: handoverNotes
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Handover inspection recorded!');
        fetchTenantsData();
        setTimeout(() => {
          setSettlementSuccess('');
          setSettlementStep('settlement');
        }, 1000);
      } else {
        setSettlementError(res?.message || 'Failed to record handover');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error recording handover');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.description || !newDeduction.amount) return;
    const updated = [...deductions, { description: newDeduction.description.trim(), amount: parseFloat(newDeduction.amount) || 0, category: newDeduction.category }];
    setDeductions(updated);
    setNewDeduction({ description: '', amount: '', category: 'repairs' });
    const deposit = Number(selectedTenantForSettlement?.securityDeposit || 0);
    const totalDed = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - totalDed));
  };

  const handleRemoveDeduction = (idx) => {
    const updated = deductions.filter((_, i) => i !== idx);
    setDeductions(updated);
    const deposit = Number(selectedTenantForSettlement?.securityDeposit || 0);
    const totalDed = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - totalDed));
  };

  const handleProcessSettlement = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/settle-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deductions,
          refundAmount: parseFloat(refundAmount) || 0,
          method: refundMethod,
          transactionRef: transactionRef.trim(),
          note: handoverNotes.trim(),
          terminateTenancy
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Deposit settlement finalized and tenancy concluded! Property returned to Available.');
        fetchTenantsData();
        setTimeout(() => {
          setShowMoveOutSettlementModal(false);
        }, 1500);
      } else {
        setSettlementError(res?.message || 'Failed to settle deposit');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error processing settlement');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  // Auto-dismiss inline page notifications
  useEffect(() => {
    if (pageNotification) {
      const timer = setTimeout(() => setPageNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageNotification]);

  // Open Issue Invoice Modal
  const handleOpenInvoiceModal = (tenant) => {
    setSelectedTenantRecord(tenant);
    const now = new Date();
    const defaultDue = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    setInvoiceFormData({
      amount: tenant.monthlyRent || '',
      rentMonth: monthLabel,
      dueDate: defaultDue,
      notes: `Monthly Rent for ${tenant.propertyName || ''} (${tenant.unitNumber || ''}) - ${monthLabel}`
    });
    setShowInvoiceModal(true);
  };

  // Submit New Rent Invoice (Enables Tenant Online Stripe Payment)
  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    if (!selectedTenantRecord) return;

    try {
      setInvoiceSubmitting(true);
      const res = await authenticatedFetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentId: selectedTenantRecord.rentId,
          billTo: selectedTenantRecord.tenantId,
          propertyId: selectedTenantRecord.propertyId,
          dueDate: invoiceFormData.dueDate,
          lineItems: [
            {
              type: 'rent',
              description: invoiceFormData.notes || `Monthly Rent - ${invoiceFormData.rentMonth}`,
              amount: Number(invoiceFormData.amount),
              quantity: 1,
              unitPrice: Number(invoiceFormData.amount)
            }
          ]
        })
      });

      if (res && (res.invoice || res._id || res.invoiceNo)) {
        setShowInvoiceModal(false);
        setPageNotification({
          type: 'success',
          message: `Official Rent Invoice #${res.invoice?.invoiceNo || res.invoiceNo || ''} issued successfully. Tenant can now pay online via Stripe.`
        });
        await fetchTenantsData();
        if (showProfileModal) {
          handleOpenProfile(selectedTenantRecord);
        }
      } else {
        setPageNotification({
          type: 'error',
          message: res?.message || 'Failed to issue rent invoice'
        });
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      setPageNotification({
        type: 'error',
        message: err.message || 'Error occurred while creating rent invoice.'
      });
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  // Download Authorized Invoice PDF
  const handleDownloadInvoicePDF = async (invoiceId, invoiceNo) => {
    try {
      setDownloadingPdf(`inv-${invoiceId}`);
      const userData = localStorage.getItem('dwellSyncUser');
      const token = userData ? JSON.parse(userData).token : '';
      const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download invoice PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNo || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      setPageNotification({ type: 'error', message: 'Could not download invoice PDF. Please try again.' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Download Verified Payment Receipt PDF
  const handleDownloadReceiptPDF = async (paymentId, receiptNumber) => {
    try {
      setDownloadingPdf(`rec-${paymentId}`);
      const userData = localStorage.getItem('dwellSyncUser');
      const token = userData ? JSON.parse(userData).token : '';
      const res = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/receipt/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download receipt PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNumber || paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading receipt PDF:', err);
      setPageNotification({ type: 'error', message: 'Could not download receipt PDF. Please try again.' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Open Notice Composer
  const handleOpenNoticeModal = (tenant = null) => {
    if (tenant) {
      setNoticeFormData({
        noticeType: 'rent_reminder',
        recipientType: 'individual',
        tenantId: tenant.tenantId,
        propertyId: tenant.propertyId,
        subject: `Rent Reminder for ${tenant.unitNumber}`,
        message: `Dear ${tenant.fullName},\n\nThis is a friendly reminder that your monthly rent of ৳${Number(tenant.monthlyRent).toLocaleString()} for ${tenant.propertyName} (${tenant.unitNumber}) is due. Please ensure timely payment through your DwellSync portal or authorized payment methods.\n\nThank you,\nProperty Management`,
        priority: 'normal',
        dueDate: '',
        legalDisclaimerAcknowledged: false
      });
    } else {
      setNoticeFormData({
        noticeType: 'general',
        recipientType: 'all_tenants',
        tenantId: '',
        propertyId: '',
        subject: 'General Property Announcement',
        message: '',
        priority: 'normal',
        dueDate: '',
        legalDisclaimerAcknowledged: false
      });
    }
    setShowNoticeModal(true);
  };

  // Submit Notice
  const handleSubmitNotice = async (status = 'sent') => {
    if (!noticeFormData.subject.trim() || !noticeFormData.message.trim()) {
      setPageNotification({ type: 'error', message: 'Please enter both subject and message body for the notice.' });
      return;
    }

    if (noticeFormData.noticeType === 'eviction_warning' && !noticeFormData.legalDisclaimerAcknowledged) {
      setPageNotification({ type: 'error', message: 'You must acknowledge the legal notice requirement before sending an eviction or lease termination notice.' });
      return;
    }

    try {
      setNoticeSubmitting(true);
      const payload = { ...noticeFormData, status };

      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowNoticeModal(false);
        setPageNotification({
          type: 'success',
          message: status === 'draft' ? 'Notice saved as draft.' : 'Notice dispatched successfully to tenants via in-app notification and email!'
        });
        await fetchTenantsData();
        if (showProfileModal && selectedTenantRecord) {
          handleOpenProfile(selectedTenantRecord);
        }
      } else {
        setPageNotification({ type: 'error', message: res?.message || 'Failed to dispatch notice' });
      }
    } catch (err) {
      console.error('Error dispatching notice:', err);
      setPageNotification({ type: 'error', message: err.message || 'Error occurred while sending notice.' });
    } finally {
      setNoticeSubmitting(false);
    }
  };

  // Helper for Payment Status Badge
  const renderPaymentBadge = (status, isStripe = false) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'completed') {
      return (
        <span className="badge-status paid">
          <CheckCircle2 size={13} /> {isStripe ? 'Paid (Stripe)' : 'Paid'}
        </span>
      );
    }
    if (s === 'overdue') return <span className="badge-status overdue"><AlertTriangle size={13} /> Overdue</span>;
    if (s === 'partially paid' || s === 'partially_paid') return <span className="badge-status partially-paid"><Info size={13} /> Partial</span>;
    return <span className="badge-status pending"><Clock size={13} /> Pending</span>;
  };

  // Helper for Lease Status Badge
  const renderLeaseBadge = (status) => {
    const s = (status || '').toLowerCase().replace(/\s+/g, '-');
    return <span className={`badge-lease ${s}`}>{status || 'Active'}</span>;
  };

  // Helper for Purchase Status Badge
  const renderPurchaseBadge = (status) => {
    const s = (status || '').toLowerCase().replace(/\s+/g, '-');
    return <span className={`badge-purchase ${s}`}>{status || 'Approved'}</span>;
  };

  // Filtered in-memory search & category tabs
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      // 1. Tab category filter
      if (activeTab === 'tenants' && t.clientType !== 'tenant') return false;
      if (activeTab === 'buyers' && t.clientType !== 'buyer') return false;

      // 2. Text search
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matches = (
          t.fullName?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.phoneNumber?.toLowerCase().includes(q) ||
          t.propertyName?.toLowerCase().includes(q) ||
          t.unitNumber?.toLowerCase().includes(q) ||
          t.propertyAddress?.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [tenants, activeTab, searchTerm]);

  return (
    <div className="tenant-mgmt-container">
      {/* Global Notification Banner */}
      {pageNotification && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: pageNotification.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: pageNotification.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${pageNotification.type === 'success' ? '#A7F3D0' : '#FECACA'}`
          }}
        >
          {pageNotification.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{pageNotification.message}</span>
        </div>
      )}

      {/* Header and Top Action Row */}
      <header className="tenant-mgmt-header">
        <div className="tenant-mgmt-title-group">
          <h1>Tenants & Buyers</h1>
          <p>Directory of verified tenants, property buyers, lease agreements, and transaction settlement tracking</p>
        </div>

        <div className="tenant-mgmt-actions">
          <button className="btn-secondary-outline" onClick={fetchTenantsData} title="Refresh records">
            <RotateCw size={16} /> Refresh
          </button>
          <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(null)}>
            <Megaphone size={16} /> Send Notice
          </button>
        </div>
      </header>

      {/* Category Tabs: All Clients / Active Tenants / Property Buyers */}
      <div className="client-tabs-nav">
        <button
          type="button"
          className={`client-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Users size={16} />
          <span>All Clients</span>
          <span className="client-tab-counter">{tenants.length}</span>
        </button>

        <button
          type="button"
          className={`client-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
          onClick={() => setActiveTab('tenants')}
        >
          <Home size={16} />
          <span>Active Tenants</span>
          <span className="client-tab-counter">{summary.totalTenants || tenants.filter(t => t.clientType === 'tenant').length}</span>
        </button>

        <button
          type="button"
          className={`client-tab-btn ${activeTab === 'buyers' ? 'active' : ''}`}
          onClick={() => setActiveTab('buyers')}
        >
          <Landmark size={16} />
          <span>Property Buyers</span>
          <span className="client-tab-counter">{summary.propertyBuyers || tenants.filter(t => t.clientType === 'buyer').length}</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      {loading ? (
        <div className="tenant-stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={`tenant-skel-${i}`} />
          ))}
        </div>
      ) : (
        <section className="tenant-stats-grid">
          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap blue"><Users size={18} /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Total Clients</span>
              <span className="tenant-stat-value">{summary.totalClients || (summary.totalTenants + summary.propertyBuyers)}</span>
              <span className="tenant-stat-subtext">
                {summary.totalTenants} Tenants · {summary.propertyBuyers} Buyers
              </span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap emerald"><Home size={18} /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Active Tenants</span>
              <span className="tenant-stat-value">{summary.totalTenants}</span>
              <span className="tenant-stat-subtext">Occupying {summary.occupiedApartments} properties</span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap purple"><Landmark size={18} /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Property Buyers</span>
              <span className="tenant-stat-value">{summary.propertyBuyers}</span>
              <span className="tenant-stat-subtext">Verified sales & bookings</span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap amber"><Banknote size={18} /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Outstanding Dues</span>
              <span className="tenant-stat-value">৳{Number((summary.outstandingRent || 0) + (summary.outstandingPurchaseBalance || 0)).toLocaleString()}</span>
              <span className="tenant-stat-subtext">
                Rent: ৳{Number(summary.outstandingRent || 0).toLocaleString()} · Buy: ৳{Number(summary.outstandingPurchaseBalance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Search and Filters Bar */}
      <section className="tenant-filters-bar">
        <div className="tenant-search-box">
          <Search size={16} className="tenant-search-icon" />
          <input
            type="text"
            className="tenant-search-input"
            placeholder="Search tenant name, email, phone, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tenant-filter-selects">
          <select
            className="tenant-select"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p._id} value={p._id}>{p.title || p.address} ({p.unitNumber || 'Unit'})</option>
            ))}
          </select>

          <select
            className="tenant-select"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            className="tenant-select"
            value={leaseStatusFilter}
            onChange={(e) => setLeaseStatusFilter(e.target.value)}
          >
            <option value="all">All Lease Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Terminated">Terminated</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </section>

      {/* Error Message with Retry */}
      {error && (
        <div className="tenant-error-banner">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn-secondary-outline" onClick={fetchTenantsData} style={{ background: '#fff' }}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Client Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredTenants.length === 0 ? (
        <div className="tenant-empty-state">
          <div className="tenant-empty-icon"><Users size={36} color="#94A3B8" /></div>
          <h3>
            {searchTerm || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || leaseStatusFilter !== 'all'
              ? 'No Matching Records'
              : activeTab === 'buyers'
                ? 'No Property Buyers Yet'
                : activeTab === 'tenants'
                  ? 'No Active Tenants Yet'
                  : 'No Clients Found'}
          </h3>
          <p>
            {searchTerm || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || leaseStatusFilter !== 'all'
              ? 'No client relationships match your search and filter criteria.'
              : activeTab === 'buyers'
                ? 'Buyers will appear here once their purchase applications are approved or booking payments are verified.'
                : activeTab === 'tenants'
                  ? 'Tenants will appear here automatically once their rental applications have been approved and their tenancy is active.'
                  : 'Client relationships will appear here once applications are approved.'}
          </p>
          <button className="btn-primary-blue" onClick={() => navigate('/request-info')}>
            View Property Requests
          </button>
        </div>
      ) : (
        <div className="tenant-table-container">
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Property & Unit</th>
                <th>Rent / Price</th>
                <th>Payment Status</th>
                <th>Agreement Status</th>
                <th>Key Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(client => {
                const isBuyer = client.clientType === 'buyer';
                const rowKey = client.relationshipId || client._id;

                return (
                  <tr key={rowKey}>
                    {/* 1. Client Identity */}
                    <td>
                      <div className="tenant-identity-cell">
                        <div className={`tenant-avatar ${isBuyer ? 'buyer' : 'tenant'}`}>
                          {(client.firstName?.[0] || client.fullName?.[0] || 'C').toUpperCase()}
                        </div>
                        <div className="tenant-name-col">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                            <span className="tenant-full-name">{client.fullName}</span>
                            <span className={`client-role-badge ${client.clientType || 'tenant'}`}>
                              {isBuyer ? 'Buyer' : 'Tenant'}
                            </span>
                          </div>
                          <span className="tenant-contact-sub">
                            <Mail size={12} /> {client.email}
                          </span>
                          {client.phoneNumber && (
                            <span className="tenant-contact-sub">
                              <Phone size={12} /> {client.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Property & Unit */}
                    <td>
                      <div className="property-unit-col">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <span className="property-title-text">{client.propertyName}</span>
                          <span className={`listing-type-badge ${client.listingType === 'For Sale' ? 'sale' : 'rent'}`}>
                            {client.listingType || (isBuyer ? 'For Sale' : 'For Rent')}
                          </span>
                          {client.unitNumber && <span className="unit-badge-tag">{client.unitNumber}</span>}
                        </div>
                        {client.propertyAddress && client.propertyAddress !== client.propertyName && (
                          <span className="property-address-sub">{client.propertyAddress}</span>
                        )}
                      </div>
                    </td>

                    {/* 3. Monthly Rent / Purchase Price */}
                    <td>
                      {isBuyer ? (
                        <div>
                          <div className="rent-amount-cell">
                            ৳{Number(client.purchasePrice || 0).toLocaleString()}
                            <span className="rent-cycle-sub"> (Total Price)</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.125rem' }}>
                            Paid: ৳{Number(client.advancePaid || client.totalPaid || 0).toLocaleString()}
                          </div>
                          {client.remainingBalance > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '0.125rem' }}>
                              Due: ৳{Number(client.remainingBalance).toLocaleString()}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.125rem' }}>
                              Fully Settled
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="rent-amount-cell">
                            ৳{Number(client.monthlyRent).toLocaleString()}
                            <span className="rent-cycle-sub"> / month</span>
                          </div>
                          {client.outstandingBalance > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '0.125rem' }}>
                              Due: ৳{Number(client.outstandingBalance).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Payment Status */}
                    <td>
                      {renderPaymentBadge(client.paymentStatus)}
                    </td>

                    {/* 5. Agreement / Lease Status */}
                    <td>
                      {isBuyer ? (
                        <div>
                          {renderPurchaseBadge(client.purchaseStatus)}
                          <div style={{ marginTop: '0.25rem' }}>
                            <span className="unit-badge-tag" style={{ background: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0', fontSize: '0.6875rem' }}>
                              Deed: {client.deedStatus || 'Pending Conveyance'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {renderLeaseBadge(client.leaseStatus)}
                          {client.moveOut?.noticeSubmitted && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span className="unit-badge-tag" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A', fontSize: '0.6875rem', fontWeight: 600 }}>
                                Move-Out: {new Date(client.moveOut.intendedMoveOutDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 6. Key Dates */}
                    <td>
                      {isBuyer ? (
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 500 }}>
                            {client.agreementDate ? new Date(client.agreementDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '—'}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Purchase Agreement
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 500 }}>
                            {new Date(client.leaseStartDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {client.leaseEndDate
                              ? `Until ${new Date(client.leaseEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                              : 'Month-to-Month'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="tenant-actions-td">
                      <div className="tenant-actions-cell">
                        {/* 1. Profile / Dossier */}
                        <button
                          type="button"
                          className="tenant-btn-action profile-btn"
                          onClick={() => handleOpenProfile(client)}
                          title={`View comprehensive ${isBuyer ? 'buyer' : 'tenant'} dossier`}
                        >
                          <Eye size={13} />
                          <span>{isBuyer ? 'Dossier' : 'Profile'}</span>
                        </button>

                        {/* 2. Messages */}
                        <button
                          type="button"
                          className={`tenant-btn-action msg-btn ${client.unreadMessagesCount > 0 ? 'unread' : ''}`}
                          onClick={() => handleOpenMessages(client)}
                          title={`Open messaging with ${client.fullName}`}
                          disabled={!client.requestId}
                        >
                          <MessageCircle size={13} />
                          <span>Messages</span>
                          {client.unreadMessagesCount > 0 && (
                            <span className="msg-badge-unread">{client.unreadMessagesCount}</span>
                          )}
                        </button>

                        {/* 3. Invoices / Payments */}
                        <button
                          type="button"
                          className="tenant-btn-action invoice-btn"
                          onClick={() => {
                            handleOpenProfile(client);
                            setActiveProfileTab('payments');
                          }}
                          title={`View ${isBuyer ? 'verified purchase payments' : 'invoices and rent payment history'}`}
                        >
                          <Receipt size={13} />
                          <span>{isBuyer ? 'Payments' : 'Invoices'}</span>
                        </button>

                        {/* 4. More Dropdown */}
                        <div className="tenant-actions-more-wrap">
                          <button
                            type="button"
                            className={`tenant-btn-action more-btn ${activeDropdownTenantId === rowKey ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownTenantId(prev => prev === rowKey ? null : rowKey);
                            }}
                            title="More actions"
                            aria-expanded={activeDropdownTenantId === rowKey}
                          >
                            <span>More</span>
                            <ChevronDown size={13} className={`chevron-icon ${activeDropdownTenantId === rowKey ? 'open' : ''}`} />
                            {client.moveOut?.noticeSubmitted && (
                              <span className="tenant-action-dot-notice" title="Notice to vacate submitted" />
                            )}
                          </button>

                          {activeDropdownTenantId === rowKey && (
                            <div className="tenant-actions-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {isBuyer ? (
                                <>
                                  <button
                                    type="button"
                                    className="tenant-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleOpenNoticeModal(client);
                                    }}
                                  >
                                    <Megaphone size={14} className="dropdown-item-icon" />
                                    <span>Send Notice</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="tenant-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleOpenProfile(client);
                                      setActiveProfileTab('overview');
                                    }}
                                  >
                                    <FileText size={14} className="dropdown-item-icon" />
                                    <span>Purchase Agreement</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="tenant-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      navigate(`/property/${client.propertyId}`);
                                    }}
                                  >
                                    <Home size={14} className="dropdown-item-icon" />
                                    <span>View Property</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="tenant-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleOpenNoticeModal(client);
                                    }}
                                  >
                                    <Megaphone size={14} className="dropdown-item-icon" />
                                    <span>Send Notice</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`tenant-dropdown-item ${client.moveOut?.noticeSubmitted ? 'item-moveout' : ''}`}
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleOpenMoveOutSettlement(client);
                                    }}
                                  >
                                    <ShieldCheck size={14} className="dropdown-item-icon" />
                                    <span>Manage Deposit</span>
                                    {client.moveOut?.noticeSubmitted && (
                                      <span className="dropdown-moveout-tag">Move-Out</span>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="tenant-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownTenantId(null);
                                      handleOpenEditTenant(client);
                                    }}
                                  >
                                    <FileText size={14} className="dropdown-item-icon" />
                                    <span>Edit Tenant</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: EDIT TENANCY MODAL (Existing Approved Tenancies Only)
          ===================================================================== */}
      {showEditModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Edit Tenancy Agreement</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitTenantForm}>
              <div className="tenant-modal-body">
                {formError && (
                  <div className="tenant-error-banner" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={tenantFormData.firstName}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, firstName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={tenantFormData.lastName}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, lastName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      disabled
                      value={tenantFormData.email}
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                    <span className="field-hint">
                      Email address is tied to the tenant's authenticated account and cannot be modified.
                    </span>
                  </div>

                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+880 1700-000000"
                      value={tenantFormData.phoneNumber}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Associated Property</label>
                    <input
                      type="text"
                      disabled
                      value={selectedTenantRecord.propertyName || selectedTenantRecord.propertyAddress}
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="form-field">
                    <label>Apartment / Unit Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Apt 4B / Unit 201"
                      value={tenantFormData.unitNumber}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, unitNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Monthly Rent (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 25000"
                      value={tenantFormData.monthlyRent}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, monthlyRent: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Security Deposit (BDT ৳)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={tenantFormData.securityDeposit}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, securityDeposit: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Move-In / Lease Start Date *</label>
                    <input
                      type="date"
                      required
                      value={tenantFormData.startDate}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Lease End Date (Optional)</label>
                    <input
                      type="date"
                      value={tenantFormData.endDate}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, endDate: e.target.value })}
                    />
                    <span className="field-hint">Leave blank for month-to-month tenancies</span>
                  </div>

                  <div className="form-field">
                    <label>Lease Status</label>
                    <select
                      value={tenantFormData.status}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="Ended">Ended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>

                  <div className="form-field form-group-full">
                    <label>Notes & Agreement Terms</label>
                    <textarea
                      rows="2"
                      placeholder="Special lease conditions, emergency contact, move-in checklists..."
                      value={tenantFormData.notes}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="tenant-modal-footer">
                <button
                  type="button"
                  className="btn-navy-outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-blue"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <ButtonLoader size="small" /> Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TENANT PROFILE DOSSIER (TABS: OVERVIEW, PAYMENTS, NOTICES)
          ===================================================================== */}
      {showProfileModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="tenant-modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Tenant Dossier & Records</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowProfileModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tenant-modal-body">
              {profileLoading ? (
                <CircularSpinner message="Retrieving comprehensive tenant dossier..." minHeight="240px" />
              ) : profileData ? (
                <>
                  {/* Hero Header */}
                  <div className="tenant-dossier-hero">
                    <div className="dossier-left">
                      <div className="dossier-avatar">
                        {(profileData.tenant?.user?.firstName?.[0] || selectedTenantRecord.fullName?.[0] || 'T').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="dossier-name">
                          {profileData.tenant?.user?.firstName} {profileData.tenant?.user?.lastName || ''}
                        </h3>
                        <div className="dossier-sub">
                          <span>{profileData.tenant?.property?.title || selectedTenantRecord.propertyName}</span> &bull;{' '}
                          <span className="unit-badge-tag">{selectedTenantRecord.unitNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                      {renderPaymentBadge(selectedTenantRecord.paymentStatus)}
                      <div>
                        {renderLeaseBadge(profileData.tenant?.leaseStatus)}
                      </div>
                      {selectedTenantRecord.requestId && (
                        <button
                          type="button"
                          className="action-btn-sm msg-btn"
                          style={{ marginTop: '0.25rem' }}
                          onClick={() => handleOpenMessages(selectedTenantRecord)}
                          title="Open messages"
                        >
                          <MessageCircle size={13} />
                          <span>Messages</span>
                          {selectedTenantRecord.unreadMessagesCount > 0 && (
                            <span className="msg-badge-unread">{selectedTenantRecord.unreadMessagesCount}</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs Bar */}
                  {/* Tabs Bar */}
                  <div className="tenant-tabs-bar">
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('overview')}
                    >
                      <User size={15} /> Overview & Agreement
                    </button>
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'payments' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('payments')}
                    >
                      <Banknote size={15} /> {selectedTenantRecord.clientType === 'buyer' ? 'Verified Payments' : 'Invoices & Payments'} ({selectedTenantRecord.clientType === 'buyer' ? (profileData.payments?.length || 0) : (profileData.invoices?.length || 0)})
                    </button>
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'notices' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('notices')}
                    >
                      <Megaphone size={15} /> Notices & Audit ({profileData.notices?.length || 0})
                    </button>
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  {activeProfileTab === 'overview' && (
                    <div>
                      {selectedTenantRecord.clientType === 'buyer' ? (
                        <div>
                          <div className="dossier-info-cards">
                            {/* Buyer Contact */}
                            <div className="dossier-card">
                              <h4><User size={15} /> Buyer Contact Information</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Buyer Name</label>
                                  <span>{selectedTenantRecord.fullName}</span>
                                </div>
                                <div className="item">
                                  <label>Email Address</label>
                                  <span>{selectedTenantRecord.email}</span>
                                </div>
                                <div className="item">
                                  <label>Phone Number</label>
                                  <span>{selectedTenantRecord.phoneNumber || 'Not provided'}</span>
                                </div>
                                <div className="item">
                                  <label>Application ID</label>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {selectedTenantRecord.requestHumanId || selectedTenantRecord.requestId}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Property Specifications */}
                            <div className="dossier-card">
                              <h4><Home size={15} /> Property Specifications</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Property Name</label>
                                  <span>{selectedTenantRecord.propertyName}</span>
                                </div>
                                <div className="item">
                                  <label>Plot / Unit</label>
                                  <span>{selectedTenantRecord.unitNumber || 'Stand-alone'}</span>
                                </div>
                                <div className="item">
                                  <label>Address</label>
                                  <span>{selectedTenantRecord.propertyAddress}</span>
                                </div>
                                <div className="item">
                                  <label>Property Type</label>
                                  <span>{selectedTenantRecord.propertyType}</span>
                                </div>
                              </div>
                            </div>

                            {/* Purchase Agreement & Financials */}
                            <div className="dossier-card">
                              <h4><Receipt size={15} /> Purchase Agreement & Financials</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Total Purchase Price</label>
                                  <span style={{ color: '#2563EB', fontWeight: 700 }}>৳{Number(selectedTenantRecord.purchasePrice || 0).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Verified Advance Paid</label>
                                  <span style={{ color: '#059669', fontWeight: 700 }}>৳{Number(selectedTenantRecord.advancePaid || 0).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Remaining Balance</label>
                                  <span style={{ color: selectedTenantRecord.remainingBalance > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
                                    {selectedTenantRecord.remainingBalance === 0 ? '৳0 (Fully Settled)' : `৳${Number(selectedTenantRecord.remainingBalance).toLocaleString()}`}
                                  </span>
                                </div>
                                <div className="item">
                                  <label>Purchase Status</label>
                                  <span>{renderPurchaseBadge(selectedTenantRecord.purchaseStatus)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Transaction & Conveyance Status */}
                            <div className="dossier-card">
                              <h4><ShieldCheck size={15} /> Conveyance & Settlement</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Agreement Date</label>
                                  <span>{selectedTenantRecord.agreementDate ? new Date(selectedTenantRecord.agreementDate).toLocaleDateString() : '—'}</span>
                                </div>
                                <div className="item">
                                  <label>Deed Conveyance</label>
                                  <span style={{ fontWeight: 600 }}>{selectedTenantRecord.deedStatus || 'Pending Conveyance'}</span>
                                </div>
                                <div className="item">
                                  <label>Payment Settlement</label>
                                  <span>{selectedTenantRecord.remainingBalance === 0 ? '100% Settled' : 'Advance Confirmed'}</span>
                                </div>
                                <div className="item">
                                  <label>Stripe Transactions</label>
                                  <span>{profileData.payments?.length || 0} Verified</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Buyer Credentials & Application Dossier */}
                          {profileData.tenant?.purchaseData?.payload && (
                            <div style={{ marginTop: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.925rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <FileText size={15} /> Applicant Dossier & Verification Documents
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                                {profileData.tenant.purchaseData.payload.occupation && (
                                  <div>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Occupation & Employer</span>
                                    <strong style={{ color: '#1E293B' }}>
                                      {profileData.tenant.purchaseData.payload.occupation.role} at {profileData.tenant.purchaseData.payload.occupation.companyName} ({profileData.tenant.purchaseData.payload.occupation.yearsOfExperience} yrs)
                                    </strong>
                                  </div>
                                )}
                                {profileData.tenant.purchaseData.payload.financials && (
                                  <div>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Declared Income & Banking</span>
                                    <strong style={{ color: '#1E293B' }}>
                                      Monthly: ৳{Number(profileData.tenant.purchaseData.payload.financials.monthlyIncome || 0).toLocaleString()} ({profileData.tenant.purchaseData.payload.financials.bankName || 'Bank'})
                                    </strong>
                                  </div>
                                )}
                                {profileData.tenant.purchaseData.payload.identity && (
                                  <div>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Verification Credentials</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                      {profileData.tenant.purchaseData.payload.identity.nidFileUrl && (
                                        <a href={profileData.tenant.purchaseData.payload.identity.nidFileUrl} target="_blank" rel="noreferrer" className="action-btn-sm" style={{ textDecoration: 'none' }}>
                                          NID Document
                                        </a>
                                      )}
                                      {profileData.tenant.purchaseData.payload.identity.tinFileUrl && (
                                        <a href={profileData.tenant.purchaseData.payload.identity.tinFileUrl} target="_blank" rel="noreferrer" className="action-btn-sm" style={{ textDecoration: 'none' }}>
                                          TIN Document
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedTenantRecord.notes && (
                            <div style={{ marginTop: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.875rem' }}>
                              <strong style={{ color: '#334155' }}>Agreement Notes / Terms:</strong>
                              <p style={{ margin: '0.25rem 0 0 0', color: '#64748B' }}>{selectedTenantRecord.notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="dossier-info-cards">
                            {/* Personal Contact */}
                            <div className="dossier-card">
                              <h4><User size={15} /> Contact Details</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Full Name</label>
                                  <span>{selectedTenantRecord.fullName}</span>
                                </div>
                                <div className="item">
                                  <label>Email Address</label>
                                  <span>{selectedTenantRecord.email}</span>
                                </div>
                                <div className="item">
                                  <label>Phone Number</label>
                                  <span>{selectedTenantRecord.phoneNumber || 'Not provided'}</span>
                                </div>
                                <div className="item">
                                  <label>Registered User ID</label>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {selectedTenantRecord.tenantId}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Property & Apartment */}
                            <div className="dossier-card">
                              <h4><Home size={15} /> Apartment Specifications</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Property Name</label>
                                  <span>{selectedTenantRecord.propertyName}</span>
                                </div>
                                <div className="item">
                                  <label>Unit / Floor</label>
                                  <span>{selectedTenantRecord.unitNumber} (Floor {selectedTenantRecord.floorNumber})</span>
                                </div>
                                <div className="item">
                                  <label>Address</label>
                                  <span>{selectedTenantRecord.propertyAddress}</span>
                                </div>
                                <div className="item">
                                  <label>Property Type</label>
                                  <span>{selectedTenantRecord.propertyType}</span>
                                </div>
                              </div>
                            </div>

                            {/* Tenancy Agreement */}
                            <div className="dossier-card">
                              <h4><FileText size={15} /> Lease & Rental Agreement</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Monthly Rent</label>
                                  <span style={{ color: '#2563EB' }}>৳{Number(selectedTenantRecord.monthlyRent).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Security Deposit</label>
                                  <span>৳{Number(selectedTenantRecord.securityDeposit || 0).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Move-In / Lease Start</label>
                                  <span>{new Date(selectedTenantRecord.leaseStartDate).toLocaleDateString()}</span>
                                </div>
                                <div className="item">
                                  <label>Lease Expiration</label>
                                  <span>{selectedTenantRecord.leaseEndDate ? new Date(selectedTenantRecord.leaseEndDate).toLocaleDateString() : 'Month-to-Month'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Financial Ledger Summary */}
                            <div className="dossier-card">
                              <h4><Receipt size={15} /> Financial Health</h4>
                              <div className="dossier-card-grid">
                                <div className="item">
                                  <label>Total Billed</label>
                                  <span>৳{Number(profileData.financialSummary?.totalBilled || 0).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Total Paid</label>
                                  <span style={{ color: '#059669' }}>৳{Number(profileData.financialSummary?.totalPaid || 0).toLocaleString()}</span>
                                </div>
                                <div className="item">
                                  <label>Current Outstanding</label>
                                  <span style={{ color: profileData.financialSummary?.balanceDue > 0 ? '#DC2626' : '#0F172A' }}>
                                    ৳{Number(profileData.financialSummary?.balanceDue || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="item">
                                  <label>Payment Rate</label>
                                  <span>{profileData.financialSummary?.paymentRate}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Notes Box */}
                          {selectedTenantRecord.notes && (
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.875rem' }}>
                              <strong style={{ color: '#334155' }}>Agreement Notes:</strong>
                              <p style={{ margin: '0.25rem 0 0 0', color: '#64748B' }}>{selectedTenantRecord.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: INVOICES & VERIFIED PAYMENT RECORDS */}
                  {activeProfileTab === 'payments' && (
                    <div>
                      {selectedTenantRecord.clientType === 'buyer' ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <h4 style={{ margin: 0, color: '#0F172A', fontSize: '1rem' }}>Verified Purchase Payments (Stripe)</h4>
                              <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                                Authoritative purchase payments verified via Stripe and banking records.
                              </span>
                            </div>
                          </div>

                          {(!profileData.payments || profileData.payments.length === 0) ? (
                            <div className="tenant-empty-state" style={{ padding: '2.25rem' }}>
                              <p>No verified purchase payments recorded yet for this property transaction.</p>
                            </div>
                          ) : (
                            <div className="tenant-table-container">
                              <table className="tenant-table">
                                <thead>
                                  <tr>
                                    <th>Payment ID</th>
                                    <th>Description / Purpose</th>
                                    <th>Amount (BDT)</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Receipt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {profileData.payments.map((pmt) => (
                                    <tr key={pmt._id || pmt.paymentId}>
                                      <td>
                                        <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                                          {pmt.paymentId || pmt._id}
                                        </strong>
                                      </td>
                                      <td>
                                        <div>{pmt.description || pmt.paymentPurpose || 'Purchase Deposit'}</div>
                                        {pmt.stripePaymentIntentId && (
                                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                                            {pmt.stripePaymentIntentId}
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ color: '#059669', fontWeight: 700 }}>
                                        ৳{Number(pmt.amount || 0).toLocaleString()}
                                      </td>
                                      <td>
                                        <span className="unit-badge-tag" style={{ textTransform: 'capitalize' }}>
                                          {pmt.method || pmt.provider || 'Stripe'}
                                        </span>
                                      </td>
                                      <td>
                                        <span className="badge-status paid">
                                          <CheckCircle2 size={13} /> {pmt.status || 'Completed'}
                                        </span>
                                      </td>
                                      <td>
                                        {pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        }) : '—'}
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="btn-secondary-outline action-btn-sm"
                                          onClick={() => handleDownloadReceiptPDF(pmt._id, pmt.paymentId)}
                                          disabled={downloadingPdf === `rec-${pmt._id}`}
                                          title="Download PDF Receipt"
                                        >
                                          <Download size={13} />
                                          <span>{downloadingPdf === `rec-${pmt._id}` ? '...' : 'Receipt'}</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <h4 style={{ margin: 0, color: '#0F172A', fontSize: '1rem' }}>Invoices & Verified Payments</h4>
                              <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                                Tenants pay online securely via Stripe. Invoices update automatically when confirmed.
                              </span>
                            </div>
                            <button className="btn-primary-blue" onClick={() => handleOpenInvoiceModal(selectedTenantRecord)}>
                              <Plus size={14} /> Issue Rent Invoice
                            </button>
                          </div>

                      {profileData.invoices?.length === 0 ? (
                        <div className="tenant-empty-state" style={{ padding: '2.25rem' }}>
                          <p>No rent invoices recorded yet for this tenancy.</p>
                          <button className="btn-primary-blue" onClick={() => handleOpenInvoiceModal(selectedTenantRecord)}>
                            Issue First Rent Invoice
                          </button>
                        </div>
                      ) : (
                        <div className="tenant-table-container">
                          <table className="tenant-table">
                            <thead>
                              <tr>
                                <th>Invoice / Month</th>
                                <th>Due Date</th>
                                <th>Billed</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Payment Status</th>
                                <th>Authorized Downloads</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profileData.invoices.map((inv) => {
                                const isPaid = inv.status === 'paid';
                                const hasStripe = inv.payments?.some(p => p.method === 'stripe' || p.provider === 'stripe') || 
                                  Boolean(inv.payments?.[0]?.stripeDetails?.sessionId);
                                return (
                                  <tr key={inv._id}>
                                    <td>
                                      <strong style={{ color: '#0F172A' }}>{inv.invoiceNo}</strong>
                                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                        {inv.lineItems?.[0]?.description || 'Monthly Rent'}
                                      </div>
                                    </td>
                                    <td>
                                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td>৳{Number(inv.total).toLocaleString()}</td>
                                    <td style={{ color: '#059669', fontWeight: 600 }}>৳{Number(inv.paidAmount || 0).toLocaleString()}</td>
                                    <td style={{ color: (inv.balance || 0) > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>
                                      ৳{Number(inv.balance !== undefined ? inv.balance : (inv.total - (inv.paidAmount || 0))).toLocaleString()}
                                    </td>
                                    <td>
                                      {isPaid ? (
                                        <span className="badge-status paid">
                                          <CheckCircle2 size={13} /> {hasStripe ? 'Paid (Stripe Verified)' : 'Paid'}
                                        </span>
                                      ) : inv.status === 'partially_paid' ? (
                                        <span className="badge-status partially-paid">
                                          <Info size={13} /> Partial
                                        </span>
                                      ) : new Date(inv.dueDate) < new Date() ? (
                                        <span className="badge-status overdue">
                                          <AlertTriangle size={13} /> Overdue
                                        </span>
                                      ) : (
                                        <span className="badge-status pending">
                                          <Clock size={13} /> Awaiting Payment
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          className="action-btn-sm"
                                          onClick={() => handleDownloadInvoicePDF(inv._id, inv.invoiceNo)}
                                          disabled={downloadingPdf === `inv-${inv._id}`}
                                          title="Download authorized PDF invoice"
                                        >
                                          <Download size={13} />
                                          <span>{downloadingPdf === `inv-${inv._id}` ? '...' : 'Invoice PDF'}</span>
                                        </button>
                                        {isPaid && (
                                          <button
                                            type="button"
                                            className="action-btn-sm"
                                            style={{ borderColor: '#A7F3D0', color: '#065F46', background: '#ECFDF5' }}
                                            onClick={() => {
                                              const payId = inv.payments?.[0]?._id || inv.payments?.[0];
                                              if (payId) {
                                                handleDownloadReceiptPDF(payId, inv.receiptNumber || inv.invoiceNo);
                                              } else {
                                                handleDownloadInvoicePDF(inv._id, inv.invoiceNo);
                                              }
                                            }}
                                            disabled={downloadingPdf?.startsWith('rec-')}
                                            title="Download verified payment receipt"
                                          >
                                            <Download size={13} />
                                            <span>Receipt PDF</span>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

                  {/* TAB 3: NOTICES & COMMUNICATION */}
                  {activeProfileTab === 'notices' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: '#0F172A', fontSize: '1rem' }}>Notice Delivery & Audit Trail</h4>
                        <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(selectedTenantRecord)}>
                          <Megaphone size={14} /> Compose Notice for Tenant
                        </button>
                      </div>

                      {profileData.notices?.length === 0 ? (
                        <div className="tenant-empty-state" style={{ padding: '2.25rem' }}>
                          <p>No notices issued to this tenant yet.</p>
                          <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(selectedTenantRecord)}>
                            Compose First Notice
                          </button>
                        </div>
                      ) : (
                        <div>
                          {profileData.notices.map((ntc) => (
                            <div key={ntc._id} className="notice-history-item">
                              <div className="notice-history-header">
                                <span className="notice-history-title">
                                  {ntc.subject}
                                </span>
                                <span className={`notice-delivery-pill ${ntc.status}`}>
                                  {ntc.status === 'sent' ? 'Delivered' : ntc.status.toUpperCase()}
                                </span>
                              </div>

                              <p style={{ margin: '0.375rem 0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                                {ntc.message}
                              </p>

                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem', alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={13} /> Issued: {new Date(ntc.issuedDate || ntc.createdAt).toLocaleString()}</span>
                                <span>Priority: <strong>{(ntc.priority || 'normal').toUpperCase()}</strong></span>
                                {ntc.dueDate && <span>Deadline: {new Date(ntc.dueDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="tenant-error-banner">Could not load tenant dossier.</div>
              )}
            </div>

            <div className="tenant-modal-footer">
              <button className="btn-navy-outline" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
              <button className="btn-primary-blue" onClick={() => handleOpenInvoiceModal(selectedTenantRecord)}>
                <Plus size={14} /> Issue Rent Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ISSUE MONTHLY RENT INVOICE (Online Stripe Workflow)
          ===================================================================== */}
      {showInvoiceModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Issue Monthly Rent Invoice</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowInvoiceModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitInvoice}>
              <div className="tenant-modal-body">
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.125rem' }}>
                  <div style={{ fontWeight: 600, color: '#1E3A8A' }}>{selectedTenantRecord.fullName}</div>
                  <div style={{ fontSize: '0.825rem', color: '#2563EB' }}>
                    {selectedTenantRecord.propertyName} &bull; {selectedTenantRecord.unitNumber}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                    Issuing this invoice enables the tenant to pay online securely via Stripe. When payment completes, records and receipts update automatically.
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Rent Month / Billing Period *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. December 2026"
                      value={invoiceFormData.rentMonth}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, rentMonth: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Invoice Due Date *</label>
                    <input
                      type="date"
                      required
                      value={invoiceFormData.dueDate}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="form-field form-group-full">
                    <label>Monthly Rent Amount (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 65000"
                      value={invoiceFormData.amount}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                    />
                    <span className="field-hint">
                      Defaults to the agreed monthly rent from the active tenancy lease.
                    </span>
                  </div>

                  <div className="form-field form-group-full">
                    <label>Description / Line Item Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Rent - December 2026"
                      value={invoiceFormData.notes}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="tenant-modal-footer">
                <button
                  type="button"
                  className="btn-navy-outline"
                  onClick={() => setShowInvoiceModal(false)}
                  disabled={invoiceSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-blue"
                  disabled={invoiceSubmitting}
                >
                  {invoiceSubmitting ? (
                    <>
                      <ButtonLoader size="small" /> Issuing Invoice...
                    </>
                  ) : (
                    'Confirm & Issue Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: NOTICE COMPOSER MODAL
          ===================================================================== */}
      {showNoticeModal && (
        <div className="tenant-modal-backdrop" onClick={() => setShowNoticeModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Compose Tenant Notice</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowNoticeModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tenant-modal-body">
              {/* Notice Type Selector */}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                  Select Notice Type *
                </label>
                <div className="notice-type-grid">
                  {NOTICE_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`notice-type-btn ${noticeFormData.noticeType === type.id ? 'active' : ''}`}
                      onClick={() => setNoticeFormData({ ...noticeFormData, noticeType: type.id })}
                    >
                      <span className="notice-type-icon">{type.icon}</span>
                      <span className="notice-type-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Eviction Warning Statutory Disclaimer Box */}
              {noticeFormData.noticeType === 'eviction_warning' && (
                <div className="eviction-warning-box">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><AlertTriangle size={16} /> Statutory Notice Procedure Warning</h4>
                  <p>
                    Official legal notices, cure periods, and eviction actions are strictly governed by applicable jurisdiction and statutory tenancy laws. Sending this notice serves as an official formal warning and <strong>does not constitute an unlawful self-help eviction</strong>. The tenant will not be automatically locked out or terminated in the database.
                  </p>
                  <label className="eviction-checkbox-label">
                    <input
                      type="checkbox"
                      checked={noticeFormData.legalDisclaimerAcknowledged}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, legalDisclaimerAcknowledged: e.target.checked })}
                    />
                    I acknowledge that official eviction proceedings require compliance with applicable statutory notice periods.
                  </label>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Recipient Target *</label>
                  <select
                    value={noticeFormData.recipientType}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, recipientType: e.target.value })}
                  >
                    <option value="individual">Individual Tenant</option>
                    <option value="property_all">All Tenants of Selected Property</option>
                    <option value="all_tenants">All Tenants (Portfolio Broadcast)</option>
                  </select>
                </div>

                {noticeFormData.recipientType === 'individual' && (
                  <div className="form-field">
                    <label>Select Tenant *</label>
                    <select
                      value={noticeFormData.tenantId}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, tenantId: e.target.value })}
                    >
                      <option value="">Select Tenant...</option>
                      {tenants.map(t => (
                        <option key={t._id} value={t.tenantId}>{t.fullName} &bull; {t.propertyName} ({t.unitNumber})</option>
                      ))}
                    </select>
                  </div>
                )}

                {noticeFormData.recipientType === 'property_all' && (
                  <div className="form-field">
                    <label>Select Property *</label>
                    <select
                      value={noticeFormData.propertyId}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, propertyId: e.target.value })}
                    >
                      <option value="">Select Property...</option>
                      {properties.map(p => (
                        <option key={p._id} value={p._id}>{p.title || p.address}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-field">
                  <label>Priority Level</label>
                  <select
                    value={noticeFormData.priority}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="low">Low (Informational)</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Relevant Date / Scheduled Deadline</label>
                  <input
                    type="date"
                    value={noticeFormData.dueDate}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, dueDate: e.target.value })}
                  />
                  <span className="field-hint">e.g. Payment due date or inspection date</span>
                </div>

                <div className="form-field form-group-full">
                  <label>Notice Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled Water Maintenance on Thursday"
                    value={noticeFormData.subject}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, subject: e.target.value })}
                  />
                </div>

                <div className="form-field form-group-full">
                  <label>Notice Message Body *</label>
                  <textarea
                    rows="5"
                    required
                    placeholder="Enter formal notice details, schedules, contact instructions..."
                    value={noticeFormData.message}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, message: e.target.value })}
                  />
                  <span className="field-hint">
                    Notice will be dispatched to the tenant's in-app notification center and their registered email via Resend.
                  </span>
                </div>
              </div>
            </div>

            <div className="tenant-modal-footer">
              <button
                type="button"
                className="btn-navy-outline"
                onClick={() => setShowNoticeModal(false)}
                disabled={noticeSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary-outline"
                onClick={() => handleSubmitNotice('draft')}
                disabled={noticeSubmitting}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn-primary-blue"
                onClick={() => handleSubmitNotice('sent')}
                disabled={noticeSubmitting || (noticeFormData.noticeType === 'eviction_warning' && !noticeFormData.legalDisclaimerAcknowledged)}
              >
                {noticeSubmitting ? (
                  <>
                    <ButtonLoader size="small" /> Dispatching...
                  </>
                ) : (
                  'Send Notice Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MOVE-OUT INSPECTION & DEPOSIT SETTLEMENT
          ===================================================================== */}
      {showMoveOutSettlementModal && selectedTenantForSettlement && (
        <div className="tenant-modal-backdrop" onClick={() => { if (!settlementSubmitting) setShowMoveOutSettlementModal(false); }}>
          <div className="tenant-modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Move-Out Inspection & Deposit Settlement</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowMoveOutSettlementModal(false)} disabled={settlementSubmitting}>
                <X size={16} />
              </button>
            </div>

            <div className="tenant-modal-body">
              {settlementSuccess && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{settlementSuccess}</span>
                </div>
              )}

              {settlementError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <span>{settlementError}</span>
                </div>
              )}

              {/* Tenancy & Notice Overview */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>
                      {selectedTenantForSettlement.fullName} &bull; {selectedTenantForSettlement.unitNumber}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                      {selectedTenantForSettlement.propertyName} — {selectedTenantForSettlement.propertyAddress}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Deposit Held</span>
                    <strong style={{ fontSize: '1.125rem', color: '#2563EB' }}>
                      ৳{Number(selectedTenantForSettlement.securityDeposit || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {selectedTenantForSettlement.moveOut?.noticeSubmitted ? (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Notice Filed Date</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                        {new Date(selectedTenantForSettlement.moveOut.noticeDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Intended Move-Out</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                        {new Date(selectedTenantForSettlement.moveOut.intendedMoveOutDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Notice Period Given</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: selectedTenantForSettlement.moveOut.meetsRequirement ? '#059669' : '#D97706' }}>
                        {selectedTenantForSettlement.moveOut.noticeDaysGiven} days ({selectedTenantForSettlement.moveOut.meetsRequirement ? 'Met 60 days' : 'Under 60 days'})
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Reason</span>
                      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {selectedTenantForSettlement.moveOut.reason || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748B' }}>
                    No move-out notice was submitted by the tenant. You can proceed directly to inspection and deposit settlement.
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="tenant-tabs-bar" style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'acknowledge' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('acknowledge')}
                >
                  1. Acknowledge Notice
                </button>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'handover' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('handover')}
                >
                  2. Handover Inspection
                </button>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'settlement' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('settlement')}
                >
                  3. Deductions & Refund
                </button>
              </div>

              {/* STEP 1: ACKNOWLEDGE NOTICE */}
              {settlementStep === 'acknowledge' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-field">
                    <label>Scheduled Handover Inspection Date</label>
                    <input
                      type="date"
                      value={handoverDate}
                      onChange={(e) => setHandoverDate(e.target.value)}
                    />
                    <span className="field-hint">Coordinate with tenant for key return and walkthrough</span>
                  </div>

                  <div className="form-field">
                    <label>Acknowledgment Notes / Meeting Instructions</label>
                    <textarea
                      rows="3"
                      placeholder="e.g. Walkthrough confirmed at 11 AM. Tenant should return keys and remove all personal belongings."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleAcknowledgeNotice}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Acknowledging...' : 'Acknowledge Notice & Schedule Handover'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: RECORD HANDOVER INSPECTION */}
              {settlementStep === 'handover' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-field">
                    <label>Inspection & Handover Notes</label>
                    <textarea
                      rows="4"
                      placeholder="Detail apartment condition: wall paint, appliances, fixtures, cleanliness, keys returned, meter readings..."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                    />
                    <span className="field-hint">These notes will be preserved in the tenancy archive.</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary-outline"
                      onClick={() => setSettlementStep('settlement')}
                    >
                      Skip to Deductions
                    </button>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleRecordHandover}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Saving...' : 'Record Handover & Proceed to Settlement'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DEDUCTIONS & REFUND */}
              {settlementStep === 'settlement' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Deductions Ledger */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                      Itemized Deposit Deductions
                    </h4>

                    {deductions.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0 0 0.75rem' }}>
                        No deductions recorded. Deposit will be refunded in full.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {deductions.map((d, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', border: '1px solid #E2E8F0' }}>
                            <div>
                              <strong style={{ fontSize: '0.8125rem', color: '#0F172A' }}>{d.description}</strong>
                              <span style={{ fontSize: '0.6875rem', color: '#64748B', marginLeft: '0.5rem' }}>({d.category || 'general'})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#DC2626' }}>-৳{Number(d.amount).toLocaleString()}</span>
                              <button type="button" onClick={() => handleRemoveDeduction(idx)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Deduction Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Wall patch & repaint"
                          value={newDeduction.description}
                          onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Amount (৳)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newDeduction.amount}
                          onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                        <select
                          value={newDeduction.category}
                          onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        >
                          <option value="repairs">Repairs</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="utilities">Unpaid Utilities</option>
                          <option value="rent">Unpaid Rent</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDeduction}
                        className="btn-secondary-outline"
                        style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem', height: 'fit-content' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Summary & Refund Processing */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Original Security Deposit:</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#0F172A' }}>৳{Number(selectedTenantForSettlement.securityDeposit || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Total Deductions:</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#DC2626' }}>
                        -৳{deductions.reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #CBD5E1' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Net Refund Amount:</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                        ৳{Math.max(0, Number(selectedTenantForSettlement.securityDeposit || 0) - deductions.reduce((s, d) => s + Number(d.amount || 0), 0)).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Refund Payment Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.875rem' }}>
                    <div className="form-field">
                      <label>Disbursed Refund Amount (৳)</label>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Disbursement Method</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                      >
                        <option value="Bank Transfer">Bank Transfer / Wire</option>
                        <option value="bKash / Nagad">Mobile Banking (bKash/Nagad)</option>
                        <option value="Check">Official Bank Check</option>
                        <option value="Cash">Cash Receipt</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Transaction / Check Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-7890123"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Terminate Tenancy & Release Property */}
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.375rem', padding: '0.75rem 1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1E3A8A', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={terminateTenancy}
                        onChange={(e) => setTerminateTenancy(e.target.checked)}
                        style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }}
                      />
                      <span>Conclude tenancy and immediately return property/unit status to Available</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-navy-outline"
                      onClick={() => setShowMoveOutSettlementModal(false)}
                      disabled={settlementSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleProcessSettlement}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Finalizing Settlement...' : 'Finalize Settlement & Terminate Tenancy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-Way Application Messaging Modal (Reuses Original Application Conversation) */}
      {showMessagesModal && selectedTenantForMessages && (
        <ApplicationMessagesModal
          isOpen={showMessagesModal}
          onClose={() => {
            setShowMessagesModal(false);
            setSelectedTenantForMessages(null);
          }}
          requestId={selectedTenantForMessages.requestId}
          requestRef={selectedTenantForMessages.requestHumanId || selectedTenantForMessages.requestId}
          property={{
            title: selectedTenantForMessages.propertyName,
            unitNumber: selectedTenantForMessages.unitNumber,
            address: selectedTenantForMessages.propertyAddress
          }}
          counterpartRole="Tenant"
          counterpartName={selectedTenantForMessages.fullName}
          status={selectedTenantForMessages.leaseStatus || 'Active'}
          onMessagesUpdated={() => {
            fetchTenantsData();
          }}
        />
      )}
    </div>
  );
};

export default TenantInfo;
