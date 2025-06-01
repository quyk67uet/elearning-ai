"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  ChevronRight,
  BookOpen,
  Clock,
  Award,
} from "lucide-react";

export default function LearningPathway({ chapters }) {
  const [expandedChapter, setExpandedChapter] = useState(null);

  const toggleChapter = (id) => {
    if (expandedChapter === id) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(id);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <Circle className="h-5 w-5 text-blue-500 fill-blue-100" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
            Completed
          </span>
        );
      case "in-progress":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            In Progress
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {chapters.map((chapter) => (
        <div key={chapter.id} className="border rounded-lg overflow-hidden">
          <div
            className={`flex items-center justify-between p-4 cursor-pointer ${
              expandedChapter === chapter.id
                ? "bg-blue-50 dark:bg-blue-900"
                : "bg-white dark:bg-gray-800"
            }`}
            onClick={() => toggleChapter(chapter.id)}
          >
            <div className="flex items-center">
              {getStatusIcon(chapter.status)}
              <span className="ml-3 font-medium">{chapter.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <Progress value={chapter.progress} className="w-24 h-2" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {chapter.progress}%
                </span>
              </div>
              {getStatusBadge(chapter.status)}
              <ChevronRight
                className={`h-5 w-5 transition-transform ${
                  expandedChapter === chapter.id ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>

          {expandedChapter === chapter.id && (
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Chapter Overview</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {chapter.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm">
                      {chapter.topics.length} Topics
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm">{chapter.estimatedTime}</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm">
                      {chapter.difficulty} Difficulty
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Topics</h3>
                <div className="space-y-2">
                  {chapter.topics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border"
                    >
                      <div className="flex items-center">
                        {getStatusIcon(topic.status)}
                        <span className="ml-2 text-sm">{topic.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {topic.duration}
                        </span>
                        {topic.status === "completed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                          >
                            Review
                          </Button>
                        ) : topic.status === "in-progress" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                          >
                            Continue
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                {chapter.status === "completed" ? (
                  <Button variant="outline" className="mr-2">
                    Review Chapter
                  </Button>
                ) : chapter.status === "in-progress" ? (
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Continue Learning
                  </Button>
                ) : (
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Start Chapter
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
