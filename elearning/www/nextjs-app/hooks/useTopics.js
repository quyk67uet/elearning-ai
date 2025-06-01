import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/pages/api/helper";
import { getTopicColor } from "@/lib/utils"; // Adjust path if needed

/**
 * Custom hook to fetch topics from Frappe, handle loading/error states,
 * and assign colors.
 * @returns {{ topics: Array, loading: boolean, error: string|null }}
 */
export function useTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTopics = async () => {
      setLoading(true);
      setError(null);
      setTopics([]); // Clear previous results
      console.log("useTopics: Attempting to fetch topics from Frappe...");

      try {
        // *** Use the correct Frappe API endpoint path ***
        const frappeMethodPath = "topics.topics.find_all_active_topics";

        // Fetch topics using the updated fetchWithAuth
        // No specific options needed for a simple GET request like this
        const responseData = await fetchWithAuth(frappeMethodPath);
        console.log("useTopics: Frappe response data:", responseData);

        if (!isMounted) return;

        // *** Extract data from Frappe's 'message' wrapper ***
        const fetchedTopics = responseData?.message;

        if (!Array.isArray(fetchedTopics)) {
          // Check if it was an error wrapped in a successful response structure
          if (responseData?._error_message) {
            throw new Error(responseData._error_message);
          }
          console.warn(
            "useTopics: Received non-array data for topics:",
            fetchedTopics
          );
          throw new Error(
            "Received invalid data format for topics from Frappe."
          );
        }

        // Add color property to each topic
        // Ensure the 'name' field from Frappe is used for getTopicColor if needed
        const topicsWithColor = fetchedTopics.map((topic) => ({
          ...topic, // Spread all fields fetched ('name', 'topic_name', 'grade_level', etc.)
          id: topic.name, // Map Frappe's 'name' to 'id' if your components expect 'id'
          color: getTopicColor(topic.topic_name, topic.name), // Use topic_name or name for color logic
        }));

        setTopics(topicsWithColor);
        console.log("useTopics: Topics state updated with color.");
      } catch (err) {
        console.error("useTopics: Failed to fetch topics from Frappe:", err);
        if (isMounted) {
          // The error thrown by fetchWithAuth should already be user-friendly
          setError(err.message || "Could not load topics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("useTopics: Finished fetching topics from Frappe.");
        }
      }
    };

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  return { topics, loading, error };
}
