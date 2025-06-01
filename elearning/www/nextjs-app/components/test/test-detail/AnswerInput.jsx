"use client";

import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import "katex/dist/katex.min.css";

export function AnswerInput({
  questionContent,
  multipleChoiceAnswer,
  shortAnswer,
  longAnswer,
  onMultipleChoiceChange,
  onShortAnswerChange,
  onLongAnswerChange,
  parseLatex,
  // testQuestionId is available via questionContent.id
}) {
  const questionId = questionContent?.id; // This is the testQuestionId

  if (!questionContent || !questionId) {
    return (
      <div className="p-4 text-gray-500">Answer input cannot be displayed.</div>
    );
  }

  switch (questionContent.type) {
    case "Multiple Choice": // Ensure this string matches exactly what's in questionContent.type
    case "multiple_select": // If you also use this type string
      const options = Array.isArray(questionContent.options)
        ? questionContent.options // These options are formatted by QuestionCard: {id, text, label}
        : [];

      return (
        <div className="space-y-3 mt-6">
          <RadioGroup
            value={multipleChoiceAnswer || ""} // Current selected option ID
            onValueChange={(selectedValue) => {
              // selectedValue is the 'id' of the chosen option
              // console.log(
              //   `AnswerInput (RadioGroup): onValueChange received: Value='${selectedValue}', Type=${typeof selectedValue}`
              // );
              if (onMultipleChoiceChange) {
                // Find the full option object that matches the selectedValue (which is the option's id)
                const selectedOptionObject = options.find(
                  (opt) => opt.id === selectedValue
                );

                if (selectedOptionObject) {
                  // Call with:
                  // 1. questionId (which is testQuestionId)
                  // 2. selectedOptionObject.text (the text of the chosen option)
                  // 3. selectedOptionObject (the full option object: {id, text, label})
                  onMultipleChoiceChange(
                    questionId,
                    selectedOptionObject.text,
                    selectedOptionObject
                  );
                } else {
                  console.error(
                    "AnswerInput: Could not find selected option object for ID:",
                    selectedValue,
                    "Available options:",
                    options
                  );
                  // Fallback: Call with what we have, though useTestAnswers expects the object.
                  // This path should ideally not be hit if selectedValue comes from a rendered option.
                  // onMultipleChoiceChange(questionId, selectedValue, { id: selectedValue, text: 'Unknown Option' });
                }
              }
            }}
            aria-label={`Answer options for question ${questionId}`}
          >
            {options.map(
              (
                option // option is {id, text, label}
              ) => (
                <Label
                  key={option.id}
                  htmlFor={`option-${questionId}-${option.id}`}
                  className={`flex items-start p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${
                    multipleChoiceAnswer === option.id
                      ? `bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400`
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem
                    value={option.id} // The value of each radio item IS the option's unique ID
                    id={`option-${questionId}-${option.id}`}
                    className="border-gray-400 data-[state=checked]:border-indigo-600 data-[state=checked]:text-indigo-600 mt-0.5 mr-3 flex-shrink-0"
                    aria-label={`Option ${option.label}`}
                  />
                  <span className="flex-1 text-sm prose prose-sm max-w-none">
                    {option.label && (
                      <strong className="mr-1">{option.label}.</strong>
                    )}
                    {/* Use parseLatex prop if provided */}
                    {typeof parseLatex === "function"
                      ? parseLatex(option.text)
                      : option.text}
                  </span>
                </Label>
              )
            )}
          </RadioGroup>
        </div>
      );

    case "Self Write": // Assuming "Self Write" maps to short answer
    case "short_answer": // Keeping your original case name as well
      return (
        <div className="space-y-2 mt-6">
          <Label
            htmlFor={`short-answer-${questionId}`}
            className="block font-medium text-gray-700"
          >
            Your Answer
          </Label>
          <Input
            id={`short-answer-${questionId}`}
            placeholder="Type your answer here..."
            value={shortAnswer || ""}
            onChange={(e) =>
              onShortAnswerChange &&
              onShortAnswerChange(questionId, e.target.value)
            }
            className="w-full"
            aria-label="Short answer input"
          />
        </div>
      );
    case "Essay": // Assuming "Essay" maps to long answer
    case "long_answer": // Keeping your original case name
      return (
        <div className="space-y-2 mt-6">
          <Label
            htmlFor={`long-answer-${questionId}`}
            className="block font-medium text-gray-700"
          >
            Your Answer
          </Label>
          <Textarea
            id={`long-answer-${questionId}`}
            placeholder="Type your detailed answer here..."
            value={longAnswer || ""}
            onChange={(e) =>
              onLongAnswerChange &&
              onLongAnswerChange(questionId, e.target.value)
            }
            className="w-full min-h-[150px] sm:min-h-[200px]"
            aria-label="Long answer input"
          />
        </div>
      );

    case "drawing": // Drawing is handled by DrawingArea component in QuestionCard
    default:
      // If it's not any of the above, and not 'drawing' (which is handled in QuestionCard), render null or a message.
      // console.log("AnswerInput: Unhandled or externally handled question type:", questionContent.type);
      return null;
  }
}
