import { useState, useEffect } from 'react';
import FlashcardView from '../FlashcardView';
import { useFlashcards } from '@/hooks/useFlashcards';

export default function BasicMode({ flashcards: initialFlashcards, loading: initialLoading, error: initialError, topicId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
    
  // Use the hook to get flashcards with filtering and refreshing capability
  const { 
    flashcards, 
    loading, 
    error, 
    refreshFlashcards 
  } = initialFlashcards ? 
    {
      flashcards: initialFlashcards,
      loading: initialLoading,
      error: initialError,
      refreshFlashcards: () => {}
    } : 
    useFlashcards(topicId);
    
  // Reset current index when flashcards change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowExplanation(false);
  }, [flashcards]);
    
  // Note: We don't need a listener for 'flashcardSettingsChanged' event
  // because useFlashcards.js now handles this directly
    
  if (loading) {
    return (
      <div className="w-full">
        <div className="flex justify-center items-center h-64">
          <p>Loading flashcards...</p>
        </div>
      </div>
    );
  }
    
  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
      </div>
    );
  }
    
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-gray-600">No flashcards available for this topic. Please check back later.</p>
        </div>
      </div>
    );
  }
    
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    // Reset explanation when flipping to front
    if (isFlipped) {
      setShowExplanation(false);
    }
  };
    
  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowExplanation(false);
    }
  };
    
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowExplanation(false);
    }
  };
    
  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };
    
  return (
    <div className="w-full max-w-full">
      {/* Progress bar */}
      <div className="mb-6 px-4 sm:px-0">
        <div className="mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Basic Mode</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{currentIndex + 1} / {flashcards.length}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          ></div>
        </div>
      </div>
            
      <FlashcardView 
        flashcards={flashcards}
        currentIndex={currentIndex}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        showExplanation={showExplanation}
        onToggleExplanation={toggleExplanation}
        topicId={topicId}
      />
    </div>
  );
}