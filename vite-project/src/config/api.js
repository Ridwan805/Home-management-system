/**
 * API configuration file
 * This file contains the base URL for API requests
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
    
<<<<<<< Updated upstream
=======
    // Payment endpoints
  getStripeKey: '/api/stripe/publishable-key',
  createPayment: (requestId) => `/api/stripe/create-payment-session/${requestId}`,
  createFullPayment: (requestId) => `/api/stripe/create-full-payment-session/${requestId}`,
  paymentHistory: '/api/payments/history',
  paymentDetails: (paymentId) => `/api/payments/${paymentId}`,
  updatePaymentStatus: (paymentId) => `/api/stripe/payment-status/${paymentId}`,
  getReceipt: (paymentId) => `/api/stripe/receipt/${paymentId}`,
    
>>>>>>> Stashed changes
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