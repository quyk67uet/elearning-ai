import { useState, useEffect } from 'react';
import { Info, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { useUserFlashcardSettings } from '@/hooks/useUserFlashcardSettings';

/**
 * FlashcardSettings Component
 * Shared settings component for all flashcard learning modes
 * 
 * @param {Object} props
 * @param {string} props.topicId - The topic ID
 * @param {Function} props.onClose - Function to close the settings modal
 * @param {Function} props.onSettingsChange - Function to call after settings are saved successfully
 * @returns {JSX.Element}
 */
export default function FlashcardSettings({ topicId, onClose, onSettingsChange }) {
  // Use the centralized settings hook
  const {
    settings,
    isLoadingSettings,
    isSavingSettings,
    isResettingSRS,
    error: apiError,
    saveSettings: saveSettingsApi,
    resetSRSProgress,
    updateSetting
  } = useUserFlashcardSettings(topicId);

  // Local state for UI
  const [localSettings, setLocalSettings] = useState({
    flashcard_arrange_mode: 'chronological',
    flashcard_direction: 'front_first',
    study_exam_flashcard_type_filter: 'All'
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Sync local settings with hook settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        flashcard_arrange_mode: settings.flashcard_arrange_mode || 'chronological',
        flashcard_direction: settings.flashcard_direction || 'front_first',
        study_exam_flashcard_type_filter: settings.study_exam_flashcard_type_filter || 'All'
      });
    }
  }, [settings]);

  // Sync errors from API
  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  // Update a single setting locally
  const handleUpdateSetting = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Function to save user settings
  const saveSettings = async () => {
    try {
      console.log("FlashcardSettings: Saving settings for topic:", topicId);
      console.log("FlashcardSettings: Settings data:", localSettings);
      
      const success = await saveSettingsApi(localSettings);
      
      if (success) {
        console.log("FlashcardSettings: Settings saved successfully");
        setSaveSuccess(true);
        
        // Call the onSettingsChange callback if provided
        if (onSettingsChange && typeof onSettingsChange === 'function') {
          console.log("FlashcardSettings: Calling onSettingsChange callback");
          onSettingsChange(settings);
        }
        
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('Could not save settings. Please try again.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Could not save settings. Please try again.');
    }
  };
  
  // Function to reset SRS progress
  const handleResetSRSProgress = async () => {
    if (!confirm("Are you sure you want to reset all SRS progress for this topic? This action cannot be undone.")) {
      return;
    }
    
    try {
      const success = await resetSRSProgress();
      
      if (success) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
      } else {
        setError('Could not reset SRS progress. Please try again.');
      }
    } catch (err) {
      console.error('Error resetting SRS progress:', err);
      setError('Could not reset SRS progress. Please try again.');
    }
  };

  // Loading state
  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Flashcard Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Flashcard Arrangement Mode */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Flashcard Arrangement</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleUpdateSetting('flashcard_arrange_mode', 'chronological')}
              className={`flex-1 py-2 px-4 rounded-md ${
                localSettings.flashcard_arrange_mode === 'chronological'
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              In Order
            </button>
            <button
              onClick={() => handleUpdateSetting('flashcard_arrange_mode', 'random')}
              className={`flex-1 py-2 px-4 rounded-md ${
                localSettings.flashcard_arrange_mode === 'random'
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Random
            </button>
          </div>
        </div>

        {/* Flashcard Direction */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Card Direction</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleUpdateSetting('flashcard_direction', 'front_first')}
              className={`flex-1 py-2 px-4 rounded-md ${
                localSettings.flashcard_direction === 'front_first'
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Question First
            </button>
            <button
              onClick={() => handleUpdateSetting('flashcard_direction', 'back_first')}
              className={`flex-1 py-2 px-4 rounded-md ${
                localSettings.flashcard_direction === 'back_first'
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Answer First
            </button>
          </div>
        </div>

        {/* Flashcard Type Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Flashcard Type Filter</h3>
          <select
            value={localSettings.study_exam_flashcard_type_filter}
            onChange={(e) => handleUpdateSetting('study_exam_flashcard_type_filter', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Types</option>
            <option value="Concept/Theorem/Formula">Concept/Theorem/Formula</option>
            <option value="Fill in the Blank">Fill in the Blank</option>
            <option value="Ordering Steps">Ordering Steps</option>
            <option value="What's the Next Step?">What's the Next Step?</option>
            <option value="Short Answer/Open-ended">Short Answer/Open-ended</option>
            <option value="Identify the Error">Identify the Error</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select which types of flashcards to include in your study and exam sessions
          </p>
        </div>

        {/* SRS Reset Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">SRS Progress</h3>
          <p className="text-xs text-gray-500 mb-3">
            Reset your spaced repetition progress for this topic. This will clear all your SRS history and start fresh.
          </p>
          <button
            onClick={handleResetSRSProgress}
            disabled={isResettingSRS}
            className="flex items-center px-4 py-2 text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isResettingSRS ? 'Resetting...' : 'Reset SRS Progress'}
          </button>
          {resetSuccess && (
            <div className="mt-2 text-sm text-green-600">SRS progress reset successfully!</div>
          )}
        </div>

        {/* Information Box */}
        <div className="p-4 bg-blue-50 rounded-lg flex items-start mt-6">
          <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-700 mb-1">About These Settings</h4>
            <p className="text-sm text-blue-600">
              These settings apply to all flashcard learning modes. The arrangement determines
              if you see cards in sequence or randomly, while the direction controls whether
              you see the question or answer first.
            </p>
          </div>
        </div>

        {/* Footer with Save button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
          {saveSuccess && (
            <div className="mr-4 py-2 px-3 bg-green-100 text-green-700 rounded-md flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Settings saved successfully
            </div>
          )}
          <button
            onClick={saveSettings}
            disabled={isSavingSettings}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSavingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
} 