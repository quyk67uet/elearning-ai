"use client";

import React, { useState, useEffect, useMemo } from "react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";

// Updated renderAnswer helper to handle multiple-choice option lookup
const renderAnswer = (answer, question) => {
  // Now accepts the full question object
  if (answer === null || answer === undefined) {
    return <span className="text-gray-500 italic">Not Answered</span>;
  }
  // Handle Multiple Choice: answer is an option ID, look up its text
  if (
    question &&
    question.q_type === "Multiple Choice" &&
    typeof answer === "string" &&
    Array.isArray(question.options)
  ) {
    const selectedOption = question.options.find((opt) => opt.id === answer);
    if (selectedOption) {
      // Render the text of the selected option, potentially with LaTeX
      if (
        typeof selectedOption.text === "string" &&
        (selectedOption.text.includes("$") ||
          selectedOption.text.includes("\\"))
      ) {
        return (
          <Latex
            delimiters={[
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\(", right: "\\)", display: false },
              { left: "\\[", right: "\\]", display: true },
            ]}
          >
            {selectedOption.text}
          </Latex>
        );
      }
      return selectedOption.text;
    } else {
      // Fallback if option ID not found in options list (should ideally not happen)
      return (
        <span className="text-orange-600 italic">
          Option ID: {answer} (Text not found)
        </span>
      );
    }
  }

  if (typeof answer === "object") {
    return <span className="text-xs font-mono">[Complex Data]</span>;
  }

  if (
    typeof answer === "string" &&
    (answer.includes("$") || answer.includes("\\"))
  ) {
    return (
      <Latex
        delimiters={[
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ]}
      >
        {answer}
      </Latex>
    );
  }
  return String(answer); // Ensure it's a string
};

// renderQuestionContent helper (remains the same)
const renderQuestionContent = (content) => {
  if (content === null || content === undefined) return "";
  if (
    typeof content === "string" &&
    (content.includes("$") || content.includes("\\"))
  ) {
    return (
      <Latex
        delimiters={[
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ]}
      >
        {content}
      </Latex>
    );
  }
  return content;
};

export default function TestResultsTable({ questions = [], searchQuery = "" }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "index",
    direction: "asc",
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const questionsWithIndex = useMemo(
    () => questions.map((q, index) => ({ ...q, index: index + 1 })),
    [questions]
  );

  console.log("questionsWithIndex", questionsWithIndex);

  const filteredQuestions = useMemo(
    () =>
      questionsWithIndex.filter((question) => {
        const content = question.q_content || "";
        const matchesSearch = content
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const status = question.is_correct;
        const matchesFilter =
          filterStatus === "all" ||
          (filterStatus === "correct" && status === true) ||
          (filterStatus === "incorrect" && status === false) ||
          (filterStatus === "not_graded" && status === null); // is_correct can be null
        return matchesSearch && matchesFilter;
      }),
    [questionsWithIndex, searchQuery, filterStatus]
  );

  const sortedQuestions = useMemo(
    () =>
      [...filteredQuestions].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "status") {
          const statusOrder = { true: 1, false: 2, null: 3 };
          aValue = statusOrder[a.is_correct];
          bValue = statusOrder[b.is_correct];
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }),
    [filteredQuestions, sortConfig]
  );

  const totalPages = Math.ceil(sortedQuestions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setCurrentPage(1);
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (status) => {
    setCurrentPage(1);
    setFilterStatus(status);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedRows({});
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return (
        <span className="ml-1 opacity-30 group-hover:opacity-60 transition-opacity">
          ↕
        </span>
      );
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">
        Question Details
      </h2>
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm text-gray-500">
          {filteredQuestions.length} questions{" "}
          {searchQuery ? `matching "${searchQuery}"` : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter Status:{" "}
              {filterStatus === "all"
                ? "All"
                : filterStatus.charAt(0).toUpperCase() +
                  filterStatus.slice(1).replace("_", " ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleFilterChange("all")}>
              All Questions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("correct")}>
              Correct Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("incorrect")}>
              Incorrect Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("not_graded")}>
              Not Graded Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table className="bg-white">
          <TableHeader className="bg-white border-b">
            <TableRow>
              <TableHead className="w-12 px-2"></TableHead>
              <TableHead
                className="w-16 px-3 py-3 cursor-pointer group"
                onClick={() => requestSort("index")}
              >
                <div className="flex items-center">
                  No. {getSortIcon("index")}
                </div>
              </TableHead>
              <TableHead className="min-w-[300px] px-4 py-3">
                Question
              </TableHead>
              <TableHead
                className="w-36 px-4 py-3 cursor-pointer group"
                onClick={() => requestSort("status")}
              >
                <div className="flex items-center">
                  Status {getSortIcon("status")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuestions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-gray-500"
                >
                  {questions.length === 0
                    ? "No questions in this result."
                    : "No questions found matching your criteria."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedQuestions.map((question) => (
                <React.Fragment key={question.test_question_id}>
                  {" "}
                  {/* Use the unique ID from backend */}
                  <TableRow className="hover:bg-gray-50 text-sm border-b">
                    <TableCell className="px-2 py-2 align-top">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleRow(question.test_question_id)}
                        aria-label={
                          expandedRows[question.test_question_id]
                            ? "Collapse row"
                            : "Expand row"
                        }
                      >
                        {expandedRows[question.test_question_id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium px-3 py-3 align-top">
                      {question.index}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      {renderQuestionContent(question.q_content)}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      {question.is_correct === 1 ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4 mr-1.5 shrink-0" />
                          <span>Correct</span>
                        </div>
                      ) : question.is_correct === 0 ? (
                        <div className="flex items-center text-red-600 font-medium">
                          <XCircle className="h-4 w-4 mr-1.5 shrink-0" />
                          <span>Incorrect</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600 font-medium">
                          <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
                          <span>Not Graded</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows[question.test_question_id] && (
                    <TableRow className="bg-white hover:bg-gray-50 text-sm">
                      <TableCell
                        colSpan={4}
                        className="p-4 space-y-4 text-xs border-t border-gray-200"
                      >
                        <div>
                          <h4 className="font-semibold mb-1.5 text-gray-600">
                            Your Answer:
                          </h4>
                          <div
                            className={`p-3 rounded border text-gray-800 ${
                              question.is_correct === true
                                ? "border-green-300 bg-green-50"
                                : question.is_correct === false
                                ? "border-red-300 bg-red-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            {/* Pass the full question object to renderAnswer */}
                            {renderAnswer(question.user_answer, question)}
                          </div>
                        </div>

                        {/* Display correct answer text (which should be text from backend for MCQs) */}
                        {question.is_correct !== true && ( // Only show if user's answer wasn't correct
                          <div>
                            <h4 className="font-semibold mb-1.5 text-gray-600">
                              Correct Answer:
                            </h4>
                            <div className="p-3 rounded border border-blue-200 bg-blue-50 text-gray-800">
                              {/* Correct answer for MCQs should be text. For others, it's the answer key. */}
                              {renderAnswer(question.answer_key, question)}
                            </div>
                          </div>
                        )}

                        {question.explanation && (
                          <div>
                            <h4 className="font-semibold mb-1.5 text-gray-600">
                              Explanation:
                            </h4>
                            <div className="p-3 rounded border border-gray-200 bg-gray-50 prose prose-sm max-w-none">
                              {renderQuestionContent(question.explanation)}
                            </div>
                          </div>
                        )}

                        <div className="text-gray-500 pt-1">
                          Points Awarded:{" "}
                          <span className="font-medium text-gray-700">
                            {question.points_awarded ?? "N/A"} /{" "}
                            {question.point_value}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-500 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
