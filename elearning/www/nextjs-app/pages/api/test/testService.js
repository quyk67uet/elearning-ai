import { fetchWithAuth } from "@/pages/api/helper";

/**
 * Fetches the detailed results for a specific test attempt from the Frappe backend.
 *
 * Calls the Frappe whitelisted method:
 * `elearning.elearning.doctype.test_attempt.test_attempt.get_attempt_result_details`
 *
 * @param {string} attemptId - The UUID of the test attempt to fetch results for.
 * @returns {Promise<object>} A promise that resolves to the detailed test result object
 * (the content of Frappe's 'message' property).
 * @throws {Error} Throws an error if the fetch fails, the backend returns an error status,
 * or the response structure is unexpected.
 */
export async function fetchAttemptResult(attemptId) {
  if (!attemptId) {
    console.error("fetchAttemptResult: attemptId is required.");
    throw new Error("Attempt ID is required to fetch results.");
  }

  // The suffix for the Frappe whitelisted method
  // fetchWithAuth should prepend something like "/api/method/elearning.elearning.doctype."
  const frappeMethodPathSuffix =
    "test_attempt.test_attempt.get_attempt_result_details";

  console.log(
    `Fetching Frappe attempt result for ID: ${attemptId} using method: ${frappeMethodPathSuffix}`
  );

  try {
    // Use the fetchWithAuth helper to make the authenticated GET request
    // The Frappe endpoint get_attempt_result_details expects 'attempt_id' as a parameter
    const responseData = await fetchWithAuth(frappeMethodPathSuffix, {
      method: "GET",
      params: {
        attempt_id: attemptId, // Pass attempt_id as snake_case to match Python function argument
      },
    });

    // Frappe typically wraps successful responses in a 'message' object
    const result = responseData?.message;

    console.log(
      `Successfully fetched result data for attempt ${attemptId} from Frappe:`,
      result
    );

    // Validate the core structure of the result expected from Frappe
    if (
      !result ||
      !result.attempt ||
      !result.test ||
      !result.questions_answers
    ) {
      console.error(
        "fetchAttemptResult: Incomplete data structure in Frappe response",
        result
      );
      // Check if Frappe itself sent an error message within a 200 OK response
      if (responseData?._error_message) {
        throw new Error(responseData._error_message);
      }
      throw new Error(
        "Incomplete attempt result data received from Frappe server."
      );
    }
    console.log(`Fetched attempt result for attempt ${attemptId}:`, result);

    return result; // Return the content of the 'message' object
  } catch (error) {
    // Log the specific error encountered during the fetch
    console.error(
      `Error fetching Frappe result for attempt ${attemptId} using ${frappeMethodPathSuffix}:`,
      error
    );

    // Re-throw the error (fetchWithAuth might have already formatted it)
    // or throw a more specific one.
    // The calling component (TestResultsPage) should handle this error.
    throw new Error(
      `Failed to fetch test result from Frappe: ${
        error.message || "Unknown error"
      }`
    );
  }
}
