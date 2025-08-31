import React, { useState, useEffect } from 'react';
import { FaCog, FaSave, FaUndo, FaExclamationTriangle } from 'react-icons/fa';

const ConfigurationManagement = () => {
  const [config, setConfig] = useState({
    monthlyFee: 500,
    paymentDeadline: 5,
    gracePeriodDays: 7,
    lateFeePercentage: 5,
    autoFreezeAfterDays: 15,
    reminderSchedule: {
      fourteenDays: true,
      sevenDays: true,
      oneDay: true,
      overdue: true,
      finalWarning: true
    }
  });
  const [originalConfig, setOriginalConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    // Check if there are any changes
    const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(configChanged);
  }, [config, originalConfig]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/admin/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      setConfig(data.config);
      setOriginalConfig(data.config);
    } catch (err) {
      setError('Failed to load configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/admin/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update configuration');
      }

      const data = await response.json();
      setOriginalConfig(config);
      setSuccess(`Configuration updated successfully! ${data.updatedCount} subscriptions affected.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to save configuration: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="config-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="config-management">
      <div className="config-header">
        <div className="header-content">
          <FaCog className="header-icon" />
          <div>
            <h2>Global Configuration</h2>
            <p>Manage payment deadlines, grace periods, and system-wide settings</p>
          </div>
        </div>
        
        {hasChanges && (
          <div className="action-buttons">
            <button 
              className="btn-secondary"
              onClick={handleReset}
              disabled={saving}
            >
              <FaUndo /> Reset
            </button>
            <button 
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="config-sections">
        {/* Payment Configuration */}
        <div className="config-section">
          <h3>Payment Configuration</h3>
          <div className="config-grid">
            <div className="config-field">
              <label>Monthly Fee (BDT)</label>
              <input
                type="number"
                value={config.monthlyFee}
                onChange={(e) => handleInputChange('monthlyFee', parseInt(e.target.value))}
                min="0"
                step="50"
              />
              <small>Base monthly subscription fee</small>
            </div>

            <div className="config-field">
              <label>Payment Deadline (Day of Month)</label>
              <input
                type="number"
                value={config.paymentDeadline}
                onChange={(e) => handleInputChange('paymentDeadline', parseInt(e.target.value))}
                min="1"
                max="31"
              />
              <small>Day of the month when payment is due</small>
            </div>

            <div className="config-field">
              <label>Grace Period (Days)</label>
              <input
                type="number"
                value={config.gracePeriodDays}
                onChange={(e) => handleInputChange('gracePeriodDays', parseInt(e.target.value))}
                min="0"
                max="30"
              />
              <small>Days after deadline before marking as overdue</small>
            </div>

            <div className="config-field">
              <label>Late Fee Percentage (%)</label>
              <input
                type="number"
                value={config.lateFeePercentage}
                onChange={(e) => handleInputChange('lateFeePercentage', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.5"
              />
              <small>Percentage of monthly fee charged as late fee</small>
            </div>

            <div className="config-field">
              <label>Auto-Freeze After (Days)</label>
              <input
                type="number"
                value={config.autoFreezeAfterDays}
                onChange={(e) => handleInputChange('autoFreezeAfterDays', parseInt(e.target.value))}
                min="1"
                max="90"
              />
              <small>Days overdue before automatic account freeze</small>
            </div>
          </div>
        </div>

        {/* Reminder Configuration */}
        <div className="config-section">
          <h3>Reminder Schedule</h3>
          <div className="reminder-grid">
            <div className="reminder-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.reminderSchedule.fourteenDays}
                  onChange={(e) => handleInputChange('reminderSchedule.fourteenDays', e.target.checked)}
                />
                <span>14 Days Before Due</span>
              </label>
            </div>

            <div className="reminder-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.reminderSchedule.sevenDays}
                  onChange={(e) => handleInputChange('reminderSchedule.sevenDays', e.target.checked)}
                />
                <span>7 Days Before Due</span>
              </label>
            </div>

            <div className="reminder-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.reminderSchedule.oneDay}
                  onChange={(e) => handleInputChange('reminderSchedule.oneDay', e.target.checked)}
                />
                <span>1 Day Before Due</span>
              </label>
            </div>

            <div className="reminder-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.reminderSchedule.overdue}
                  onChange={(e) => handleInputChange('reminderSchedule.overdue', e.target.checked)}
                />
                <span>Overdue Notification</span>
              </label>
            </div>

            <div className="reminder-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.reminderSchedule.finalWarning}
                  onChange={(e) => handleInputChange('reminderSchedule.finalWarning', e.target.checked)}
                />
                <span>Final Warning</span>
              </label>
            </div>
          </div>
        </div>

        {/* Configuration Preview */}
        <div className="config-section">
          <h3>Configuration Summary</h3>
          <div className="config-summary">
            <div className="summary-item">
              <strong>Payment Timeline:</strong>
              <p>Due on day {config.paymentDeadline} of each month, {config.gracePeriodDays} day grace period, auto-freeze after {config.autoFreezeAfterDays} days overdue</p>
            </div>
            <div className="summary-item">
              <strong>Fees:</strong>
              <p>Monthly: ৳{config.monthlyFee}, Late fee: {config.lateFeePercentage}% (৳{Math.round(config.monthlyFee * config.lateFeePercentage / 100)})</p>
            </div>
            <div className="summary-item">
              <strong>Active Reminders:</strong>
              <p>
                {Object.entries(config.reminderSchedule)
                  .filter(([key, value]) => value)
                  .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
                  .join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="config-footer">
          <div className="warning-message">
            <FaExclamationTriangle />
            <span>You have unsaved changes. These will apply to all existing subscriptions.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationManagement;