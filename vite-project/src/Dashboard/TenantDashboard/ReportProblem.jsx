import React, { useState, useEffect } from 'react';
import './ReportProblem.css';
import { authenticatedFetch, createMaintenanceReport, getTenantReports, getTenantProperties } from '../../config/api';
import { useNavigate } from 'react-router-dom';

const ReportProblem = () => {
  const navigate = useNavigate();
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

  const issueTypes = [
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'heating_cooling', label: 'HVAC' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'structural', label: 'Structural' },
    { value: 'pest_control', label: 'Pest Control' },
    { value: 'security', label: 'Security' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'internet_cable', label: 'Internet/Cable' },
    { value: 'other', label: 'Other' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' }
  ];

  useEffect(() => {
    fetchPreviousReports();
    fetchTenantProperties();
  }, []);

  const fetchPreviousReports = async () => {
    try {
      const response = await getTenantReports();
      console.log('📋 Tenant reports response:', response);
      console.log('📋 Reports data:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('📋 First report structure:', response.data[0]);
        console.log('📋 First report ownerId:', response.data[0].ownerId);
        if (response.data[0].ownerId) {
          console.log('📋 Owner phone:', response.data[0].ownerId.phone);
          console.log('📋 Owner email:', response.data[0].ownerId.email);
          console.log('📋 Owner name:', response.data[0].ownerId.name);
        }
      }
      setPreviousReports(response.data || response.reports || []);
    } catch (error) {
      console.error('Error fetching previous reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchTenantProperties = async () => {
    try {
      console.log('🏠 Fetching tenant properties...');
      const response = await getTenantProperties();
      console.log('🏠 Raw API response:', response);
      console.log('🏠 Response type:', typeof response);
      console.log('🏠 Response.properties:', response.properties);
      console.log('🏠 Response as array:', Array.isArray(response));
      
      // Handle both direct array response and object with properties field
      const properties = Array.isArray(response) ? response : (response.properties || []);
      console.log('🏠 Final properties array:', properties);
      console.log('🏠 Properties count:', properties.length);
      
      // Log property details including owner info
      if (properties.length > 0) {
        console.log('🏠 First property details:', properties[0]);
        if (properties[0].ownerUserId) {
          console.log('🏠 Property owner info:', properties[0].ownerUserId);
        }
      }
      
      setTenantProperties(properties);
    } catch (error) {
      console.error('❌ Error fetching tenant properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Test function to create a sample maintenance report
  const createTestReport = async () => {
    if (tenantProperties.length === 0) {
      alert('No properties available to create a test report');
      return;
    }

    const testData = {
      propertyId: tenantProperties[0]._id,
      title: 'Test Report - Owner Phone Display',
      description: 'This is a test report to verify owner phone numbers are displayed correctly.',
      issueType: 'other',
      priority: 'low'
    };

    try {
      console.log('🧪 Creating test report with data:', testData);
      const response = await createMaintenanceReport(testData);
      console.log('🧪 Test report created:', response);
      alert('Test report created successfully! Check the reports list below.');
      // Refresh the reports list
      fetchPreviousReports();
    } catch (error) {
      console.error('❌ Error creating test report:', error);
      alert('Error creating test report: ' + error.message);
    }
  };



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrorMessage('Some files were rejected. Please ensure all files are images under 10MB.');
      setTimeout(() => setErrorMessage(''), 5000);
    }

    setImages(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 images
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.propertyId.trim()) {
      errors.propertyId = 'Property selection is required';
    }
    
    if (!formData.issueType.trim()) {
      errors.issueType = 'Issue type is required';
    }
    
    if (!formData.title.trim()) {
      errors.title = 'Problem title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side validation
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting form data:', formData);
      const submitFormData = new FormData();
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        submitFormData.append(key, formData[key]);
        console.log(`Appending ${key}:`, formData[key]);
      });

      // Append images
      images.forEach((image, index) => {
        submitFormData.append('images', image);
        console.log(`Appending image ${index}:`, image.name);
      });

      console.log('Making API request...');
      const response = await createMaintenanceReport(submitFormData);
      console.log('API response:', response);

      setSuccessMessage('Problem reported successfully! Your report has been submitted to the owner.');
      
      // Reset form
      setFormData({
        propertyId: '',
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
      
      // Refresh previous reports
      fetchPreviousReports();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setErrorMessage(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'submitted': return 'status-submitted';
      case 'in_progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      default: return 'status-submitted';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="report-problem">
      <h2 className="section-title">Report a Problem</h2>
      
      <div className="report-container">
        {/* Report Form */}
        <div className="report-form-container">
          <h3>Submit New Report</h3>
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-group">
              <label htmlFor="propertyId">Property *</label>
              <select
                 id="propertyId"
                 name="propertyId"
                 value={formData.propertyId}
                 onChange={handleInputChange}
                 required
                 className="form-select"
                 disabled={loadingProperties}
               >
                 <option value="">
                   {loadingProperties ? 'Loading properties...' : 'Select a property'}
                 </option>
                 {tenantProperties.map(property => (
                   <option key={property._id} value={property._id}>
                     {property.address}
                   </option>
                 ))}
               </select>
              {formErrors.propertyId && (
                <span className="error-text">{formErrors.propertyId}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="title">Problem Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Brief description of the problem"
                className="form-input"
              />
              {formErrors.title && (
                <span className="error-text">{formErrors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="issueType">Issue Type *</label>
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                <option value="">Select issue type</option>
                {issueTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {formErrors.issueType && (
                <span className="error-text">{formErrors.issueType}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="floor">Floor</label>
                <input
                  type="text"
                  id="floor"
                  name="floor"
                  value={formData.floor}
                  onChange={handleInputChange}
                  placeholder="e.g., Ground, 1st, 2nd"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="room">Room/Area</label>
                <input
                  type="text"
                  id="room"
                  name="room"
                  value={formData.room}
                  onChange={handleInputChange}
                  placeholder="e.g., Kitchen, Bathroom, Living Room"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Priority Level</label>
              <div className="priority-options">
                {priorityLevels.map(level => (
                  <label key={level.value} className="priority-option">
                    <input
                      type="radio"
                      name="priority"
                      value={level.value}
                      checked={formData.priority === level.value}
                      onChange={handleInputChange}
                    />
                    <span style={{ color: level.color }}>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={formData.isUrgent}
                  onChange={handleInputChange}
                />
                <span>This is an urgent issue requiring immediate attention</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="description">Detailed Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Please provide a detailed description of the problem..."
                className="form-textarea"
              />
              {formErrors.description && (
                <span className="error-text">{formErrors.description}</span>
              )}
            </div>

            <div className="form-group">
              <label>Attach Images (Optional)</label>
              <div className="file-upload">
                <label htmlFor="images" className="file-label">
                  Choose Images
                </label>
                <input
                  type="file"
                  id="images"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
                <span className="file-info">
                  {images.length > 0 ? `${images.length} file(s) selected` : 'Max 5 images, 10MB each'}
                </span>
              </div>
              
              {images.length > 0 && (
                <div className="attachments-list">
                  {images.map((image, index) => (
                    <div key={index} className="attachment-item">
                      <span className="attachment-name">{image.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-attachment"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* Previous Reports */}
        <div className="previous-reports">
          <div className="reports-header">
            <h3>Previous Reports</h3>
            <button 
              onClick={createTestReport} 
              className="test-button"
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Create Test Report
            </button>
          </div>
          

          
          {loadingReports ? (
            <div className="loading-message">Loading reports...</div>
          ) : previousReports.length === 0 ? (
            <div className="no-reports">No previous reports found.</div>
          ) : (
            <div className="reports-list">
              {previousReports.map(report => (
                <div key={report._id} className="report-item">
                  <div className="report-header">
                    <h4>{report.title}</h4>
                    <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                      {report.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="report-description">
                    {report.description}
                  </div>
                  
                  <div className="report-meta">
                    <span>Type: {report.issueType}</span>
                    <span>Priority: {report.priority}</span>
                    {report.floor && <span>Floor: {report.floor}</span>}
                    {report.room && <span>Room: {report.room}</span>}
                    <span>Submitted: {formatDate(report.createdAt)}</span>
                  </div>
                  
                  {/* Debug: Show raw owner data */}
                  {console.log('🔍 Report ownerId data:', report.ownerId)}
                  
                  {report.ownerId && (
                    <div className="owner-contact">
                      <strong>Property Owner Contact:</strong>
                      <div className="contact-details">
                        <span>📞 {report.ownerId.phone || 'Phone not available'}</span>
                        <span>📧 {report.ownerId.email || 'Email not available'}</span>
                        <span>👤 {report.ownerId.name || 'Name not available'}</span>
                      </div>
                    </div>
                  )}
                  
                  {!report.ownerId && (
                    <div className="owner-contact">
                      <strong>Property Owner Contact:</strong>
                      <div className="contact-details">
                        <span style={{color: '#ef4444'}}>⚠️ Owner information not available</span>
                      </div>
                    </div>
                  )}
                  
                  {report.updates && report.updates.length > 0 && (
                    <div className="report-updates">
                      <strong>Latest Update:</strong> {report.updates[report.updates.length - 1].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportProblem;