"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, CheckCircle } from "lucide-react";

export default function RecommendedActions({ data }) {
  // Helper function to get the appropriate icon
  const getActionIcon = (type) => {
    switch (type) {
      case "lesson":
        return <BookOpen className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "practice":
        return <FileText className="h-5 w-5" />;
      case "review":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((action, index) => (
        <Card key={index} className="overflow-hidden">
          <div
            className="h-2"
            style={{
              backgroundColor:
                action.priority === "high"
                  ? "#ef4444"
                  : action.priority === "medium"
                  ? "#f59e0b"
                  : "#10b981",
            }}
          ></div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg  ">{action.title}</CardTitle>
              <div
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  action.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : action.priority === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {action.priority.charAt(0).toUpperCase() +
                  action.priority.slice(1)}{" "}
                Priority
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">{action.description}</p>
            <div className="space-y-3">
              {action.resources.map((resource, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-md mr-3 ${
                        resource.type === "lesson"
                          ? "bg-blue-100 text-blue-700"
                          : resource.type === "video"
                          ? "bg-purple-100 text-purple-700"
                          : resource.type === "practice"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {getActionIcon(resource.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{resource.title}</p>
                      <p className="text-xs text-gray-500">
                        {resource.duration}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs ${
                      resource.type === "lesson"
                        ? "border-blue-200 hover:bg-blue-50"
                        : resource.type === "video"
                        ? "border-purple-200 hover:bg-purple-50"
                        : resource.type === "practice"
                        ? "border-amber-200 hover:bg-amber-50"
                        : "border-green-200 hover:bg-green-50"
                    }`}
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
