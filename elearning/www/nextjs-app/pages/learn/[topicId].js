import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTopics } from "@/hooks/useTopics";
import { useFlashcards } from "@/hooks/useFlashcards";
import LearningModes from "@/components/learn/LearningModes";
import FlashcardSettings from "@/components/learn/FlashcardSettings";
import { Settings } from "lucide-react";

export default function TopicFlashcards() {
  const router = useRouter();
  const { topicId } = router.query;
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Get topics to find current topic info
  const { topics, loading: topicsLoading, error: topicsError } = useTopics();
  
  // Get flashcards for current topic
  const { 
    flashcards, 
    loading: flashcardsLoading, 
    error: flashcardsError,
    refreshFlashcards
  } = useFlashcards(topicId);

  // Handle authentication & user data
  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    let userData = null;

    if (loggedInUser) {
      try {
        userData = JSON.parse(loggedInUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = {
        userId: session.user.userId || session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar || session.user.image,
        roles: session.user.roles || ["Student"],
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      setUser(sessionUser);
    }

    if (!userData && status !== "loading" && status !== "authenticated") {
      router.push("/login");
    }
  }, [router, session, status]);

  const topic = topics.find(t => t.id === Number(topicId));

  // Centralized handler for settings changes
  const handleSettingsChange = () => {
    console.log("TopicPage: Settings changed, closing modal");
    // Close the settings modal
    setShowSettings(false);
    
    // NOTE: We don't need to call refreshFlashcards here because the event listener in each mode
    // will handle refreshing the data. If we call it here too, it might cause race conditions
    // where the API is called with stale settings.
  };

  if (status === "loading" || (!user && status === "authenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user && status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      {/* Thêm container wrapper với responsive classes */}
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-full">
          {/* Header section với responsive layout cải thiện */}
          {topic && (
            <div className="mb-6 w-full">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => router.push("/learn")}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm md:text-base flex-shrink-0"
                >
                  ← Back to Topics
                </button>
              </div>
              {/* Cải thiện layout header cho responsive tốt hơn */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0 sm:space-x-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
                    {topic.topic_name}
                  </h1>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto justify-center"
                  >
                    <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main content area với responsive container */}
          <div className="w-full overflow-hidden">
            <LearningModes 
              topicId={topicId} 
              flashcards={flashcards} 
              loading={flashcardsLoading} 
              error={flashcardsError}
            />
          </div>

          {/* Settings Modal với responsive improvements */}
          {showSettings && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-800 bg-opacity-75 flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                <FlashcardSettings 
                  topicId={topicId} 
                  onClose={() => setShowSettings(false)}
                  onSettingsChange={handleSettingsChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}