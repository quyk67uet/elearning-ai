"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KnowledgeGaps({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl   text-blue-600">
            Mathematics Knowledge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.mathematicsKnowledge.map((category, index) => (
            <div key={index} className="mb-6 last:mb-0">
              <h3 className="font-medium text-lg mb-2">{category.title}</h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Common mistakes:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  {category.mistakes.map((mistake, i) => (
                    <li key={i} className="text-gray-700">
                      {mistake.text}{" "}
                      {mistake.highlight && (
                        <span className="font-medium text-gray-900">
                          {mistake.highlight}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl   text-blue-600">
            Mathematics Processes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.mathematicsProcesses.map((process, index) => (
            <div key={index} className="mb-6 last:mb-0">
              <div className="flex items-start gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {process.level}
                </Badge>
                <h3 className="font-medium text-lg">{process.title}</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {process.issues.map((issue, i) => (
                  <li key={i} className="text-gray-700">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
