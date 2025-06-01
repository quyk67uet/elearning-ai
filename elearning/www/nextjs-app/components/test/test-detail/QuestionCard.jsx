"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lightbulb, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { AnswerInput } from "./AnswerInput";
import { DrawingArea } from "./DrawingArea";
import { parseLatex } from "@/lib/utils";

export function QuestionCard({
  currentQuestionIndex, // Expect 0-based index
  questions = [], // Expect the full array of question objects { id, content, type, options, ... }
  markedForReview = {}, // State keyed by question ID
  completedQuestions = {}, // State keyed by question ID
  onToggleMarkForReview, // Function accepting question ID
  onMarkComplete, // Function accepting question ID and boolean status
  multipleChoiceAnswer,
  shortAnswer,
  longAnswer,
  canvasState,
  onMultipleChoiceChange,
  onShortAnswerChange,
  onLongAnswerChange,
  setCanvasStates,
  testQuestionId,
}) {
  const [showHint, setShowHint] = useState(false);
  function decodeHtmlEntities(str) {
    if (!str) return "";
    return str.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }

  const questionData = useMemo(() => {
    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
      return null; // Index out of bounds
    }
    return questions[currentQuestionIndex];
  }, [currentQuestionIndex, questions]);

  const currentQuestionId = testQuestionId;
  const currentDisplayNumber = currentQuestionIndex + 1; // 1-based for display

  // Derive status based on ID
  const isMarkedForReview = !!markedForReview[currentQuestionId];
  const isMarkedComplete = !!completedQuestions[currentQuestionId];

  // Reset hint visibility when question changes
  useEffect(() => {
    setShowHint(false);
  }, [currentQuestionId]);

  const questionContentForDisplay = useMemo(() => {
    if (!questionData) return null;

    let formattedOptions = [];
    if (
      questionData.question_type === "Multiple Choice" &&
      Array.isArray(questionData.options)
    ) {
      formattedOptions = questionData.options.map((opt, index) => ({
        // 1. Creates a unique 'id' for each option:
        //    - Uses opt.id if your backend provides it.
        //    - Falls back to generating an ID like "questionId-option-0" if opt.id is missing.
        //    This is crucial for React keys and for the value of radio buttons.
        id: opt.id || `${currentQuestionId}-option-${index}`,

        // 2. Extracts the option text:
        //    - Uses opt.text if present.
        //    - Falls back to opt.option_text (which matches your sample response: {"option_text": "Hello"}).
        //    - Provides a default if neither is found.
        text: opt.text || opt.option_text || "Option text missing",

        // 3. Creates a display 'label' (like A, B, C):
        //    - Uses opt.label if your backend provides it.
        //    - Falls back to generating 'A', 'B', 'C', etc., based on the option's index.
        label: opt.label || String.fromCharCode(65 + index),
      }));
    }

    return {
      id: currentQuestionId,
      type: questionData.question_type || "multiple_choice",
      question: questionData.content || "Question content missing.",
      imageUrl: questionData.image_url || questionData.image,
      options: formattedOptions,
      hint: questionData.hint || "",
      explanation: questionData.explanation || "",
      points: questionData.point_value || 1,
      color: "bg-indigo-500",
    };
  }, [questionData, currentQuestionId]);

  // --- Event Handlers using ID ---
  const handleToggleReview = () => {
    if (currentQuestionId && onToggleMarkForReview) {
      onToggleMarkForReview(currentQuestionId);
    }
  };

  const handleToggleComplete = () => {
    if (currentQuestionId && onMarkComplete) {
      // Toggle the completion status based on the current state
      onMarkComplete(currentQuestionId, !isMarkedComplete);
    }
  };

  // --- Render Logic ---

  if (!questionData || !questionContentForDisplay) {
    return (
      <Card className="p-6 mb-6 border shadow-sm bg-white text-center">
        <p className="text-gray-500">Loading question data...</p>
      </Card>
    );
  }

  const hasDrawingArea = questionContentForDisplay.type === "drawing";

  return (
    <Card
      key={currentQuestionId}
      className="p-4 sm:p-6 mb-6 relative overflow-hidden border shadow-sm bg-white"
    >
      {/* Color indicator bar */}
      <div
        className={`w-1.5 h-full ${questionContentForDisplay.color} absolute left-0 top-0 bottom-0 rounded-l-md`} // Full height bar
        aria-hidden="true"
      ></div>

      <div className="pl-4 sm:pl-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 pb-4 border-b">
          {" "}
          {/* Added padding/border */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold whitespace-nowrap">
              Question {currentDisplayNumber}
            </h2>
            <Badge
              variant="outline"
              className="font-normal capitalize text-xs sm:text-sm"
            >
              {questionContentForDisplay.type.replace("_", " ")}
            </Badge>
            <Badge
              variant="secondary"
              className="font-normal text-xs sm:text-sm"
            >
              {questionContentForDisplay.points} Point
              {questionContentForDisplay.points !== 1 ? "s" : ""}
            </Badge>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
            {/* Mark for Review Button */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMarkedForReview ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleReview}
                    className={`transition-colors ${
                      isMarkedForReview
                        ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={isMarkedForReview}
                  >
                    <AlertCircle
                      className={`h-4 w-4 mr-1 ${
                        isMarkedForReview ? "" : "text-yellow-600"
                      }`}
                    />{" "}
                    Review
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Flag this question to review later</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Mark Complete Button */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMarkedComplete ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleComplete}
                    className={`transition-colors ${
                      isMarkedComplete
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={isMarkedComplete}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 mr-1 ${
                        isMarkedComplete ? "" : "text-green-600"
                      }`}
                    />
                    {isMarkedComplete ? "Completed" : "Mark Complete"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isMarkedComplete
                      ? "Unmark as completed"
                      : "Mark this question as completed"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Hint Button */}
            {questionContentForDisplay.hint && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHint(!showHint)}
                      className="text-gray-700 hover:bg-gray-50"
                      aria-pressed={showHint}
                    >
                      <Lightbulb className="h-4 w-4 mr-1 text-blue-600" /> Hint
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showHint ? "Hide" : "Show"} hint</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Explanation Button (Consider hiding during test) */}
            {/* {questionContentForDisplay.explanation && ( ... Dialog ... )} */}
          </div>
        </div>
        {/* Question Text - Parsed for LaTeX */}
        <div className="text-base md:text-lg mb-6 leading-relaxed prose prose-sm sm:prose max-w-none">
          {parseLatex(decodeHtmlEntities(questionContentForDisplay.question))}
        </div>
        {/* Hint Box */}
        {showHint && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">Hint</h3>
            </div>
            <div className="text-sm text-blue-700 prose prose-sm max-w-none">
              {parseLatex(questionContentForDisplay.hint)}
            </div>
          </div>
        )}
        {/* Explanation Dialog (if needed) */}
        {/* Answer Input Area */}
        <AnswerInput
          // Pass data relevant to the current question
          questionContent={questionContentForDisplay}
          // Pass answer state for the current question ID
          multipleChoiceAnswer={multipleChoiceAnswer}
          shortAnswer={shortAnswer}
          longAnswer={longAnswer}
          // Pass handlers that include the current question ID
          // Ensure these handlers exist in the parent component
          onMultipleChoiceChange={onMultipleChoiceChange}
          onShortAnswerChange={onShortAnswerChange}
          onLongAnswerChange={onLongAnswerChange}
          parseLatex={parseLatex} // Pass down the LaTeX parser
        />
        {hasDrawingArea && (
          <DrawingArea
            questionId={currentQuestionId}
            // Pass the specific canvas state received as a prop
            canvasState={canvasState} // Use the singular prop
            // The handler expects (qid, newState)
            setCanvasState={
              (newState) =>
                setCanvasStates && setCanvasStates(currentQuestionId, newState) // Call handler from props
            }
            markAsCompleted={() => {
              if (currentQuestionId && onMarkComplete) {
                onMarkComplete(currentQuestionId, true); // Mark complete on interaction maybe?
              }
            }}
          />
        )}
      </div>
    </Card>
  );
}
