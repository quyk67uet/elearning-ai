"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { useRouter } from "next/router";

// --- UI Components ---
import { TestHeader } from "@/components/test/test-detail/TestHeader";
import { ProgressBarDisplay } from "@/components/test/test-detail/ProgressBar";
import { QuestionNavigator } from "@/components/test/test-detail/QuestionNavigator";
import { QuestionCard } from "@/components/test/test-detail/QuestionCard";
import { TestNavigation } from "@/components/test/test-detail/TestNavigation";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { ErrorScreen } from "@/components/common/ErrorScreen"; // Assuming ErrorScreen is robust
import { NoTestDataScreen } from "@/components/test/test-detail/NoTestData";
import { Button } from "@/components/ui/button";

// --- Hooks ---
import { useTimer } from "@/hooks/useTimer";
import { useTestAttempt } from "@/hooks/useTestAttempt";
import { useTestAnswers } from "@/hooks/useTestAnswers";
import { useTestNavigation } from "@/hooks/useTestNavigation";

// --- Utils & Services ---
import { formatTime } from "@/utils/timeUtils";
import { fetchWithAuth } from "@/pages/api/helper";
import { useDebouncedCallback } from "use-debounce";

export default function TestDetail() {
  const router = useRouter();

  const { testId } = router.query;

  // --- Attempt Management ---
  const isReadyToStartAttempt = !!testId;
  const { attemptStartData, loadingAttempt, attemptError } = useTestAttempt(
    testId,
    isReadyToStartAttempt
  );

  // --- Derive State from attemptStartData ---
  const testDataFromAttempt = attemptStartData?.test; // e.g., { id, title, time_limit_minutes, instructions }
  const questionsFromAttempt = useMemo(
    () =>
      attemptStartData?.questions?.map((q) => ({
        ...q, // Spread original properties
        testQuestionId: q.test_question_detail_id,
      })) ?? [],
    [attemptStartData?.questions]
  );
  const totalQuestions = questionsFromAttempt.length;
  const testAttemptId = attemptStartData?.attempt?.id;
  const initialSavedAnswers = attemptStartData?.saved_answers;
  const initialRemainingTime =
    attemptStartData?.attempt?.remaining_time_seconds;
  const initialLastViewedQuestionDetailId =
    attemptStartData?.attempt?.last_viewed_question_id;

  // --- Navigation ---
  const initialQuestionIndex = useMemo(() => {
    if (initialLastViewedQuestionDetailId && questionsFromAttempt.length > 0) {
      // The `questionsFromAttempt` items should have `test_question_detail_id` and `question_id`
      // `initialLastViewedQuestionDetailId` from backend is the `Question.name` (base question ID)
      // The `questions` array from `get_test_data` has `test_question_detail_id` and `question_id`
      const idx = questionsFromAttempt.findIndex(
        (q) => q.question_id === initialLastViewedQuestionDetailId // Match against the base question_id
      );
      return idx !== -1 ? idx : 0;
    }
    return 0;
  }, [initialLastViewedQuestionDetailId, questionsFromAttempt]);

  const {
    currentQuestionIndex,
    showQuestionNav,
    handlers: navHandlers,
    setCurrentQuestionIndexDirectly,
  } = useTestNavigation(totalQuestions, initialQuestionIndex);

  // --- Answers & Status ---
  const {
    multipleChoiceAnswers,
    shortAnswers,
    longAnswers,
    canvasStates,
    completedQuestions,
    markedForReview,
    savedStatus,
    handlers: answerHandlers,
    getAnswersForSubmission,
  } = useTestAnswers();
  const { initializeAnswers, setSavedStatus, handleQuestionChange } =
    answerHandlers; // Destructure for clarity
  const AUTO_SAVE_INTERVAL_MS = 10000;
  const [isSaving, setIsSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Moved up for use in debouncedSaveProgress

  const currentQuestionData = useMemo(
    () => questionsFromAttempt[currentQuestionIndex],
    [questionsFromAttempt, currentQuestionIndex]

  );

  // This is the unique ID for the question *instance* in this test (e.g., Test Question Detail's name)
  const currentTestQuestionDetailId =
    currentQuestionData?.test_question_detail_id;

  useEffect(() => {
    if (
      initialSavedAnswers &&
      typeof initialSavedAnswers === "object" &&
      Array.isArray(questionsFromAttempt) &&
      questionsFromAttempt.length > 0
    ) {
      // initializeAnswers should expect keys in initialSavedAnswers to be test_question_detail_id
      initializeAnswers(initialSavedAnswers, questionsFromAttempt);
    }
  }, [initialSavedAnswers, questionsFromAttempt, initializeAnswers]);

  // --- Timer ---
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (initialRemainingTime !== undefined && initialRemainingTime !== null) {
      setTimeLeft(initialRemainingTime);
    } else if (testDataFromAttempt?.timeLimitMinutes) {
      const minutes = Number(testDataFromAttempt.timeLimitMinutes);
      if (!isNaN(minutes) && minutes > 0) {
        setTimeLeft(minutes * 60);
      } else {
        setTimeLeft(null);
      }
    } else {
      setTimeLeft(null);
    }
  }, [initialRemainingTime, testDataFromAttempt?.timeLimitMinutes]);

  const countdown = useTimer(timeLeft !== null ? timeLeft : 0);

  // --- Save Progress Logic ---
  const debouncedSaveProgress = useDebouncedCallback(
    async (reason = "auto") => {
      console.log(
        `DEBOUNCED SAVE PROGRESS INVOKED. Reason: ${reason}, Timestamp: ${new Date().toISOString()}`
      );

      if (
        !testAttemptId ||
        isSaving ||
        submitting ||
        savedStatus === "saving"
      ) {

        return;
      }
      if (!currentTestQuestionDetailId) {
        console.warn(
          "Save progress skipped: No current test_question_detail_id."
        );

        return;
      }
      setIsSaving(true);
      setSavedStatus("saving");
      const currentAnswersForSave =
        getAnswersForSubmission(questionsFromAttempt);

      // Create the progress_data object
      const progressData = {

        answers: currentAnswersForSave,
        remainingTimeSeconds: countdown,
        lastViewedTestQuestionId: currentQuestionData.testQuestionId,
      };

      // Create the payload structure expected by the backend
      const payload = {
        attempt_id: testAttemptId,
        progress_data: JSON.stringify(progressData),
      };

      console.log("Saving progress data:", progressData);
      try {
        await fetchWithAuth(`test_attempt.test_attempt.save_attempt_progress`, {
          method: "PATCH",
          body: payload, // Send the correctly structured payload
        });
        console.log(`Progress saved successfully (${reason}).`);
        setSavedStatus("saved");
      } catch (error) {
        console.error(`Error saving progress (${reason}):`, error);
        setSavedStatus("error");
      } finally {
        setIsSaving(false);
        setTimeout(() => {
          setSavedStatus((current) => (current === "saved" ? "idle" : current));
        }, 3000);
      }
    },
    500
  );
  // --- Auto-Save Trigger: Interval ---
  useEffect(() => {

    if (!testAttemptId || !currentTestQuestionDetailId) return;
    const intervalId = setInterval(
      () => debouncedSaveProgress("interval"),
      AUTO_SAVE_INTERVAL_MS
    );
    return () => clearInterval(intervalId);
  }, [debouncedSaveProgress, testAttemptId, currentTestQuestionDetailId]);


  // --- Auto-Save Trigger: Page Visibility Change ---
  useEffect(() => {
    const handleVisibilityChange = () => {

      if (document.visibilityState === "hidden" && testAttemptId) {
        // Ensure attemptId exists

        debouncedSaveProgress("visibility");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // if (testAttemptId) { debouncedSaveProgress.flush(); } // Optional: force save on unmount

    };
  }, [debouncedSaveProgress, testAttemptId]);

  // --- Combined Loading/Error States ---

  // Assuming loadingInitialtestDataFromAttempt and initialtestDataFromAttemptError are handled by useTestAttempt now
  const isLoading = loadingAttempt;
  const errorOccurred = attemptError;

  // Effect to notify answers hook when question changes
  useEffect(() => {
    if (currentTestQuestionDetailId) {
      handleQuestionChange(currentTestQuestionDetailId);
    }

  }, [currentTestQuestionDetailId, handleQuestionChange]);


  const handleMarkCompleteToggle = useCallback(() => {
    if (!currentTestQuestionDetailId) return;
    answerHandlers.markQuestionCompleted(
      currentTestQuestionDetailId,
      !completedQuestions[currentTestQuestionDetailId]
    );
  }, [currentTestQuestionDetailId, completedQuestions, answerHandlers]);

  const handleSubmitTest = async () => {
    if (!testAttemptId || submitting) return;

    const completedCount =
      Object.values(completedQuestions).filter(Boolean).length;
    const unansweredCount = totalQuestions - completedCount;
    const confirmMessage =
      unansweredCount > 0
        ? `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
        : "Are you sure you want to submit your test? You cannot make changes after submission.";

    if (!window.confirm(confirmMessage)) return;

    setSavedStatus("saving"); // Use setSavedStatus from answerHandlers
    setSubmitting(true);
    const answersPayload = getAnswersForSubmission(questionsFromAttempt);

    // Payload for Frappe's submit_test_attempt
    const payloadForFrappe = {
      attempt_id: testAttemptId,
      submission_data: JSON.stringify({
        // Python backend expects submission_data as a JSON string
        answers: answersPayload,
        timeLeft: countdown,
        lastViewedTestQuestionId: currentTestQuestionDetailId,
      }),
    };

    console.log(
      "Submitting Payload to Frappe:",
      JSON.stringify(payloadForFrappe, null, 2)
    );

    try {
      // fetchWithAuth expects the method suffix
      const result = await fetchWithAuth(
        `test_attempt.test_attempt.submit_test_attempt`,
        {
          method: "POST",
          body: JSON.stringify(payloadForFrappe), // Send the whole payload as JSON
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const resultData = result?.message || result; // Handle Frappe's message wrapper
      console.log(
        "Test submitted successfully, Frappe API Result:",
        resultData
      );
      // Assuming resultData from Frappe contains { attemptId, status, score, passed }
      const finalAttemptId = resultData?.attemptId || testAttemptId;

      router.push(`/test/${testId}/test-result/${finalAttemptId}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      alert(
        `Error submitting test: ${
          error.message || "An unknown error occurred."
        }`
      );
      setSavedStatus("error"); // Use setSavedStatus from answerHandlers
      setSubmitting(false);
    }
  };


  // --- Render Logic ---

  if (isLoading) return <LoadingScreen />;

  if (errorOccurred) {
    const errorMessage =
      errorOccurred instanceof Error
        ? errorOccurred.message
        : String(errorOccurred);
    return <ErrorScreen error={errorMessage} onRetry={() => router.reload()} />;
  }

  if (!loadingAttempt && !attemptStartData && !errorOccurred) {
    return <LoadingScreen />;

  }

  if (!testAttemptId) return <LoadingScreen />; // Still waiting for attempt ID

  const questionContent = questionsFromAttempt[currentQuestionIndex];
  const completedCount =
    Object.values(completedQuestions).filter(Boolean).length;
  const currentDisplayNumber = currentQuestionIndex + 1;


  if (questionsFromAttempt.length === 0 && !isLoading)
    return <NoTestDataScreen />;

  if (!questionContent && questionsFromAttempt.length > 0) {

    console.error(
      `Attempted to render question at index ${currentQuestionIndex}, but it's undefined.`
    );
    return (
      <ErrorScreen
        error={`Could not load question ${currentDisplayNumber}.`}
        onRetry={() => setCurrentQuestionIndexDirectly(0)}

      />
    );
  }

  // If, after all loading, there's still no questionContent (e.g. questions array is empty but attempt started)
  if (!questionContent && !isLoading) {
    console.warn(
      "No question content available to render, but not loading and no primary error."
    );
    return <NoTestDataScreen message="No questions found for this test." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-6">
        <TestHeader
          title={testDataFromAttempt?.title || "Loading Test..."} // Add fallback for title

          timeLeft={timeLeft !== null ? countdown : null}
          formatTime={formatTime}
        />
        <ProgressBarDisplay
          currentQuestionDisplayNumber={currentDisplayNumber}
          totalQuestions={totalQuestions}
          completedCount={completedCount}
        />
        <div className="flex justify-end mb-4">
          <Button
            variant="link"
            size="sm"
            onClick={navHandlers.toggleNavigator}
          >
            {showQuestionNav ? "Hide" : "Show"} Question Navigator
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {showQuestionNav && (
            <div className="lg:w-1/4 order-2 lg:order-1">
              <QuestionNavigator
                totalQuestions={totalQuestions}
                currentQuestionIndex={currentQuestionIndex}
                markedForReview={markedForReview || {}}
                completedQuestions={completedQuestions || {}}
                onNavigate={navHandlers.navigateToQuestion}
                questions={questionsFromAttempt}
              />
            </div>
          )}
          <div
            className={`w-full order-1 lg:order-2 ${
              showQuestionNav ? "lg:w-3/4" : "lg:w-full"
            }`}
          >
            {questionContent && ( // Ensure questionContent exists before rendering QuestionCard
              <QuestionCard
                key={
                  questionContent.test_question_detail_id ||
                  currentQuestionIndex
                }
                currentQuestionIndex={currentQuestionIndex}
                questions={questionsFromAttempt} // Pass the full questions array
                markedForReview={markedForReview}
                completedQuestions={completedQuestions}
                onToggleMarkForReview={answerHandlers.toggleMarkForReview}
                onMarkComplete={handleMarkCompleteToggle}
                multipleChoiceAnswer={
                  multipleChoiceAnswers[questionContent.test_question_detail_id]
                }
                shortAnswer={
                  shortAnswers[questionContent.test_question_detail_id]
                }
                longAnswer={
                  longAnswers[questionContent.test_question_detail_id]
                }
                canvasState={
                  canvasStates[questionContent.test_question_detail_id]
                }
                onMultipleChoiceChange={
                  answerHandlers.handleMultipleChoiceChange
                }
                onShortAnswerChange={answerHandlers.handleShortAnswerChange}
                onLongAnswerChange={answerHandlers.handleLongAnswerChange}
                setCanvasStates={answerHandlers.handleSetCanvasStates}
                testQuestionId={questionContent.test_question_detail_id}
              />
            )}

            <TestNavigation
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              onPrevQuestion={navHandlers.handlePrevQuestion}
              onNextQuestion={navHandlers.handleNextQuestion}
              onSubmitTest={handleSubmitTest}
              onNavigate={navHandlers.navigateToQuestion}
              savedStatus={savedStatus}
              submitting={submitting}
              completedQuestions={completedQuestions}
              markedForReview={markedForReview}
              questions={questionsFromAttempt}

              testId={testId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}