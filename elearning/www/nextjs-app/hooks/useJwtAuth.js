import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/pages/api/helper';

/**
 * Custom hook for JWT authentication
 * Provides access to JWT token, user info, and authentication status
 * 
 * @returns {Object} Authentication state and methods
 * - isAuthenticated: Boolean indicating if user is authenticated
 * - isLoading: Boolean indicating if session is loading
 * - user: User object from session
 * - accessToken: JWT token from session
 * - fetchWithAuth: Function to make authenticated API requests
 */
export function useJwtAuth() {
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsAuthenticated(true);
      setUser(session.user);
      setAccessToken(session.accessToken);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
    }
  }, [session, status]);

  /**
   * Makes an authenticated API request using the JWT token
   * 
   * @param {string} path - API path
   * @param {object} options - Request options
   * @returns {Promise<any>} - Response data
   */
  const makeAuthRequest = async (path, options = {}) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    
    return fetchWithAuth(path, options);
  };

  return {
    isAuthenticated,
    isLoading: status === 'loading',
    user,
    accessToken,
    makeAuthRequest,
  };
}

export default useJwtAuth; 