import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/pages/api/helper';
import { useUserFlashcardSettings } from './useUserFlashcardSettings';

/**
 * Custom hook for SRS mode functionality
 * @param {string} topicId - The topic ID
 * @returns {object} SRS mode state and methods
 */
export function useSrsMode(topicId) {
  // Cards state
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isRoundCompleted, setIsRoundCompleted] = useState(false);
  
  // Loading states
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isProcessingRating, setIsProcessingRating] = useState(false);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Statistics state
  const [srsStats, setSrsStats] = useState({
    new: 0,
    learning: 0,
    review: 0,
    lapsed: 0,
    total: 0,
    due: 0,
    upcoming: 0,
    current_review: {
      new: 0,
      learning: 0,
      review: 0,
      lapsed: 0
    }
  });
  
  // Special message states
  const [noExamsMessage, setNoExamsMessage] = useState(false);
  const [noAssessmentsMessage, setNoAssessmentsMessage] = useState(false);
  
  // Force refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Get user settings
  const { settings } = useUserFlashcardSettings(topicId);

  // Derived state
  const currentCard = cards[currentCardIndex] || null;
  const hasNextCard = currentCardIndex < cards.length - 1;
  const hasPreviousCard = currentCardIndex > 0;

  /**
   * Force a refresh of the SRS data
   */
  const forceRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  /**
   * Fetch review cards from the API
   */
  const fetchReviewCards = useCallback(async () => {
    if (!topicId) return;
    
    setIsLoadingCards(true);
    setError(null);
    setNoExamsMessage(false);
    setNoAssessmentsMessage(false);
    
    try {
      console.log("Fetching SRS review cards for topic:", topicId);
      
      const response = await fetchWithAuth(
        "user_srs_progress.user_srs_progress.get_srs_review_cards",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId
          })
        }
      );
      
      console.log("SRS API response:", response);
      
      if (response?.message?.success) {
        const data = response.message;
        
        // Set special message flags
        if (data.no_exams) {
          setNoExamsMessage(true);
          setCards([]);
          setSrsStats({
            new: 0,
            learning: 0,
            review: 0,
            lapsed: 0,
            total: 0,
            due: 0,
            upcoming: 0,
            current_review: {
              new: 0,
              learning: 0,
              review: 0,
              lapsed: 0
            }
          });
        } else if (data.no_assessments) {
          setNoAssessmentsMessage(true);
          setCards([]);
          setSrsStats({
            new: 0,
            learning: 0,
            review: 0,
            lapsed: 0,
            total: 0,
            due: 0,
            upcoming: 0,
            current_review: {
              new: 0,
              learning: 0,
              review: 0,
              lapsed: 0
            }
          });
        } else {
          // Set cards and stats
          setCards(data.cards || []);
          setSrsStats(data.stats || {
            new: 0,
            learning: 0,
            review: 0,
            lapsed: 0,
            total: 0,
            due: 0,
            upcoming: 0,
            current_review: {
              new: 0,
              learning: 0,
              review: 0,
              lapsed: 0
            }
          });
          setIsRoundCompleted(false);
          setCurrentCardIndex(0);
          setIsAnswerVisible(false);
        }
      } else {
        throw new Error(response?.message?.message || "Failed to fetch SRS review cards");
      }
    } catch (error) {
      console.error("Error fetching SRS review cards:", error);
      setError(error.message || "Failed to fetch SRS review cards");
      setCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  }, [topicId]);
  
  // Process user rating for current card
  const processRating = useCallback(async (flashcardName, userRating) => {
    if (!flashcardName || isProcessingRating) return;
    
    setIsProcessingRating(true);
    
    try {
      const response = await fetchWithAuth(
        'user_srs_progress.user_srs_progress.update_srs_progress',
        {
          method: 'POST',
          body: JSON.stringify({
            flashcard_name: flashcardName,
            user_rating: userRating,
          }),
        }
      );
      
      if (!response?.message?.success) {
        throw new Error(response?.message?._error_message || 'Failed to update SRS progress');
      }
      
      // Move to next card or complete round
      if (hasNextCard) {
        setCurrentCardIndex(prevIndex => prevIndex + 1);
        setIsAnswerVisible(false);
      } else {
        setIsRoundCompleted(true);
      }
      
      console.log("Processed rating for card:", flashcardName);
    } catch (error) {
      console.error('Error processing rating:', error);
      setError(error.message || 'Could not update card progress. Please try again.');
    } finally {
      setIsProcessingRating(false);
    }
  }, [isProcessingRating, hasNextCard]);
  
  // Toggle answer visibility
  const toggleAnswer = useCallback(() => {
    setIsAnswerVisible(prev => !prev);
  }, []);
  
  // Start a new SRS round
  const startNewRound = useCallback(() => {
    fetchReviewCards();
  }, [fetchReviewCards]);
  
  // Navigation functions
  const goToNextCard = useCallback(() => {
    if (hasNextCard) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setIsAnswerVisible(false);
    }
  }, [hasNextCard]);
  
  const goToPreviousCard = useCallback(() => {
    if (hasPreviousCard) {
      setCurrentCardIndex(prevIndex => prevIndex - 1);
      setIsAnswerVisible(false);
    }
  }, [hasPreviousCard]);
  
  // Fetch cards when component mounts or when topicId changes or on forced refresh
  useEffect(() => {
    fetchReviewCards();
  }, [fetchReviewCards, refreshCounter]);
  
  return {
    cards,
    currentCard,
    currentCardIndex,
    isAnswerVisible,
    isLoadingCards,
    isProcessingRating,
    isRoundCompleted,
    error,
    srsStats,
    noExamsMessage,
    noAssessmentsMessage,
    fetchReviewCards,
    processRating,
    startNewRound,
    toggleAnswer,
    goToNextCard,
    goToPreviousCard,
    // Computed values
    hasNextCard,
    hasPreviousCard,
    forceRefresh
  };
}

// Export the old name for backward compatibility
export const useSrsCards = useSrsMode; 