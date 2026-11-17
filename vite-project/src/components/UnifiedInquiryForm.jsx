import React, { useState, useEffect, useMemo, useRef } from 'react';
import './UnifiedInquiryForm.css';
import apiConfig from '../config/api';
import {
  Building2,
  Home,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  RotateCw,
  DollarSign,
  Calendar,
  Users,
  Briefcase,
  ShieldCheck,
  FileCheck,
  CreditCard,
  Clock,
  Landmark,
  MapPin,
  Info,
  Lock,
  ArrowRight,
  Plus
} from 'lucide-react';

const DRAFT_PREFIX = 'dwellsync_draft';

// Format BDT Currency cleanly
const formatBDT = (amount) => {
  if (amount === undefined || amount === null || amount === '' || isNaN(amount)) return '৳0';
  return `৳${Number(amount).toLocaleString('en-US')}`;
};

// Format address cleanly without extraneous commas
const formatPropertyAddress = (property) => {
  if (!property) return '';
  const parts = [
    property.address,
    property.city,
    property.locationState !== property.city ? property.locationState : null
  ].filter(part => Boolean(part) && typeof part === 'string' && part.trim() !== '' && part.toLowerCase() !== 'undefined');
  return parts.join(', ') || property.title || 'Property Address';
};

// Helper to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const UnifiedInquiryForm = ({ property, requestType: initialRequestType, onClose, onSubmit }) => {
  // Normalize request type: 'Rent' or 'Buy'
  const isRentWorkflow = initialRequestType === 'Rent';
  const isLandProperty = property?.propertyType?.toLowerCase() === 'land';

  // Total steps based on workflow
  const totalSteps = isRentWorkflow ? 5 : 4;
  const stepTitles = useMemo(() => {
    if (isRentWorkflow) {
      return {
        1: 'Applicant & Occupants',
        2: 'Living Requirements',
        3: 'Employment & Affordability',
        4: 'Documents & Terms',
        5: 'Review & Submit'
      };
    }
    return {
      1: 'Buyer Information',
      2: isLandProperty ? 'Land Purchase Proposal' : 'Purchase Proposal',
      3: 'Documents & Conditions',
      4: 'Review & Submit'
    };
  }, [isRentWorkflow, isLandProperty]);

  // Read authenticated user info
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('dwellSyncUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.name || [parsed.firstName, parsed.lastName].filter(Boolean).join(' ') || '';
        return {
          name,
          email: parsed.email || '',
          phone: parsed.phoneNumber || parsed.phone || '',
          token: parsed.token || ''
        };
      }
    } catch {
      // silent fallback
    }
    return { name: '', email: '', phone: '', token: '' };
  }, []);

  // Form State for Rent
  const [rentData, setRentData] = useState({
    // Step 1: Applicant & Occupants
    applicant: {
      fullName: currentUser.name || '',
      email: currentUser.email || '',
      phoneNumber: currentUser.phone || '',
      currentAddress: ''
    },
    preferredMoveInDate: '',
    leaseDuration: '12 Months (Standard)',
    occupantsCount: 1,
    coOccupants: [], // [{ name: '', relation: '', age: '' }]

    // Step 2: Living Requirements
    hasPets: false,
    petDetails: '',
    hasVehicle: false,
    vehicleType: 'Car',
    requiresParking: false,
    specialAccommodations: '',
    livingNotes: '',

    // Step 3: Employment & Affordability
    employmentStatus: 'Employed (Full-time)',
    jobRole: '',
    employerName: '',
    supervisorName: '',
    supervisorContact: '',
    monthlyIncome: '',
    additionalIncome: '',

    // Step 4: Documents & Terms
    documents: {
      nidFile: null,
      personalPhoto: null,
      tinFile: null
    },
    consentAccepted: false,

    // Step 5: Review & Submit
    messageToOwner: ''
  });

  // Form State for Buy
  const [buyData, setBuyData] = useState({
    // Step 1: Buyer Information
    buyerType: 'individual', // 'individual' | 'organizational'
    buyerInfo: {
      fullName: currentUser.name || '',
      email: currentUser.email || '',
      phoneNumber: currentUser.phone || '',
      residentialAddress: '',
      organizationName: '',
      registrationNumber: '',
      authorizedSignatory: currentUser.name || '',
      signatoryDesignation: 'Director / Executive',
      officialEmail: currentUser.email || '',
      officialPhone: currentUser.phone || '',
      registeredOfficeAddress: ''
    },

    // Step 2: Purchase Proposal
    askingPrice: property?.price || property?.pricing?.sale || 0,
    offeredPrice: property?.price || property?.pricing?.sale || '',
    financingMethod: 'Cash / Self-Financed',
    purchaseTimeline: '30 – 60 Days',
    intendedLandUse: isLandProperty ? 'Residential Development' : '',
    proposalNotes: '',

    // Step 3: Documents & Conditions
    documents: {
      nidFile: null,
      personalPhoto: null,
      tinFile: null
    },
    consentAccepted: false,

    // Step 4: Review & Submit
    messageToSeller: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [autosaveState, setAutosaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [collapsedSections, setCollapsedSections] = useState({
    sec1: false,
    sec2: false,
    sec3: false,
    sec4: false
  });

  const draftKey = useMemo(() => {
    return `${DRAFT_PREFIX}_${property?._id}_${initialRequestType}`;
  }, [property?._id, initialRequestType]);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const { rentData: savedRent, buyData: savedBuy, currentStep: savedStep } = JSON.parse(saved);
        if (isRentWorkflow && savedRent) {
          // Restore documents placeholders without losing file objects
          setRentData(prev => ({
            ...prev,
            ...savedRent,
            documents: prev.documents
          }));
        } else if (!isRentWorkflow && savedBuy) {
          setBuyData(prev => ({
            ...prev,
            ...savedBuy,
            documents: prev.documents
          }));
        }
        if (savedStep && savedStep >= 1 && savedStep <= totalSteps) {
          setCurrentStep(savedStep);
        }
      }
    } catch (err) {
      console.warn('Failed to restore draft:', err);
    }
  }, [draftKey, isRentWorkflow, totalSteps]);

  // Debounced Autosave (1000ms)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAutosaveState('saving');
    const timer = setTimeout(() => {
      try {
        const payloadToSave = {
          currentStep,
          timestamp: new Date().toISOString(),
          rentData: isRentWorkflow ? {
            ...rentData,
            documents: {} // do not serialize File objects to localStorage
          } : null,
          buyData: !isRentWorkflow ? {
            ...buyData,
            documents: {}
          } : null
        };
        localStorage.setItem(draftKey, JSON.stringify(payloadToSave));
        setAutosaveState('saved');
        const hideSaved = setTimeout(() => setAutosaveState('idle'), 2500);
        return () => clearTimeout(hideSaved);
      } catch (err) {
        console.error('Autosave error:', err);
        setAutosaveState('error');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [rentData, buyData, currentStep, draftKey, isRentWorkflow]);

  // Discard draft handler
  const handleDiscardDraft = () => {
    if (window.confirm('Are you sure you want to discard your saved draft and reset the form?')) {
      localStorage.removeItem(draftKey);
      onClose();
    }
  };

  // Generic Field Updaters
  const handleRentChange = (field, value) => {
    setRentData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleRentApplicantChange = (subField, value) => {
    setRentData(prev => ({
      ...prev,
      applicant: { ...prev.applicant, [subField]: value }
    }));
    const key = `applicant_${subField}`;
    if (fieldErrors[key]) {
      setFieldErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleBuyChange = (field, value) => {
    setBuyData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleBuyerInfoChange = (subField, value) => {
    setBuyData(prev => ({
      ...prev,
      buyerInfo: { ...prev.buyerInfo, [subField]: value }
    }));
    const key = `buyerInfo_${subField}`;
    if (fieldErrors[key]) {
      setFieldErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  // Co-occupants for Rent
  const handleAddCoOccupant = () => {
    setRentData(prev => ({
      ...prev,
      coOccupants: [...prev.coOccupants, { name: '', relation: 'Family Member', age: '' }]
    }));
  };

  const handleUpdateCoOccupant = (index, field, value) => {
    setRentData(prev => ({
      ...prev,
      coOccupants: prev.coOccupants.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const handleRemoveCoOccupant = (index) => {
    setRentData(prev => ({
      ...prev,
      coOccupants: prev.coOccupants.filter((_, i) => i !== index)
    }));
  };

  // File Upload Handlers
  const handleDocumentChange = (docType, file) => {
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({
        ...prev,
        [docType]: 'File size exceeds 10MB limit. Please choose a smaller file.'
      }));
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFieldErrors(prev => ({
        ...prev,
        [docType]: 'Unsupported file type. Please upload a JPEG, PNG, or PDF file.'
      }));
      return;
    }

    if (isRentWorkflow) {
      setRentData(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: file }
      }));
    } else {
      setBuyData(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: file }
      }));
    }

    setFieldErrors(prev => ({ ...prev, [docType]: null }));
  };

  const handleRemoveDocument = (docType) => {
    if (isRentWorkflow) {
      setRentData(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: null }
      }));
    } else {
      setBuyData(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: null }
      }));
    }
  };

  // Step Validation
  const validateStep = (step) => {
    const errors = {};

    if (isRentWorkflow) {
      switch (step) {
        case 1:
          if (!rentData.applicant.fullName?.trim()) {
            errors.applicant_fullName = 'Applicant full name is required';
          }
          if (!rentData.applicant.email?.trim()) {
            errors.applicant_email = 'Valid email address is required';
          }
          if (!rentData.applicant.phoneNumber?.trim()) {
            errors.applicant_phoneNumber = 'Phone number is required';
          }
          if (!rentData.preferredMoveInDate) {
            errors.preferredMoveInDate = 'Preferred move-in date is required';
          }
          if (!rentData.occupantsCount || Number(rentData.occupantsCount) < 1) {
            errors.occupantsCount = 'Number of occupants must be at least 1';
          }
          break;

        case 2:
          if (rentData.hasPets && !rentData.petDetails?.trim()) {
            errors.petDetails = 'Please provide details of your pets (e.g. breed, number)';
          }
          break;

        case 3:
          if (!rentData.employmentStatus) {
            errors.employmentStatus = 'Please select your employment status';
          }
          if (!rentData.monthlyIncome || Number(rentData.monthlyIncome) <= 0) {
            errors.monthlyIncome = 'Monthly declared income is required';
          }
          break;

        case 4:
          if (!rentData.documents.nidFile) {
            errors.nidFile = 'National ID or Passport document is required';
          }
          if (!rentData.documents.personalPhoto) {
            errors.personalPhoto = 'Personal photograph is required for identity verification';
          }
          if (!rentData.consentAccepted) {
            errors.consentAccepted = 'You must confirm the terms and authorization to proceed';
          }
          break;

        default:
          break;
      }
    } else {
      // Buy Workflow Validation
      switch (step) {
        case 1:
          if (buyData.buyerType === 'individual') {
            if (!buyData.buyerInfo.fullName?.trim()) {
              errors.buyerInfo_fullName = 'Full legal name is required';
            }
            if (!buyData.buyerInfo.email?.trim()) {
              errors.buyerInfo_email = 'Valid email is required';
            }
            if (!buyData.buyerInfo.phoneNumber?.trim()) {
              errors.buyerInfo_phoneNumber = 'Contact phone number is required';
            }
          } else {
            if (!buyData.buyerInfo.organizationName?.trim()) {
              errors.buyerInfo_organizationName = 'Company / Organization name is required';
            }
            if (!buyData.buyerInfo.registrationNumber?.trim()) {
              errors.buyerInfo_registrationNumber = 'Trade license or registration number is required';
            }
            if (!buyData.buyerInfo.authorizedSignatory?.trim()) {
              errors.buyerInfo_authorizedSignatory = 'Authorized representative name is required';
            }
            if (!buyData.buyerInfo.officialEmail?.trim()) {
              errors.buyerInfo_officialEmail = 'Official organizational email is required';
            }
          }
          break;

        case 2:
          if (!buyData.offeredPrice || Number(buyData.offeredPrice) <= 0) {
            errors.offeredPrice = 'Please enter a valid proposed purchase offer amount';
          }
          if (!buyData.financingMethod) {
            errors.financingMethod = 'Please select your intended financing method';
          }
          if (!buyData.purchaseTimeline) {
            errors.purchaseTimeline = 'Please select your preferred acquisition timeline';
          }
          break;

        case 3:
          if (!buyData.documents.nidFile) {
            errors.nidFile = 'National ID or Corporate Identification document is required';
          }
          if (buyData.buyerType === 'individual' && !buyData.documents.personalPhoto) {
            errors.personalPhoto = 'Buyer photograph is required for verification';
          }
          if (!buyData.consentAccepted) {
            errors.consentAccepted = 'You must acknowledge the transaction disclaimers to proceed';
          }
          break;

        default:
          break;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next / Previous Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setFieldErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Validate all steps before submission
  const validateEntireForm = () => {
    let allValid = true;
    for (let s = 1; s < totalSteps; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        allValid = false;
        break;
      }
    }
    return allValid;
  };

  // Final Submission Handler
  const handleSubmitApplication = async () => {
    if (!validateEntireForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = currentUser.token || (() => {
        try {
          const userStr = localStorage.getItem('dwellSyncUser');
          return userStr ? JSON.parse(userStr).token : '';
        } catch {
          return '';
        }
      })();

      if (!token) {
        throw new Error('Please log in to submit this application.');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('propertyId', property._id);
      formDataToSend.append('requestType', initialRequestType);

      if (isRentWorkflow) {
        // Construct Rent Payload
        const rentPayload = {
          rentDetails: {
            preferredMoveInDate: rentData.preferredMoveInDate,
            leaseDuration: rentData.leaseDuration,
            occupantsCount: Number(rentData.occupantsCount) || 1,
            specialRequests: rentData.specialAccommodations
          },
          familyMembers: rentData.coOccupants.length > 0 ? rentData.coOccupants.map(c => ({
            name: c.name.trim() || 'Co-occupant',
            relation: c.relation || 'Other',
            age: parseInt(c.age, 10) || 0
          })) : [{
            name: rentData.applicant.fullName,
            relation: 'Primary Tenant',
            age: 28
          }],
          livingRequirements: {
            hasPets: rentData.hasPets,
            petDetails: rentData.petDetails,
            hasVehicle: rentData.hasVehicle,
            vehicleDetails: rentData.hasVehicle ? `${rentData.vehicleType} (Parking: ${rentData.requiresParking ? 'Yes' : 'No'})` : '',
            parkingNeeded: rentData.requiresParking,
            specialRequests: rentData.specialAccommodations,
            additionalNotes: rentData.livingNotes
          },
          belongings: {
            hasPets: rentData.hasPets,
            petDetails: rentData.petDetails,
            hasVehicle: rentData.hasVehicle,
            vehicleDetails: rentData.hasVehicle ? rentData.vehicleType : '',
            items: []
          },
          employmentAffordability: {
            employmentStatus: rentData.employmentStatus,
            employerName: rentData.employerName,
            jobRole: rentData.jobRole,
            monthlyIncome: Number(rentData.monthlyIncome) || 0,
            additionalIncome: Number(rentData.additionalIncome) || 0
          },
          occupation: {
            employmentType: rentData.employmentStatus,
            role: rentData.jobRole || rentData.employmentStatus,
            yearsOfExperience: 2,
            companyName: rentData.employerName || '',
            supervisorName: rentData.supervisorName || '',
            supervisorContact: rentData.supervisorContact || ''
          },
          financials: {
            monthlyIncome: Number(rentData.monthlyIncome) || 0,
            additionalIncome: Number(rentData.additionalIncome) || 0
          },
          identity: {
            phone: rentData.applicant.phoneNumber
          },
          letterToOwner: rentData.messageToOwner?.trim() || `Tenancy application for ${formatPropertyAddress(property)}.`,
          messageToOwner: rentData.messageToOwner?.trim() || ''
        };

        formDataToSend.append('payload', JSON.stringify(rentPayload));
        formDataToSend.append('consent', JSON.stringify({
          agreed: rentData.consentAccepted,
          version: 'v2.0',
          timestamp: new Date().toISOString()
        }));

        if (rentData.documents.nidFile) {
          formDataToSend.append('nidFile', rentData.documents.nidFile);
        }
        if (rentData.documents.personalPhoto) {
          formDataToSend.append('personalPhoto', rentData.documents.personalPhoto);
        }
        if (rentData.documents.tinFile) {
          formDataToSend.append('tinFile', rentData.documents.tinFile);
        }
      } else {
        // Construct Buy Payload
        const buyPayload = {
          purchaseProposal: {
            askingPrice: Number(buyData.askingPrice) || 0,
            offeredPrice: Number(buyData.offeredPrice) || 0,
            financingMethod: buyData.financingMethod,
            purchaseTimeline: buyData.purchaseTimeline,
            intendedLandUse: buyData.intendedLandUse,
            proposalNotes: buyData.proposalNotes
          },
          buyerInfo: {
            buyerType: buyData.buyerType,
            fullName: buyData.buyerInfo.fullName,
            email: buyData.buyerInfo.email,
            phoneNumber: buyData.buyerInfo.phoneNumber,
            buyerAddress: buyData.buyerInfo.residentialAddress || buyData.buyerInfo.registeredOfficeAddress,
            organizationName: buyData.buyerInfo.organizationName,
            registrationNumber: buyData.buyerInfo.registrationNumber,
            authorizedSignatory: buyData.buyerInfo.authorizedSignatory,
            secondaryContact: buyData.buyerInfo.officialPhone
          },
          identity: {
            phone: buyData.buyerInfo.phoneNumber || buyData.buyerInfo.officialPhone
          },
          letterToOwner: buyData.messageToSeller?.trim() || `Purchase proposal of ${formatBDT(buyData.offeredPrice)} for ${formatPropertyAddress(property)}.`,
          messageToOwner: buyData.messageToSeller?.trim() || ''
        };

        formDataToSend.append('payload', JSON.stringify(buyPayload));
        formDataToSend.append('consent', JSON.stringify({
          agreed: buyData.consentAccepted,
          version: 'v2.0',
          timestamp: new Date().toISOString()
        }));

        if (buyData.documents.nidFile) {
          formDataToSend.append('nidFile', buyData.documents.nidFile);
        }
        if (buyData.documents.personalPhoto) {
          formDataToSend.append('personalPhoto', buyData.documents.personalPhoto);
        }
        if (buyData.documents.tinFile) {
          formDataToSend.append('tinFile', buyData.documents.tinFile);
        }
      }

      const res = await fetch(apiConfig.getUrl('/api/requests'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Clear draft on successful submission
        localStorage.removeItem(draftKey);
        setSubmissionSuccess(data.request || { requestId: 'REQ-' + Date.now() });
        if (onSubmit) {
          onSubmit(data);
        }
      } else {
        const errorMsg = data.message || (Array.isArray(data.errors) ? data.errors.join(', ') : 'Failed to submit application. Please check your entries.');
        alert(`Application Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert(err.message || 'Network error occurred while submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reusable Document Upload Card
  const renderDocumentUploadCard = (docKey, label, required = false, hint = 'JPEG, PNG, or PDF up to 10MB') => {
    const file = isRentWorkflow ? rentData.documents[docKey] : buyData.documents[docKey];
    const error = fieldErrors[docKey];

    return (
      <div className={`ds-upload-card ${file ? 'has-file' : ''} ${error ? 'has-error' : ''}`}>
        <div className="upload-card-header">
          <label className="upload-label">
            {label} {required && <span className="req-star">*</span>}
          </label>
          <span className="upload-hint">{hint}</span>
        </div>

        {!file ? (
          <label className="upload-dropzone">
            <input
              type="file"
              className="sr-only-input"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleDocumentChange(docKey, e.target.files[0]);
                }
              }}
            />
            <div className="dropzone-content">
              <div className="upload-icon-circle">
                <UploadCloud size={20} className="upload-cloud-icon" />
              </div>
              <div className="dropzone-text">
                <span className="click-browse">Click or drag file to upload</span>
                <span className="browse-sub">Supports scanned images & PDF documents</span>
              </div>
            </div>
          </label>
        ) : (
          <div className="upload-file-preview">
            <div className="preview-info">
              <div className="preview-type-badge">
                {file.type?.includes('pdf') ? <FileText size={18} /> : <ImageIcon size={18} />}
              </div>
              <div className="preview-meta">
                <span className="file-name" title={file.name}>{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
            </div>

            <div className="preview-actions">
              <label className="replace-btn" title="Replace file">
                <input
                  type="file"
                  className="sr-only-input"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDocumentChange(docKey, e.target.files[0]);
                    }
                  }}
                />
                <RotateCw size={14} />
                <span>Replace</span>
              </label>

              <button
                type="button"
                className="remove-doc-btn"
                onClick={() => handleRemoveDocument(docKey)}
                title="Remove file"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="ds-field-error">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  };

  // RENDER STEP CONTENT FOR RENT WORKFLOW
  const renderRentStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Applicant & Occupant Details</h3>
              <p>Verify your contact details and specify your intended occupancy schedule.</p>
            </div>

            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label>Full Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  className={`ds-input ${fieldErrors.applicant_fullName ? 'is-invalid' : ''}`}
                  value={rentData.applicant.fullName}
                  onChange={(e) => handleRentApplicantChange('fullName', e.target.value)}
                  placeholder="Enter legal full name"
                />
                {fieldErrors.applicant_fullName && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.applicant_fullName}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Email Address <span className="req-star">*</span></label>
                <input
                  type="email"
                  className={`ds-input ${fieldErrors.applicant_email ? 'is-invalid' : ''}`}
                  value={rentData.applicant.email}
                  onChange={(e) => handleRentApplicantChange('email', e.target.value)}
                  placeholder="name@domain.com"
                />
                {fieldErrors.applicant_email && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.applicant_email}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Phone Number <span className="req-star">*</span></label>
                <input
                  type="tel"
                  className={`ds-input ${fieldErrors.applicant_phoneNumber ? 'is-invalid' : ''}`}
                  value={rentData.applicant.phoneNumber}
                  onChange={(e) => handleRentApplicantChange('phoneNumber', e.target.value)}
                  placeholder="+880 1712-345678"
                />
                {fieldErrors.applicant_phoneNumber && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.applicant_phoneNumber}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Current Residential Address</label>
                <input
                  type="text"
                  className="ds-input"
                  value={rentData.applicant.currentAddress}
                  onChange={(e) => handleRentApplicantChange('currentAddress', e.target.value)}
                  placeholder="e.g. Dhanmondi, Dhaka"
                />
              </div>

              <div className="ds-form-group">
                <label>Preferred Move-in Date <span className="req-star">*</span></label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className={`ds-input ${fieldErrors.preferredMoveInDate ? 'is-invalid' : ''}`}
                  value={rentData.preferredMoveInDate}
                  onChange={(e) => handleRentChange('preferredMoveInDate', e.target.value)}
                />
                {fieldErrors.preferredMoveInDate && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.preferredMoveInDate}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Expected Lease Duration <span className="req-star">*</span></label>
                <select
                  className="ds-select"
                  value={rentData.leaseDuration}
                  onChange={(e) => handleRentChange('leaseDuration', e.target.value)}
                >
                  <option value="6 Months">6 Months</option>
                  <option value="12 Months (Standard)">12 Months (Standard)</option>
                  <option value="24 Months">24 Months</option>
                  <option value="Month-to-Month">Month-to-Month</option>
                  <option value="Flexible / Negotiable">Flexible / Negotiable</option>
                </select>
              </div>

              <div className="ds-form-group">
                <label>Total Number of Occupants <span className="req-star">*</span></label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className={`ds-input ${fieldErrors.occupantsCount ? 'is-invalid' : ''}`}
                  value={rentData.occupantsCount}
                  onChange={(e) => handleRentChange('occupantsCount', e.target.value)}
                />
                {fieldErrors.occupantsCount && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.occupantsCount}</span>
                )}
              </div>
            </div>

            {/* Optional Co-occupants section when occupants > 1 */}
            {Number(rentData.occupantsCount) > 1 && (
              <div className="co-occupants-subblock">
                <div className="subblock-header">
                  <div>
                    <h4>Co-Occupants Information (Optional)</h4>
                    <p>You may optionally list other individuals residing in the unit.</p>
                  </div>
                  <button type="button" className="ds-btn-ghost-sm" onClick={handleAddCoOccupant}>
                    <Plus size={14} /> Add Co-Occupant
                  </button>
                </div>

                {rentData.coOccupants.length > 0 && (
                  <div className="co-occupants-list">
                    {rentData.coOccupants.map((occ, idx) => (
                      <div key={idx} className="co-occupant-row">
                        <input
                          type="text"
                          placeholder="Occupant Name"
                          className="ds-input"
                          value={occ.name}
                          onChange={(e) => handleUpdateCoOccupant(idx, 'name', e.target.value)}
                        />
                        <select
                          className="ds-select"
                          value={occ.relation}
                          onChange={(e) => handleUpdateCoOccupant(idx, 'relation', e.target.value)}
                        >
                          <option value="Family Member">Family Member</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Roommate">Roommate</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Age"
                          className="ds-input age-input"
                          value={occ.age}
                          onChange={(e) => handleUpdateCoOccupant(idx, 'age', e.target.value)}
                        />
                        <button
                          type="button"
                          className="remove-row-btn"
                          onClick={() => handleRemoveCoOccupant(idx)}
                          title="Remove co-occupant"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Living Requirements & Preferences</h3>
              <p>Help the property manager prepare the unit according to your lifestyle needs.</p>
            </div>

            {/* Pets Section */}
            <div className="ds-preference-card">
              <div className="preference-toggle-header">
                <div>
                  <h4 className="preference-title">Do you plan to keep pets?</h4>
                  <p className="preference-sub">Domestic animals such as cats, dogs, or birds.</p>
                </div>
                <div className="ds-pill-switch">
                  <button
                    type="button"
                    className={`switch-opt ${!rentData.hasPets ? 'active' : ''}`}
                    onClick={() => handleRentChange('hasPets', false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`switch-opt ${rentData.hasPets ? 'active' : ''}`}
                    onClick={() => handleRentChange('hasPets', true)}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {rentData.hasPets && (
                <div className="conditional-group">
                  <label>Pet Description & Count <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className={`ds-input ${fieldErrors.petDetails ? 'is-invalid' : ''}`}
                    placeholder="e.g. 1 vaccinated Persian cat, quiet indoors"
                    value={rentData.petDetails}
                    onChange={(e) => handleRentChange('petDetails', e.target.value)}
                  />
                  {fieldErrors.petDetails && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.petDetails}</span>
                  )}
                </div>
              )}
            </div>

            {/* Vehicles & Parking Section */}
            <div className="ds-preference-card">
              <div className="preference-toggle-header">
                <div>
                  <h4 className="preference-title">Vehicles & Dedicated Parking Needs</h4>
                  <p className="preference-sub">Indicate personal vehicles requiring garage or designated parking.</p>
                </div>
                <div className="ds-pill-switch">
                  <button
                    type="button"
                    className={`switch-opt ${!rentData.hasVehicle ? 'active' : ''}`}
                    onClick={() => {
                      handleRentChange('hasVehicle', false);
                      handleRentChange('requiresParking', false);
                    }}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`switch-opt ${rentData.hasVehicle ? 'active' : ''}`}
                    onClick={() => {
                      handleRentChange('hasVehicle', true);
                      handleRentChange('requiresParking', true);
                    }}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {rentData.hasVehicle && (
                <div className="conditional-group ds-form-grid">
                  <div className="ds-form-group">
                    <label>Primary Vehicle Type</label>
                    <select
                      className="ds-select"
                      value={rentData.vehicleType}
                      onChange={(e) => handleRentChange('vehicleType', e.target.value)}
                    >
                      <option value="Sedan / Hatchback">Sedan / Hatchback</option>
                      <option value="SUV / Crossover">SUV / Crossover</option>
                      <option value="Motorcycle / Scooter">Motorcycle / Scooter</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Multiple Vehicles">Multiple Vehicles</option>
                    </select>
                  </div>

                  <div className="ds-form-group checkbox-align-group">
                    <label className="ds-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rentData.requiresParking}
                        onChange={(e) => handleRentChange('requiresParking', e.target.checked)}
                      />
                      <span>Request dedicated parking slot</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Special Accommodation Requests */}
            <div className="ds-form-group" style={{ marginTop: '1.25rem' }}>
              <label>Special Accommodation Requests (Optional)</label>
              <input
                type="text"
                className="ds-input"
                placeholder="e.g. Accessibility needs, ground-floor preference, weekend move-in"
                value={rentData.specialAccommodations}
                onChange={(e) => handleRentChange('specialAccommodations', e.target.value)}
              />
            </div>

            <div className="ds-form-group">
              <label>Additional Living Notes (Optional)</label>
              <textarea
                className="ds-textarea"
                rows="2"
                placeholder="Any additional details you would like the property manager to know"
                value={rentData.livingNotes}
                onChange={(e) => handleRentChange('livingNotes', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Employment & Affordability</h3>
              <p>Provide professional context to verify your tenancy affordability.</p>
            </div>

            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label>Employment Status <span className="req-star">*</span></label>
                <select
                  className={`ds-select ${fieldErrors.employmentStatus ? 'is-invalid' : ''}`}
                  value={rentData.employmentStatus}
                  onChange={(e) => handleRentChange('employmentStatus', e.target.value)}
                >
                  <option value="Employed (Full-time)">Employed (Full-time)</option>
                  <option value="Employed (Part-time)">Employed (Part-time)</option>
                  <option value="Self-Employed / Business Owner">Self-Employed / Business Owner</option>
                  <option value="Freelancer / Contractor">Freelancer / Contractor</option>
                  <option value="Student">Student</option>
                  <option value="Retired">Retired</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.employmentStatus && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.employmentStatus}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Monthly Declared Income (BDT) <span className="req-star">*</span></label>
                <div className="currency-input-wrap">
                  <span className="currency-tag">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 75000"
                    className={`ds-input currency-padding ${fieldErrors.monthlyIncome ? 'is-invalid' : ''}`}
                    value={rentData.monthlyIncome}
                    onChange={(e) => handleRentChange('monthlyIncome', e.target.value)}
                  />
                </div>
                {fieldErrors.monthlyIncome && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.monthlyIncome}</span>
                )}
              </div>

              {/* Conditional Employer details */}
              {(rentData.employmentStatus.includes('Employed') || rentData.employmentStatus.includes('Business')) && (
                <>
                  <div className="ds-form-group">
                    <label>Designation / Role (Optional)</label>
                    <input
                      type="text"
                      className="ds-input"
                      placeholder="e.g. Software Engineer, Operations Lead"
                      value={rentData.jobRole}
                      onChange={(e) => handleRentChange('jobRole', e.target.value)}
                    />
                  </div>

                  <div className="ds-form-group">
                    <label>Company / Employer Name (Optional)</label>
                    <input
                      type="text"
                      className="ds-input"
                      placeholder="e.g. Acme Tech Solutions"
                      value={rentData.employerName}
                      onChange={(e) => handleRentChange('employerName', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="ds-form-group">
                <label>Secondary / Additional Monthly Income (Optional)</label>
                <div className="currency-input-wrap">
                  <span className="currency-tag">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 15000"
                    className="ds-input currency-padding"
                    value={rentData.additionalIncome}
                    onChange={(e) => handleRentChange('additionalIncome', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="notice-banner-soft">
              <Info size={16} className="notice-icon" />
              <span>Supervisor contact is not mandatory for application submission. Privacy is preserved during preliminary review.</span>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Required Documents & Terms</h3>
              <p>Upload your verification documents and review the tenancy agreement terms.</p>
            </div>

            <div className="upload-cards-grid">
              {renderDocumentUploadCard('nidFile', 'National ID or Passport Document', true, 'Clear scan or photo of Government NID / Smart Card / Passport')}
              {renderDocumentUploadCard('personalPhoto', 'Personal Photograph', true, 'Recent color passport-style photograph for tenant ledger profile')}
              {renderDocumentUploadCard('tinFile', 'TIN Certificate / Proof of Income', false, 'Optional: Tax Certificate, employment ID, or salary statement')}
            </div>

            <div className="ds-terms-block">
              <h4 className="terms-heading">Tenancy Verification & Terms</h4>
              <div className="terms-scroll-preview">
                <p>1. <strong>Lawful Tenancy:</strong> The applicant certifies that all provided information is accurate and agrees to adhere to building house rules and municipal safety codes.</p>
                <p>2. <strong>Financial Settlement:</strong> Upon owner acceptance, tenancy is confirmed only after receipt of the required advance rent and security deposit via verified platform payment.</p>
                <p>3. <strong>Privacy Notice:</strong> Uploaded identity documents are handled in strict compliance with data protection standards and accessed solely for lawful tenancy verification.</p>
              </div>

              <label className={`ds-consent-checkbox-wrap ${fieldErrors.consentAccepted ? 'has-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={rentData.consentAccepted}
                  onChange={(e) => handleRentChange('consentAccepted', e.target.checked)}
                />
                <span className="consent-text">
                  I confirm that all statements provided are true and complete, and I agree to DwellSync’s verified tenancy terms and verification checks. <span className="req-star">*</span>
                </span>
              </label>
              {fieldErrors.consentAccepted && (
                <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.consentAccepted}</span>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Review & Submit Tenancy Application</h3>
              <p>Verify all entered information before sending your formal application to the property owner.</p>
            </div>

            {/* Property Summary Banner */}
            <div className="ds-review-property-card">
              <div className="review-prop-thumb">
                {property.images && property.images[0] ? (
                  <img src={property.images[0]} alt={property.title} />
                ) : (
                  <Building2 size={24} className="prop-fallback-icon" />
                )}
              </div>
              <div className="review-prop-meta">
                <span className="prop-badge">Rental Listing</span>
                <h4 className="prop-name">{property.title || 'Rental Property'}</h4>
                <p className="prop-address">{formatPropertyAddress(property)}</p>
                <div className="prop-financials">
                  <span className="rent-tag">{formatBDT(property.price || property.pricing?.rent)} / month</span>
                  {property.pricing?.securityDeposit && (
                    <span className="deposit-tag">Deposit: {formatBDT(property.pricing.securityDeposit)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Section 1: Applicant & Occupants */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec1: !prev.sec1 }))}
              >
                <div className="header-left">
                  <Users size={16} className="sec-icon" />
                  <h4>1. Applicant & Occupants</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(1);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec1 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec1 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Applicant:</span> <span className="val">{rentData.applicant.fullName}</span></div>
                    <div className="data-item"><span className="label">Email:</span> <span className="val">{rentData.applicant.email}</span></div>
                    <div className="data-item"><span className="label">Phone:</span> <span className="val">{rentData.applicant.phoneNumber}</span></div>
                    <div className="data-item"><span className="label">Move-in Date:</span> <span className="val">{rentData.preferredMoveInDate || 'Not specified'}</span></div>
                    <div className="data-item"><span className="label">Lease Duration:</span> <span className="val">{rentData.leaseDuration}</span></div>
                    <div className="data-item"><span className="label">Occupants Count:</span> <span className="val">{rentData.occupantsCount} person(s)</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section 2: Living Requirements */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec2: !prev.sec2 }))}
              >
                <div className="header-left">
                  <Home size={16} className="sec-icon" />
                  <h4>2. Living Requirements & Parking</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(2);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec2 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec2 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Pets:</span> <span className="val">{rentData.hasPets ? `Yes (${rentData.petDetails})` : 'None'}</span></div>
                    <div className="data-item"><span className="label">Personal Vehicles:</span> <span className="val">{rentData.hasVehicle ? rentData.vehicleType : 'None'}</span></div>
                    <div className="data-item"><span className="label">Parking Requested:</span> <span className="val">{rentData.requiresParking ? 'Yes' : 'No'}</span></div>
                    {rentData.specialAccommodations && (
                      <div className="data-item full-span"><span className="label">Special Needs:</span> <span className="val">{rentData.specialAccommodations}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section 3: Employment */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec3: !prev.sec3 }))}
              >
                <div className="header-left">
                  <Briefcase size={16} className="sec-icon" />
                  <h4>3. Employment & Declared Income</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(3);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec3 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec3 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Employment Status:</span> <span className="val">{rentData.employmentStatus}</span></div>
                    <div className="data-item"><span className="label">Monthly Income:</span> <span className="val font-semibold">{formatBDT(rentData.monthlyIncome)}</span></div>
                    {rentData.jobRole && <div className="data-item"><span className="label">Designation:</span> <span className="val">{rentData.jobRole}</span></div>}
                    {rentData.employerName && <div className="data-item"><span className="label">Company / Employer:</span> <span className="val">{rentData.employerName}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section 4: Documents */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec4: !prev.sec4 }))}
              >
                <div className="header-left">
                  <ShieldCheck size={16} className="sec-icon" />
                  <h4>4. Verification Documents</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(4);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec4 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec4 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">National ID / Passport:</span> <span className="val text-success">{rentData.documents.nidFile ? `✓ ${rentData.documents.nidFile.name}` : 'Provided'}</span></div>
                    <div className="data-item"><span className="label">Personal Photograph:</span> <span className="val text-success">{rentData.documents.personalPhoto ? `✓ ${rentData.documents.personalPhoto.name}` : 'Provided'}</span></div>
                    <div className="data-item"><span className="label">Tax / Income Document:</span> <span className="val">{rentData.documents.tinFile ? `✓ ${rentData.documents.tinFile.name}` : 'Not provided'}</span></div>
                    <div className="data-item"><span className="label">Legal Consent:</span> <span className="val text-success">✓ Acknowledged & Verified</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Message to Owner */}
            <div className="ds-form-group" style={{ marginTop: '1.25rem' }}>
              <label>Message to Property Owner (Optional)</label>
              <textarea
                className="ds-textarea"
                rows="3"
                placeholder="Introduce yourself or leave any specific question for the owner..."
                value={rentData.messageToOwner}
                onChange={(e) => handleRentChange('messageToOwner', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // RENDER STEP CONTENT FOR BUY WORKFLOW
  const renderBuyStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Buyer Information</h3>
              <p>Specify whether you are purchasing as an individual or on behalf of an organization.</p>
            </div>

            {/* Individual vs Organizational Toggle */}
            <div className="buyer-type-segmented">
              <button
                type="button"
                className={`type-segment-btn ${buyData.buyerType === 'individual' ? 'active' : ''}`}
                onClick={() => handleBuyChange('buyerType', 'individual')}
              >
                <Users size={16} />
                <span>Individual Buyer</span>
              </button>
              <button
                type="button"
                className={`type-segment-btn ${buyData.buyerType === 'organizational' ? 'active' : ''}`}
                onClick={() => handleBuyChange('buyerType', 'organizational')}
              >
                <Landmark size={16} />
                <span>Organizational / Corporate Buyer</span>
              </button>
            </div>

            {buyData.buyerType === 'individual' ? (
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label>Full Legal Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className={`ds-input ${fieldErrors.buyerInfo_fullName ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.fullName}
                    onChange={(e) => handleBuyerInfoChange('fullName', e.target.value)}
                    placeholder="Enter full legal name"
                  />
                  {fieldErrors.buyerInfo_fullName && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_fullName}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Email Address <span className="req-star">*</span></label>
                  <input
                    type="email"
                    className={`ds-input ${fieldErrors.buyerInfo_email ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.email}
                    onChange={(e) => handleBuyerInfoChange('email', e.target.value)}
                    placeholder="name@domain.com"
                  />
                  {fieldErrors.buyerInfo_email && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_email}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Contact Phone Number <span className="req-star">*</span></label>
                  <input
                    type="tel"
                    className={`ds-input ${fieldErrors.buyerInfo_phoneNumber ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.phoneNumber}
                    onChange={(e) => handleBuyerInfoChange('phoneNumber', e.target.value)}
                    placeholder="+880 1712-345678"
                  />
                  {fieldErrors.buyerInfo_phoneNumber && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_phoneNumber}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Current Address</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={buyData.buyerInfo.residentialAddress}
                    onChange={(e) => handleBuyerInfoChange('residentialAddress', e.target.value)}
                    placeholder="Current street, city, country"
                  />
                </div>
              </div>
            ) : (
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label>Organization / Company Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className={`ds-input ${fieldErrors.buyerInfo_organizationName ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.organizationName}
                    onChange={(e) => handleBuyerInfoChange('organizationName', e.target.value)}
                    placeholder="e.g. Apex Holdings Ltd."
                  />
                  {fieldErrors.buyerInfo_organizationName && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_organizationName}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Trade License / Reg. No. <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className={`ds-input ${fieldErrors.buyerInfo_registrationNumber ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.registrationNumber}
                    onChange={(e) => handleBuyerInfoChange('registrationNumber', e.target.value)}
                    placeholder="e.g. TRAD/DNCC/12345/2026"
                  />
                  {fieldErrors.buyerInfo_registrationNumber && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_registrationNumber}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Authorized Signatory Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className={`ds-input ${fieldErrors.buyerInfo_authorizedSignatory ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.authorizedSignatory}
                    onChange={(e) => handleBuyerInfoChange('authorizedSignatory', e.target.value)}
                    placeholder="Full name of representative"
                  />
                  {fieldErrors.buyerInfo_authorizedSignatory && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_authorizedSignatory}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Signatory Designation</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={buyData.buyerInfo.signatoryDesignation}
                    onChange={(e) => handleBuyerInfoChange('signatoryDesignation', e.target.value)}
                    placeholder="e.g. Managing Director"
                  />
                </div>

                <div className="ds-form-group">
                  <label>Official Email <span className="req-star">*</span></label>
                  <input
                    type="email"
                    className={`ds-input ${fieldErrors.buyerInfo_officialEmail ? 'is-invalid' : ''}`}
                    value={buyData.buyerInfo.officialEmail}
                    onChange={(e) => handleBuyerInfoChange('officialEmail', e.target.value)}
                    placeholder="contact@company.com"
                  />
                  {fieldErrors.buyerInfo_officialEmail && (
                    <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.buyerInfo_officialEmail}</span>
                  )}
                </div>

                <div className="ds-form-group">
                  <label>Registered Office Address</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={buyData.buyerInfo.registeredOfficeAddress}
                    onChange={(e) => handleBuyerInfoChange('registeredOfficeAddress', e.target.value)}
                    placeholder="Registered business address"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>{isLandProperty ? 'Land Purchase Proposal' : 'Purchase Proposal'}</h3>
              <p>State your proposed offer, intended financing structure, and preferred settlement timeline.</p>
            </div>

            {/* Benchmark Price Banner */}
            <div className="benchmark-price-strip">
              <div className="benchmark-item">
                <span className="bench-label">Asking Price</span>
                <span className="bench-val">{formatBDT(buyData.askingPrice)}</span>
              </div>
              <div className="benchmark-item">
                <span className="bench-label">Property Category</span>
                <span className="bench-val" style={{ textTransform: 'capitalize' }}>{property.propertyType || 'Residential Flat'}</span>
              </div>
            </div>

            <div className="ds-form-grid" style={{ marginTop: '1.25rem' }}>
              <div className="ds-form-group">
                <label>Proposed Purchase Offer (BDT) <span className="req-star">*</span></label>
                <div className="currency-input-wrap">
                  <span className="currency-tag">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    placeholder="e.g. 17500000"
                    className={`ds-input currency-padding ${fieldErrors.offeredPrice ? 'is-invalid' : ''}`}
                    value={buyData.offeredPrice}
                    onChange={(e) => handleBuyChange('offeredPrice', e.target.value)}
                  />
                </div>
                {fieldErrors.offeredPrice && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.offeredPrice}</span>
                )}
                {buyData.offeredPrice && Number(buyData.offeredPrice) > 0 && buyData.askingPrice > 0 && (
                  <div className="offer-diff-tag">
                    {Number(buyData.offeredPrice) === Number(buyData.askingPrice) ? (
                      <span className="diff-neutral">Offer exactly matches asking price</span>
                    ) : Number(buyData.offeredPrice) > Number(buyData.askingPrice) ? (
                      <span className="diff-above">+{formatBDT(Number(buyData.offeredPrice) - Number(buyData.askingPrice))} above asking price</span>
                    ) : (
                      <span className="diff-below">-{formatBDT(Number(buyData.askingPrice) - Number(buyData.offeredPrice))} below asking price</span>
                    )}
                  </div>
                )}
              </div>

              <div className="ds-form-group">
                <label>Intended Financing Method <span className="req-star">*</span></label>
                <select
                  className={`ds-select ${fieldErrors.financingMethod ? 'is-invalid' : ''}`}
                  value={buyData.financingMethod}
                  onChange={(e) => handleBuyChange('financingMethod', e.target.value)}
                >
                  <option value="Cash / Self-Financed">Cash / Self-Financed (Immediate Escrow)</option>
                  <option value="Bank Mortgage / Pre-Approved Loan">Bank Mortgage / Pre-Approved Loan</option>
                  <option value="Bank Mortgage / Loan Under Application">Bank Mortgage / Loan Under Application</option>
                  <option value="Developer Installment / Staged Payment">Developer Installment / Staged Payment</option>
                  <option value="Other Financial Arrangement">Other Financial Arrangement</option>
                </select>
                {fieldErrors.financingMethod && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.financingMethod}</span>
                )}
              </div>

              <div className="ds-form-group">
                <label>Preferred Purchase Timeline <span className="req-star">*</span></label>
                <select
                  className={`ds-select ${fieldErrors.purchaseTimeline ? 'is-invalid' : ''}`}
                  value={buyData.purchaseTimeline}
                  onChange={(e) => handleBuyChange('purchaseTimeline', e.target.value)}
                >
                  <option value="Immediate (Within 30 Days)">Immediate (Within 30 Days)</option>
                  <option value="30 – 60 Days">30 – 60 Days</option>
                  <option value="60 – 90 Days">60 – 90 Days</option>
                  <option value="Flexible / Contingent">Flexible / Contingent</option>
                </select>
                {fieldErrors.purchaseTimeline && (
                  <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.purchaseTimeline}</span>
                )}
              </div>

              {/* Conditional Intended Land Use for Land Property */}
              {isLandProperty && (
                <div className="ds-form-group">
                  <label>Intended Land Utilization</label>
                  <select
                    className="ds-select"
                    value={buyData.intendedLandUse}
                    onChange={(e) => handleBuyChange('intendedLandUse', e.target.value)}
                  >
                    <option value="Residential Development">Residential Development</option>
                    <option value="Commercial Construction">Commercial Construction</option>
                    <option value="Industrial / Warehouse Facility">Industrial / Warehouse Facility</option>
                    <option value="Agricultural / Plantation">Agricultural / Plantation</option>
                    <option value="Long-term Capital Investment">Long-term Capital Investment</option>
                  </select>
                </div>
              )}
            </div>

            <div className="ds-form-group" style={{ marginTop: '1.25rem' }}>
              <label>Proposal Notes & Contingencies (Optional)</label>
              <textarea
                className="ds-textarea"
                rows="2"
                placeholder="e.g. Subject to title deed clearance, architectural survey, or structural inspection..."
                value={buyData.proposalNotes}
                onChange={(e) => handleBuyChange('proposalNotes', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Documents & Transaction Disclaimers</h3>
              <p>Upload authorized identification and review property purchase terms.</p>
            </div>

            <div className="upload-cards-grid">
              {renderDocumentUploadCard(
                'nidFile',
                buyData.buyerType === 'individual' ? 'National ID or Passport Document' : 'Company Incorporation / Trade License',
                true,
                'Clear scan of identification or registered corporate papers'
              )}
              {buyData.buyerType === 'individual' && (
                renderDocumentUploadCard('personalPhoto', 'Buyer Photograph', true, 'Recent color passport-size photograph')
              )}
              {renderDocumentUploadCard('tinFile', 'TIN Certificate / Bank Solvency', false, 'Optional: Tax Certificate or bank financial capacity letter')}
            </div>

            <div className="ds-terms-block">
              <h4 className="terms-heading">Purchase Terms & Legal Disclaimer</h4>
              <div className="terms-scroll-preview">
                <p>1. <strong>Expression of Interest:</strong> This submission constitutes a formal offer to purchase and price proposal. It does NOT constitute transfer of title, conveyance of deed, or guarantee of sale.</p>
                <p>2. <strong>Legal Due Diligence:</strong> Legal conveyance occurs solely upon mutual execution of deed contracts, title search verification, sub-registry office registration, and full financial settlement.</p>
                <p>3. <strong>Booking Deposit:</strong> If the seller accepts this offer, an earnest booking deposit or documentation agreement may be required through DwellSync’s escrow or authorized platform channels.</p>
              </div>

              <label className={`ds-consent-checkbox-wrap ${fieldErrors.consentAccepted ? 'has-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={buyData.consentAccepted}
                  onChange={(e) => handleBuyChange('consentAccepted', e.target.checked)}
                />
                <span className="consent-text">
                  I acknowledge the property transaction disclaimers and confirm that this purchase proposal is submitted in good faith with bona fide funds. <span className="req-star">*</span>
                </span>
              </label>
              {fieldErrors.consentAccepted && (
                <span className="ds-field-error"><AlertCircle size={13} /> {fieldErrors.consentAccepted}</span>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="inquiry-step-block">
            <div className="step-intro">
              <h3>Review & Submit Purchase Proposal</h3>
              <p>Confirm the details of your proposal before submitting it to the property owner / seller.</p>
            </div>

            {/* Property Summary Banner */}
            <div className="ds-review-property-card">
              <div className="review-prop-thumb">
                {property.images && property.images[0] ? (
                  <img src={property.images[0]} alt={property.title} />
                ) : (
                  <Building2 size={24} className="prop-fallback-icon" />
                )}
              </div>
              <div className="review-prop-meta">
                <span className="prop-badge">For Sale</span>
                <h4 className="prop-name">{property.title || 'Sale Property'}</h4>
                <p className="prop-address">{formatPropertyAddress(property)}</p>
                <div className="prop-financials">
                  <span className="rent-tag">Asking: {formatBDT(buyData.askingPrice)}</span>
                  <span className="deposit-tag" style={{ background: '#ECFDF5', color: '#047857' }}>
                    Proposed Offer: {formatBDT(buyData.offeredPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Collapsible Section 1: Buyer Information */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec1: !prev.sec1 }))}
              >
                <div className="header-left">
                  <Users size={16} className="sec-icon" />
                  <h4>1. Buyer Information</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(1);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec1 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec1 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Buyer Type:</span> <span className="val" style={{ textTransform: 'capitalize' }}>{buyData.buyerType}</span></div>
                    {buyData.buyerType === 'individual' ? (
                      <>
                        <div className="data-item"><span className="label">Buyer Name:</span> <span className="val">{buyData.buyerInfo.fullName}</span></div>
                        <div className="data-item"><span className="label">Email:</span> <span className="val">{buyData.buyerInfo.email}</span></div>
                        <div className="data-item"><span className="label">Phone:</span> <span className="val">{buyData.buyerInfo.phoneNumber}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="data-item"><span className="label">Organization:</span> <span className="val">{buyData.buyerInfo.organizationName}</span></div>
                        <div className="data-item"><span className="label">Registration:</span> <span className="val">{buyData.buyerInfo.registrationNumber}</span></div>
                        <div className="data-item"><span className="label">Signatory:</span> <span className="val">{buyData.buyerInfo.authorizedSignatory}</span></div>
                        <div className="data-item"><span className="label">Official Email:</span> <span className="val">{buyData.buyerInfo.officialEmail}</span></div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section 2: Purchase Proposal */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec2: !prev.sec2 }))}
              >
                <div className="header-left">
                  <CreditCard size={16} className="sec-icon" />
                  <h4>2. Purchase Proposal & Terms</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(2);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec2 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec2 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Asking Price:</span> <span className="val">{formatBDT(buyData.askingPrice)}</span></div>
                    <div className="data-item"><span className="label">Proposed Offer:</span> <span className="val font-semibold text-primary">{formatBDT(buyData.offeredPrice)}</span></div>
                    <div className="data-item"><span className="label">Financing:</span> <span className="val">{buyData.financingMethod}</span></div>
                    <div className="data-item"><span className="label">Timeline:</span> <span className="val">{buyData.purchaseTimeline}</span></div>
                    {isLandProperty && buyData.intendedLandUse && (
                      <div className="data-item"><span className="label">Land Utilization:</span> <span className="val">{buyData.intendedLandUse}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Section 3: Documents */}
            <div className="ds-accordion-section">
              <div
                className="accordion-header"
                onClick={() => setCollapsedSections(prev => ({ ...prev, sec3: !prev.sec3 }))}
              >
                <div className="header-left">
                  <ShieldCheck size={16} className="sec-icon" />
                  <h4>3. Documents & Disclaimers</h4>
                </div>
                <div className="header-right">
                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(3);
                    }}
                  >
                    Edit
                  </button>
                  {collapsedSections.sec3 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </div>
              {!collapsedSections.sec3 && (
                <div className="accordion-content">
                  <div className="review-data-grid">
                    <div className="data-item"><span className="label">Identification Doc:</span> <span className="val text-success">{buyData.documents.nidFile ? `✓ ${buyData.documents.nidFile.name}` : 'Provided'}</span></div>
                    {buyData.buyerType === 'individual' && (
                      <div className="data-item"><span className="label">Buyer Photo:</span> <span className="val text-success">{buyData.documents.personalPhoto ? `✓ ${buyData.documents.personalPhoto.name}` : 'Provided'}</span></div>
                    )}
                    <div className="data-item"><span className="label">Financial / Tax Doc:</span> <span className="val">{buyData.documents.tinFile ? `✓ ${buyData.documents.tinFile.name}` : 'Not provided'}</span></div>
                    <div className="data-item"><span className="label">Transaction Consent:</span> <span className="val text-success">✓ Acknowledged & Verified</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Message to Seller */}
            <div className="ds-form-group" style={{ marginTop: '1.25rem' }}>
              <label>Message to Seller / Owner (Optional)</label>
              <textarea
                className="ds-textarea"
                rows="3"
                placeholder="Include a proposal letter or note to the property seller..."
                value={buyData.messageToSeller}
                onChange={(e) => handleBuyChange('messageToSeller', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // SUCCESS CONFIRMATION MODAL VIEW
  if (submissionSuccess) {
    return (
      <div className="unified-inquiry-overlay">
        <div className="unified-inquiry-modal success-view">
          <div className="success-content">
            <div className="success-badge-icon">
              <CheckCircle2 size={44} color="#059669" />
            </div>

            <h2>Application Submitted Successfully</h2>
            <p className="success-sub">
              Your {isRentWorkflow ? 'tenancy application' : 'purchase proposal'} for{' '}
              <strong>{property.title || 'this property'}</strong> has been formally dispatched to the owner.
            </p>

            <div className="reference-box">
              <span className="ref-label">Application Reference ID</span>
              <span className="ref-code">{submissionSuccess.requestId || 'REQ-REGISTERED'}</span>
            </div>

            <div className="next-steps-card">
              <h4>What happens next?</h4>
              <div className="steps-flow">
                <div className="flow-step">
                  <div className="step-num">1</div>
                  <div className="step-text">
                    <strong>Owner Review</strong>
                    <span>The property owner will review your application and background information.</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    <strong>{isRentWorkflow ? 'Tenancy Offer & Advance' : 'Price Agreement & Escrow'}</strong>
                    <span>{isRentWorkflow ? 'Upon approval, you will receive an official tenancy offer with payment details.' : 'Upon acceptance, documentation and earnest booking steps will activate.'}</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="step-num">3</div>
                  <div className="step-text">
                    <strong>{isRentWorkflow ? 'Move-In & Key Handover' : 'Deed Registration & Settlement'}</strong>
                    <span>Formal agreement signing and key handover will be coordinated.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="success-actions">
              <button
                type="button"
                className="ds-btn-primary"
                onClick={() => {
                  onClose();
                  window.location.href = '/tenant/request-info';
                }}
              >
                View in My Requests
              </button>
              <button type="button" className="ds-btn-secondary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-inquiry-overlay" role="dialog" aria-modal="true">
      <div className="unified-inquiry-modal">
        {/* Compact Sticky Header (Navy & Clean Design) */}
        <div className="inquiry-modal-header">
          <div className="header-brand-strip">
            <div className="header-tag">
              <Building2 size={13} />
              <span>DwellSync Application Portal</span>
            </div>
            <div className="header-status-slot">
              {autosaveState === 'saving' && (
                <span className="autosave-pill saving">
                  <RotateCw size={11} className="spin-icon" /> Saving draft...
                </span>
              )}
              {autosaveState === 'saved' && (
                <span className="autosave-pill saved">
                  <Check size={11} /> Draft saved
                </span>
              )}
            </div>
          </div>

          <div className="header-main-row">
            <div className="header-title-info">
              <h2>{isRentWorkflow ? 'Apply for Rent' : (isLandProperty ? 'Apply to Purchase Land' : 'Apply to Purchase Property')}</h2>
              <div className="header-property-summary">
                <span className="summary-title">{property.title || 'Selected Property'}</span>
                <span className="summary-bullet">•</span>
                <span className="summary-address">{formatPropertyAddress(property)}</span>
              </div>
            </div>

            <button
              type="button"
              className="inquiry-close-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="inquiry-stepper-wrap">
          <div className="stepper-track">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => {
              const isPassed = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              return (
                <div
                  key={stepNum}
                  className={`stepper-node ${isCurrent ? 'is-current' : ''} ${isPassed ? 'is-passed' : ''}`}
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (stepNum < currentStep) {
                      setCurrentStep(stepNum);
                    }
                  }}
                >
                  <div className="node-circle">
                    {isPassed ? <Check size={12} strokeWidth={3} /> : stepNum}
                  </div>
                  <span className="node-title">{stepTitles[stepNum]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Single Scrollable Content Body */}
        <div className="inquiry-modal-body">
          {isRentWorkflow ? renderRentStepContent() : renderBuyStepContent()}
        </div>

        {/* Sticky Bottom Navigation Footer */}
        <div className="inquiry-modal-footer">
          <div className="footer-left">
            {currentStep > 1 && (
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={handlePrevious}
                disabled={submitting}
              >
                <ChevronLeft size={16} /> Previous
              </button>
            )}
            <button
              type="button"
              className="ds-btn-ghost"
              onClick={handleDiscardDraft}
              disabled={submitting}
            >
              Discard Draft
            </button>
          </div>

          <div className="footer-right">
            <span className="step-counter-text">
              Step {currentStep} of {totalSteps}
            </span>

            {currentStep < totalSteps ? (
              <button
                type="button"
                className="ds-btn-primary"
                onClick={handleNext}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="ds-btn-primary submit-btn"
                onClick={handleSubmitApplication}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RotateCw size={15} className="spin-icon" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{isRentWorkflow ? 'Submit Tenancy Application' : 'Submit Purchase Proposal'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedInquiryForm;
