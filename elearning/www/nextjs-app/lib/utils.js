import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import "katex/dist/katex.min.css";

import { InlineMath, BlockMath } from "react-katex";
import React from "react";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Predefined color palette
const colors = [
  "#6366f1", // indigo-600
  "#4ade80", // green-400
  "#f97316", // orange-500
  "#22d3ee", // cyan-400
  "#a855f7", // violet-500
  "#fb923c", // amber-400
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#eab308", // yellow-500
  "#ef4444", // red-500
];

// Simple hash function to get a consistent index based on string
// Ensures the same topic name always gets the same color index.
const simpleHash = (str) => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Assigns a color from the predefined palette based on the topic name or ID.
 * For chapters, uses the chapter number (name field) to ensure distinct colors.
 *
 * @param {string} topicName - The name of the topic
 * @param {number|string} topicId - The ID/name of the topic (chapter number)
 * @returns {string} A hex color code
 */
export const getTopicColor = (topicName, topicId) => {
  // Check if this is a chapter topic (starts with "Chương")
  if (typeof topicName === "string" && topicName.startsWith("Chương")) {
    // Use the chapter number (topicId) to pick a color
    // Convert topicId to number if it's a string
    const chapterNum =
      typeof topicId === "number" ? topicId : parseInt(topicId, 10);

    // Make sure we have a valid number, otherwise fallback to hash method
    if (!isNaN(chapterNum)) {
      // Using modulo to wrap around if we have more chapters than colors
      return colors[(chapterNum - 1) % colors.length];
    }
  }

  // Fallback to original hash method for non-chapter topics or invalid IDs
  const topicNameForColor = (topicName || "")
    .replace(/^Chương \d+\.\s*/i, "")
    .trim();
  const hash = simpleHash(topicNameForColor);
  return colors[hash % colors.length];
};

export function formatDurationFromSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
    return "N/A";
  }
  if (totalSeconds === 0) {
    return "0s";
  }
  const seconds = Math.floor(totalSeconds % 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

export const parseLatex = (text) => {
  if (!text) return null;
  // Regex to find delimiters: \(...\), \[...\], $$...$$, $...$
  const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$)/gs);
  return parts.map((part, index) => {
    try {
      if (part.startsWith("\\(") && part.endsWith("\\)"))
        return (
          <InlineMath key={index} math={part.substring(2, part.length - 2)} />
        );
      if (part.startsWith("\\[") && part.endsWith("\\]"))
        return (
          <BlockMath key={index} math={part.substring(2, part.length - 2)} />
        );
      if (part.startsWith("$$") && part.endsWith("$$"))
        return (
          <BlockMath key={index} math={part.substring(2, part.length - 2)} />
        );
      // Be careful with single $: check it's not just currency before rendering as math
      if (
        part.startsWith("$") &&
        part.endsWith("$") &&
        part.length > 2 &&
        !part.match(/^\$\d+(\.\d{1,2})?$/)
      ) {
        return (
          <InlineMath key={index} math={part.substring(1, part.length - 1)} />
        );
      }
    } catch (error) {
      console.error("Error rendering LaTeX:", error, part);
      return (
        <span key={index} className="text-red-500 font-mono">
          {part}
        </span>
      ); // Show error inline
    }
    // Replace newline characters with <br /> for proper display in HTML
    return part.split("\n").map((line, lineIndex) => (
      <React.Fragment key={`${index}-${lineIndex}`}>
        {lineIndex > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
};
