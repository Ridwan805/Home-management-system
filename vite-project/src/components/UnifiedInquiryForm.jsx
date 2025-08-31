import React, { useState, useEffect } from 'react';
import './UnifiedInquiryForm.css';
import apiConfig from '../config/api';

const UnifiedInquiryForm = ({ property, requestType, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    // Family Members (≥1 required)
    familyMembers: [{ name: '', relation: '', age: '' }],
    
    // Belongings
    belongings: {
      items: [''],
      hasPets: false,
      petDetails: '',
      hasVehicle: false,
      vehicleDetails: ''
    },
    
    // Occupation
    occupation: {
      employmentType: '', // employed, self-employed, unemployed, student, retired
      role: '',
      yearsOfExperience: '',
      companyName: '',
      companyAddress: '',
      supervisorName: '',
      supervisorContact: ''
    },
    
    // Identity & Compliance
    documents: {
      nidFile: null,
      tinFile: null,
      personalPhoto: null
    },
    
    // Financials
    financials: {
      monthlyIncome: '',
      additionalIncome: '',
      bankName: '',
      accountNumber: ''
    },
    
    // Terms & Conditions
    consent: {
      agreed: false,
      version: '1.0',
      timestamp: null
    },
    
    // Letter to Owner
    letterToOwner: ''
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  
  const totalSteps = 8;
  const stepTitles = {
    1: 'Family Members',
    2: 'Belongings',
    3: 'Occupation',
    4: 'Identity & Compliance',
    5: 'Financials',
    6: 'Terms & Conditions',
    7: 'Letter to Owner',
    8: 'Review & Submit'
  };
  
  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      saveDraft();
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => clearTimeout(saveTimer);
  }, [formData]);
  
  // Load draft on component mount
  useEffect(() => {
    loadDraft();
  }, []);
  
  const saveDraft = () => {
    const draftKey = `inquiry_draft_${property._id}_${requestType}`;
    localStorage.setItem(draftKey, JSON.stringify({
      formData,
      currentStep,
      timestamp: new Date().toISOString()
    }));
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };
  
  const loadDraft = () => {
    const draftKey = `inquiry_draft_${property._id}_${requestType}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const { formData: savedFormData, currentStep: savedStep } = JSON.parse(savedDraft);
        setFormData(savedFormData);
        setCurrentStep(savedStep);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  };
  
  const clearDraft = () => {
    const draftKey = `inquiry_draft_${property._id}_${requestType}`;
    localStorage.removeItem(draftKey);
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const handleFileChange = (field, file) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Helper functions for family members
  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', relation: '', age: '' }]
    }));
  };
  
  const removeFamilyMember = (index) => {
    if (formData.familyMembers.length > 1) {
      setFormData(prev => ({
        ...prev,
        familyMembers: prev.familyMembers.filter((_, i) => i !== index)
      }));
    }
  };
  
  const updateFamilyMember = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };
  
  const addBelongingItem = () => {
    setFormData(prev => ({
      ...prev,
      belongings: {
        ...prev.belongings,
        items: [...prev.belongings.items, '']
      }
    }));
  };
  
  const removeBelongingItem = (index) => {
    if (formData.belongings.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        belongings: {
          ...prev.belongings,
          items: prev.belongings.items.filter((_, i) => i !== index)
        }
      }));
    }
  };
  
  const updateBelongingItem = (index, value) => {
    setFormData(prev => ({
      ...prev,
      belongings: {
        ...prev.belongings,
        items: prev.belongings.items.map((item, i) => i === index ? value : item)
      }
    }));
  };
  
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1: // Family Members
        formData.familyMembers.forEach((member, index) => {
          if (!member.name.trim()) {
            newErrors[`familyMember_${index}_name`] = 'Name is required';
          }
          if (!member.relation.trim()) {
            newErrors[`familyMember_${index}_relation`] = 'Relation is required';
          }
          if (!member.age || member.age < 0) {
            newErrors[`familyMember_${index}_age`] = 'Valid age is required';
          }
        });
        break;
        
      case 2: // Belongings
        // No mandatory validation for belongings
        if (formData.belongings.hasPets && !formData.belongings.petDetails.trim()) {
          newErrors.petDetails = 'Pet details are required when you have pets';
        }
        if (formData.belongings.hasVehicle && !formData.belongings.vehicleDetails.trim()) {
          newErrors.vehicleDetails = 'Vehicle details are required when you have a vehicle';
        }
        break;
        
      case 3: // Occupation
        if (!formData.occupation.employmentType) {
          newErrors.employmentType = 'Employment type is required';
        }
        if (!formData.occupation.role.trim()) {
          newErrors.role = 'Role is required';
        }
        if (!formData.occupation.yearsOfExperience || formData.occupation.yearsOfExperience < 0) {
          newErrors.yearsOfExperience = 'Years of experience is required';
        }
        break;
        
      case 4: // Identity & Compliance
        if (!formData.documents.nidFile) {
          newErrors.nidFile = 'NID card is required';
        }
        if (!formData.documents.personalPhoto) {
          newErrors.personalPhoto = 'Personal photo is required';
        }
        break;
        
      case 5: // Financials
        if (!formData.financials.monthlyIncome || formData.financials.monthlyIncome <= 0) {
          newErrors.monthlyIncome = 'Monthly income is required';
        }
        break;
        
      case 6: // Terms & Conditions
        if (!formData.consent.agreed) {
          newErrors.consentAccepted = 'You must accept the terms and conditions';
        }
        break;
        
      case 7: // Letter to Owner
        if (!formData.letterToOwner.trim()) {
          newErrors.letterToOwner = 'Letter to owner is required';
        }
        if (formData.letterToOwner.length < 20) {
          newErrors.letterToOwner = 'Letter must be at least 20 characters';
        }
        if (formData.letterToOwner.length > 1500) {
          newErrors.letterToOwner = 'Letter must not exceed 1500 characters';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };
  
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const validateAllSteps = () => {
    const allErrors = {};
    
    // Validate all steps
    for (let step = 1; step <= 7; step++) {
      const stepErrors = {};
      
      switch (step) {
        case 1: // Family Members
          formData.familyMembers.forEach((member, index) => {
            if (!member.name.trim()) {
              stepErrors[`familyMember_${index}_name`] = 'Name is required';
            }
            if (!member.relation.trim()) {
              stepErrors[`familyMember_${index}_relation`] = 'Relation is required';
            }
            if (!member.age || member.age < 0) {
              stepErrors[`familyMember_${index}_age`] = 'Valid age is required';
            }
          });
          break;
          
        case 2: // Belongings
          if (formData.belongings.hasPets && !formData.belongings.petDetails.trim()) {
            stepErrors.petDetails = 'Pet details are required when you have pets';
          }
          if (formData.belongings.hasVehicle && !formData.belongings.vehicleDetails.trim()) {
            stepErrors.vehicleDetails = 'Vehicle details are required when you have a vehicle';
          }
          break;
          
        case 3: // Occupation
          if (!formData.occupation.employmentType) {
            stepErrors.employmentType = 'Employment type is required';
          }
          if (!formData.occupation.role.trim()) {
            stepErrors.role = 'Role is required';
          }
          if (!formData.occupation.yearsOfExperience || formData.occupation.yearsOfExperience < 0) {
            stepErrors.yearsOfExperience = 'Years of experience is required';
          }
          break;
          
        case 4: // Identity & Compliance
          if (!formData.documents.nidFile) {
            stepErrors.nidFile = 'NID card is required';
          }
          if (!formData.documents.personalPhoto) {
            stepErrors.personalPhoto = 'Personal photo is required';
          }
          break;
          
        case 5: // Financials
          if (!formData.financials.monthlyIncome || formData.financials.monthlyIncome <= 0) {
            stepErrors.monthlyIncome = 'Monthly income is required';
          }
          break;
          
        case 6: // Terms & Conditions
          if (!formData.consent.agreed) {
            stepErrors.consentAccepted = 'You must accept the terms and conditions';
          }
          break;
          
        case 7: // Letter to Owner
          if (!formData.letterToOwner.trim()) {
            stepErrors.letterToOwner = 'Letter to owner is required';
          }
          if (formData.letterToOwner.length < 20) {
            stepErrors.letterToOwner = 'Letter must be at least 20 characters';
          }
          if (formData.letterToOwner.length > 1500) {
            stepErrors.letterToOwner = 'Letter must not exceed 1500 characters';
          }
          break;
      }
      
      Object.assign(allErrors, stepErrors);
    }
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const handleSubmit = async () => {

    
    // Validate all steps before submission
    if (!validateAllSteps()) {

      alert('Please complete all required fields before submitting. Check the Identity & Compliance section for required documents.');
      return;
    }
    

    
    // Check if user has already applied to this property
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (userData) {
        const user = JSON.parse(userData);
        const token = user.token;
        if (token) {
          const response = await fetch(apiConfig.getUrl('/api/requests'), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const hasExistingApplication = data.requests.some(request => 
              request.propertyId._id === property._id
            );
            
            if (hasExistingApplication) {
              alert('You have already applied to this property. Multiple applications are not allowed.');
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing applications:', error);
      // Continue with submission if check fails
    }
    
    setLoading(true);
    try {
      // Prepare form data for submission
      const submissionData = {
        propertyId: property._id,
        requestType: requestType,
        payload: {
          familyMembers: formData.familyMembers.map(member => ({
            name: member.name.trim(),
            relation: member.relation,
            age: parseInt(member.age) || 0
          })),
          belongings: formData.belongings,
          occupation: {
            ...formData.occupation,
            yearsOfExperience: parseInt(formData.occupation.yearsOfExperience) || 0
          },
          identity: {
            // File URLs will be populated by backend after upload
          },
          financials: {
            ...formData.financials,
            monthlyIncome: parseFloat(formData.financials.monthlyIncome) || 0,
            additionalIncome: parseFloat(formData.financials.additionalIncome) || 0
          },
          letterToOwner: formData.letterToOwner.trim()
        },
        consent: {
          ...formData.consent,
          timestamp: new Date().toISOString(),
          ipAddress: 'client-ip', // Will be populated by backend
          userAgent: navigator.userAgent
        }
      };
      
      // Create FormData for file uploads
      const formDataToSend = new FormData();
      
      // Add the main payload
      formDataToSend.append('payload', JSON.stringify(submissionData.payload));
      formDataToSend.append('propertyId', submissionData.propertyId);
      formDataToSend.append('requestType', submissionData.requestType);
      formDataToSend.append('consent', JSON.stringify(submissionData.consent));
      
      // Add files with specific field names expected by backend
      if (formData.documents.nidFile) {
        formDataToSend.append('nidFile', formData.documents.nidFile);
      }
      if (formData.documents.tinFile) {
        formDataToSend.append('tinFile', formData.documents.tinFile);
      }
      if (formData.documents.personalPhoto) {
        formDataToSend.append('personalPhoto', formData.documents.personalPhoto);
      }
      
      // Get the authentication token
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('Please log in to submit a request');
      }
      
      let token;
      try {
        const user = JSON.parse(userData);
        token = user.token;
        if (!token) {
          throw new Error('Please log in to submit a request');
        }
      } catch (e) {
        throw new Error('Please log in to submit a request');
      }
      

      
      const response = await fetch(apiConfig.getUrl('/api/requests'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      

      
      if (response.ok) {
        const result = await response.json();

        
        // Clear the draft
        clearDraft();
        
        // Call the onSubmit callback
        onSubmit(result);
        return true; // Indicate success
      } else {
        let errorMessage = 'Failed to submit request';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Server error response:', errorData);
          // Log the full error data to help with debugging
          console.error('Full error data:', JSON.stringify(errorData));
        } catch (jsonError) {
          // If JSON parsing fails, use the response status text or a generic message
          console.error('Failed to parse error response as JSON:', jsonError);
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
        // Instead of throwing an error, display it to the user
        alert(`Error: ${errorMessage}`);
        return false; // Indicate failure
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      // Show a more detailed error message
      const errorMessage = error.message || 'An unknown error occurred';
      alert(`Failed to submit request data. Please try again.\n\nDetails: ${errorMessage}`);
      
      // Log additional debugging information
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      return false; // Indicate failure
    } finally {
      setLoading(false);
    }
    return true; // Indicate success if we reach here
  };
  
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? This will discard your draft.')) {
      clearDraft();
      onClose();
    }
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h3>Family Members</h3>
            <p className="step-description">Please provide information about all family members who will be living in the property.</p>
            
            {formData.familyMembers.map((member, index) => (
              <div key={index} className="family-member-item">
                <div className="item-header">
                  <h4>Family Member {index + 1}</h4>
                  {formData.familyMembers.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeFamilyMember(index)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="search"
                      value={member.name}
                      onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                      className={`name-input ${errors[`familyMember_${index}_name`] ? 'error' : ''}`}
                      style={{background: '#ffffff !important', color: '#1f2937 !important', border: '1px solid #e5e7eb !important', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03) !important', padding: '14px 18px !important', borderRadius: '10px !important'}}
                    />
                    {errors[`familyMember_${index}_name`] && (
                      <span className="error-message">{errors[`familyMember_${index}_name`]}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Relation *</label>
                    <select
                      value={member.relation}
                      onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                      className={errors[`familyMember_${index}_relation`] ? 'error' : ''}
                      style={{background: '#ffffff', color: '#1f2937'}}
                    >
                      <option value="">Select relation</option>
                      <option value="spouse">Spouse</option>
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="other">Other</option>
                    </select>
                    {errors[`familyMember_${index}_relation`] && (
                      <span className="error-message">{errors[`familyMember_${index}_relation`]}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={member.age}
                      onChange={(e) => updateFamilyMember(index, 'age', e.target.value)}
                      className={errors[`familyMember_${index}_age`] ? 'error' : ''}
                      style={{background: '#ffffff', color: '#1f2937'}}
                    />
                    {errors[`familyMember_${index}_age`] && (
                      <span className="error-message">{errors[`familyMember_${index}_age`]}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button type="button" onClick={addFamilyMember} className="add-btn">
              + Add Family Member
            </button>
          </div>
        );
        
      case 2:
        return (
          <div className="form-step">
            <h3>Belongings</h3>
            <p className="step-description">Please list your belongings and indicate if you have pets or vehicles.</p>
            
            <div className="belongings-section">
              <h4>Personal Belongings</h4>
              {formData.belongings.items.map((item, index) => (
                <div key={index} className="belonging-item">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateBelongingItem(index, e.target.value)}
                    placeholder="Describe your belonging"
                  />
                  {formData.belongings.items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeBelongingItem(index)}
                      className="remove-btn-small"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addBelongingItem} className="add-btn">
                + Add Belonging
              </button>
            </div>
            
            <div className="toggles-section">
              <div className="toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.belongings.hasPets}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      belongings: {
                        ...prev.belongings,
                        hasPets: e.target.checked,
                        petDetails: e.target.checked ? prev.belongings.petDetails : ''
                      }
                    }))}
                  />
                  <span className="toggle-text">I have pets</span>
                </label>
                
                {formData.belongings.hasPets && (
                  <div className="conditional-field">
                    <label>Pet Details</label>
                    <textarea
                      value={formData.belongings.petDetails}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        belongings: {
                          ...prev.belongings,
                          petDetails: e.target.value
                        }
                      }))}
                      placeholder="Please describe your pets (type, breed, size, etc.)"
                      rows="3"
                      className={errors.petDetails ? 'error' : ''}
                    />
                    {errors.petDetails && (
                      <span className="error-message">{errors.petDetails}</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.belongings.hasVehicle}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      belongings: {
                        ...prev.belongings,
                        hasVehicle: e.target.checked,
                        vehicleDetails: e.target.checked ? prev.belongings.vehicleDetails : ''
                      }
                    }))}
                  />
                  <span className="toggle-text">I have a vehicle</span>
                </label>
                
                {formData.belongings.hasVehicle && (
                  <div className="conditional-field">
                    <label>Vehicle Details</label>
                    <textarea
                      value={formData.belongings.vehicleDetails}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        belongings: {
                          ...prev.belongings,
                          vehicleDetails: e.target.value
                        }
                      }))}
                      placeholder="Please describe your vehicle (type, model, license plate, etc.)"
                      rows="3"
                      className={errors.vehicleDetails ? 'error' : ''}
                    />
                    {errors.vehicleDetails && (
                      <span className="error-message">{errors.vehicleDetails}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="form-step">
            <h3>Occupation</h3>
            <p className="step-description">Please provide your employment information.</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Employment Type *</label>
                <select
                  value={formData.occupation.employmentType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    occupation: {
                      ...prev.occupation,
                      employmentType: e.target.value
                    }
                  }))}
                  className={errors.employmentType ? 'error' : ''}
                >
                  <option value="">Select employment type</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
                {errors.employmentType && <span className="error-message">{errors.employmentType}</span>}
              </div>
              
              <div className="form-group">
                <label>Role/Position *</label>
                <input
                  type="search"
                  value={formData.occupation.role}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    occupation: {
                      ...prev.occupation,
                      role: e.target.value
                    }
                  }))}
                  className={`name-input ${errors.role ? 'error' : ''}`}
                  style={{background: '#ffffff !important', color: '#1f2937 !important', border: '1px solid #e5e7eb !important', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03) !important', padding: '14px 18px !important', borderRadius: '10px !important'}}
                  placeholder="Your job title or role"
                />
                {errors.role && <span className="error-message">{errors.role}</span>}
              </div>
              
              <div className="form-group">
                <label>Years of Experience *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.occupation.yearsOfExperience}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    occupation: {
                      ...prev.occupation,
                      yearsOfExperience: e.target.value
                    }
                  }))}
                  className={errors.yearsOfExperience ? 'error' : ''}
                  placeholder="Years of experience"
                />
                {errors.yearsOfExperience && <span className="error-message">{errors.yearsOfExperience}</span>}
              </div>
            </div>
            
            {(formData.occupation.employmentType === 'employed' || formData.occupation.employmentType === 'self-employed') && (
              <div className="employer-section">
                <h4>Company Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      value={formData.occupation.companyName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        occupation: {
                          ...prev.occupation,
                          companyName: e.target.value
                        }
                      }))}
                      placeholder="Company/Organization name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Company Address</label>
                    <input
                      type="text"
                      value={formData.occupation.companyAddress}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        occupation: {
                          ...prev.occupation,
                          companyAddress: e.target.value
                        }
                      }))}
                      placeholder="Company address"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Supervisor Name</label>
                    <input
                      type="text"
                      value={formData.occupation.supervisorName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        occupation: {
                          ...prev.occupation,
                          supervisorName: e.target.value
                        }
                      }))}
                      placeholder="Supervisor's name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Supervisor Contact</label>
                    <input
                      type="tel"
                      value={formData.occupation.supervisorContact}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        occupation: {
                          ...prev.occupation,
                          supervisorContact: e.target.value
                        }
                      }))}
                      placeholder="Supervisor's contact number"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="form-step">
            <h3>Identity & Compliance</h3>
            <p className="step-description">Please upload the required documents for verification.</p>
            
            <div className="documents-section">
              <div className="form-group">
                <label>NID Card * <span className="file-info">(PDF or Image)</span></label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    documents: {
                      ...prev.documents,
                      nidFile: e.target.files[0]
                    }
                  }))}
                  className={errors.nidFile ? 'error' : ''}
                />
                {errors.nidFile && <span className="error-message">{errors.nidFile}</span>}
                {formData.documents.nidFile && (
                  <div className="file-preview">
                    ✓ {formData.documents.nidFile.name}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>TIN Certificate <span className="file-info">(Optional - PDF or Image)</span></label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    documents: {
                      ...prev.documents,
                      tinFile: e.target.files[0]
                    }
                  }))}
                />
                {formData.documents.tinFile && (
                  <div className="file-preview">
                    ✓ {formData.documents.tinFile.name}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Personal Photo * <span className="file-info">(Image only)</span></label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    documents: {
                      ...prev.documents,
                      personalPhoto: e.target.files[0]
                    }
                  }))}
                  className={errors.personalPhoto ? 'error' : ''}
                />
                {errors.personalPhoto && <span className="error-message">{errors.personalPhoto}</span>}
                {formData.documents.personalPhoto && (
                  <div className="file-preview">
                    ✓ {formData.documents.personalPhoto.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="form-step">
            <h3>Financials</h3>
            <p className="step-description">Please provide your financial information.</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Monthly Income * <span className="currency">(BDT)</span></label>
                <input
                  type="number"
                  min="0"
                  value={formData.financials.monthlyIncome}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    financials: {
                      ...prev.financials,
                      monthlyIncome: e.target.value
                    }
                  }))}
                  className={errors.monthlyIncome ? 'error' : ''}
                  placeholder="Your monthly income"
                />
                {errors.monthlyIncome && <span className="error-message">{errors.monthlyIncome}</span>}
              </div>
              
              <div className="form-group">
                <label>Additional Income <span className="currency">(BDT - Optional)</span></label>
                <input
                  type="number"
                  min="0"
                  value={formData.financials.additionalIncome}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    financials: {
                      ...prev.financials,
                      additionalIncome: e.target.value
                    }
                  }))}
                  placeholder="Any additional income"
                />
              </div>
              
              <div className="form-group">
                <label>Bank Name <span className="optional">(Optional)</span></label>
                <input
                  type="search"
                  value={formData.financials.bankName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    financials: {
                      ...prev.financials,
                      bankName: e.target.value
                    }
                  }))}
                  className="name-input"
                  style={{background: '#ffffff !important', color: '#1f2937 !important', border: '1px solid #e5e7eb !important', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03) !important', padding: '14px 18px !important', borderRadius: '10px !important'}}
                  placeholder="Your primary bank"
                />
              </div>
              
              <div className="form-group">
                <label>Account Number <span className="optional">(Optional)</span></label>
                <input
                  type="search"
                  value={formData.financials.accountNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    financials: {
                      ...prev.financials,
                      accountNumber: e.target.value
                    }
                  }))}
                  className="name-input"
                  style={{background: '#ffffff !important', color: '#1f2937 !important', border: '1px solid #e5e7eb !important', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03) !important', padding: '14px 18px !important', borderRadius: '10px !important'}}
                  placeholder="Your account number"
                />
              </div>
            </div>
            
            <div className="financial-tips">
              <h4>Financial Information Tips:</h4>
              <ul>
                <li>Provide accurate monthly income information</li>
                <li>Include all sources of regular income</li>
                <li>Bank details help with verification (optional)</li>
                <li>Your financial information is kept confidential</li>
              </ul>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="form-step">
            <h3>Terms & Conditions</h3>
            <p className="step-description">Please review and accept the terms and conditions.</p>
            
            <div className="terms-content">
              <div className="terms-text">
                <h4>Data Processing and Privacy</h4>
                <p>By submitting this application, you consent to:</p>
                <ul>
                  <li>Processing of your personal data for rental/purchase evaluation</li>
                  <li>Verification of provided information with relevant authorities</li>
                  <li>Storage of your data for the duration of the application process</li>
                  <li>Sharing of necessary information with the property owner</li>
                </ul>
                
                <h4>Application Terms</h4>
                <ul>
                  <li>All information provided is accurate and complete</li>
                  <li>You understand that false information may result in application rejection</li>
                  <li>The property owner has the right to accept or reject this application</li>
                  <li>This application does not guarantee property allocation</li>
                </ul>
              </div>
              
              <div className="consent-section">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.consent.agreed}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      consent: {
                        ...prev.consent,
                        agreed: e.target.checked
                      }
                    }))}
                    className={errors.consentAccepted ? 'error' : ''}
                  />
                  <span>I have read and accept the terms and conditions *</span>
                </label>
                {errors.consentAccepted && (
                  <span className="error-message">{errors.consentAccepted}</span>
                )}
                
                <div className="consent-info">
                  <small>Consent Version: {formData.consent.version}</small>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 7:
        return (
          <div className="form-step">
            <h3>Letter to Owner</h3>
            <p className="step-description">Write a personal message to the property owner (20-1500 characters).</p>
            
            <div className="letter-section">
              <div className="form-group">
                <label>Your Message *</label>
                <textarea
                  value={formData.letterToOwner}
                  onChange={(e) => handleInputChange('letterToOwner', e.target.value)}
                  className={errors.letterToOwner ? 'error' : ''}
                  placeholder="Dear Property Owner,\n\nI am interested in your property because..."
                  rows="8"
                  maxLength="1500"
                />
                <div className="character-count">
                  {formData.letterToOwner.length}/1500 characters
                  {formData.letterToOwner.length < 20 && (
                    <span className="min-warning"> (minimum 20 characters)</span>
                  )}
                </div>
                {errors.letterToOwner && (
                  <span className="error-message">{errors.letterToOwner}</span>
                )}
              </div>
            </div>
          </div>
        );
        
      case 8:
        return (
          <div className="form-step">
            <h3>Review & Submit</h3>
            <p className="step-description">
              Please review all your information before submitting your application.
            </p>
            
            <div className="review-section">
              <div className="review-group">
                <h4>Property Information</h4>
                <div className="review-detail">
                  <strong>Property:</strong> {property?.title || property?.address || 'Property'}
                </div>
                <div className="review-detail">
                  <strong>Application Type:</strong> {requestType === 'rent' ? 'Rent' : 'Buy'}
                </div>
                <div className="review-detail">
                  <strong>Location:</strong> {property?.city}, {property?.state}
                </div>
              </div>
              
              <div className="review-group">
                <h4>Family Members ({formData.familyMembers.length})</h4>
                {formData.familyMembers.map((member, index) => (
                  <div key={index} className="review-detail">
                    <strong>{member.name}</strong> - {member.relation}, {member.age} years old
                  </div>
                ))}
              </div>
              
              <div className="review-group">
                <h4>Belongings & Inventory</h4>
                {formData.belongings.items.length > 0 && formData.belongings.items[0] && (
                  <div className="review-detail">
                    <strong>Items:</strong> {formData.belongings.items.filter(item => item.trim()).join(', ')}
                  </div>
                )}
                <div className="review-detail">
                  <strong>Pets:</strong> {formData.belongings.hasPets ? 'Yes' : 'No'}
                  {formData.belongings.hasPets && formData.belongings.petDetails && (
                    <span> - {formData.belongings.petDetails}</span>
                  )}
                </div>
                <div className="review-detail">
                  <strong>Vehicle:</strong> {formData.belongings.hasVehicle ? 'Yes' : 'No'}
                  {formData.belongings.hasVehicle && formData.belongings.vehicleDetails && (
                    <span> - {formData.belongings.vehicleDetails}</span>
                  )}
                </div>
              </div>
              
              <div className="review-group">
                <h4>Occupation & Employment</h4>
                <div className="review-detail">
                  <strong>Role:</strong> {formData.occupation.role}
                </div>
                <div className="review-detail">
                  <strong>Employment Type:</strong> {formData.occupation.employmentType}
                </div>
                <div className="review-detail">
                  <strong>Experience:</strong> {formData.occupation.yearsOfExperience} years
                </div>
                {formData.occupation.companyName && (
                  <div className="review-detail">
                    <strong>Company:</strong> {formData.occupation.companyName}
                  </div>
                )}
                {formData.occupation.supervisorName && (
                  <div className="review-detail">
                    <strong>Supervisor:</strong> {formData.occupation.supervisorName}
                  </div>
                )}
              </div>
              
              <div className="review-group">
                <h4>Identity & Compliance Documents</h4>
                <div className="review-detail">
                  <strong>NID Card:</strong> {formData.documents.nidFile ? `✓ ${formData.documents.nidFile.name}` : '✗ Missing'}
                </div>
                <div className="review-detail">
                  <strong>TIN Certificate:</strong> {formData.documents.tinFile ? `✓ ${formData.documents.tinFile.name}` : 'Not provided'}
                </div>
                <div className="review-detail">
                  <strong>Personal Photo:</strong> {formData.documents.personalPhoto ? `✓ ${formData.documents.personalPhoto.name}` : '✗ Missing'}
                </div>
              </div>
              
              <div className="review-group">
                <h4>Financial Information</h4>
                <div className="review-detail">
                  <strong>Monthly Income:</strong> ৳{formData.financials.monthlyIncome ? Number(formData.financials.monthlyIncome).toLocaleString() : 'Not provided'}
                </div>
                {formData.financials.additionalIncome && (
                  <div className="review-detail">
                    <strong>Additional Income:</strong> ৳{Number(formData.financials.additionalIncome).toLocaleString()}
                  </div>
                )}
                {formData.financials.bankName && (
                  <div className="review-detail">
                    <strong>Primary Bank:</strong> {formData.financials.bankName}
                  </div>
                )}
              </div>
              
              <div className="review-group">
                <h4>Letter to Property Owner</h4>
                <div className="review-detail letter-preview">
                  {formData.letterToOwner || 'No letter provided'}
                </div>
                <div className="character-info">
                  Length: {formData.letterToOwner.length} characters
                </div>
              </div>
              
              <div className="review-group">
                <h4>Terms & Conditions</h4>
                <div className="review-detail">
                  <strong>Consent Status:</strong> {formData.consent.agreed ? '✓ Accepted' : '✗ Not Accepted'}
                </div>
                <div className="review-detail">
                  <strong>Consent Version:</strong> {formData.consent.version}
                </div>
                {formData.consent.timestamp && (
                  <div className="review-detail">
                    <strong>Accepted on:</strong> {new Date(formData.consent.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="submission-notice">
              <div className="notice-box">
                <h4>⚠️ Important Notice</h4>
                <p>By submitting this application, you confirm that:</p>
                <ul>
                  <li>All information provided is accurate and truthful</li>
                  <li>You understand this application will be reviewed by the property owner</li>
                  <li>You consent to background verification if required</li>
                  <li>You agree to the terms and conditions outlined above</li>
                </ul>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="unified-inquiry-overlay">
      <div className="unified-inquiry-modal">
        <div className="form-header">
          <div className="form-title">
            <h2>Applying to {requestType}: {property.address}</h2>
            <p>{property.city}, {property.state}</p>
          </div>
          <div className="header-actions">
            {isDraftSaved && <span className="draft-saved">✓ Draft saved</span>}
            <button className="close-btn" onClick={handleCancel}>×</button>
          </div>
        </div>
        
        <div className="form-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className="step-info">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{stepTitles[currentStep]}</span>
          </div>
        </div>
        
        <div className="form-content">
          {renderStep()}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={handlePrevious} 
            disabled={currentStep === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          
          <div className="action-buttons">
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn-cancel"
            >
              Cancel
            </button>
            
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="btn-primary"
              >
                Next
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedInquiryForm;