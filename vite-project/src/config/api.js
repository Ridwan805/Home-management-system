/**
 * API configuration file
 * This file contains the base URL for API requests and authentication utilities
 */

// Function to get a free port (for demonstration, we'll use a fixed port for now)
// In a real application, you might want to implement a more sophisticated port detection mechanism
const getApiPort = () => {
  // You can implement logic to find a free port here if needed
  // For now, we'll use 5001 as the default port
  return 5001;
};

// Base URL for API requests
const API_BASE_URL = `http://localhost:${getApiPort()}`;

/**
 * Handles API responses and checks for token expiration
 * @param {Response} response - The fetch API response
 * @param {Function} navigate - React Router's navigate function (optional)
 * @returns {Promise<any>} - The parsed response data
 */
export const handleApiResponse = async (response, navigate = null) => {
  // First check if the response is ok
  if (response.ok) {
    return await response.json();
  }

  // If not ok, parse the error response
  const errorData = await response.json();
  
  // Check if token has expired
  if (response.status === 401 && errorData.expired) {
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
  throw new Error(errorData.message || 'An error occurred');
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
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) {
      throw new Error('Authentication required');
    }
    
    const user = JSON.parse(userData);
    const token = user.token;
    
    if (!token) {
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
    console.error('API request error:', error);
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
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) {
      throw new Error('Authentication required');
    }
    
    const user = JSON.parse(userData);
    const token = user.token;
    
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

// Export the base URL and other API-related configurations
export default {
  baseUrl: API_BASE_URL,
  endpoints: {
    // Auth endpoints
    login: '/api/auth/login',
    register: '/api/auth/register',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    
    // Property endpoints
    properties: '/api/properties',
    propertyById: (id) => `/api/properties/${id}`,
    propertyStatus: (id) => `/api/properties/${id}/status`,
    userProperties: '/api/properties/user',
    
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
    
    // Admin endpoints
    adminStats: '/api/admin/dashboard/stats',
    adminUsers: '/api/admin/users',
    banUser: (id) => `/api/admin/users/${id}/ban`,
    unbanUser: (id) => `/api/admin/users/${id}/unban`,
    deleteUser: (id) => `/api/admin/users/${id}`,
    reports: '/api/admin/reports',
    deleteReport: (id) => `/api/admin/reports/${id}`,
    escalateReport: (id) => `/api/admin/reports/${id}/escalate`,
    pendingProperties: '/api/admin/properties/pending',
    approveProperty: (id) => `/api/admin/properties/${id}/approve`,
  },
  
  // Helper function to get full URL for an endpoint
  getUrl: function(endpoint) {
    return `${this.baseUrl}${endpoint}`;
  }
};