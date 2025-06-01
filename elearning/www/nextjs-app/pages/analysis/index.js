"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";
import { studentPerformanceData } from "@/lib/analysis-data";
import SpiderChart from "@/components/analysis/SpiderChart";
import PerformanceTrend from "@/components/analysis/PerformanceTrend";
import KnowledgeGaps from "@/components/analysis/KnowledgeGaps";
import RecommendedActions from "@/components/analysis/RecommendedAction";
import LearningPathway from "@/components/analysis/LearningPathway";

export default function AnalysisPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch student data
    const fetchData = async () => {
      setLoading(true);
      // In a real app, you would fetch from an API
      setTimeout(() => {
        setStudentData(studentPerformanceData);
        setLoading(false);
      }, 500);
    };

    fetchData();
  }, []);

  if (loading || !studentData) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Analytics</h1>
        <div className="flex items-center space-x-4">
          <Tabs defaultValue="skills" className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
          </Tabs>
          <select
            className="border rounded-md p-2 text-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="current">Current Period</option>
            <option value="lastMonth">Last Month</option>
            <option value="lastQuarter">Last Quarter</option>
            <option value="lastYear">Last Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Spider Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Skills Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <SpiderChart data={studentData.skillsData} />
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-medium">
                    {studentData.overallProgress}%
                  </span>
                </div>
                <Progress value={studentData.overallProgress} className="h-2" />
              </div>

              {studentData.skillsData.categories.map((category, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-sm font-medium">
                      {studentData.skillsData.currentPeriod[index]}%
                    </span>
                  </div>
                  <Progress
                    value={studentData.skillsData.currentPeriod[index]}
                    className={`h-2 ${
                      studentData.skillsData.currentPeriod[index] < 50
                        ? "bg-red-200"
                        : studentData.skillsData.currentPeriod[index] < 70
                        ? "bg-yellow-200"
                        : "bg-green-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Pathway Section */}
      <Card className="my-6">
        <CardHeader>
          <CardTitle className="text-xl font-sora">
            Personalized Learning Pathway
          </CardTitle>
          <CardDescription>
            Track your progress through the curriculum and focus on what to
            learn next
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LearningPathway chapters={studentData.chapters} />
        </CardContent>
      </Card>

      <div className="mt-6">
        <Tabs defaultValue="knowledge-gaps">
          <TabsList className="mb-4">
            <TabsTrigger value="knowledge-gaps">Knowledge Gaps</TabsTrigger>
            <TabsTrigger value="performance-trend">
              Performance Trend
            </TabsTrigger>
            <TabsTrigger value="recommended-actions">
              Recommended Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge-gaps">
            <KnowledgeGaps data={studentData.knowledgeGaps} />
          </TabsContent>

          <TabsContent value="performance-trend">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PerformanceTrend data={studentData.performanceTrend} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommended-actions">
            <RecommendedActions data={studentData.recommendedActions} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl   text-blue-600">
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {studentData.areasForImprovement.map((area, index) => (
                <div
                  key={index}
                  className="border-l-4 border-red-400 pl-4 py-2"
                >
                  <h3 className="font-medium text-lg mb-2">
                    Struggles with: {area.title}
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {area.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <h4 className="font-medium text-sm text-gray-600 mb-1">
                      Recommended Focus:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {area.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="mr-2 font-medium text-sm">
                        Mastery Level:
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= area.masteryLevel
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Practice now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl   text-green-600">
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {studentData.strengths.map((strength, index) => (
                <div
                  key={index}
                  className="border-l-4 border-green-400 pl-4 py-2"
                >
                  <h3 className="font-medium text-lg mb-2">
                    Excels at: {strength.title}
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {strength.skills.map((skill, i) => (
                      <li key={i}>{skill}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="mr-2 font-medium text-sm">
                        Mastery Level:
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= strength.masteryLevel
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Advanced practice
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
