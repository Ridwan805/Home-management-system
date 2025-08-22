// API utility functions for handling authentication and token expiration

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