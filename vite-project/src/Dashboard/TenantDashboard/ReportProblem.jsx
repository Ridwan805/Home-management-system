import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Send, 
  Image as ImageIcon, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  UserRound, 
  Clock, 
  Calendar, 
  Building2, 
  AlertTriangle,
  RotateCw,
  FileText
} from 'lucide-react';
import './ReportProblem.css';
import { createMaintenanceReport, getTenantReports, getTenantProperties } from '../../config/api';
import { CircularSpinner, ButtonLoader } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';

const issueTypes = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating_cooling', label: 'HVAC / Air Conditioning' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'structural', label: 'Structural / Doors & Windows' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'security', label: 'Security & Access' },
  { value: 'cleaning', label: 'Cleaning & Sanitation' },
  { value: 'internet_cable', label: 'Internet / Cable' },
  { value: 'other', label: 'Other' }
];

const priorityLevels = [
  { value: 'low', label: 'Low', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { value: 'medium', label: 'Medium', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { value: 'high', label: 'High', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
];

const ReportProblem = () => {
  const [formData, setFormData] = useState({
    propertyId: '',
    title: '',
    description: '',
    issueType: '',
    floor: '',
    room: '',
    priority: 'medium',
    isUrgent: false
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previousReports, setPreviousReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [tenantProperties, setTenantProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPreviousReports();
    fetchTenantProperties();
  }, []);

  const fetchPreviousReports = async () => {
    try {
      setLoadingReports(true);
      const response = await getTenantReports();
      setPreviousReports(response.data || response.reports || []);
    } catch (error) {
      console.error('Error fetching previous reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchTenantProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await getTenantProperties();
      const properties = Array.isArray(response) ? response : (response.properties || []);
      setTenantProperties(properties);
      
      // Auto-select first property if only one exists
      if (properties.length === 1 && properties[0]._id) {
        setFormData(prev => ({ ...prev, propertyId: properties[0]._id }));
      }
    } catch (error) {
      console.error('Error fetching tenant properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrorMessage('Some files were rejected. Please ensure all attachments are image files under 10MB.');
      setTimeout(() => setErrorMessage(''), 5000);
    }

    setImages(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.propertyId.trim()) {
      errors.propertyId = 'Please select the affected property';
    }
    if (!formData.title.trim()) {
      errors.title = 'Problem title is required';
    }
    if (!formData.issueType.trim()) {
      errors.issueType = 'Please select the type of issue';
    }
    if (!formData.description.trim()) {
      errors.description = 'Please provide a detailed description';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitFormData = new FormData();
      Object.keys(formData).forEach(key => {
        submitFormData.append(key, formData[key]);
      });
      images.forEach((image) => {
        submitFormData.append('images', image);
      });

      await createMaintenanceReport(submitFormData);
      setSuccessMessage('Problem reported successfully. Your request has been transmitted to the property owner.');
      
      // Reset form
      setFormData({
        propertyId: tenantProperties.length === 1 ? tenantProperties[0]._id : '',
        title: '',
        description: '',
        issueType: '',
        floor: '',
        room: '',
        priority: 'medium',
        isUrgent: false
      });
      setFormErrors({});
      setImages([]);

      // Refresh list
      fetchPreviousReports();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setErrorMessage(error.message || 'Failed to submit report. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="tenant-report-problem-page">
      <TenantPageHeader 
        title="Report a Problem" 
        subtitle="Submit maintenance tickets and track ongoing repairs directly with property management."
        action={
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={fetchPreviousReports}
            disabled={loadingReports}
            title="Refresh previous reports"
          >
            <RotateCw size={16} className={loadingReports ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {successMessage && (
        <div className="report-alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="report-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Two-Column Responsive Grid */}
      <div className="report-two-col-layout">
        {/* Left Column: Submit New Report Form */}
        <section className="report-form-card" aria-labelledby="form-heading">
          <div className="card-section-header">
            <div className="header-title-wrap">
              <Wrench size={20} className="header-icon" />
              <h2 id="form-heading" className="card-section-title">Submit New Report</h2>
            </div>
            <p className="card-section-subtitle">
              Provide thorough details so management can dispatch the appropriate technician.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="report-entry-form" noValidate>
            {/* Property Selection */}
            <div className="ds-form-group">
              <label htmlFor="propertyId" className="ds-form-label">
                <span>Property *</span>
              </label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleInputChange}
                required
                className={`ds-form-select ${formErrors.propertyId ? 'input-error' : ''}`}
                disabled={loadingProperties}
              >
                <option value="">
                  {loadingProperties ? 'Loading assigned properties...' : 'Select your residence'}
                </option>
                {tenantProperties.map(property => (
                  <option key={property._id} value={property._id}>
                    {property.name || property.address || 'Rental Property'}
                  </option>
                ))}
              </select>
              {formErrors.propertyId && (
                <span className="ds-form-error">{formErrors.propertyId}</span>
              )}
            </div>

            {/* Problem Title */}
            <div className="ds-form-group">
              <label htmlFor="title" className="ds-form-label">
                <span>Problem Title *</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Kitchen sink leaking under cabinet"
                className={`ds-form-input ${formErrors.title ? 'input-error' : ''}`}
              />
              {formErrors.title && (
                <span className="ds-form-error">{formErrors.title}</span>
              )}
            </div>

            {/* Issue Type */}
            <div className="ds-form-group">
              <label htmlFor="issueType" className="ds-form-label">
                <span>Issue Type *</span>
              </label>
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleInputChange}
                required
                className={`ds-form-select ${formErrors.issueType ? 'input-error' : ''}`}
              >
                <option value="">Select category</option>
                {issueTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {formErrors.issueType && (
                <span className="ds-form-error">{formErrors.issueType}</span>
              )}
            </div>

            {/* Floor & Room / Area */}
            <div className="form-two-col-row">
              <div className="ds-form-group">
                <label htmlFor="floor" className="ds-form-label">Floor</label>
                <input
                  type="text"
                  id="floor"
                  name="floor"
                  value={formData.floor}
                  onChange={handleInputChange}
                  placeholder="e.g., 3rd Floor"
                  className="ds-form-input"
                />
              </div>

              <div className="ds-form-group">
                <label htmlFor="room" className="ds-form-label">Room / Area</label>
                <input
                  type="text"
                  id="room"
                  name="room"
                  value={formData.room}
                  onChange={handleInputChange}
                  placeholder="e.g., Master Bathroom"
                  className="ds-form-input"
                />
              </div>
            </div>

            {/* Priority Level */}
            <div className="ds-form-group">
              <label className="ds-form-label">
                <span>Priority Level</span>
              </label>
              <div className="priority-segmented-control" role="radiogroup">
                {priorityLevels.map(lvl => {
                  const isSelected = formData.priority === lvl.value;
                  return (
                    <label 
                      key={lvl.value} 
                      className={`priority-pill-label ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? { 
                        borderColor: lvl.color, 
                        backgroundColor: lvl.bg, 
                        color: lvl.color 
                      } : undefined}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={lvl.value}
                        checked={isSelected}
                        onChange={handleInputChange}
                        className="priority-hidden-radio"
                      />
                      <span className="priority-pill-text">{lvl.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Urgent Issue Checkbox */}
            <div className={`urgent-toggle-box ${formData.isUrgent ? 'urgent-active' : ''}`}>
              <label className="urgent-checkbox-label">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={formData.isUrgent}
                  onChange={handleInputChange}
                  className="urgent-native-checkbox"
                />
                <div className="urgent-text-wrap">
                  <span className="urgent-title">
                    <AlertTriangle size={16} />
                    <span>Urgent Issue</span>
                  </span>
                  <span className="urgent-desc">
                    Check only if this problem poses immediate health, water flooding, or electrical hazards.
                  </span>
                </div>
              </label>
            </div>

            {/* Detailed Description */}
            <div className="ds-form-group">
              <label htmlFor="description" className="ds-form-label">
                <span>Detailed Description *</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Describe when the issue began, how severe it is, and any troubleshooting steps already attempted..."
                className={`ds-form-textarea ${formErrors.description ? 'input-error' : ''}`}
              />
              {formErrors.description && (
                <span className="ds-form-error">{formErrors.description}</span>
              )}
            </div>

            {/* Attach Images */}
            <div className="ds-form-group">
              <label className="ds-form-label">
                <span>Attach Photographs (Optional)</span>
                <span className="label-hint">Max 5 photos, 10MB each</span>
              </label>

              <div className="image-upload-zone">
                <label htmlFor="report-images" className="upload-trigger-btn">
                  <ImageIcon size={18} />
                  <span>Choose Photographs</span>
                </label>
                <input
                  type="file"
                  id="report-images"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="visually-hidden-input"
                />
                <span className="upload-count-text">
                  {images.length > 0 ? `${images.length} photo(s) selected` : 'PNG, JPG or WebP'}
                </span>
              </div>

              {images.length > 0 && (
                <div className="staged-images-list">
                  {images.map((img, idx) => (
                    <div key={idx} className="staged-image-chip">
                      <span className="chip-name">{img.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="chip-remove-btn"
                        aria-label={`Remove photo ${img.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="ds-btn ds-btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            >
              {loading ? (
                <>
                  <ButtonLoader size="small" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Maintenance Report</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column: Previous Reports */}
        <section className="previous-reports-card" aria-labelledby="previous-heading">
          <div className="card-section-header">
            <div className="header-title-wrap">
              <Clock size={20} className="header-icon" />
              <h2 id="previous-heading" className="card-section-title">Previous Reports</h2>
            </div>
            <span className="reports-counter-pill">
              {previousReports.length} {previousReports.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>

          {loadingReports ? (
            <div className="reports-loader-wrap">
              <CircularSpinner message="Loading maintenance history..." minHeight="200px" />
            </div>
          ) : previousReports.length === 0 ? (
            <TenantEmptyState 
              icon={FileText}
              title="No Reports Filed Yet"
              description="You haven't submitted any maintenance requests. Any past reports and technician status updates will appear here."
            />
          ) : (
            <div className="reports-scroll-container">
              {previousReports.map((report) => {
                const ownerName = report.ownerId?.name || 
                  (report.ownerId?.firstName ? `${report.ownerId.firstName} ${report.ownerId.lastName || ''}`.trim() : null);

                return (
                  <article key={report._id} className="report-history-item">
                    <div className="report-item-top">
                      <div className="report-title-row">
                        <h3 className="report-item-title">{report.title}</h3>
                        <div className="report-badges-group">
                          <TenantStatusBadge status={report.status || 'submitted'} size="sm" />
                          <TenantStatusBadge status={report.priority || 'medium'} customLabel={`${report.priority} Priority`} size="sm" />
                        </div>
                      </div>
                      <span className="report-timestamp">
                        <Calendar size={13} />
                        <span>{formatDate(report.createdAt)}</span>
                      </span>
                    </div>

                    <p className="report-item-desc">{report.description}</p>

                    <div className="report-item-meta-tags">
                      <span className="meta-tag">
                        <strong>Category:</strong> {report.issueType?.replace('_', ' ')}
                      </span>
                      {report.floor && (
                        <span className="meta-tag">
                          <strong>Floor:</strong> {report.floor}
                        </span>
                      )}
                      {report.room && (
                        <span className="meta-tag">
                          <strong>Area:</strong> {report.room}
                        </span>
                      )}
                    </div>

                    {/* Owner Contact Information */}
                    {report.ownerId && (
                      <div className="report-owner-box">
                        <span className="owner-box-title">Property Management Contact</span>
                        <div className="owner-box-details">
                          {ownerName && (
                            <div className="owner-box-row">
                              <UserRound size={14} className="owner-icon" />
                              <span>{ownerName}</span>
                            </div>
                          )}
                          {report.ownerId.phone && (
                            <div className="owner-box-row">
                              <Phone size={14} className="owner-icon" />
                              <a href={`tel:${report.ownerId.phone}`} className="owner-link">
                                {report.ownerId.phone}
                              </a>
                            </div>
                          )}
                          {report.ownerId.email && (
                            <div className="owner-box-row">
                              <Mail size={14} className="owner-icon" />
                              <a href={`mailto:${report.ownerId.email}`} className="owner-link">
                                {report.ownerId.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Latest Status Update */}
                    {report.updates && report.updates.length > 0 && (
                      <div className="report-latest-update">
                        <span className="update-label">Latest Update:</span>
                        <p className="update-message">
                          {report.updates[report.updates.length - 1].message}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReportProblem;
