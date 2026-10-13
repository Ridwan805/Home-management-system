/**
 * API configuration file
 * This file contains the base URL for API requests and authentication utilities
 */

// Production Render backend URLs
const DEFAULT_PROD_URL = 'https://dwellsync-backend.onrender.com';
const FALLBACK_PROD_URL = 'https://dewllsync-backend.onrender.com';
const LOCAL_DEV_URL = 'http://localhost:5001';

/**
 * Determine API base URL dynamically.
 * Priority:
 * 1. import.meta.env.VITE_API_URL
 * 2. import.meta.env.VITE_API_BASE_URL
 * 3. Localhost (ONLY when in local development on a local hostname)
 * 4. Production HTTPS URL on Render (default for any deployed environment)
 */
export const getApiBaseUrl = () => {
  // 1. Explicit environment variables (VITE_API_URL takes precedence, then VITE_API_BASE_URL)
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    
    // Safety check: If deployed on HTTPS, never allow a misconfigured http://localhost
    const isPublicHttps = typeof window !== 'undefined' && 
      window.location.protocol === 'https:' && 
      !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
    
    if (isPublicHttps && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1'))) {
      console.warn('⚠️ Disallowing localhost API URL on public HTTPS origin to prevent Chrome Local Network Access blocks.');
      return FALLBACK_PROD_URL;
    }
    return trimmed;
  }

  // 2. Local development check (must be running locally in dev mode)
  const isLocalHost = typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

  if (import.meta.env.DEV && isLocalHost) {
    return LOCAL_DEV_URL;
  }

  // 3. Fallback for deployed environments (Vercel, etc.)
  // Use the verified active Render backend instance
  return FALLBACK_PROD_URL;
};

// Base URL for API requests
export const API_BASE_URL = getApiBaseUrl();

/**
 * Handles API responses and checks for token expiration
 * @param {Response} response - The fetch API response
 * @param {Function} navigate - React Router's navigate function (optional)
 * @returns {Promise<any>} - The parsed response data
 */
