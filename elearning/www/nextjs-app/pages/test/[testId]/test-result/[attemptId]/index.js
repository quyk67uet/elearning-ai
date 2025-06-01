// pages/test/[testId]/test-result/[attemptId].js (or pages/test/[slug]/test-result.js)
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import TestResultHeader from "@/components/test/test-results/test-result-header";
import TestResultSummary from "@/components/test/test-results/test-result-summary";
import TestResultFeedback from "@/components/test/test-results/test-result-feedback";
import TestResultsTable from "@/components/test/test-results/test-result-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCcw, Download, Search, ArrowRight } from "lucide-react";
import { fetchAttemptResult } from "@/pages/api/test/testService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Helper function to format duration (add this or import from utils)
function formatDurationFromSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
    return "N/A";
  }
  if (totalSeconds === 0) {
    return "0s";
  }
  const seconds = Math.floor(totalSeconds % 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

export default function TestResultsPage() {
  const router = useRouter();
  // Get dynamic parameters from the query object
  // Use 'id' or 'testId' depending on your actual filename [id].js vs [testId].js
  // Use 'slug' if filename is [slug].js
  const { testId, slug, attemptId } = router.query;

  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Set initial active tab to "details"
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch data when router is ready and attemptId is available
  useEffect(() => {
    if (router.isReady && attemptId) {
      loadTestResult(attemptId);
    } else if (router.isReady && !attemptId) {
      setError("Attempt ID is missing from the URL.");
      setLoading(false);
    }
  }, [router.isReady, attemptId]);

  // Function to load data based on attemptId
  const loadTestResult = async (currentAttemptId) => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    console.log(`Fetching result for attempt ID: ${currentAttemptId}`);
    try {
      const result = await fetchAttemptResult(currentAttemptId);
      console.log("Fetched test result:", result); // Log the fetched result

      if (
        !result ||
        !result.attempt ||
        !result.test ||
        !result.questions_answers
      ) {
        // Check if essential parts of the data are missing
        throw new Error("Incomplete attempt result data received.");
      }

      setTestResult(result);
    } catch (err) {
      console.error("Failed to fetch test result:", err);
      setError(
        `Failed to load test results for attempt ${currentAttemptId}. Please try again. ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    if (router.isReady && attemptId) {
      loadTestResult(attemptId);
    }
  };

  // Export handler - using data from testResult
  const handleExport = () => {
    if (!testResult) return;

    // Extract data safely using optional chaining and nullish coalescing
    const attemptScore = testResult.attempt?.score ?? null;
    const totalPossible = testResult.test?.total_possible_score ?? null;
    const scorePercent =
      attemptScore !== null && totalPossible !== null && totalPossible > 0
        ? ((attemptScore / totalPossible) * 100).toFixed(1) + "%"
        : "N/A";

    const correctCount =
      testResult.questions_answers?.filter((q) => q.is_correct === true)
        .length ?? "N/A";
    const totalQ = testResult.questions_answers?.length ?? "N/A";
    const time = formatDurationFromSeconds(
      testResult.attempt?.time_taken_seconds
    );
    const dateCompleted = testResult.attempt?.end_time
      ? new Date(testResult.attempt.end_time).toLocaleDateString() // Use appropriate locale if needed
      : "N/A";
    const testTitle = testResult.test?.title ?? "N/A";

    // Basic CSV content
    let csvContent = `data:text/csv;charset=utf-8,Test: "${testTitle.replace(
      /"/g,
      '""'
    )}"\nScore: ${scorePercent}\nCorrect Answers: ${correctCount}/${totalQ}\nTime Taken: ${time}\nDate: ${dateCompleted}\n\nQuestion No.,Question Content,Your Answer,Correct Answer,Status,Points Awarded,Points Possible,Time Spent (s)\n`;

    // Add question details
    testResult.questions_answers?.forEach((q, index) => {
      const qNum = index + 1;
      const qContent = `"${(q.q_content || "").replace(/"/g, '""')}"`; // Handle quotes
      const userAnswer = `"${(q.user_answer !== null ? q.user_answer : "")
        .toString()
        .replace(/"/g, '""')}"`;
      const correctAnswer = `"${(q.correct_answer || "").replace(/"/g, '""')}"`;
      const status =
        q.is_correct === true
          ? "Correct"
          : q.is_correct === false
          ? "Incorrect"
          : "Not Graded";
      const pointsAwarded = q.points_awarded ?? "N/A";
      const pointsPossible = q.point_value ?? "N/A";
      const timeSpent = q.time_spent_seconds ?? "N/A";
      csvContent += `${qNum},${qContent},${userAnswer},${correctAnswer},${status},${pointsAwarded},${pointsPossible},${timeSpent}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `test-result-${attemptId || slug || "export"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Logic ---

  if (!router.isReady || loading) {
    return (
      <div className="p-6">
        {/* Skeleton Loading */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        {/* Error Display */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!testResult) {
    return <div className="p-6">No test result data available.</div>;
  }

  // --- Prepare data for child components ---
  const attemptScore = testResult.attempt?.score ?? 0; // Default to 0 if null for calculation
  const totalPossibleScore = testResult.test?.total_possible_score ?? 0; // Default to 0
  console.log("Total Possible Score:", totalPossibleScore);
  const scorePercentage =
    totalPossibleScore > 0
      ? parseFloat(((attemptScore / totalPossibleScore) * 100).toFixed(1))
      : 0; // Calculate percentage, handle division by zero

  const correctAnswersCount =
    testResult.questions_answers?.filter((q) => q.is_correct === 1).length ?? 0;
  const totalQuestionsCount = testResult.questions_answers?.length ?? 0;
  const timeTakenFormatted = formatDurationFromSeconds(
    testResult.attempt?.time_taken_seconds
  );

  // Inside your component, update the breadcrumbs:
  const breadcrumbs = [
    {
      label: "Tests",
      href: "/test",
    },
    {
      label: testResult?.test?.title || "Test",
      href: getTestDescriptionUrl(), // Use a function to get the correct URL
    },
    {
      label: "Result", // Current page - no href needed
    },
  ];

  // Add this helper function to build the URL correctly:
  function getTestDescriptionUrl() {
    // In the test result URL, the testId/slug is the 2nd part of the path
    // Format: /test/[testId]/test-result/[attemptId]
    const pathParts = router.asPath.split("/");
    const testSlug = pathParts[2];

    // If there's a test object in the result, use its slug if available
    const testSlugFromData = testResult?.test?.slug;

    // Determine which slug to use (prefer from data if available)
    const finalSlug = testSlugFromData || testSlug || testId;

    // Extract the test UUID from result data if available
    const testUUIDFromData = testResult?.test?.id;

    // Extract the ID from the query parameter if available, or use the one from data
    const testUUID = router.query.id || testUUIDFromData;

    if (finalSlug && testUUID) {
      // Return URL with both slug and ID
      return `/test/${finalSlug}?id=${testUUID}`;
    } else if (finalSlug) {
      // Return URL with just the slug
      return `/test/${finalSlug}`;
    } else {
      // Fallback if we can't determine the URL
      return `/test/${testId || router.query.testId}`;
    }
  }

  // --- Main Return JSX ---
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        {/* Use data from testResult */}
        <TestResultHeader
          title={testResult.test?.title}
          status={testResult.attempt?.status}
          passed={testResult.attempt?.passed}
          breadcrumbs={breadcrumbs}
        />
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search questions..." // Updated placeholder
              className="pl-8 w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            title="Export Results"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        // Use controlled value and set default via state
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Question Details</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-6">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Left: Summary Card */}
            <div className="w-full md:w-1/3">
              <Card>
                <CardContent className="pt-6">
                  {/* Pass calculated/formatted props */}
                  <TestResultSummary
                    score={scorePercentage}
                    correctAnswers={correctAnswersCount}
                    totalQuestions={totalQuestionsCount}
                    timeTaken={timeTakenFormatted}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Middle: Statistics Card */}
            <div className="w-full md:w-1/3">
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="h-full flex flex-col justify-center">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-center font-sora text-lg font-medium mb-4">
                        Statistics
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Correct Answers:</span>
                        <span className="font-medium">
                          {correctAnswersCount} / {totalQuestionsCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="font-medium">{scorePercentage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Time Taken:</span>
                        <span className="font-medium">
                          {timeTakenFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Actions */}
            <div className="w-full md:w-1/3">
              <div className="flex flex-col space-y-4">
                <Button
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-100 text-gray-700 justify-between h-14 font-medium"
                  onClick={() => setActiveTab("details")}
                >
                  Review Answers
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="bg-amber-50 hover:bg-amber-100 border-amber-100 text-gray-700 justify-between h-14"
                  // onClick={testResult.actions.retake}
                >
                  Retake Test
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-100 text-gray-700 justify-between h-14"
                  // onClick={testResult.actions.next}
                >
                  Next Test
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom: Feedback/Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="bg-white shadow-sm">
              <CardContent className="pt-6">
                {/* Use feedback data from testResult */}
                <TestResultFeedback feedback={testResult.feedback} />
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="pt-6">
                {/* Use recommendations data from testResult */}
                <TestResultFeedback
                  title="Recommendations"
                  feedback={testResult.recommendation}
                  icon="thumbsUp"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          {/* Pass the correct array to the table */}
          <TestResultsTable
            questions={testResult.questions_answers}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
