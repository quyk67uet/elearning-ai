"use client";

import { CheckCircle, ThumbsUp } from "lucide-react";

/**
 * Displays a list of feedback items (e.g., overall feedback or recommendations).
 *
 * @param {object} props - Component props.
 * @param {string} [props.title="Feedback Overall"] - The title for the feedback section.
 * @param {string[]} [props.feedback=[]] - An array of feedback strings to display.
 * @param {'checkCircle' | 'thumbsUp'} [props.icon='checkCircle'] - Which icon to display next to the title.
 */
export default function TestResultFeedback({
  title = "Feedback Overall",
  feedback = "", // Default to empty array
  icon = "checkCircle",
}) {
  // Determine the icon component and color based on the icon prop
  const IconComponent = icon === "checkCircle" ? CheckCircle : ThumbsUp;
  const iconColor =
    icon === "checkCircle" ? "text-orange-500" : "text-blue-500"; // Example colors

  return (
    <div>
      {/* Header section with icon and title */}
      <div className="flex items-center mb-4">
        <IconComponent className={`h-5 w-5 ${iconColor} mr-2 shrink-0`} />{" "}
        {/* Added shrink-0 */}
        <h3 className="text-lg font-sora font-medium">{title}</h3>
      </div>

      {feedback ? (
        <p className="text-sm pl-1">{feedback}</p>
      ) : (
        <p className="text-sm text-gray-500 pl-7">
          No {title.toLowerCase()} available.
        </p>
      )}
    </div>
  );
}