export const handleApiResponse = async (response, navigate = null) => {


  // First check if the response is ok
  if (response.ok) {
    try {
      // Check if response has content and is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseText = await response.text();
        if (responseText.trim()) {
          const data = JSON.parse(responseText);
          return data;
        } else {
          // Empty JSON response, return empty object
          return {};
        }
      } else {
        // Non-JSON response, return as text or empty object for successful requests
        const text = await response.text();
        return text ? { message: text } : {};
      }
    } catch (parseError) {
      console.error('❌ Failed to parse successful response:', parseError);
      throw new Error('Invalid response format');
    }
  }

  console.error('❌ API response not ok:', response.status, response.statusText);
  
  // If not ok, parse the error response
  let errorData;
  try {
    // Check if response has content and is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text();
      if (responseText.trim()) {
        errorData = JSON.parse(responseText);
        console.error('❌ Error response data:', errorData);
      } else {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
    } else {
      // Non-JSON response, use status text
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (parseError) {
    console.error('❌ Failed to parse error response:', parseError);
    errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
  }
  
  // Check if token has expired
  if (response.status === 401 && errorData.expired) {
    console.warn('⚠️ 401 Unauthorized - Token expired');
    // Clear user data from localStorage
    localStorage.removeItem('dwellSyncUser');
    
    // Show alert to user
    alert('Your session has expired. Please login again.');
    
    // Redirect to login page if navigate function is provided
    if (navigate) {

      navigate('/login');
    } else {
      // Fallback if navigate is not provided
      window.location.href = '/login';
    }
    
    throw new Error('Session expired');
  }
  
  // For other errors, throw with the error message
  const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
  console.error('❌ Throwing error:', errorMessage);
  throw new Error(errorMessage);
};

/**
 * Makes an authenticated API request with token expiration handling
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body)
 * @param {Function} navigate - React Router's navigate function (optional)
 * @returns {Promise<any>} - The parsed response data
 */
export const authenticatedFetch = async (url, options = {}, navigate = null) => {
  
  try {
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
    const token = user ? user.token : null;
    
    if (!token) {
      console.error('❌ No authentication data found in localStorage');
      throw new Error('Authentication required');
    }
    

    
    // Set up headers with authentication token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    

    
    // Make the API request
    const response = await fetch(url, {
      ...options,
      headers
    });
    

    
    // Handle the response with token expiration check
    return await handleApiResponse(response, navigate);
  } catch (error) {
    console.error('❌ Fetch error occurred:', error);
    console.error('❌ Fetch error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Makes an authenticated API request using axios with token expiration handling
 * @param {Object} axiosInstance - Axios instance
 * @param {Object} config - Axios request config
 * @param {Function} navigate - React Router's navigate function (optional)
 * @returns {Promise<any>} - The response data
 */
export const authenticatedAxios = async (axiosInstance, config, navigate = null) => {
  try {
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
    const token = user ? user.token : null;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Set up headers with authentication token
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...config.headers
    };
    
    // Make the API request
    const response = await axiosInstance({
      ...config,
      headers
    });
    
    return response.data;
  } catch (error) {
    // Check if it's an axios error with a response
    if (error.response) {
      const { status, data } = error.response;
      
      // Check if token has expired
      if (status === 401 && data.expired) {
        // Clear user data from localStorage
        localStorage.removeItem('dwellSyncUser');
        
        // Show alert to user
        alert('Your session has expired. Please login again.');
        
        // Redirect to login page if navigate function is provided
        if (navigate) {
          navigate('/login');
        } else {
          // Fallback if navigate is not provided
          window.location.href = '/login';
        }
      }
      
      throw new Error(data.message || 'An error occurred');
    }
    
    console.error('API request error:', error);
    throw error;
  }
};

/**
 * Resolves an image path/filename to a full URL pointing to backend image endpoint
 * @param {string|object} imagePath - image filename, path, or object with url property
 * @returns {string} - full URL to image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (typeof imagePath === 'object' && imagePath.url) {
    imagePath = imagePath.url;
  }
  if (typeof imagePath !== 'string') return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    // If an image URL contains localhost or 127.0.0.1 on a public host, rewrite to API_BASE_URL
    if (imagePath.includes('localhost:') || imagePath.includes('127.0.0.1:')) {
      const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
      if (!isLocalHost) {
        return imagePath.replace(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/, API_BASE_URL);
      }
    }
    return imagePath;
  }
  const cleanFilename = imagePath.replace(/^\/?uploads\//, '').replace(/^\/?api\/images\//, '');
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/api/images/${cleanFilename}`;
};

// Export the base URL and other API-related configurations
export default {
  baseUrl: API_BASE_URL,
  getImageUrl,
  endpoints: {
    // Auth endpoints
    login: '/api/auth/login',
    adminLogin: '/api/admin/login',
    register: '/api/auth/register',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    profile: '/api/auth/me',
    
    // Property endpoints
    properties: '/api/properties',
    topProperties: '/api/properties/top',
    propertyById: (id) => `/api/properties/${id}`,
    propertyStatus: (id) => `/api/properties/${id}/status`,
    userProperties: '/api/properties/user',
    tenantAssignments: '/api/properties/my-assignments',
    tenantProperties: '/api/properties/tenant-properties',
    tenantPropertyDetails: (propertyId) => `/api/properties/tenant/${propertyId}/details`,
    
    // Request endpoints
    requests: '/api/requests',
    requestById: (id) => `/api/requests/${id}`,
    requestStatus: (id) => `/api/requests/${id}/status`,
    
    // Request management endpoints
    ownerRequests: '/api/request-management/owner-requests',
    requestManagement: (id) => `/api/request-management/${id}`,
    requestMessages: (id) => `/api/request-management/${id}/messages`,
    readMessages: (id) => `/api/request-management/${id}/messages/read`,
    rejectRequest: (id) => `/api/request-management/owner-requests/${id}/reject`,
    requestStatusUpdate: (id) => `/api/request-management/owner-requests/${id}/status`,
    advancePayment: (id) => `/api/request-management/owner-requests/${id}/advance-payment`,
    
    // Payment endpoints
    getStripeKey: '/api/stripe/publishable-key',
    createPayment: (requestId) => `/api/stripe/payment-session/${requestId}`,
    paymentHistory: '/api/payments/history',
    paymentDetails: (paymentId) => `/api/payments/${paymentId}`,
    
    // Invoice endpoints
    invoices: '/api/invoices',
    invoiceById: (id) => `/api/invoices/${id}`,
    invoicePayment: (id) => `/api/invoices/${id}/payment`,
    overdueInvoices: '/api/invoices/status/overdue',
    generateMonthlyRent: '/api/invoices/generate/monthly-rent',
    
    // Building endpoints
    buildings: '/api/buildings',
    buildingById: (id) => `/api/buildings/${id}`,
    ownerBuildings: '/api/buildings/owner',
    
    // Admin endpoints
    adminStats: '/api/admin/dashboard/stats',
    adminRecentActivity: '/api/admin/dashboard/recent-activity',
    adminUsers: '/api/admin/users',
    adminUserActivity: (id) => `/api/admin/users/${id}/activity`,
    updateUserByAdmin: (id) => `/api/admin/users/${id}`,
    resetUserPasswordByAdmin: (id) => `/api/admin/users/${id}/reset-password`,
    banUser: (id) => `/api/admin/users/${id}/ban`,
    unbanUser: (id) => `/api/admin/users/${id}/unban`,
    deleteUser: (id) => `/api/admin/users/${id}`,
    reports: '/api/admin/reports',
    deleteReport: (id) => `/api/admin/reports/${id}`,
    escalateReport: (id) => `/api/admin/reports/${id}/escalate`,
    pendingProperties: '/api/admin/properties/pending',
    approveProperty: (id) => `/api/admin/properties/${id}/approve`,
    
    // JobPost endpoints
    jobPosts: '/api/job-posts',
    jobPostById: (id) => `/api/job-posts/${id}`,
    jobPostApplications: (id) => `/api/security-guard-applications/job/${id}`,
    hireGuard: '/api/job-posts/hire',
    
    // Security Guard Application endpoints
    securityGuardApplications: '/api/security-guard-applications',
    applyForJob: '/api/security-guard-applications/apply',
    guardApplications: '/api/security-guard-applications/guard',
    tenantAssignedGuards: '/api/job-posts/tenant/assigned-guards',
    guardCurrentJob: '/api/job-posts/guard/current-job',
    applicationById: (id) => `/api/security-guard-applications/${id}`,
    updateApplication: (id) => `/api/security-guard-applications/${id}`,
    withdrawApplication: (id) => `/api/security-guard-applications/${id}/withdraw`,
    updateApplicationStatus: (id) => `/api/security-guard-applications/${id}/status`,

    // Parcel Logging endpoints
    parcelLogs: '/api/parcel-logs',
    logParcel: '/api/parcel-logs/log',
    parcelLogById: (id) => `/api/parcel-logs/${id}`,
    parcelLogStatus: (id) => `/api/parcel-logs/${id}/status`,
    updateParcelLog: (id) => `/api/parcel-logs/${id}`,
    deleteParcelLog: (id) => `/api/parcel-logs/${id}`,
    
    // Image serving endpoint
    image: (filename) => `/api/images/${filename}`,
    
    // Maintenance Reports endpoints
    maintenanceReports: '/api/maintenance-reports',
    tenantReports: '/api/maintenance-reports/tenant',
    ownerReports: '/api/maintenance-reports/owner',
    reportStats: '/api/maintenance-reports/stats',
  },
  
  // Helper function to get full URL for an endpoint
  getUrl: function(endpoint) {
    if (!endpoint) return this.baseUrl;
    const base = this.baseUrl.replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }
};

// Maintenance Report API Functions

/**
 * Create a new maintenance report (tenant only)
 * @param {FormData} formData - Form data containing report details and images
 * @returns {Promise<Object>} - API response
 */
export const createMaintenanceReport = async (formData) => {
  try {
    const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
    const token = user ? user.token : null;
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/maintenance-reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData, // FormData handles its own Content-Type
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error creating maintenance report:', error);
    throw error;
  }
};

/**
 * Get maintenance reports for tenant
 * @param {string} status - Optional status filter
 * @returns {Promise<Object>} - API response with reports
 */
export const getTenantReports = async (status = null) => {
  try {
    let url = `${API_BASE_URL}/api/maintenance-reports/tenant`;
    if (status) {
      url += `?status=${status}`;
    }
    
    const response = await authenticatedFetch(url);
    return response;
  } catch (error) {
    console.error('Error fetching tenant reports:', error);
    throw error;
  }
};

/**
 * Get maintenance reports for owner
 * @param {string} status - Optional status filter
 * @returns {Promise<Object>} - API response with reports
 */
export const getOwnerReports = async (status = null) => {
  try {
    let url = `${API_BASE_URL}/api/maintenance-reports/owner`;
    if (status) {
      url += `?status=${status}`;
    }
    
    const response = await authenticatedFetch(url);
    return response;
  } catch (error) {
    console.error('Error fetching owner reports:', error);
    throw error;
  }
};

/**
 * Get a specific maintenance report by ID
 * @param {string} reportId - The report ID
 * @returns {Promise<Object>} - API response with report details
 */
export const getReportById = async (reportId) => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/maintenance-reports/${reportId}`);
    return response;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
};

/**
 * Update maintenance report status (owner only)
 * @param {string} reportId - The report ID
 * @param {Object} statusData - Object containing new status
 * @returns {Promise<Object>} - API response
 */
export const updateReportStatus = async (reportId, statusData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/maintenance-reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statusData),
    });
    return response;
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};

/**
 * Resolve a maintenance report (owner only)
 * @param {string} reportId - The report ID
 * @param {Object} resolutionData - Object containing resolution notes and cost
 * @returns {Promise<Object>} - API response
 */
export const resolveReport = async (reportId, resolutionData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/maintenance-reports/${reportId}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resolutionData),
    });
    return response;
  } catch (error) {
    console.error('Error resolving report:', error);
    throw error;
  }
};

/**
 * Add an update to a maintenance report
 * @param {string} reportId - The report ID
 * @param {Object} updateData - Object containing update message
 * @returns {Promise<Object>} - API response
 */
export const addReportUpdate = async (reportId, updateData) => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/maintenance-reports/${reportId}/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    return response;
  } catch (error) {
    console.error('Error adding report update:', error);
    throw error;
  }
};

/**
 * Get maintenance report statistics (owner only)
 * @returns {Promise<Object>} - API response with statistics
 */
export const getReportStats = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/maintenance-reports/stats`);
    return response;
  } catch (error) {
    console.error('Error fetching report stats:', error);
    throw error;
  }
};

/**
 * Get properties where the authenticated user is a tenant
 * @returns {Promise<Object>} - API response with tenant properties
 */
export const getTenantProperties = async () => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/properties/tenant-properties`);
    return response;
  } catch (error) {
    console.error('Error fetching tenant properties:', error);
    throw error;
  }
};