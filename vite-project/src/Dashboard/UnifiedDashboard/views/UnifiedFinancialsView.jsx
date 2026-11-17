import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RotateCw,
  Search,
  Filter,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import API from '../../../config/api';
import './UnifiedFinancialsView.css';

const UnifiedFinancialsView = ({ onNavigateSection, searchTerm = '' }) => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Period filter
  const [selectedPeriod, setSelectedPeriod] = useState('6months'); // '30days' | '3months' | '6months' | '12months' | 'all'

  // Data from backend
  const [financialData, setFinancialData] = useState({
    summary: {
      rentReceived: 0,
      rentReceivedChange: 'Verified collections',
      rentToReceive: 0,
      pendingReceivableCount: 0,
      rentToPay: 0,
      nextDueDate: null,
      securityDepositsHeld: 0,
      activeDepositCount: 0
    },
    cashFlowSummary: {
      totalRentReceived: 0,
      totalRentPaid: 0,
      outstandingReceivables: 0,
      outstandingPayables: 0,
      netRentalCashFlow: 0
    },
    cashFlowMonthly: [],
    upcomingPayments: [],
    transactions: []
  });

  // Ledger filters
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'received' | 'paid' | 'deposit' | 'outstanding'
  const [searchQuery, setSearchQuery] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sync search term from header if changed
  useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchQuery(searchTerm);
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Chart tooltip state
  const [activeChartPoint, setActiveChartPoint] = useState(null);

  // Fetch financial data from backend API
  const fetchFinancials = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try {
        token = JSON.parse(saved).token;
      } catch {
        token = null;
      }
    }

    if (!token) {
      setError('Authentication token not found. Please log in again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const url = `${API.getUrl(API.endpoints.dashboardFinancials)}?period=${selectedPeriod}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch financial data (Status: ${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setFinancialData({
          summary: data.summary || {
            rentReceived: 0,
            rentReceivedChange: 'Verified collections',
            rentToReceive: 0,
            pendingReceivableCount: 0,
            rentToPay: 0,
            nextDueDate: null,
            securityDepositsHeld: 0,
            activeDepositCount: 0
          },
          cashFlowSummary: data.cashFlowSummary || {
            totalRentReceived: 0,
            totalRentPaid: 0,
            outstandingReceivables: 0,
            outstandingPayables: 0,
            netRentalCashFlow: 0
          },
          cashFlowMonthly: Array.isArray(data.cashFlowMonthly) ? data.cashFlowMonthly : [],
          upcomingPayments: Array.isArray(data.upcomingPayments) ? data.upcomingPayments : [],
          transactions: Array.isArray(data.transactions) ? data.transactions : []
        });
      } else {
        throw new Error(data.message || 'Failed to parse financial response');
      }
    } catch (err) {
      console.error('Error loading financial overview:', err);
      setError(err.message || 'An error occurred while loading financial data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  // Currency Formatter
  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  // Compact Formatter for charts
  const formatCompactBDT = (amount) => {
    const num = Number(amount) || 0;
    if (num >= 10000000) return `৳${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `৳${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `৳${(num / 1000).toFixed(0)}k`;
    return `৳${num}`;
  };

  // Date Formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Filtered Ledger Transactions
  const filteredTransactions = useMemo(() => {
    let list = financialData.transactions || [];

    // Filter by tab category
    if (activeTab === 'received') {
      list = list.filter((t) => t.category === 'received');
    } else if (activeTab === 'paid') {
      list = list.filter((t) => t.category === 'paid');
    } else if (activeTab === 'deposit') {
      list = list.filter((t) => t.category === 'deposit' || t.type?.toLowerCase().includes('deposit'));
    } else if (activeTab === 'outstanding') {
      list = list.filter((t) => t.category === 'outstanding' || ['pending', 'overdue'].includes((t.status || '').toLowerCase()));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        (t.propertyName && t.propertyName.toLowerCase().includes(q)) ||
        (t.from && t.from.toLowerCase().includes(q)) ||
        (t.to && t.to.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      list = list.filter((t) => (t.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    return list;
  }, [financialData.transactions, activeTab, searchQuery, statusFilter]);

  // Paginated Ledger Transactions
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Export CSV handler
  const handleExportCSV = () => {
    const list = filteredTransactions;
    if (list.length === 0) return;

    const headers = ['Transaction ID', 'Date', 'Property', 'Type', 'From', 'To', 'Amount (BDT)', 'Status'];
    const rows = list.map((t) => [
      `"${t.id || ''}"`,
      `"${formatDate(t.date)}"`,
      `"${t.propertyName || ''}"`,
      `"${t.type || ''}"`,
      `"${t.from || ''}"`,
      `"${t.to || ''}"`,
      t.amount || 0,
      `"${t.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DwellSync_Financial_Report_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cash flow chart calculations
  const chartData = financialData.cashFlowMonthly || [];
  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 100000;
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.received || 0, d.paid || 0)),
      10000
    );
    // Round up to nice upper bound
    return Math.ceil(maxVal * 1.15);
  }, [chartData]);

  // Helper to calculate bar heights in percentage
  const getBarHeight = (value) => {
    if (!maxChartValue || maxChartValue === 0) return 0;
    const pct = (Number(value || 0) / maxChartValue) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  return (
    <div className="unified-financials-container">
      {/* 1. Page Header */}
      <div className="financials-page-header">
        <div className="header-titles">
          <h1 className="financials-main-title">Financial Overview</h1>
          <p className="financials-main-subtitle">
            Track your rental income, payments, deposits, and property finances.
          </p>
        </div>

        <div className="header-actions-group">
          {/* Period Selector */}
          <div className="period-selector-wrapper">
            <Calendar size={14} className="period-icon" />
            <select
              className="period-dropdown"
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Select financial period"
            >
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            className="btn-financial-action btn-refresh"
            onClick={() => fetchFinancials(true)}
            disabled={refreshing || loading}
            title="Refresh Financial Data"
          >
            <RotateCw size={14} className={refreshing ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export Report Action */}
          <button
            type="button"
            className="btn-financial-action btn-export"
            onClick={handleExportCSV}
            disabled={loading || filteredTransactions.length === 0}
            title="Export CSV Report"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="financials-error-banner" role="alert">
          <AlertCircle size={18} className="error-icon" />
          <div className="error-content">
            <span className="error-title">Unable to Load Financial Data</span>
            <span className="error-message">{error}</span>
          </div>
          <button
            type="button"
            className="btn-error-retry"
            onClick={() => fetchFinancials(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Four Financial Summary Cards */}
      <div className="financial-summary-grid">
        {/* Card 1: Rent Received */}
        <div className="fin-summary-card">
          <div className="card-top-indicator">
            <div className="fin-icon-container green-icon">
              <ArrowDownLeft size={20} />
            </div>
            <span className="fin-card-badge green-badge">
              {financialData.summary.rentReceivedChange}
            </span>
          </div>
          <div className="fin-card-body">
            <span className="fin-card-label">Rent Received</span>
            <span className="fin-card-value">
              {loading ? '...' : formatBDT(financialData.summary.rentReceived)}
            </span>
            <span className="fin-card-subtext">Verified tenant collections</span>
          </div>
        </div>

        {/* Card 2: Rent to Receive */}
        <div className="fin-summary-card">
          <div className="card-top-indicator">
            <div className="fin-icon-container blue-icon">
              <TrendingUp size={20} />
            </div>
            <span className="fin-card-badge blue-badge">
              {financialData.summary.pendingReceivableCount} pending
            </span>
          </div>
          <div className="fin-card-body">
            <span className="fin-card-label">Rent to Receive</span>
            <span className="fin-card-value text-blue">
              {loading ? '...' : formatBDT(financialData.summary.rentToReceive)}
            </span>
            <span className="fin-card-subtext">Outstanding tenant obligations</span>
          </div>
        </div>

        {/* Card 3: Rent to Pay */}
        <div className="fin-summary-card">
          <div className="card-top-indicator">
            <div className="fin-icon-container orange-icon">
              <ArrowUpRight size={20} />
            </div>
            {financialData.summary.nextDueDate && (
              <span className="fin-card-badge orange-badge">
                Due {formatDate(financialData.summary.nextDueDate)}
              </span>
            )}
          </div>
          <div className="fin-card-body">
            <span className="fin-card-label">Rent to Pay</span>
            <span className="fin-card-value text-orange">
              {loading ? '...' : formatBDT(financialData.summary.rentToPay)}
            </span>
            <span className="fin-card-subtext">Upcoming obligations as tenant</span>
          </div>
        </div>

        {/* Card 4: Security Deposits */}
        <div className="fin-summary-card">
          <div className="card-top-indicator">
            <div className="fin-icon-container violet-icon">
              <ShieldCheck size={20} />
            </div>
            <span className="fin-card-badge violet-badge">
              {financialData.summary.activeDepositCount} active held
            </span>
          </div>
          <div className="fin-card-body">
            <span className="fin-card-label">Security Deposits</span>
            <span className="fin-card-value text-violet">
              {loading ? '...' : formatBDT(financialData.summary.securityDepositsHeld)}
            </span>
            <span className="fin-card-subtext">Deposits held on owned units</span>
          </div>
        </div>
      </div>

      {/* 3. Mid Section: Cash Flow Chart + Upcoming Payments Panel */}
      <div className="financial-mid-layout">
        {/* Left: Cash Flow Overview Chart */}
        <div className="financial-card chart-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-section-title">Cash Flow Overview</h2>
              <p className="card-section-subtitle">
                Monthly comparison of verified rent received vs rent paid
              </p>
            </div>
            <div className="chart-legend-row">
              <div className="legend-item">
                <span className="legend-indicator bg-received" />
                <span className="legend-text">Rent Received</span>
              </div>
              <div className="legend-item">
                <span className="legend-indicator bg-paid" />
                <span className="legend-text">Rent Paid</span>
              </div>
            </div>
          </div>

          <div className="chart-container-wrap">
            {loading ? (
              <div className="chart-loading-placeholder">
                <RotateCw size={24} className="spinning text-muted" />
                <span>Loading cash flow trends...</span>
              </div>
            ) : chartData.length > 0 ? (
              <div className="custom-bar-chart">
                {/* Y-Axis Gridlines */}
                <div className="chart-y-grid">
                  <div className="grid-level">
                    <span className="y-label">{formatCompactBDT(maxChartValue)}</span>
                    <div className="grid-line" />
                  </div>
                  <div className="grid-level">
                    <span className="y-label">{formatCompactBDT(maxChartValue * 0.66)}</span>
                    <div className="grid-line" />
                  </div>
                  <div className="grid-level">
                    <span className="y-label">{formatCompactBDT(maxChartValue * 0.33)}</span>
                    <div className="grid-line" />
                  </div>
                  <div className="grid-level">
                    <span className="y-label">৳0</span>
                    <div className="grid-line base-line" />
                  </div>
                </div>

                {/* Bars Container */}
                <div className="chart-bars-track">
                  {chartData.map((d, index) => {
                    const receivedHeight = getBarHeight(d.received);
                    const paidHeight = getBarHeight(d.paid);
                    const isHovered = activeChartPoint === index;

                    return (
                      <div
                        key={d.month || index}
                        className={`bar-group-column ${isHovered ? 'hovered' : ''}`}
                        onMouseEnter={() => setActiveChartPoint(index)}
                        onMouseLeave={() => setActiveChartPoint(null)}
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="bar-hover-tooltip">
                            <span className="tooltip-title">{d.month}</span>
                            <div className="tooltip-row green">
                              <span>Received:</span>
                              <strong>{formatBDT(d.received)}</strong>
                            </div>
                            <div className="tooltip-row orange">
                              <span>Paid:</span>
                              <strong>{formatBDT(d.paid)}</strong>
                            </div>
                            <div className="tooltip-divider" />
                            <div className="tooltip-row net">
                              <span>Net Flow:</span>
                              <strong className={d.net >= 0 ? 'text-green' : 'text-orange'}>
                                {d.net >= 0 ? `+${formatBDT(d.net)}` : `-${formatBDT(Math.abs(d.net))}`}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* Visual Bars */}
                        <div className="bars-pair-container">
                          {/* Received Bar (Green) */}
                          <div
                            className="bar-pillar bar-received"
                            style={{ height: `${receivedHeight}%` }}
                            title={`Received: ${formatBDT(d.received)}`}
                          />
                          {/* Paid Bar (Orange) */}
                          <div
                            className="bar-pillar bar-paid"
                            style={{ height: `${paidHeight}%` }}
                            title={`Paid: ${formatBDT(d.paid)}`}
                          />
                        </div>

                        {/* Month Label */}
                        <span className="bar-x-label">{d.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="chart-empty-state">
                <BarChart3 size={32} className="text-muted" />
                <span className="empty-title">No Financial Cash Flow Data</span>
                <span className="empty-subtext">
                  Verified rental collections and payments will be charted here.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Upcoming Payments Panel */}
        <div className="financial-card upcoming-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-section-title">Upcoming Obligations</h2>
              <p className="card-section-subtitle">Active rent and invoice payables</p>
            </div>
            <button
              type="button"
              className="btn-link-action"
              onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
            >
              <span>Manage</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="upcoming-list-container">
            {financialData.upcomingPayments.length > 0 ? (
              <div className="upcoming-items-stack">
                {financialData.upcomingPayments.map((item) => (
                  <div key={item.id} className="upcoming-item-card">
                    <div className="upcoming-item-main">
                      <div className="upcoming-item-header">
                        <span className="upcoming-prop-name">{item.propertyName}</span>
                        {item.unitNumber && (
                          <span className="upcoming-unit-pill">Unit {item.unitNumber}</span>
                        )}
                      </div>
                      <span className="upcoming-type-label">{item.paymentType}</span>
                      <div className="upcoming-meta-row">
                        <Clock size={12} className="meta-icon" />
                        <span className="upcoming-due-date">
                          Due: {formatDate(item.dueDate)}
                        </span>
                        <span className={`upcoming-status-pill ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="upcoming-action-col">
                      <span className="upcoming-amount">{formatBDT(item.amount)}</span>
                      {item.isPayable && (
                        <button
                          type="button"
                          className="btn-pay-now"
                          onClick={() => {
                            if (item.invoiceId) {
                              navigate(`/dashboard/invoices?id=${item.invoiceId}`);
                            } else {
                              onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments');
                            }
                          }}
                        >
                          <CreditCard size={12} />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="upcoming-empty-card">
                <CheckCircle2 size={30} className="text-success" />
                <span className="empty-title">All Caught Up!</span>
                <span className="empty-subtext">
                  You have no pending or overdue payment obligations at this time.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Financial Summary Breakdown Panel */}
      <div className="financial-card summary-breakdown-card">
        <div className="breakdown-header">
          <h2 className="card-section-title">Cash Flow Reconciliations</h2>
          <span className="breakdown-badge">
            {selectedPeriod.toUpperCase()} RECONCILIATION
          </span>
        </div>

        <div className="breakdown-metrics-grid">
          <div className="breakdown-stat-item">
            <span className="breakdown-label">Total Rent Received</span>
            <span className="breakdown-val text-green">
              +{formatBDT(financialData.cashFlowSummary.totalRentReceived)}
            </span>
            <span className="breakdown-sub">Verified rental income</span>
          </div>

          <div className="breakdown-stat-item">
            <span className="breakdown-label">Total Rent Paid</span>
            <span className="breakdown-val text-orange">
              -{formatBDT(financialData.cashFlowSummary.totalRentPaid)}
            </span>
            <span className="breakdown-sub">Rental lease expenses</span>
          </div>

          <div className="breakdown-stat-item">
            <span className="breakdown-label">Outstanding Receivables</span>
            <span className="breakdown-val text-blue">
              {formatBDT(financialData.cashFlowSummary.outstandingReceivables)}
            </span>
            <span className="breakdown-sub">Uncollected tenant rent</span>
          </div>

          <div className="breakdown-stat-item">
            <span className="breakdown-label">Outstanding Payables</span>
            <span className="breakdown-val text-orange">
              {formatBDT(financialData.cashFlowSummary.outstandingPayables)}
            </span>
            <span className="breakdown-sub">Pending obligations</span>
          </div>

          <div className="breakdown-stat-item net-cash-stat">
            <span className="breakdown-label">Net Rental Cash Flow</span>
            <span className={`breakdown-val ${financialData.cashFlowSummary.netRentalCashFlow >= 0 ? 'text-green' : 'text-orange'}`}>
              {financialData.cashFlowSummary.netRentalCashFlow >= 0 ? '+' : ''}
              {formatBDT(financialData.cashFlowSummary.netRentalCashFlow)}
            </span>
            <span className="breakdown-sub">Rental income minus expenses</span>
          </div>
        </div>

        <div className="breakdown-footer-note">
          <DollarSign size={13} className="note-icon" />
          <span>
            Net rental cash flow is strictly calculated from verified rental payments received minus rental payments made. Security deposits held and property sale transfers are maintained in dedicated escrow registers.
          </span>
        </div>
      </div>

      {/* 5. Recent Financial Activity Ledger */}
      <div className="financial-card ledger-table-card">
        <div className="ledger-card-header">
          <div>
            <h2 className="card-section-title">Recent Financial Activity</h2>
            <p className="card-section-subtitle">
              Comprehensive ledger of verified payments, deposit escrows, and active receivables
            </p>
          </div>

          {/* Ledger Category Tabs */}
          <div className="ledger-tabs-nav" role="tablist">
            <button
              type="button"
              className={`ledger-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            >
              All Transactions
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTab === 'received' ? 'active' : ''}`}
              onClick={() => { setActiveTab('received'); setCurrentPage(1); }}
            >
              Money Received
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTab === 'paid' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paid'); setCurrentPage(1); }}
            >
              Money Paid
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTab === 'deposit' ? 'active' : ''}`}
              onClick={() => { setActiveTab('deposit'); setCurrentPage(1); }}
            >
              Deposits
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTab === 'outstanding' ? 'active' : ''}`}
              onClick={() => { setActiveTab('outstanding'); setCurrentPage(1); }}
            >
              Outstanding
            </button>
          </div>
        </div>

        {/* Ledger Filter & Search Toolbar */}
        <div className="ledger-toolbar">
          <div className="ledger-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="ledger-search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by property, client, invoice ID..."
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>

          <div className="ledger-filters-group">
            <div className="filter-select-wrapper">
              <Filter size={13} className="filter-icon" />
              <select
                className="filter-dropdown"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="held">Held (Deposit)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Data Table */}
        {paginatedTransactions.length > 0 ? (
          <>
            <div className="ledger-table-wrapper">
              <table className="financial-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Property</th>
                    <th>Transaction Type</th>
                    <th>From / To</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Document</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((item) => {
                    const isPositive = item.category === 'received';
                    const isNegative = item.category === 'paid';
                    const isPending = ['pending', 'overdue'].includes((item.status || '').toLowerCase());

                    return (
                      <tr key={item.id} className="ledger-data-row">
                        <td className="col-date">
                          <span className="row-date">{formatDate(item.date)}</span>
                          <span className="row-id-subtext">{item.id}</span>
                        </td>
                        <td className="col-property">
                          <span className="row-property-title">{item.propertyName}</span>
                          {item.unitNumber && (
                            <span className="row-unit-badge">Unit {item.unitNumber}</span>
                          )}
                        </td>
                        <td className="col-type">
                          <span className="row-type-badge">{item.type}</span>
                        </td>
                        <td className="col-parties">
                          <div className="parties-stack">
                            <span className="party-from">From: {item.from}</span>
                            <span className="party-to">To: {item.to}</span>
                          </div>
                        </td>
                        <td className="col-amount">
                          <span className={`row-amount ${isPositive ? 'amount-positive' : isNegative ? 'amount-negative' : ''}`}>
                            {isPositive ? '+' : isNegative ? '-' : ''}
                            {formatBDT(item.amount)}
                          </span>
                        </td>
                        <td className="col-status">
                          <span className={`row-status-pill status-${(item.status || '').toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="col-doc">
                          {item.receiptUrl ? (
                            <a
                              href={item.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="doc-link-btn"
                              title="View Official Receipt"
                            >
                              <Receipt size={13} />
                              <span>Receipt</span>
                            </a>
                          ) : item.invoiceNo ? (
                            <button
                              type="button"
                              className="doc-link-btn"
                              onClick={() => navigate(`/dashboard/invoices?id=${item.invoiceId || ''}`)}
                              title="View Invoice"
                            >
                              <FileText size={13} />
                              <span>{item.invoiceNo}</span>
                            </button>
                          ) : (
                            <span className="doc-na">—</span>
                          )}
                        </td>
                        <td className="col-action">
                          {isPending && item.category === 'outstanding' ? (
                            <button
                              type="button"
                              className="btn-table-action btn-table-pay"
                              onClick={() => {
                                if (item.invoiceId) {
                                  navigate(`/dashboard/invoices?id=${item.invoiceId}`);
                                } else {
                                  onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments');
                                }
                              }}
                            >
                              <span>Pay</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => {
                                onNavigateSection ? onNavigateSection('invoices') : navigate('/dashboard/invoices');
                              }}
                            >
                              <span>Details</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="ledger-mobile-cards-list">
              {paginatedTransactions.map((item) => {
                const isPositive = item.category === 'received';
                const isNegative = item.category === 'paid';

                return (
                  <div key={item.id} className="ledger-mobile-card">
                    <div className="card-mobile-top">
                      <div>
                        <span className="mobile-prop-title">{item.propertyName}</span>
                        <span className="mobile-type-label">{item.type}</span>
                      </div>
                      <span className={`mobile-amount ${isPositive ? 'amount-positive' : isNegative ? 'amount-negative' : ''}`}>
                        {isPositive ? '+' : isNegative ? '-' : ''}
                        {formatBDT(item.amount)}
                      </span>
                    </div>

                    <div className="card-mobile-parties">
                      <span>From: {item.from}</span>
                      <span>To: {item.to}</span>
                    </div>

                    <div className="card-mobile-bottom">
                      <span className="mobile-date">{formatDate(item.date)}</span>
                      <span className={`row-status-pill status-${(item.status || '').toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="ledger-pagination-bar">
                <span className="pagination-count-label">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} entries
                </span>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <span className="pagination-page-indicator">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="ledger-empty-state">
            <Receipt size={36} className="empty-icon text-muted" />
            <h3 className="empty-title">No Financial Transactions Found</h3>
            <p className="empty-subtext">
              {searchQuery || statusFilter !== 'all' || activeTab !== 'all'
                ? 'No financial records match your current filters. Try resetting the search or category filter.'
                : 'Verified payments, tenant billings, and security deposit records will appear here as transactions occur.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || activeTab !== 'all') && (
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFinancialsView;
