import axios from "axios";
import { getSession } from "next-auth/react";

const frappeBackendUrl =
  process.env.NEXT_PUBLIC_FRAPPE_URL || "http://math.local:8000";
const API_METHOD_PREFIX = "/api/method/elearning.elearning.doctype.";
/**
 * Helper function to make authenticated requests to your Frappe backend using JWT.
 *
 * @param {string} path - The API path to call
 * @param {object} options - Options for the request
 * @returns {Promise<any>} - The response data
 */
export async function fetchWithAuth(path, options = {}) {
  if (!frappeBackendUrl) {
    console.error("Frappe Backend URL is not defined");
    throw new Error("Frappe backend configuration error.");
  }

  const formattedPath = path.startsWith(API_METHOD_PREFIX)
    ? path
    : `${API_METHOD_PREFIX}${path}`;

  console.log(`Making API request to: ${baseURL}${formattedPath}`);

  try {
    // Get session from NextAuth if on client side
    let accessToken = null;
    if (typeof window !== "undefined") {
      const session = await getSession();
      accessToken = session?.accessToken;

      if (!accessToken) {
        console.warn("No JWT token available in session");
      }
    }

    // Headers with authorization if available
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Add Authorization header if token is available
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    console.log(`Request method: ${options.method || "GET"}`);
    console.log(`Request body:`, options.body);

    const response = await axios({
      baseURL: frappeBackendUrl,
      url: formattedPath,
      method: options.method || "GET",
      headers,
      params: options.params || undefined,
      data: options.body || undefined,
      timeout: options.timeout || 15000,
      withCredentials: false, // No need to include cookies with JWT auth
    });

    console.log("API request successful, status:", response.status);
    return response.data;
  } catch (error) {
    console.error("API Request Error:", error);

    // Add more detailed error logging
    if (error.response) {
      console.error("Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
      });

      const errorMessage =
        error.response.data?._error_message ||
        `Request failed with status ${error.response.status}: ${error.response.statusText}`;

      const customError = new Error(errorMessage);
      customError.status = error.response.status;
      customError.data = error.response.data;
      throw customError;
    }

    throw error;
  }
}

/**
 * Helper function to make authenticated requests to your Frappe backend directly from server components.
 * To be used in getServerSideProps or API routes.
 *
 * @param {string} path - The API path to call
 * @param {string} accessToken - The JWT token
 * @param {object} options - Options for the request
 * @returns {Promise<any>} - The response data
 */
export async function fetchWithAuthServer(path, accessToken, options = {}) {
  if (!frappeBackendUrl) {
    console.error("Frappe Backend URL is not defined");
    throw new Error("Frappe backend configuration error.");
  }

  const formattedPath = path.startsWith(API_METHOD_PREFIX)
    ? path
    : `${API_METHOD_PREFIX}${path}`;

  try {
    // Headers with authorization
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Add Authorization header if token is available
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      console.warn("No JWT token provided to fetchWithAuthServer");
    }

    const response = await axios({
      baseURL: frappeBackendUrl,
      url: formattedPath,
      method: options.method || "GET",
      headers,
      params: options.params || undefined,
      data: options.body || undefined,
      timeout: options.timeout || 15000,
      withCredentials: false, // No need to include cookies with JWT auth
    });

    return response.data;
  } catch (error) {
    console.error("API Request Error:", error);

    if (error.response) {
      const errorMessage =
        error.response.data?._error_message ||
        `Request failed with status ${error.response.status}: ${error.response.statusText}`;

      const customError = new Error(errorMessage);
      customError.status = error.response.status;
      customError.data = error.response.data;
      throw customError;
    }

    throw error;
  }
}

// Bắt đầu phiên học Flashcard mới
export async function startFlashcardSession(topicId, mode = "Basic") {
  return fetchWithAuth(
    `flashcard_session.flashcard_session.start_flashcard_session`,
    {
      method: "POST",
      body: JSON.stringify({
        topic_id: topicId,
        mode: mode,
      }),
    }
  );
}

// Cập nhật thời gian phiên học Flashcard
export async function updateFlashcardSessionTime(sessionId, timeSpentSeconds) {
  return fetchWithAuth(
    `flashcard_session.flashcard_session.update_flashcard_session_time`,
    {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        time_spent_seconds: timeSpentSeconds,
      }),
    }
  );
}

// Kết thúc phiên học Flashcard
export async function endFlashcardSession(sessionId) {
  return fetchWithAuth(
    `flashcard_session.flashcard_session.end_flashcard_session`,
    {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
      }),
    }
  );
}
