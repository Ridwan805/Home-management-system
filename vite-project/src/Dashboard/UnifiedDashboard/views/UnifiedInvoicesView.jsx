import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  RotateCw,
  FileText
} from 'lucide-react';
import API from '../../../config/api';
import './UnifiedInvoicesView.css';

const UnifiedInvoicesView = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'overdue'

  const fetchInvoices = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try { token = JSON.parse(saved).token; } catch (e) { token = null; }
    }
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Invoices can be retrieved via /api/invoices or /api/payments/my-payments
      const res = await fetch(API.getUrl('/api/invoices/my-invoices'), { headers });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || data || []);
      } else {
        // Fallback: payments endpoint
        const pRes = await fetch(API.getUrl('/api/payments/my-payments'), { headers });
        if (pRes.ok) {
          const pData = await pRes.json();
          setInvoices(pData.invoices || []);
        }
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownloadInvoicePDF = async (inv) => {
    const invId = inv._id || inv.id;
    setDownloadingId(invId);
    try {
      const saved = localStorage.getItem('dwellSyncUser');
      const token = saved ? JSON.parse(saved).token : null;

      const res = await fetch(API.getUrl(`/api/invoices/${invId}/pdf`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${inv.invoiceNo || invId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not download invoice PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  const getFilteredInvoices = () => {
    let list = invoices;
    if (statusFilter !== 'all') {
      list = list.filter(i => (i.status || '').toLowerCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i =>
        (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
        (i.propertyId?.title && i.propertyId.title.toLowerCase().includes(q)) ||
        (i.propertyId?.address && i.propertyId.address.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const filteredInvoices = getFilteredInvoices();

  return (
    <div className="unified-invoices-view">
      <div className="invoices-header">
        <div>
          <h1 className="invoices-title">Invoices & Receipts</h1>
          <p className="invoices-subtitle">
            Authoritative billing records, verified transaction receipts, and official PDF statements.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => fetchInvoices(true)}
          disabled={refreshing}
        >
          <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="invoices-controls-row">
        <div className="status-filter-pills">
          <button
            type="button"
            className={`pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            className={`pill ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Paid ({invoices.filter(i => (i.status || '').toLowerCase() === 'paid').length})
          </button>
          <button
            type="button"
            className={`pill ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({invoices.filter(i => ['pending', 'open'].includes((i.status || '').toLowerCase())).length})
          </button>
          <button
            type="button"
            className={`pill ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            Overdue ({invoices.filter(i => (i.status || '').toLowerCase() === 'overdue').length})
          </button>
        </div>

        <div className="invoices-search-input">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by invoice number or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="invoices-card-table">
        {loading ? (
          <div className="invoices-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`inv-skel-${i}`} className="inv-skeleton" />
            ))}
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="table-responsive">
            <table className="invoices-data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Property</th>
                  <th>Issued Date</th>
                  <th>Due Date</th>
                  <th>Total Billed</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const invId = inv._id || inv.id;
                  const isPaid = (inv.status || '').toLowerCase() === 'paid';
                  const isOverdue = (inv.status || '').toLowerCase() === 'overdue';
                  const isPending = ['pending', 'open'].includes((inv.status || '').toLowerCase());

                  return (
                    <tr key={invId}>
                      <td className="inv-no-cell">
                        <Receipt size={14} className="cell-icon" />
                        <span>{inv.invoiceNo || `INV-${invId.slice(-6)}`}</span>
                      </td>
                      <td className="inv-prop-cell">
                        {inv.propertyId?.title || inv.propertyId?.address || 'Property on file'}
                      </td>
                      <td>{new Date(inv.issuedAt || inv.createdAt).toLocaleDateString()}</td>
                      <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt'}</td>
                      <td className="bold-cell">{formatBDT(inv.total)}</td>
                      <td>{formatBDT(inv.amountPaid || inv.paidAmount || 0)}</td>
                      <td className={inv.balance > 0 ? 'due-cell' : ''}>
                        {formatBDT(inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.amountPaid || 0)))}
                      </td>
                      <td>
                        <span className={`inv-status-pill ${isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending'}`}>
                          {inv.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-download-pdf"
                          onClick={() => handleDownloadInvoicePDF(inv)}
                          disabled={downloadingId === invId}
                          title="Download PDF statement"
                        >
                          <Download size={13} />
                          <span>{downloadingId === invId ? 'Generating...' : 'PDF'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="invoices-empty">
            <Receipt size={36} className="empty-icon" />
            <h3>No Invoices Found</h3>
            <p>Generated rent invoices and official receipts will be listed here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedInvoicesView;
