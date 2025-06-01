import { useState, useEffect } from 'react';
import { useSrsMode } from '@/hooks/useSrsMode';
import { useUserFlashcardSettings } from '@/hooks/useUserFlashcardSettings';
import MathRenderer from '../MathRenderer';
import { XCircle, CheckCircle, Printer, Download, Info, ArrowRightCircle, FileText, Lightbulb } from 'lucide-react';

export default function SrsMode({ topicId }) {
  // Track reviewed cards for the session
  const [reviewedCards, setReviewedCards] = useState({});
  // State for hint display
  const [showHint, setShowHint] = useState(false);

  // Custom hooks for SRS functionality and user settings
  const {
    cards,
    currentCard,
    currentCardIndex,
    isAnswerVisible,
    isLoadingCards,
    isProcessingRating,
    isRoundCompleted,
    srsStats,
    error,
    noExamsMessage,
    noAssessmentsMessage,
    fetchReviewCards,
    processRating,
    startNewRound,
    toggleAnswer,
    goToNextCard,
    goToPreviousCard
  } = useSrsMode(topicId);

  const {
    settings,
    isLoadingSettings
  } = useUserFlashcardSettings(topicId);

  // Effect to listen for SRS reset events
  useEffect(() => {
    const handleSettingsChange = (event) => {
      // Ensure it's for this topic
      if (String(event.detail.topicId) === String(topicId)) {
        console.log('SrsMode: Detected settings change, refreshing data');
        // Force refresh the SRS data
        fetchReviewCards();
      }
    };

    // Listen for both settings changes and explicit SRS reset
    window.addEventListener('flashcardSettingsChanged', handleSettingsChange);
    window.addEventListener('srsProgressReset', (event) => {
      if (String(event.detail.topicId) === String(topicId)) {
        console.log('SrsMode: SRS progress reset detected, refreshing data');
        fetchReviewCards();
      }
    });
    
    return () => {
      window.removeEventListener('flashcardSettingsChanged', handleSettingsChange);
      window.removeEventListener('srsProgressReset', handleSettingsChange);
    };
  }, [topicId, fetchReviewCards]);

  // Track card ratings in the session
  const handleProcessRating = (flashcardName, rating) => {
    // Update the reviewedCards state
    setReviewedCards(prev => ({
      ...prev,
      [flashcardName]: rating
    }));
    
    // Call the actual processRating function
    processRating(flashcardName, rating);
  };

  // Format content with newlines for Identify the Error
  const formatContent = (content) => {
    if (!content) return "";
    return content.replace(/\\n/g, "\n");
  };

  // Get flashcard type tag color
  const getTagColor = (type) => {
    const typeColors = {
      "Concept/Theorem/Formula": "bg-blue-100 text-blue-800",
      "Fill in the Blank": "bg-green-100 text-green-800",
      "Ordering Steps": "bg-purple-100 text-purple-800",
      "What's the Next Step?": "bg-amber-100 text-amber-800",
      "Short Answer/Open-ended": "bg-indigo-100 text-indigo-800",
      "Identify the Error": "bg-red-100 text-red-800"
    };
    return typeColors[type] || "bg-gray-100 text-gray-800";
  };

  // Initial loading state
  if (isLoadingCards || isLoadingSettings) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Loading SRS data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
    );
  }

  // Show message if there are no exam attempts
  if (noExamsMessage) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Chưa có thẻ để ôn tập</h2>
          <p className="text-gray-600 mb-6">Bạn chưa có flashcard nào cần ôn tập. Hãy vào 'Exam Mode' để luyện tập, nhận feedback, và tự đánh giá. Những thẻ bạn cần củng cố sẽ được tự động thêm vào đây để ôn tập nhé!</p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => window.location.href = `/learn/${topicId}?mode=exam`}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Chuyển đến Exam Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if there are no self-assessments
  if (noAssessmentsMessage) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Chưa đánh giá mức độ hiểu</h2>
          <p className="text-gray-600 mb-6">
            Bạn chưa có flashcard nào được đưa vào hệ thống ôn tập SRS. Sau khi trả lời các câu hỏi trong Exam Mode, hãy đánh giá mức độ hiểu của bạn để hệ thống tự động thêm các thẻ vào lịch ôn tập!
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => window.location.href = `/learn/${topicId}?mode=exam`}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <ArrowRightCircle className="w-5 h-5 mr-2" />
              Chuyển đến Exam Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Round completed view
  if (isRoundCompleted) {
    // Calculate statistics
    const totalReviewed = Object.keys(reviewedCards).length;
    const correctAnswers = Object.values(reviewedCards).filter(rating => rating === "correct" || rating === "good").length;
    const wrongAnswers = Object.values(reviewedCards).filter(rating => rating === "wrong" || rating === "again").length;
    const hardAnswers = Object.values(reviewedCards).filter(rating => rating === "hard").length;
    
    // Calculate percent of cards that are known
    // Use the percentage of correct answers in this session instead of overall stats
    const correctPercent = totalReviewed > 0 ? Math.round((correctAnswers / totalReviewed) * 100) : 0;

    // Calculate how many new cards are remaining (total new cards minus the reviewed new cards)
    const totalNewCards = srsStats.new || 0;
    const reviewedNewCards = srsStats.reviewed?.new || 0;
    const remainingNewCards = Math.max(0, totalNewCards - reviewedNewCards);
    
    // Show "Start Next Round" button if there are any wrong answers in this session
    const showStartNextRound = wrongAnswers > 0;
    
    return (
      <div className="w-full max-w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Round Complete</h2>
          <p className="text-gray-600 mb-8">Great job! Keep studying to reach 100%</p>
          
          {/* Progress Donut */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#e0e0fe" 
                strokeWidth="10" 
              />
              
              {/* Progress arc */}
              <circle 
                cx="50" 
                cy="50" 
                r="45"
                fill="none"
                stroke="#6366f1"
                strokeWidth="10"
                strokeDasharray={`${correctPercent * 2.83} ${283 - correctPercent * 2.83}`}
                strokeDashoffset="70.75"
                transform="rotate(-90 50 50)"
              />
              
              {/* Percentage text */}
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill="#4f46e5"
              >
                {correctPercent}%
              </text>
              <text
                x="50"
                y="70"
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                Know
              </text>
            </svg>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-lg mx-auto">
            <div className="bg-purple-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-purple-200 rounded text-xs font-medium mb-1">New</span>
              <p className="text-xl font-bold text-purple-800">{remainingNewCards}</p>
              <p className="text-xs text-purple-600">cards remaining to study</p>
            </div>
            
            <div className="bg-amber-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-amber-200 rounded text-xs font-medium mb-1">Don't know</span>
              <p className="text-xl font-bold text-amber-800">{wrongAnswers}</p>
              <p className="text-xs text-amber-600">cards to study again</p>
            </div>
            
            <div className="bg-green-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-green-200 rounded text-xs font-medium mb-1">Know</span>
              <p className="text-xl font-bold text-green-800">{correctAnswers}</p>
              <p className="text-xs text-green-600">cards reviewed correctly</p>
            </div>

            <div className="bg-red-100 p-3 rounded-lg">
              <span className="inline-block px-2 py-1 bg-red-200 rounded text-xs font-medium mb-1">Hard</span>
              <p className="text-xl font-bold text-red-800">{hardAnswers}</p>
              <p className="text-xs text-red-600">cards marked as hard</p>
            </div>
          </div>

          
          {/* Only show Start Next Round if there are any wrong answers */}
          {showStartNextRound ? (
            <div className="flex justify-center">
              <button
                onClick={startNewRound}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
              >
                Start Next Round
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <p className="text-green-700 font-medium">
                All cards completed! Check back later for more reviews.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No cards to review
  if (cards.length === 0) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">No Cards to Review</h2>
          <p className="text-gray-600 mb-6">You've completed all your reviews for now. Check back later for more cards to review.</p>
        </div>
      </div>
    );
  }

  // Regular SRS mode view with card
  return (
    <div className="w-full max-w-full">
      {/* Current card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-8">
          {/* Card content */}
          <div className="min-h-[300px] mb-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              {currentCard?.flashcard_type && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(currentCard.flashcard_type)}`}>
                  {currentCard.flashcard_type}
                </span>
              )}
              
              {currentCard?.hint && (
                <div className="relative">
                  <button 
                    className="w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                    onMouseEnter={() => setShowHint(true)}
                    onMouseLeave={() => setShowHint(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint(!showHint);
                    }}
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                  
                  {showHint && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 text-sm z-20">
                      <div className="font-medium text-gray-700 mb-1">Hint:</div>
                      <div className="text-gray-600">
                        <MathRenderer content={currentCard.hint} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {isAnswerVisible ? (
              <div>
                <h3 className="text-gray-500 mb-4 text-sm font-medium">Question:</h3>
                <div className="mb-6 whitespace-pre-line">
                  {currentCard?.flashcard_type === "Ordering Steps" ? (
                    <div>
                      <MathRenderer content={currentCard?.question || ''} />
                      {currentCard?.ordering_steps_items && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Thứ tự các bước đúng:</p>
                          <div className="space-y-2">
                            {currentCard.ordering_steps_items.map((step, index) => (
                              <div
                                key={index}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-md"
                              >
                                <div className="flex items-center">
                                  <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full text-sm mr-3">
                                    {step.correct_order}
                                  </span>
                                  <div className="flex-1">
                                    <MathRenderer content={step.step_content} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : currentCard?.flashcard_type === "Identify the Error" ? (
                    <MathRenderer content={formatContent(currentCard?.question || '')} />
                  ) : (
                    <MathRenderer content={currentCard?.question || ''} />
                  )}
                </div>
                <h3 className="text-gray-500 mb-2 text-sm font-medium">Answer:</h3>
                <div className="prose max-w-none whitespace-pre-line">
                  {currentCard?.flashcard_type === "Identify the Error" ? (
                    <MathRenderer content={formatContent(currentCard?.answer || '')} />
                  ) : (
                    <MathRenderer content={currentCard?.answer || ''} />
                  )}
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-line">
                {currentCard?.flashcard_type === "Ordering Steps" ? (
                  <div>
                    <MathRenderer content={currentCard?.question || ''} />
                    {currentCard?.ordering_steps_items && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Sắp xếp các bước theo thứ tự đúng:</p>
                        <div className="space-y-2">
                          {currentCard.ordering_steps_items.map((step, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-50 border border-gray-200 rounded-md"
                            >
                              <div className="flex items-center">
                                <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full text-sm mr-3">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <MathRenderer content={step.step_content} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : currentCard?.flashcard_type === "Identify the Error" ? (
                  <MathRenderer content={formatContent(currentCard?.question || '')} />
                ) : (
                  <MathRenderer content={currentCard?.question || ''} />
                )}
              </div>
            )}
          </div>
          
          {/* Card actions */}
          <div className="flex justify-center mt-6">
            {!isAnswerVisible ? (
              <button
                onClick={toggleAnswer}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700"
              >
                Show Answer
              </button>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleProcessRating(currentCard?.name, "wrong")}
                  disabled={isProcessingRating}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-md font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Quên
                </button>
                <button
                  onClick={() => handleProcessRating(currentCard?.name, "hard")}
                  disabled={isProcessingRating}
                  className="flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-md font-medium hover:bg-amber-200 disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Khó
                </button>
                <button
                  onClick={() => handleProcessRating(currentCard?.name, "correct")}
                  disabled={isProcessingRating}
                  className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium hover:bg-green-200 disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Nhớ
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Card footer with progress */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-purple-300 rounded-full mr-2"></span>
              <span className="text-sm text-gray-600">{currentCardIndex + 1} / {cards.length}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {currentCard?.status === "new" ? (
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">New</span>
                ) : currentCard?.status === "learning" || currentCard?.status === "lapsed" ? (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">Learning</span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Review</span>
                )}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              className={`p-1 rounded-full ${
                currentCardIndex === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextCard}
              disabled={currentCardIndex === cards.length - 1}
              className={`p-1 rounded-full ${
                currentCardIndex === cards.length - 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Review Stats */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Current Review</h3>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mt-2">
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-lg font-semibold text-purple-700">{srsStats.current_review?.new || 0}</div>
            <div className="text-xs text-purple-600">New</div>
          </div>
          <div className="bg-amber-50 p-2 rounded">
            <div className="text-lg font-semibold text-amber-700">{(srsStats.current_review?.learning || 0) + (srsStats.current_review?.lapsed || 0)}</div>
            <div className="text-xs text-amber-600">Learning</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-semibold text-green-700">{srsStats.current_review?.review || 0}</div>
            <div className="text-xs text-green-600">Review</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-lg font-semibold text-blue-700">{srsStats.due || 0}</div>
            <div className="text-xs text-blue-600">Total Due</div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Stats</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-purple-50 p-2 rounded">
              <div className="text-lg font-semibold text-purple-700">{srsStats.new || 0}</div>
              <div className="text-xs text-purple-600">New</div>
            </div>
            <div className="bg-amber-50 p-2 rounded">
              <div className="text-lg font-semibold text-amber-700">{srsStats.learning || 0}</div>
              <div className="text-xs text-amber-600">Learning</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-lg font-semibold text-green-700">{srsStats.review || 0}</div>
              <div className="text-xs text-green-600">Review</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="text-lg font-semibold text-red-700">{srsStats.lapsed || 0}</div>
              <div className="text-xs text-red-600">Lapsed</div>
            </div>
          </div>
        </div>
        
        {/* Upcoming Reviews */}
        {srsStats && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Upcoming Reviews</h4>
            {srsStats.upcoming && srsStats.upcoming > 0 ? (
              <div className="flex items-center justify-between bg-amber-50 p-3 rounded">
                <div>
                  <span className="text-amber-800 font-medium">{srsStats.upcoming}</span> 
                  <span className="text-amber-700 text-sm ml-1">thẻ sắp đến hạn ôn tập</span>
                </div>
                <div className="text-xs text-amber-600">
                  Trong 2 ngày tới
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center bg-gray-50 p-3 rounded">
                <span className="text-gray-600 text-sm">Không có thẻ nào sắp đến hạn ôn tập</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
