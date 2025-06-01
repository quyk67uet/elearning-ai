import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/pages/api/helper";

/**
 * Custom hook to manage user settings for a specific topic
 * @param {string} topicId - The topic ID for the settings
 * @returns {Object} - Settings state and functions
 */
export function useUserFlashcardSettings(topicId) {
  // State variables
  const [settings, setSettings] = useState({
    flashcard_arrange_mode: "chronological",
    flashcard_direction: "front_first",
    study_exam_flashcard_type_filter: "All"
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isResettingSRS, setIsResettingSRS] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState(null);
  // Add a counter to force reload
  const [reloadCounter, setReloadCounter] = useState(0);

  /**
   * Load user settings for the current topic
   */
  const loadSettings = useCallback(async () => {
    if (!topicId) return;
    
    setIsLoadingSettings(true);
    setError(null);
    
    try {
      console.log("Loading settings for topic:", topicId);
      const response = await fetchWithAuth(
        "user_flashcard_setting.user_flashcard_setting.get_user_flashcard_setting",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId
          })
        }
      );
      
      if (response?.message?.success) {
        const settingsData = response.message.settings || {};
        console.log("Settings loaded:", settingsData);
        setSettings({
          flashcard_arrange_mode: settingsData.flashcard_arrange_mode || "chronological",
          flashcard_direction: settingsData.flashcard_direction || "front_first",
          study_exam_flashcard_type_filter: settingsData.study_exam_flashcard_type_filter || "All"
        });
      } else {
        setError(response?.message?._error_message || "Failed to load settings");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setError("Failed to load settings: " + error.message);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [topicId]);

  /**
   * Force reload of settings
   */
  const reloadSettings = useCallback(() => {
    setReloadCounter(prev => prev + 1);
  }, []);

  /**
   * Save user settings for the current topic
   * @param {Object} newSettings - New settings to save
   */
  const saveSettings = useCallback(async (newSettingsData) => {
    if (!topicId) return;
    
    setIsSavingSettings(true);
    setError(null);
    
    try {
      console.log("Saving settings for topic:", topicId);
      console.log("Settings data:", newSettingsData);
      
      const response = await fetchWithAuth(
        "user_flashcard_setting.user_flashcard_setting.save_user_flashcard_setting",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId,
            settings_data: newSettingsData
          })
        }
      );
      
      if (response?.message?.success) {
        const updatedSettings = response.message.settings || {};
        console.log("Settings saved successfully:", updatedSettings);
        
        // Update local state with new settings
        setSettings({
          flashcard_arrange_mode: updatedSettings.flashcard_arrange_mode || "chronological",
          flashcard_direction: updatedSettings.flashcard_direction || "front_first",
          study_exam_flashcard_type_filter: updatedSettings.study_exam_flashcard_type_filter || "All"
        });
        
        // Dispatch a custom event to notify other components about settings change
        if (typeof window !== 'undefined') {
          // Ensure topicId is a string
          const eventTopicId = String(topicId);
          console.log("Dispatching flashcardSettingsChanged event for topic:", eventTopicId);
          
          const settingsEvent = new CustomEvent('flashcardSettingsChanged', {
            detail: {
              topicId: eventTopicId,
              settings: updatedSettings
            }
          });
          window.dispatchEvent(settingsEvent);
          
          // Force reload settings after a short delay to ensure they're updated
          setTimeout(() => {
            reloadSettings();
          }, 500);
        }
        
        return true;
      } else {
        console.error("API returned error:", response?.message?._error_message);
        setError(response?.message?._error_message || "Failed to save settings");
        return false;
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings: " + error.message);
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  }, [topicId, reloadSettings]);

  /**
   * Reset the SRS progress for the current topic
   */
  const resetSRSProgress = useCallback(async () => {
    if (!topicId) return false;
    
    setIsResettingSRS(true);
    setError(null);
    
    try {
      console.log("Resetting SRS progress for topic:", topicId);
      
      const response = await fetchWithAuth(
        "user_flashcard_setting.user_flashcard_setting.reset_srs_progress_for_topic",
        {
          method: "POST",
          body: JSON.stringify({
            topic_name: topicId
          })
        }
      );
      
      if (response?.message?.success) {
        console.log("SRS progress reset successfully:", response.message);
        
        // Dispatch a custom event to notify other components about the SRS reset
        if (typeof window !== 'undefined') {
          const eventTopicId = String(topicId);
          console.log("Dispatching srsProgressReset event for topic:", eventTopicId);
          
          const resetEvent = new CustomEvent('srsProgressReset', {
            detail: {
              topicId: eventTopicId
            }
          });
          window.dispatchEvent(resetEvent);
        }
        
        return true;
      } else {
        console.error("API returned error:", response?.message?._error_message);
        setError(response?.message?._error_message || "Failed to reset SRS progress");
        return false;
      }
    } catch (error) {
      console.error("Error resetting SRS progress:", error);
      setError("Failed to reset SRS progress: " + error.message);
      return false;
    } finally {
      setIsResettingSRS(false);
    }
  }, [topicId]);

  /**
   * Update a single setting value
   * @param {string} key - The setting key to update
   * @param {any} value - The new value
   */
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Load settings on mount and when topicId changes or reload is triggered
  useEffect(() => {
    if (topicId) {
      loadSettings();
    }
  }, [topicId, loadSettings, reloadCounter]);

  return {
    settings,
    isLoadingSettings,
    isResettingSRS,
    isSavingSettings,
    error,
    loadSettings,
    saveSettings,
    resetSRSProgress,
    updateSetting,
    reloadSettings
  };
} 