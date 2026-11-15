import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTimes,
  FaHome,
  FaBuilding,
  FaCalculator,
  FaMoneyBillWave,
  FaPercentage,
  FaCalendarAlt,
  FaArrowRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUndo
} from 'react-icons/fa';
import apiConfig from '../config/api';
import './AffordabilityCalculatorModal.css';

const AffordabilityCalculatorModal = ({ isOpen, onClose, initialMode = 'buy' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'buy' or 'rent'

  // Buy Mode State
  const [buyIncome, setBuyIncome] = useState(120000);
  const [downPayment, setDownPayment] = useState(800000);
  const [buyDebts, setBuyDebts] = useState(15000);
  const [loanTenureYears, setLoanTenureYears] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);

  // Rent Mode State
  const [rentIncome, setRentIncome] = useState(70000);
  const [rentDebts, setRentDebts] = useState(5000);
  const [rentRatio, setRentRatio] = useState(30); // 25, 30, or 35%

  // Live matching properties preview
  const [matchingProperties, setMatchingProperties] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculations for Buy Mode (Using standard 36% Back-End DTI ratio)
  const buyCalculations = useMemo(() => {
    const income = Math.max(0, Number(buyIncome) || 0);
    const debts = Math.max(0, Number(buyDebts) || 0);
    const down = Math.max(0, Number(downPayment) || 0);
    const tenure = Math.max(1, Number(loanTenureYears) || 20);
    const rate = Math.max(0.1, Number(interestRate) || 8.5);

    // DTI max allowable monthly debt + housing = 36% of gross income
    const maxAllowableTotalDebt = income * 0.36;
    const maxAllowableMonthlyHousing = Math.max(0, maxAllowableTotalDebt - debts);

    // Amortization formula: Loan = EMI * [(1 - (1 + r)^-n) / r]
    const monthlyRate = (rate / 100) / 12;
    const numPayments = tenure * 12;

    let maxLoanAmount = 0;
    if (monthlyRate > 0 && maxAllowableMonthlyHousing > 0) {
      maxLoanAmount = maxAllowableMonthlyHousing * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
    }

    const maxPropertyPrice = Math.round(maxLoanAmount + down);
    const estimatedMonthlyEMI = Math.round(maxAllowableMonthlyHousing);
    const debtRatio = income > 0 ? Math.round(((debts + estimatedMonthlyEMI) / income) * 100) : 0;
    const isDebtConstrained = maxAllowableTotalDebt <= debts;

    return {
      maxPropertyPrice,
      maxLoanAmount: Math.round(maxLoanAmount),
      estimatedMonthlyEMI,
      debtRatio,
      isDebtConstrained
    };
  }, [buyIncome, buyDebts, downPayment, loanTenureYears, interestRate]);

  // Calculations for Rent Mode (Using standard 30% rule)
  const rentCalculations = useMemo(() => {
    const income = Math.max(0, Number(rentIncome) || 0);
    const debts = Math.max(0, Number(rentDebts) || 0);
    const ratio = Math.max(10, Math.min(50, Number(rentRatio) || 30));

    const disposable = Math.max(0, income - debts);
    const maxRecommendedRent = Math.round(disposable * (ratio / 100));
    const annualIncomeRequirement = maxRecommendedRent * 40;
    const isDebtConstrained = debts >= income * 0.6;

    return {
      maxRecommendedRent,
      annualIncomeRequirement,
      isDebtConstrained
    };
  }, [rentIncome, rentDebts, rentRatio]);

  // Effective budget threshold depending on mode
  const currentMaxBudget = mode === 'buy'
    ? buyCalculations.maxPropertyPrice
    : rentCalculations.maxRecommendedRent;

  // Fetch real property matches from database when budget updates
  useEffect(() => {
    if (!isOpen || currentMaxBudget <= 0) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingMatches(true);
        const listingType = mode === 'buy' ? 'For Sale' : 'For Rent';
        const query = new URLSearchParams({
          maxPrice: currentMaxBudget.toString(),
          listingType
        });
        const url = `${apiConfig.getUrl(apiConfig.endpoints.properties)}?${query.toString()}`;
        const response = await fetch(url);
        if (response.ok && !isCancelled) {
          const data = await response.json();
          const list = data.properties || data || [];
          setMatchingProperties(Array.isArray(list) ? list.slice(0, 3) : []);
        }
      } catch (err) {
        console.error('Error fetching matching properties for calculator:', err);
      } finally {
        if (!isCancelled) setLoadingMatches(false);
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, currentMaxBudget, mode]);

  // Reset calculator to default figures
  const handleReset = () => {
    if (mode === 'buy') {
      setBuyIncome(120000);
      setDownPayment(800000);
      setBuyDebts(15000);
      setLoanTenureYears(20);
      setInterestRate(8.5);
    } else {
      setRentIncome(70000);
      setRentDebts(5000);
      setRentRatio(30);
    }
  };

  // Navigate to full properties list with matching budget filters applied
  const handleViewMatchingProperties = () => {
    onClose();
    const listingType = mode === 'buy' ? 'For Sale' : 'For Rent';
    navigate(`/properties?maxPrice=${currentMaxBudget}&listingType=${encodeURIComponent(listingType)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="affordability-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="affordability-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="affordability-modal-header">
          <div className="header-title-box">
            <span className="modal-eyebrow">DWELLSYNC FINANCIAL TOOLS</span>
            <h2>Affordability & Budget Calculator</h2>
            <p>Compute realistic home buying power or rental budget based on your real income and savings.</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close calculator"
          >
            <FaTimes />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="calculator-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'buy' ? 'active' : ''}`}
            onClick={() => setMode('buy')}
          >
            <FaHome className="tab-icon" />
            <span>Buying a Home</span>
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'rent' ? 'active' : ''}`}
            onClick={() => setMode('rent')}
          >
            <FaBuilding className="tab-icon" />
            <span>Renting a Home</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="affordability-modal-body">
          {/* Left Form: User Inputs */}
          <div className="calc-inputs-column">
            {mode === 'buy' ? (
              <>
                <div className="calc-field-group">
                  <label htmlFor="buyIncome">
                    <FaMoneyBillWave className="label-icon" /> Monthly Net Household Income (৳)
                  </label>
                  <input
                    id="buyIncome"
                    type="number"
                    min="10000"
                    step="5000"
                    value={buyIncome}
                    onChange={(e) => setBuyIncome(e.target.value)}
                    placeholder="e.g. 120,000"
                    className="calc-input"
                  />
                  <div className="calc-presets">
                    {[60000, 100000, 150000, 250000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className="preset-pill"
                        onClick={() => setBuyIncome(val)}
                      >
                        ৳{(val / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="calc-field-group">
                  <label htmlFor="downPayment">
                    <FaMoneyBillWave className="label-icon" /> Down Payment / Cash Available (৳)
                  </label>
                  <input
                    id="downPayment"
                    type="number"
                    min="0"
                    step="50000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="e.g. 800,000"
                    className="calc-input"
                  />
                  <div className="calc-presets">
                    {[300000, 500000, 1000000, 2000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className="preset-pill"
                        onClick={() => setDownPayment(val)}
                      >
                        ৳{(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)} Lakh
                      </button>
                    ))}
                  </div>
                </div>

                <div className="calc-field-group">
                  <label htmlFor="buyDebts">
                    <FaExclamationTriangle className="label-icon" /> Existing Monthly Debts / EMIs (৳)
                  </label>
                  <input
                    id="buyDebts"
                    type="number"
                    min="0"
                    step="2000"
                    value={buyDebts}
                    onChange={(e) => setBuyDebts(e.target.value)}
                    placeholder="e.g. 15,000"
                    className="calc-input"
                  />
                  <span className="field-hint">Car loans, credit cards, or personal loan monthly payments</span>
                </div>

                <div className="calc-grid-2col">
                  <div className="calc-field-group">
                    <label htmlFor="loanTenureYears">
                      <FaCalendarAlt className="label-icon" /> Loan Term
                    </label>
                    <select
                      id="loanTenureYears"
                      value={loanTenureYears}
                      onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                      className="calc-select"
                    >
                      <option value="10">10 Years</option>
                      <option value="15">15 Years</option>
                      <option value="20">20 Years (Standard)</option>
                      <option value="25">25 Years</option>
                    </select>
                  </div>

                  <div className="calc-field-group">
                    <label htmlFor="interestRate">
                      <FaPercentage className="label-icon" /> Interest Rate (%)
                    </label>
                    <input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      min="3"
                      max="20"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="calc-input"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="calc-field-group">
                  <label htmlFor="rentIncome">
                    <FaMoneyBillWave className="label-icon" /> Monthly Net Household Income (৳)
                  </label>
                  <input
                    id="rentIncome"
                    type="number"
                    min="10000"
                    step="5000"
                    value={rentIncome}
                    onChange={(e) => setRentIncome(e.target.value)}
                    placeholder="e.g. 70,000"
                    className="calc-input"
                  />
                  <div className="calc-presets">
                    {[40000, 60000, 90000, 150000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className="preset-pill"
                        onClick={() => setRentIncome(val)}
                      >
                        ৳{(val / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="calc-field-group">
                  <label htmlFor="rentDebts">
                    <FaExclamationTriangle className="label-icon" /> Existing Monthly Debt Obligations (৳)
                  </label>
                  <input
                    id="rentDebts"
                    type="number"
                    min="0"
                    step="2000"
                    value={rentDebts}
                    onChange={(e) => setRentDebts(e.target.value)}
                    placeholder="e.g. 5,000"
                    className="calc-input"
                  />
                  <span className="field-hint">Fixed monthly loan payments, insurance, or commitments</span>
                </div>

                <div className="calc-field-group">
                  <label>
                    <FaPercentage className="label-icon" /> Rent Affordability Benchmark
                  </label>
                  <div className="ratio-selection-pills">
                    {[
                      { val: 25, label: 'Conservative (25%)' },
                      { val: 30, label: 'Standard (30%)' },
                      { val: 35, label: 'Flexible (35%)' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`ratio-pill ${rentRatio === item.val ? 'selected' : ''}`}
                        onClick={() => setRentRatio(item.val)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <span className="field-hint">Financial experts recommend spending at most 30% of income on rent</span>
                </div>
              </>
            )}

            <button
              type="button"
              className="calc-reset-btn"
              onClick={handleReset}
            >
              <FaUndo /> Reset to Sensible Defaults
            </button>
          </div>

          {/* Right Column: Live Affordability Results */}
          <div className="calc-results-column">
            <div className="results-hero-card">
              <span className="results-tag">
                {mode === 'buy' ? 'MAX ESTIMATED PURCHASE BUDGET' : 'RECOMMENDED MONTHLY RENT'}
              </span>
              <div className="results-big-figure">
                ৳ {currentMaxBudget > 0 ? currentMaxBudget.toLocaleString('en-IN') : '0'}
                {mode === 'rent' && <span className="per-month-text">/ month</span>}
              </div>

              {mode === 'buy' ? (
                buyCalculations.isDebtConstrained ? (
                  <div className="results-warning-banner">
                    <FaExclamationTriangle />
                    <span>Existing debts exceed safe 36% DTI limits. Consider lowering monthly debts or adding more cash down payment.</span>
                  </div>
                ) : (
                  <div className="results-success-banner">
                    <FaCheckCircle />
                    <span>Comfortable debt-to-income profile based on {loanTenureYears}-year tenure at {interestRate}% rate.</span>
                  </div>
                )
              ) : (
                rentCalculations.isDebtConstrained ? (
                  <div className="results-warning-banner">
                    <FaExclamationTriangle />
                    <span>High debt ratio. Keeping rent conservative will protect your emergency savings.</span>
                  </div>
                ) : (
                  <div className="results-success-banner">
                    <FaCheckCircle />
                    <span>Within sustainable 30% living affordability limits.</span>
                  </div>
                )
              )}

              {/* Financial Breakdown Grid */}
              <div className="results-breakdown-grid">
                {mode === 'buy' ? (
                  <>
                    <div className="breakdown-stat">
                      <span className="stat-label">Estimated Monthly EMI</span>
                      <span className="stat-val">৳ {buyCalculations.estimatedMonthlyEMI.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Estimated Loan Capacity</span>
                      <span className="stat-val">৳ {buyCalculations.maxLoanAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Down Payment Share</span>
                      <span className="stat-val">৳ {Number(downPayment || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Total Debt Ratio (DTI)</span>
                      <span className="stat-val">{buyCalculations.debtRatio}%</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="breakdown-stat">
                      <span className="stat-label">Suggested Annual Income</span>
                      <span className="stat-val">৳ {rentCalculations.annualIncomeRequirement.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Chosen Rent Ratio</span>
                      <span className="stat-val">{rentRatio}% of Income</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Net After Rent & Debts</span>
                      <span className="stat-val">
                        ৳ {Math.max(0, Number(rentIncome || 0) - Number(rentDebts || 0) - rentCalculations.maxRecommendedRent).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Security Deposit Buffer</span>
                      <span className="stat-val">~৳ {(rentCalculations.maxRecommendedRent * 2).toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Property Matching Section */}
            <div className="matching-properties-preview">
              <div className="matching-preview-header">
                <h4>
                  {loadingMatches ? 'Searching Database...' : `Real Homes in Your Budget (${matchingProperties.length} found)`}
                </h4>
              </div>

              {loadingMatches ? (
                <div className="matching-loading-state">
                  <div className="small-pulse-loader" />
                  <span>Matching properties from database...</span>
                </div>
              ) : matchingProperties.length > 0 ? (
                <div className="matching-cards-list">
                  {matchingProperties.map((prop) => (
                    <div
                      key={prop._id}
                      className="matching-card-item"
                      onClick={() => {
                        onClose();
                        navigate(`/properties/${prop._id}`);
                      }}
                    >
                      <img
                        src={apiConfig.getImageUrl(prop.images?.[0] || prop.media?.images?.[0]?.url) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
                        alt={prop.title || prop.address}
                        className="matching-thumb"
                      />
                      <div className="matching-info">
                        <span className="matching-title">{prop.title || prop.address}</span>
                        <span className="matching-price">
                          ৳ {prop.price ? prop.price.toLocaleString('en-IN') : 'Contact for Price'}
                        </span>
                        <span className="matching-specs">
                          {prop.specifications?.bedrooms || 0} Beds • {prop.specifications?.bathrooms || 0} Baths • {prop.city || 'Dhaka'}
                        </span>
                      </div>
                      <FaArrowRight className="matching-arrow" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="matching-empty-state">
                  <span>No exact properties currently under this filter. Tap below to browse all available options.</span>
                </div>
              )}

              <button
                type="button"
                className="btn-view-matches"
                onClick={handleViewMatchingProperties}
              >
                Browse All Homes Under ৳{currentMaxBudget.toLocaleString('en-IN')} <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffordabilityCalculatorModal;
