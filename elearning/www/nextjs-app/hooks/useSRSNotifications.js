import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/pages/api/helper';

/**
 * Custom hook to manage SRS notifications
 * @returns {{ notifications, notificationCount, upcomingCount, totalCount, loading, error, fetchNotifications }}
 */
export function useSRSNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch notifications from the API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth("user_srs_progress.user_srs_progress.get_due_srs_summary");
      
      // Log response for debugging
      console.log("SRS notification response:", response);
      
      // Check if response exists and contains message property
      if (response && response.message) {
        // Extract data from message property
        const data = response.message;
        
        if (data.success) {
          setNotificationCount(data.due_count || 0);
          setUpcomingCount(data.upcoming_count || 0);
          setTotalCount(data.total_count || 0);
          setNotifications(data.topics || []);
        } else {
          throw new Error(data.message || "Failed to fetch notifications");
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching SRS notifications:", error);
      setError(error.message || "Failed to fetch notifications");
      
      // Reset notification counts on error
      setNotificationCount(0);
      setUpcomingCount(0);
      setTotalCount(0);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
    
    // Set up interval to check for notifications every 15 minutes
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    notificationCount,
    upcomingCount,
    totalCount,
    loading,
    error,
    fetchNotifications
  };
} 