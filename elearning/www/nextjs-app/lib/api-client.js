import axios from 'axios';
import { getSession } from 'next-auth/react';

/**
 * API client for making authenticated requests to Frappe backend
 */
class ApiClient {
  constructor() {
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL || 'http://learn.local',
      withCredentials: false, // Changed to false since we're using JWT instead of cookies
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Set up response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle Frappe specific errors
        const originalRequest = error.config;
        
        // If we got a 403 Forbidden, it might be a CSRF token issue
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Get a new CSRF token
            const csrfResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/frappe.auth.get_csrf_token`,
              { withCredentials: true }
            );
            
            const csrfToken = csrfResponse.data.message;
            
            // Set the token in the headers and retry the request
            originalRequest.headers['X-Frappe-CSRF-Token'] = csrfToken;
            return this.client(originalRequest);
          } catch (csrfError) {
            console.error('Error refreshing CSRF token:', csrfError);
            return Promise.reject(error);
          }
        }
        
        // If we got a 401 Unauthorized, user might need to login again
        if (error.response?.status === 401) {
          console.error('Authentication failed. Please login again.');
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Add request interceptor for JWT token and CSRF token handling
    this.client.interceptors.request.use(
      async (config) => {
        // Add JWT token from session if available
        if (typeof window !== 'undefined') {
          try {
            const session = await getSession();
            if (session?.accessToken) {
              config.headers['Authorization'] = `Bearer ${session.accessToken}`;
            }
          } catch (e) {
            console.error('Error getting JWT token from session:', e);
          }
        }
        
        // For methods that modify data, ensure we have CSRF token
        if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
          try {
            // Try to get existing CSRF token from cookie if we're in a browser
            let csrfToken = null;
            if (typeof document !== 'undefined') {
              const csrfCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('frappe_csrf_token='));
                
              csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;
            }
            
            // If no token in cookies, fetch a new one
            if (!csrfToken) {
              const response = await axios.get(
                `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/method/frappe.auth.get_csrf_token`,
                { withCredentials: true }
              );
              csrfToken = response.data.message;
            }
            
            // Set the CSRF token in headers
            config.headers['X-Frappe-CSRF-Token'] = csrfToken;
          } catch (error) {
            console.error('Error getting CSRF token:', error);
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Call Frappe API method
   * @param {string} method - Frappe method path (e.g. 'frappe.auth.get_logged_user')
   * @param {object} params - Method parameters
   * @returns {Promise} API response
   */
  async callMethod(method, params = {}) {
    try {
      const response = await this.client.post(`/api/method/${method}`, params);
      return response.data;
    } catch (error) {
      console.error(`Error calling method ${method}:`, error);
      throw error;
    }
  }

  /**
   * Get Frappe resource
   * @param {string} doctype - Doctype name
   * @param {string} name - Document name
   * @param {object} params - Additional parameters
   * @returns {Promise} API response
   */
  async getResource(doctype, name, params = {}) {
    try {
      const response = await this.client.get(`/api/resource/${doctype}/${name}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error getting resource ${doctype}/${name}:`, error);
      throw error;
    }
  }

  /**
   * List Frappe resources
   * @param {string} doctype - Doctype name
   * @param {object} params - Query parameters
   * @returns {Promise} API response
   */
  async listResources(doctype, params = {}) {
    try {
      const response = await this.client.get(`/api/resource/${doctype}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error listing resources for ${doctype}:`, error);
      throw error;
    }
  }

  /**
   * Create Frappe resource
   * @param {string} doctype - Doctype name
   * @param {object} data - Document data
   * @returns {Promise} API response
   */
  async createResource(doctype, data) {
    try {
      const response = await this.client.post(`/api/resource/${doctype}`, { data });
      return response.data;
    } catch (error) {
      console.error(`Error creating resource for ${doctype}:`, error);
      throw error;
    }
  }

  /**
   * Update Frappe resource
   * @param {string} doctype - Doctype name
   * @param {string} name - Document name
   * @param {object} data - Document data to update
   * @returns {Promise} API response
   */
  async updateResource(doctype, name, data) {
    try {
      const response = await this.client.put(`/api/resource/${doctype}/${name}`, { data });
      return response.data;
    } catch (error) {
      console.error(`Error updating resource ${doctype}/${name}:`, error);
      throw error;
    }
  }

  /**
   * Delete Frappe resource
   * @param {string} doctype - Doctype name
   * @param {string} name - Document name
   * @returns {Promise} API response
   */
  async deleteResource(doctype, name) {
    try {
      const response = await this.client.delete(`/api/resource/${doctype}/${name}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting resource ${doctype}/${name}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient; 