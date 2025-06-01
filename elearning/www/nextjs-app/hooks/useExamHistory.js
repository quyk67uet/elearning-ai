import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";

/**
 * Custom hook to fetch and manage user's exam history
 * @param {string} [topicId] - Optional topic ID to filter the history
 * @returns {{ 
 *   examHistory,
 *   selectedAttempt,
 *   attemptDetails,
 *   isLoadingHistory,
 *   isLoadingDetails,
 *   error,
 *   fetchExamHistory,
 *   fetchAttemptDetails,
 *   selectAttempt
 * }}
 */
export function useExamHistory(topicId = null) {
  // State variables
  const [examHistory, setExamHistory] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch exam history
  const fetchExamHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setError(null);
    
    try {
      const apiPath = "user_exam_attempt.user_exam_attempt.get_user_exam_history";
      const body = topicId ? { topic_name: topicId } : {};
      
      const responseData = await fetchWithAuth(
        apiPath,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      
      if (!responseData?.message?.success) {
        throw new Error(responseData?.message?._error_message || "Failed to fetch exam history");
      }
      
      setExamHistory(responseData.message.attempts || []);
      
    } catch (error) {
      console.error("Error fetching exam history:", error);
      setError("Failed to load exam history. Please try again later.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [topicId]);
  
  // Fetch details for a specific attempt
  const fetchAttemptDetails = useCallback(async (attemptName) => {
    if (!attemptName) return;
    
    setIsLoadingDetails(true);
    setError(null);
    
    try {
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.get_exam_attempt_details",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: attemptName,
          }),
        }
      );
      
      if (!responseData?.message?.success) {
        throw new Error(responseData?.message?._error_message || "Failed to fetch attempt details");
      }
      
      setAttemptDetails(responseData.message.attempt || null);
      
    } catch (error) {
      console.error("Error fetching attempt details:", error);
      setError("Failed to load attempt details. Please try again later.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);
  
  // Select an attempt and fetch its details
  const selectAttempt = useCallback((attemptName) => {
    setSelectedAttempt(attemptName);
    fetchAttemptDetails(attemptName);
  }, [fetchAttemptDetails]);
  
  // Fetch exam history on initial load
  useEffect(() => {
    fetchExamHistory();
  }, [fetchExamHistory]);
  
  return {
    examHistory,
    selectedAttempt,
    attemptDetails,
    isLoadingHistory,
    isLoadingDetails,
    error,
    fetchExamHistory,
    fetchAttemptDetails,
    selectAttempt
  };
} 