import { useState } from 'react';
import { useExamHistory } from '@/hooks/useExamHistory';
import { format } from 'date-fns';
import MathRenderer from './MathRenderer';

export default function ExamHistory({ topicId }) {
  const {
    examHistory,
    selectedAttempt,
    attemptDetails,
    isLoadingHistory,
    isLoadingDetails,
    error,
    selectAttempt
  } = useExamHistory(topicId);
  
  // State to track currently expanded question in the details view
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  if (isLoadingHistory && !examHistory.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading exam history...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">{error}</div>
    );
  }
  
  if (!examHistory.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-600">No exam history found. Try taking an exam first!</p>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
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
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Exam History</h2>
        
        {/* History list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Spent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {examHistory.map((attempt) => (
                <tr 
                  key={attempt.name}
                  className={selectedAttempt === attempt.name ? "bg-indigo-50" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(attempt.end_time || attempt.creation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.topic_name || 'Unknown Topic'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.total_questions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.formatted_time || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => selectAttempt(attempt.name)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Details view */}
      {selectedAttempt && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Attempt Details</h3>
          
          {isLoadingDetails ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">Loading attempt details...</p>
            </div>
          ) : attemptDetails ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Attempt summary */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Topic:</p>
                    <p className="font-medium">{attemptDetails.topic_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started:</p>
                    <p className="font-medium">{formatDate(attemptDetails.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Completed:</p>
                    <p className="font-medium">{formatDate(attemptDetails.completion_timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time Spent:</p>
                    <p className="font-medium">{attemptDetails.formatted_time || 'N/A'}</p>
                  </div>
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
                          {detail.ai_feedback_what_was_correct && (
                            <div className="space-y-4">
                              <h5 className="text-sm font-medium text-gray-500">AI Feedback:</h5>
                              
                              {/* What was correct */}
                              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <h6 className="text-green-700 font-medium mb-2 text-sm">What was correct</h6>
                                <div className="text-green-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_was_correct} />
                                </div>
                              </div>
                              
                              {/* What was incorrect */}
                              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <h6 className="text-red-700 font-medium mb-2 text-sm">What was incorrect</h6>
                                <div className="text-red-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_was_incorrect} />
                                </div>
                              </div>
                              
                              {/* What to include */}
                              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h6 className="text-purple-700 font-medium mb-2 text-sm">What you could have included</h6>
                                <div className="text-purple-600 text-sm">
                                  <MathRenderer content={detail.ai_feedback_what_to_include} />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Correct answer */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-500 mb-2">Correct Answer:</h5>
                            <div className="bg-gray-50 p-3 rounded">
                              <MathRenderer content={detail.answer} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No details available for this attempt.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">Failed to load attempt details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 