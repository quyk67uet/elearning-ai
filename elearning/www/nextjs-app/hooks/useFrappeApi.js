import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '../lib/api-client';

/**
 * Custom hook for interacting with Frappe API
 * @returns {Object} API methods and state
 */
export function useFrappeApi() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Call a Frappe method
  const callMethod = useCallback(async (method, params = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user is authenticated
      if (status === 'unauthenticated') {
        throw new Error('You must be logged in to access this resource');
      }
      
      const result = await apiClient.callMethod(method, params);
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, [status]);

  // Get a Frappe document
  const getDoc = useCallback(async (doctype, name, params = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.getResource(doctype, name, params);
      setIsLoading(false);
      return result.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // List Frappe documents
  const listDocs = useCallback(async (doctype, params = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.listResources(doctype, params);
      setIsLoading(false);
      return result.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Create a Frappe document
  const createDoc = useCallback(async (doctype, doc) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.createResource(doctype, doc);
      setIsLoading(false);
      return result.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Update a Frappe document
  const updateDoc = useCallback(async (doctype, name, doc) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.updateResource(doctype, name, doc);
      setIsLoading(false);
      return result.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Delete a Frappe document
  const deleteDoc = useCallback(async (doctype, name) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.deleteResource(doctype, name);
      setIsLoading(false);
      return result.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Check if user is authenticated with Frappe
  const isAuthenticated = useCallback(() => {
    return status === 'authenticated';
  }, [status]);

  return {
    callMethod,
    getDoc,
    listDocs,
    createDoc,
    updateDoc,
    deleteDoc,
    isAuthenticated,
    isLoading,
    error,
    session
  };
} 