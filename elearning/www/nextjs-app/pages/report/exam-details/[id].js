import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../../../pages/api/helper';
import MathRenderer from '../../../components/learn/MathRenderer';

export default function ExamDetails() {
  const router = useRouter();
  const { id } = router.query;
  
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await fetchWithAuth(
          "user_exam_attempt.user_exam_attempt.get_exam_attempt_details",
          {
            method: "POST",
            body: JSON.stringify({
              attempt_name: id
            })
          }
        );
        
        console.log("API Response:", response);
        
        if (response?.message?.success) {
          setAttemptDetails(response.message.attempt);
        } else {
          setError('Failed to load exam details. Please try again later.');
          console.error("API Error:", response);
        }
      } catch (err) {
        console.error('Error fetching exam details:', err);
        setError('An error occurred while loading exam details.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamDetails();
  }, [id]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Toggle a question's expanded state
  const toggleQuestion = (questionId) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(questionId);
    }
  };
  
  // Check if this is a flashcard exam
  const isFlashcardExam = id?.startsWith('UEA');
  
  // Calculate score (only for multiple choice exams)
  const calculateScore = () => {
    if (!attemptDetails || !attemptDetails.details || isFlashcardExam) {
      return { correct: 0, total: 0, percentage: 0 };
    }
    
    const total = attemptDetails.details.length;
    let correct = 0;
    
    attemptDetails.details.forEach(detail => {
      // Handle cases where ai_feedback might be missing or have a different structure
      if (detail.ai_feedback_what_was_incorrect !== undefined) {
        // Old API structure with separate fields
        if (detail.ai_feedback_what_was_incorrect === '' || 
            detail.ai_feedback_what_was_incorrect.toLowerCase().includes('no errors') ||
            detail.ai_feedback_what_was_incorrect.toLowerCase().includes('correctly')) {
          correct++;
        }
      } else if (detail.ai_feedback && typeof detail.ai_feedback === 'object') {
        // New API structure with nested object
        const incorrectFeedback = detail.ai_feedback.what_was_incorrect || '';
        if (incorrectFeedback === '' || 
            incorrectFeedback.toLowerCase().includes('no errors') ||
            incorrectFeedback.toLowerCase().includes('correctly')) {
          correct++;
        }
      }
    });
    
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return { correct, total, percentage };
  };
  
  // Back to report page
  const goBackToReport = () => {
    router.push('/report');
  };
  
  const score = calculateScore();
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <button 
          onClick={goBackToReport}
          className="mr-4 text-blue-500 hover:text-blue-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Report
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
      ) : attemptDetails ? (
        <div className="space-y-8">
          {/* Attempt summary */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold mb-4">{attemptDetails.topic_name || 'Flashcard Exam'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Exam ID:</p>
                  <p className="font-medium">{id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Started:</p>
                  <p className="font-medium">{formatDate(attemptDetails.creation)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Completed:</p>
                  <p className="font-medium">{formatDate(attemptDetails.completion_timestamp)}</p>
                </div>
                {!isFlashcardExam && (
                  <div>
                    <p className="text-gray-500">Score:</p>
                    <p className="font-medium">{score.correct} / {score.total} ({score.percentage}%)</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Questions and answers */}
            {attemptDetails.details && attemptDetails.details.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {attemptDetails.details.map((detail, index) => (
                  <div key={index} className="p-6">
                    <div 
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => toggleQuestion(index)}
                    >
                      <h4 className="text-md font-medium">Question {index + 1}</h4>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 transition-transform ${expandedQuestion === index ? 'transform rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {expandedQuestion === index && (
                      <div className="mt-4 space-y-4">
                        {/* Question */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Question:</h5>
                          <div className="bg-gray-50 p-3 rounded">
                            <MathRenderer content={detail.question} />
                          </div>
                        </div>
                        
                        {/* User's answer */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Your Answer:</h5>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">{detail.user_answer}</p>
                          </div>
                        </div>
                        
                        {/* AI Feedback */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-gray-500">AI Feedback:</h5>
                          
                          {/* What was correct */}
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h6 className="text-green-700 font-medium mb-2 text-sm">What was correct</h6>
                            <div className="text-green-600 text-sm">
                              <MathRenderer content={
                                detail.ai_feedback_what_was_correct !== undefined 
                                  ? detail.ai_feedback_what_was_correct 
                                  : (detail.ai_feedback?.what_was_correct || 'No feedback available')
                              } />
                            </div>
                          </div>
                          
                          {/* What was incorrect */}
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <h6 className="text-red-700 font-medium mb-2 text-sm">What was incorrect</h6>
                            <div className="text-red-600 text-sm">
                              <MathRenderer content={
                                detail.ai_feedback_what_was_incorrect !== undefined 
                                  ? detail.ai_feedback_what_was_incorrect 
                                  : (detail.ai_feedback?.what_was_incorrect || 'No feedback available')
                              } />
                            </div>
                          </div>
                          
                          {/* What to include */}
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h6 className="text-purple-700 font-medium mb-2 text-sm">What you could have included</h6>
                            <div className="text-purple-600 text-sm">
                              <MathRenderer content={
                                detail.ai_feedback_what_to_include !== undefined 
                                  ? detail.ai_feedback_what_to_include 
                                  : (detail.ai_feedback?.what_to_include || 'No feedback available')
                              } />
                            </div>
                          </div>
                        </div>
                        
                        {/* Correct answer */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Correct Answer:</h5>
                          <div className="bg-gray-50 p-3 rounded">
                            <MathRenderer content={detail.correct_answer} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No questions available for this exam.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <p className="text-gray-600">No exam details found.</p>
        </div>
      )}
    </div>
  );
} 