import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";
import { useFlashcards } from "./useFlashcards";

/**
 * Custom hook to manage Exam Mode
 * @param {string} topicId - The topic ID for the exam
 * @returns {{ 
 *   currentAttemptName, 
 *   examFlashcards, 
 *   currentQuestionIndex, 
 *   userAnswers,
 *   aiFeedbacks,
 *   isLoadingExam,
 *   isLoadingFeedback,
 *   isExamCompleted,
 *   activeQuestionFlashcardName,
 *   startExam,
 *   submitAnswer,
 *   completeExam,
 *   restartExam,
 *   goToNextQuestion,
 *   goToPreviousQuestion,
 *   resetQuestion,
 *   loadingFlashcards,
 *   flashcardsError,
 *   submitSelfAssessment
 * }}
 */
export function useExamMode(topicId) {
  // Get flashcards using the existing hook
  const { flashcards, loading: loadingFlashcards, error: flashcardsError } = useFlashcards(topicId);
  
  // State variables
  const [currentAttemptName, setCurrentAttemptName] = useState(null);
  const [examFlashcards, setExamFlashcards] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [aiFeedbacks, setAiFeedbacks] = useState({});
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  
  // Derived state
  const activeQuestionFlashcardName = examFlashcards[currentQuestionIndex]?.name || null;
  
  // Initialize flashcards when they load from the API
  useEffect(() => {
    if (flashcards && flashcards.length > 0 && !isExamCompleted) {
      setExamFlashcards(flashcards);
    }
  }, [flashcards, isExamCompleted]);
  
  // Start a new exam attempt
  const startExam = useCallback(async () => {
    if (!topicId || isLoadingExam || examFlashcards.length > 0) return;
    
    setIsLoadingExam(true);
    setUserAnswers({});
    setAiFeedbacks({});
    setIsExamCompleted(false);
    setCurrentQuestionIndex(0);
    
    try {
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.start_exam_attempt",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId,
          }),
        }
      );
      
      if (!responseData?.message?.success) {
        throw new Error(responseData?.message?._error_message || "Failed to start exam");
      }
      
      // Save the attempt name for future API calls
      setCurrentAttemptName(responseData.message.attempt.name);
      
      // If flashcards are already loaded, use them
      if (flashcards && flashcards.length > 0) {
        setExamFlashcards(flashcards);
      } else if (responseData.message.attempt.flashcards) {
        // Use flashcards from the response if available
        setExamFlashcards(responseData.message.attempt.flashcards);
      }
      
      console.log("Exam started with attempt ID:", responseData.message.attempt.name);
      
    } catch (error) {
      console.error("Error starting exam:", error);
      // Keep the error state in the component that uses this hook
    } finally {
      setIsLoadingExam(false);
    }
  }, [topicId, isLoadingExam, flashcards, examFlashcards.length]);
  
  // Submit an answer and get AI feedback
  const submitAnswer = useCallback(async (flashcardName, userAnswer) => {
    if (!currentAttemptName || !flashcardName || isLoadingFeedback) return null;
    
    setIsLoadingFeedback(true);
    
    try {
      // Save the user's answer in local state first
      setUserAnswers(prev => ({
        ...prev,
        [flashcardName]: userAnswer
      }));
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.submit_exam_answer_and_get_feedback",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
            flashcard_name: flashcardName,
            user_answer: userAnswer,
          }),
        }
      );
      
      // Log the full response to debug
      console.log("Full API Response:", responseData);
      
      if (!responseData?.message?.success) {
        // Handle API error
        console.error("API error:", responseData?.message?._error_message || "Unknown error");
        
        // Still provide feedback so UI can display something
        const errorFeedback = {
          ai_feedback_what_was_correct: "We couldn't generate feedback at this time.",
          ai_feedback_what_was_incorrect: responseData?.message?._error_message || "There was an error processing your answer.",
          ai_feedback_what_to_include: "Please try again later or contact support.",
          is_correct: false
        };
        
        setAiFeedbacks(prev => ({
          ...prev,
          [flashcardName]: errorFeedback
        }));
        
        return errorFeedback;
      }
      
      // Debug log the message structure
      console.log("Response message structure:", Object.keys(responseData.message));
      
      // Parse feedback data based on the API response structure
      let feedbackData;
      
      // Try different possible structures
      if (responseData.message.ai_feedback_what_was_correct !== undefined) {
        // Direct structure
        feedbackData = {
          ai_feedback_what_was_correct: responseData.message.ai_feedback_what_was_correct || "",
          ai_feedback_what_was_incorrect: responseData.message.ai_feedback_what_was_incorrect || "",
          ai_feedback_what_to_include: responseData.message.ai_feedback_what_to_include || "",
          is_correct: responseData.message.is_correct
        };
      } else if (responseData.message.feedback) {
        // Nested under 'feedback'
        feedbackData = {
          ai_feedback_what_was_correct: responseData.message.feedback.ai_feedback_what_was_correct || "",
          ai_feedback_what_was_incorrect: responseData.message.feedback.ai_feedback_what_was_incorrect || "",
          ai_feedback_what_to_include: responseData.message.feedback.ai_feedback_what_to_include || "",
          is_correct: responseData.message.is_correct || responseData.message.feedback.is_correct
        };
      } else {
        // Fallback with error messages
        console.warn("Feedback structure not recognized");
        feedbackData = {
          ai_feedback_what_was_correct: "We couldn't parse the feedback correctly.",
          ai_feedback_what_was_incorrect: "There might be an issue with the feedback format.",
          ai_feedback_what_to_include: "Please try again or submit a different answer.",
          is_correct: false
        };
      }
      
      // Check for empty or error messages in feedback
      if (
        (feedbackData.ai_feedback_what_was_correct && feedbackData.ai_feedback_what_was_correct.includes("error")) ||
        (feedbackData.ai_feedback_what_was_incorrect && feedbackData.ai_feedback_what_was_incorrect.includes("Error:"))
      ) {
        console.warn("API returned error in feedback:", feedbackData);
      }
      
      // Log the extracted feedback data
      console.log("Extracted feedback data:", feedbackData);
      
      setAiFeedbacks(prev => ({
        ...prev,
        [flashcardName]: feedbackData
      }));
      
      return feedbackData;
      
    } catch (error) {
      console.error("Error submitting answer:", error);
      
      // Provide fallback feedback for UI
      const errorFeedback = {
        ai_feedback_what_was_correct: "We encountered a technical issue.",
        ai_feedback_what_was_incorrect: `Error: ${error.message || "Unknown error"}`,
        ai_feedback_what_to_include: "Please try again later or contact support.",
        is_correct: false
      };
      
      setAiFeedbacks(prev => ({
        ...prev,
        [flashcardName]: errorFeedback
      }));
      
      return errorFeedback;
    } finally {
      setIsLoadingFeedback(false);
    }
  }, [currentAttemptName, isLoadingFeedback]);
  
  // Complete the exam
  const completeExam = useCallback(async () => {
    if (!currentAttemptName) return;
    
    try {
      // Set the state to completed first to ensure UI updates even if there's an API delay
      setIsExamCompleted(true);
      
      const responseData = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.complete_exam_attempt",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
          }),
        }
      );
      
      // Even if the API call fails, we keep the UI in completed state
      // since all answers have been recorded already
      if (!responseData?.message?.success) {
        console.warn("API call to complete exam returned an error, but the exam is still considered complete");
        console.warn(responseData?.message?._error_message || "Unknown error");
      }
      
      console.log("Exam completed successfully");
      
    } catch (error) {
      console.error("Error completing exam:", error);
      // We still consider the exam completed from the UI perspective
      // even if the API call fails
    }
  }, [currentAttemptName]);
  
  // Restart the exam
  const restartExam = useCallback(async () => {
    setCurrentAttemptName(null);
    setUserAnswers({});
    setAiFeedbacks({});
    setIsExamCompleted(false);
    setCurrentQuestionIndex(0);
    
    // Start a new exam
    await startExam();
  }, [startExam]);
  
  // Navigation functions
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < examFlashcards.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, examFlashcards.length]);
  
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);
  
  // Reset the current question (clear answer and feedback)
  const resetQuestion = useCallback((flashcardName) => {
    if (!flashcardName) return;
    
    // Create new objects without the keys for the current flashcard
    const newUserAnswers = { ...userAnswers };
    const newAiFeedbacks = { ...aiFeedbacks };
    
    delete newUserAnswers[flashcardName];
    delete newAiFeedbacks[flashcardName];
    
    setUserAnswers(newUserAnswers);
    setAiFeedbacks(newAiFeedbacks);
  }, [userAnswers, aiFeedbacks]);
  
  // Submit self-assessment and initialize SRS progress
  const submitSelfAssessment = useCallback(async (flashcardName, selfAssessmentValue) => {
    if (!currentAttemptName || !flashcardName || !selfAssessmentValue) return null;
    
    try {
      const response = await fetchWithAuth(
        "user_exam_attempt.user_exam_attempt.submit_self_assessment_and_init_srs",
        {
          method: "POST",
          body: JSON.stringify({
            attempt_name: currentAttemptName,
            flashcard_name: flashcardName,
            self_assessment_value: selfAssessmentValue,
          }),
        }
      );
      
      if (!response?.message?.success) {
        throw new Error(response?.message?._error_message || "Failed to submit self-assessment");
      }
      
      console.log("Submitted self-assessment for card:", flashcardName);
      return true;
      
    } catch (error) {
      console.error("Error submitting self-assessment:", error);
      return false;
    }
  }, [currentAttemptName]);
  
  return {
    currentAttemptName,
    examFlashcards,
    currentQuestionIndex,
    userAnswers,
    aiFeedbacks,
    isLoadingExam,
    isLoadingFeedback,
    isExamCompleted,
    activeQuestionFlashcardName,
    startExam,
    submitAnswer,
    completeExam,
    restartExam,
    goToNextQuestion,
    goToPreviousQuestion,
    resetQuestion,
    loadingFlashcards,
    flashcardsError,
    submitSelfAssessment
  };
} 