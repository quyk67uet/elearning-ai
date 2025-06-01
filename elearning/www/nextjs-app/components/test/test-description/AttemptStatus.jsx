import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Award, Hourglass } from "lucide-react";
export function AttemptStatus({ status, passed }) {
  const normalizedStatus = status?.toLowerCase();

  switch (normalizedStatus) {
    case "graded":
    case "completed":
      if (passed === 1) {
        // Keep Badge for Passed
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Passed
          </Badge>
        );
      } else if (passed === 0) {
        return (
          <div className="flex items-center justify-center text-red-600">
            {" "}
            {/* Added justify-center */}
            <XCircle className="h-4 w-4 mr-1" />{" "}
            {/* Use h-4 w-4 from old code */}
            Failed
          </div>
        );
      } else {
        // Keep Badge for Completed (unknown pass/fail)
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            <Award className="h-3.5 w-3.5 mr-1" /> Completed
          </Badge>
        );
      }
    case "in_progress":
      // Keep Badge for In Progress
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-300">
          <Hourglass className="h-3.5 w-3.5 mr-1 animate-spin" /> In Progress
        </Badge>
      );
    case "timed_out":
      if (passed === true) {
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Passed (Timed Out)
          </Badge>
        );
      } else if (passed === false) {
        return (
          <div className="flex items-center justify-center text-red-600">
            {" "}
            {/* Added justify-center */}
            <XCircle className="h-4 w-4 mr-1" />{" "}
            {/* Use h-4 w-4 from old code */}
            Failed (Timed Out) {/* Add specific text */}
          </div>
        );
      } else {
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <Clock className="h-3.5 w-3.5 mr-1" /> Timed Out
          </Badge>
        );
      }
    default:
      return <Badge variant="secondary">{status || "Unknown"}</Badge>;
  }
}
