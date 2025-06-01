import { useState, useEffect } from 'react';
import { useExamMode } from '@/hooks/useExamMode';
import MathRenderer from '../MathRenderer';
import { RefreshCw, Lightbulb } from 'lucide-react';

export default function ExamMode({ topicId }) {
  const {
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
  } = useExamMode(topicId);

  // Local state for user input
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [selfAssessment, setSelfAssessment] = useState('');
  const [isSubmittingSelfAssessment, setIsSubmittingSelfAssessment] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Initialize exam on first render
  useEffect(() => {
    if (!currentAttemptName && !isLoadingExam && examFlashcards.length === 0) {
      startExam();
    }
  }, [currentAttemptName, isLoadingExam, startExam, examFlashcards.length]);

  // Update current answer when changing questions or if there's a saved answer
  useEffect(() => {
    if (activeQuestionFlashcardName) {
      if (userAnswers[activeQuestionFlashcardName]) {
        setCurrentAnswer(userAnswers[activeQuestionFlashcardName]);
        setHasSubmitted(!!aiFeedbacks[activeQuestionFlashcardName]);
      } else {
        setCurrentAnswer('');
        setHasSubmitted(false);
      }
    }
  }, [activeQuestionFlashcardName, userAnswers, aiFeedbacks]);

  // Loading state
  if (isLoadingExam || loadingFlashcards) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Đang tải bài kiểm tra...</p>
      </div>
    );
  }

  // Error state
  if (flashcardsError) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">{flashcardsError}</div>
    );
  }

  // No flashcards
  if (!examFlashcards || examFlashcards.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-600">Không có thẻ ghi nhớ nào cho chủ đề này. Vui lòng kiểm tra lại sau.</p>
      </div>
    );
  }

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

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !activeQuestionFlashcardName || hasSubmitted || isLoadingFeedback) {
      return;
    }

    await submitAnswer(activeQuestionFlashcardName, currentAnswer.trim());
    setHasSubmitted(true);
    setShowSelfAssessment(true);
  };

  // Handle self-assessment submission
  const handleSubmitSelfAssessment = async () => {
    if (!selfAssessment || !activeQuestionFlashcardName || isSubmittingSelfAssessment) {
      return;
    }

    setIsSubmittingSelfAssessment(true);
    try {
      const success = await submitSelfAssessment(activeQuestionFlashcardName, selfAssessment);
      if (success) {
        setShowSelfAssessment(false);
        setSelfAssessment('');
        
        // Auto advance to next question if not the last one
        if (currentQuestionIndex < examFlashcards.length - 1) {
          goToNextQuestion();
        }
      }
    } catch (error) {
      console.error('Error submitting self-assessment:', error);
    } finally {
      setIsSubmittingSelfAssessment(false);
    }
  };

  // Reset current question
  const handleResetQuestion = () => {
    if (activeQuestionFlashcardName) {
      resetQuestion(activeQuestionFlashcardName);
      setCurrentAnswer('');
      setHasSubmitted(false);
      setShowSelfAssessment(false);
    }
  };

  // Complete the exam
  const handleCompleteExam = async () => {
    await completeExam();
  };

  // Handle restart exam
  const handleRestartExam = async () => {
    await restartExam();
  };

  // Calculate progress
  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = examFlashcards.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Current flashcard
  const currentFlashcard = examFlashcards[currentQuestionIndex];
  
  // Exam complete view
  if (isExamCompleted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-3xl mx-auto">
        {/* Main completion card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full text-center">
          {/* Success icon */}
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Hoàn thành bài kiểm tra</h2>
          
          {/* Description */}
          <div className="mb-8">
            <p className="text-gray-700 text-lg mb-3">
              Chúc mừng! Bạn đã hoàn thành tất cả <span className="font-semibold text-emerald-600">{totalQuestions} thẻ ghi nhớ</span> trong bộ này.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
              <p className="text-blue-800 text-sm leading-relaxed">
                Bạn đã đánh giá mức độ hiểu của mình cho từng thẻ, và hệ thống đã tự động đưa những thẻ bạn cần ôn tập vào chế độ SRS.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() => window.location.href = `/learn/${topicId}?mode=srs`}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Chuyển sang chế độ SRS để ôn tập
            </button>
            
            <button
              onClick={handleRestartExam}
              className="bg-white border-2 border-indigo-300 text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 w-full sm:w-auto"
            >
              Bắt đầu lại
            </button>
          </div>

          {/* Footer note */}
          <div className="bg-gray-50 rounded-lg p-4 mx-auto max-w-lg">
            <p className="text-gray-600 text-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hệ thống SRS sẽ nhắc nhở bạn ôn tập các thẻ này vào thời điểm tối ưu để tăng cường khả năng ghi nhớ dài hạn.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-full">
      {/* Progress bar */}
      <div className="mb-6 px-4 sm:px-0">
        <div className="mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800">Exam Mode</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{answeredCount} / {totalQuestions} answered</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-8 min-h-[400px] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                Câu hỏi {currentQuestionIndex + 1} / {examFlashcards.length}
              </span>
              {currentFlashcard?.flashcard_type && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(currentFlashcard.flashcard_type)}`}>
                  {currentFlashcard.flashcard_type}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {currentFlashcard?.hint && (
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
                        <MathRenderer content={currentFlashcard.hint} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={handleResetQuestion}
                disabled={!hasSubmitted}
                className={`flex items-center text-sm ${
                  hasSubmitted 
                    ? "text-indigo-600 hover:text-indigo-800" 
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Làm lại
              </button>
            </div>
          </div>
          
          <div className="prose max-w-none mb-6 whitespace-pre-line">
            {currentFlashcard?.flashcard_type === "Ordering Steps" ? (
              <div>
                <MathRenderer content={currentFlashcard?.question || ''} />
                {!hasSubmitted && currentFlashcard?.ordering_steps_items && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Sắp xếp các bước theo thứ tự đúng:</p>
                    <div className="space-y-2">
                      {currentFlashcard.ordering_steps_items.map((step, index) => (
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
                    <p className="text-sm text-gray-500 mt-4">
                      Hãy viết danh sách các bước theo thứ tự đúng vào khung trả lời phía dưới.
                    </p>
                  </div>
                )}
                {hasSubmitted && currentFlashcard?.ordering_steps_items && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-gray-700 font-medium mb-2">Thứ tự đúng:</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      {currentFlashcard.ordering_steps_items
                        .sort((a, b) => a.correct_order - b.correct_order)
                        .map((step) => (
                          <li key={step.correct_order} className="pl-2">
                            <div className="prose prose-sm max-w-none">
                              <MathRenderer content={step.step_content} />
                            </div>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : currentFlashcard?.flashcard_type === "Identify the Error" ? (
              <MathRenderer content={formatContent(currentFlashcard?.question || '')} />
            ) : (
              <MathRenderer content={currentFlashcard?.question || ''} />
            )}
          </div>
          
          <div className="mt-6">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
              Câu trả lời của bạn
            </label>
            <textarea
              id="answer"
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Nhập câu trả lời của bạn"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              readOnly={hasSubmitted}
            ></textarea>
          </div>
          
          {hasSubmitted && aiFeedbacks[activeQuestionFlashcardName] && (
            <div className="mt-6 space-y-4">
              {/* What was correct */}
              {aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_correct && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-green-700 font-medium mb-2">What was correct</h3>
                  <div className="text-green-600 text-sm">
                    <MathRenderer content={aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_correct} />
                  </div>
                </div>
              )}
              
              {/* What was incorrect */}
              {aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_incorrect && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h3 className="text-red-700 font-medium mb-2">What was incorrect</h3>
                  <div className="text-red-600 text-sm">
                    <MathRenderer content={aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_incorrect} />
                  </div>
                </div>
              )}
              
              {/* What to include */}
              {aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_to_include && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="text-purple-700 font-medium mb-2">What you could have included</h3>
                  <div className="text-purple-600 text-sm">
                    <MathRenderer content={aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_to_include} />
                  </div>
                </div>
              )}

              {/* Handle case when all feedback sections are empty or missing */}
              {!aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_correct && 
               !aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_was_incorrect && 
               !aiFeedbacks[activeQuestionFlashcardName].ai_feedback_what_to_include && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="text-yellow-700 font-medium mb-2">Không có phản hồi</h3>
                  <div className="text-yellow-600 text-sm">
                    <p>Chúng tôi không thể tạo phản hồi cho câu trả lời của bạn lúc này. Vui lòng thử lại sau.</p>
                  </div>
                </div>
              )}

              {/* Self-assessment section */}
              {showSelfAssessment && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-blue-700 font-medium mb-2">Đánh giá mức độ hiểu của bạn</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['Chưa hiểu', 'Mơ hồ', 'Khá ổn', 'Rất rõ'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelfAssessment(level)}
                        className={`py-2 px-3 rounded-md text-sm ${
                          selfAssessment === level
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleSubmitSelfAssessment}
                      disabled={!selfAssessment}
                      className={`px-4 py-2 rounded text-sm ${
                        !selfAssessment
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Gửi & Tiếp tục
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`flex items-center justify-center w-12 h-12 rounded-full border ${
            currentQuestionIndex === 0
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex space-x-4">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || isLoadingFeedback}
              className={`bg-indigo-600 text-white px-4 py-2 rounded-md font-medium ${
                !currentAnswer.trim() || isLoadingFeedback
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-700"
              } transition-colors`}
            >
              {isLoadingFeedback ? "Đang lấy phản hồi..." : "Gửi câu trả lời & Nhận phản hồi"}
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === examFlashcards.length - 1}
              className={`bg-indigo-600 text-white px-4 py-2 rounded-md font-medium ${
                currentQuestionIndex === examFlashcards.length - 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-700"
              } transition-colors`}
            >
              Câu hỏi tiếp theo
            </button>
          )}
          
          {answeredCount === totalQuestions && (
            <button
              onClick={handleCompleteExam}
              className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              Hoàn thành bài kiểm tra
            </button>
          )}
        </div>

        <button
          onClick={goToNextQuestion}
          disabled={currentQuestionIndex === examFlashcards.length - 1}
          className={`flex items-center justify-center w-12 h-12 rounded-full border ${
            currentQuestionIndex === examFlashcards.length - 1
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}