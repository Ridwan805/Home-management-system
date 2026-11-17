import React, { useState } from 'react';
import {
  Lock,
  Bell,
  Globe,
  Shield,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';
import apiConfig from '../../../config/api';
import { ButtonLoader } from '../../../components/loading';
import './UnifiedSettingsView.css';

const UnifiedSettingsView = () => {

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification Preferences State (persisted in local state)
  const [notifPreferences, setNotifPreferences] = useState({
    rentReminders: true,
    maintenanceAlerts: true,
    applicationUpdates: true,
    noticesAndLegal: true,
    emailReceipts: true
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) throw new Error('Session expired');
      const token = JSON.parse(saved).token;

      const res = await fetch(apiConfig.getUrl('/api/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setPasswordSuccess('Password successfully updated.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const togglePreference = (key) => {
    setNotifPreferences(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2500);
  };

  return (
    <div className="unified-settings-page">
      {/* Header */}
      <div className="unified-view-header">
        <div>
          <h1 className="unified-view-title">Account Settings</h1>
          <p className="unified-view-subtitle">
            Configure security, credentials, automated alerts, and account preferences
          </p>
        </div>
      </div>

      <div className="settings-sections-container">
        {/* Security / Password Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="header-icon-box blue">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="card-title">Security & Password</h3>
              <p className="card-subtitle">Ensure your account uses a secure password with at least 6 characters.</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="unified-alert success">
              <Check size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="unified-alert error">
              <AlertCircle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="password-form-grid">
            <div className="settings-field">
              <label className="field-label">Current Password</label>
              <div className="password-input-wrap">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="field-input"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="pass-visibility-toggle"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  aria-label="Toggle password visibility"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label className="field-label">New Password</label>
              <div className="password-input-wrap">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="field-input"
                  placeholder="Enter at least 6 characters"
                  required
                />
                <button
                  type="button"
                  className="pass-visibility-toggle"
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label="Toggle password visibility"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label className="field-label">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="field-input"
                placeholder="Confirm new password"
                required
              />
            </div>

            <div className="settings-form-actions">
              <button
                type="submit"
                className="unified-btn unified-btn-primary"
                disabled={passwordSubmitting}
              >
                {passwordSubmitting ? (
                  <ButtonLoader size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Notifications & Alert Preferences */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="header-icon-box green">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="card-title">Notification & Alert Preferences</h3>
              <p className="card-subtitle">Choose which events trigger real-time alerts and inbox notifications.</p>
            </div>
          </div>

          {prefsSaved && (
            <div className="unified-alert success">
              <Check size={18} />
              <span>Preferences automatically updated</span>
            </div>
          )}

          <div className="preferences-list">
            <div className="pref-row">
              <div className="pref-info">
                <span className="pref-title">Rent Due & Collection Reminders</span>
                <span className="pref-desc">Receive automated reminders 5 days before monthly rent due dates</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={notifPreferences.rentReminders}
                  onChange={() => togglePreference('rentReminders')}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <span className="pref-title">Application Status Updates</span>
                <span className="pref-desc">Instant alerts when tenant applications are submitted, approved, or reviewed</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={notifPreferences.applicationUpdates}
                  onChange={() => togglePreference('applicationUpdates')}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <span className="pref-title">Maintenance & Inspection Reports</span>
                <span className="pref-desc">Updates regarding repairs, scheduled visits, and technician reports</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={notifPreferences.maintenanceAlerts}
                  onChange={() => togglePreference('maintenanceAlerts')}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <span className="pref-title">Legal & Move-Out Notices</span>
                <span className="pref-desc">Official 2-month statutory notices and tenancy departure records</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={notifPreferences.noticesAndLegal}
                  onChange={() => togglePreference('noticesAndLegal')}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Currency & Regional Preferences */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="header-icon-box purple">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="card-title">Regional & Financial Standards</h3>
              <p className="card-subtitle">Default localized formatting configured for DwellSync operations.</p>
            </div>
          </div>

          <div className="regional-grid">
            <div className="regional-item">
              <span className="reg-label">Operating Currency</span>
              <span className="reg-value">BDT (Bangladeshi Taka ৳)</span>
            </div>
            <div className="regional-item">
              <span className="reg-label">Timezone</span>
              <span className="reg-value">Asia/Dhaka (UTC+06:00)</span>
            </div>
            <div className="regional-item">
              <span className="reg-label">Payment Gateway</span>
              <span className="reg-value">Stripe Verified Card & Digital Payments</span>
            </div>
            <div className="regional-item">
              <span className="reg-label">System Platform</span>
              <span className="reg-value">DwellSync Unified Property Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettingsView;
