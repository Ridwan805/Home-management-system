import React, { useState } from 'react';
import './ReportProblem.css';

const ReportProblem = () => {
  const [reportType, setReportType] = useState('owner');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousReports, setPreviousReports] = useState([
    {
      id: 1,
      type: 'owner',
      category: 'Plumbing',
      description: 'Leaking faucet in the kitchen',
      urgency: 'medium',
      status: 'In Progress',
      dateSubmitted: '2023-06-15',
      lastUpdated: '2023-06-16'
    },
    {
      id: 2,
      type: 'admin',
      category: 'Security',
      description: 'Main entrance door not locking properly',
      urgency: 'high',
      status: 'Resolved',
      dateSubmitted: '2023-05-20',
      lastUpdated: '2023-05-22'
    }
  ]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      // Add new report to the list
      const newReport = {
        id: previousReports.length + 1,
        type: reportType,
        category,
        description,
        urgency,
        status: 'Submitted',
        dateSubmitted: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      setPreviousReports([newReport, ...previousReports]);
      
      // Reset form
      setCategory('');
      setDescription('');
      setUrgency('medium');
      setAttachments([]);
      setSubmitting(false);
      setSubmitted(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    }, 1500);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Submitted':
        return 'status-submitted';
      case 'In Progress':
        return 'status-in-progress';
      case 'Resolved':
        return 'status-resolved';
      default:
        return '';
    }
  };

  return (
    <div className="report-problem">
      <h2 className="section-title">Report a Problem</h2>
      
      <div className="report-container">
        <div className="report-form-container">
          <h3>Submit New Report</h3>
          
          {submitted && (
            <div className="success-message">
              Your report has been submitted successfully!
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-group">
              <label>Report To</label>
              <div className="report-type-options">
                <label className="report-type-option">
                  <input 
                    type="radio" 
                    name="reportType" 
                    value="owner" 
                    checked={reportType === 'owner'}
                    onChange={() => setReportType('owner')}
                  />
                  <span>Property Owner</span>
                </label>
                <label className="report-type-option">
                  <input 
                    type="radio" 
                    name="reportType" 
                    value="admin" 
                    checked={reportType === 'admin'}
                    onChange={() => setReportType('admin')}
                  />
                  <span>Admin</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC (Heating/Cooling)</option>
                <option value="Appliance">Appliance</option>
                <option value="Structural">Structural</option>
                <option value="Pest Control">Pest Control</option>
                <option value="Security">Security</option>
                <option value="Noise">Noise Complaint</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows="5"
                placeholder="Please describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Urgency Level</label>
              <div className="urgency-options">
                <label className="urgency-option">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="low" 
                    checked={urgency === 'low'}
                    onChange={() => setUrgency('low')}
                  />
                  <span>Low</span>
                </label>
                <label className="urgency-option">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="medium" 
                    checked={urgency === 'medium'}
                    onChange={() => setUrgency('medium')}
                  />
                  <span>Medium</span>
                </label>
                <label className="urgency-option">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value="high" 
                    checked={urgency === 'high'}
                    onChange={() => setUrgency('high')}
                  />
                  <span>High</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label>Attachments (Optional)</label>
              <div className="file-upload">
                <input 
                  type="file" 
                  id="file-upload" 
                  multiple 
                  onChange={handleFileChange} 
                  className="file-input"
                />
                <label htmlFor="file-upload" className="file-label">
                  Choose Files
                </label>
                <span className="file-info">
                  {attachments.length > 0 
                    ? `${attachments.length} file(s) selected` 
                    : 'No files selected'}
                </span>
              </div>
              
              {attachments.length > 0 && (
                <div className="attachments-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="attachment-item">
                      <span className="attachment-name">{file.name}</span>
                      <button 
                        type="button" 
                        className="remove-attachment" 
                        onClick={() => removeAttachment(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="previous-reports">
          <h3>Previous Reports</h3>
          
          {previousReports.length === 0 ? (
            <p className="no-reports">You haven't submitted any reports yet.</p>
          ) : (
            <div className="reports-list">
              {previousReports.map(report => (
                <div key={report.id} className="report-item">
                  <div className="report-header">
                    <h4>{report.category}</h4>
                    <span className={`status-badge ${getStatusClass(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="report-description">{report.description}</p>
                  <div className="report-meta">
                    <span>Reported to: {report.type === 'owner' ? 'Property Owner' : 'Admin'}</span>
                    <span>Urgency: {report.urgency.charAt(0).toUpperCase() + report.urgency.slice(1)}</span>
                    <span>Submitted: {report.dateSubmitted}</span>
                    <span>Last Updated: {report.lastUpdated}</span>
                  </div>
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