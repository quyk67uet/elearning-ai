import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * Component to render HTML content with LaTeX math expressions
 * @param {Object} props 
 * @param {string} props.content - HTML content potentially containing LaTeX expressions
 */
export default function MathRenderer({ content }) {
  const [renderedContent, setRenderedContent] = useState("");

  useEffect(() => {
    if (!content) {
      setRenderedContent("");
      return;
    }

    try {
      // Create a temporary div to hold the HTML content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;

      // Find all LaTeX expressions in spans and render them
      const latexElements = tempDiv.querySelectorAll("span.math");
      latexElements.forEach(renderLatexElement);

      // Get processed HTML with inline/display LaTeX
      const htmlContent = tempDiv.innerHTML;
      const processedHtml = processLatexInText(htmlContent);

      // Set final HTML
      setRenderedContent(processedHtml);
    } catch (error) {
      console.error("Error processing content:", error);
      setRenderedContent(content); // fallback
    }
  }, [content]);

  // Decode HTML entities like &lt; to <
  const decodeHtmlEntities = (text) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  };

  // Render LaTeX inside span.math elements
  const renderLatexElement = (element) => {
    try {
      const latex = element.textContent;
      katex.render(latex, element, {
        throwOnError: false,
        displayMode: element.classList.contains("display-math"),
      });
    } catch (err) {
      console.error("Error rendering LaTeX:", err);
    }
  };

  // Render inline and display LaTeX expressions
  const processLatexInText = (text) => {
    if (!text) return "";

    // First decode any HTML entities
    text = decodeHtmlEntities(text);

    // Render inline math: \(...\)
    let processed = text.replace(/\\\((.*?)\\\)/g, (match, p1) => {
      try {
        return katex.renderToString(p1, { throwOnError: false, displayMode: false });
      } catch (err) {
        console.error("Error rendering inline LaTeX:", err);
        return match;
      }
    });

    // Render display math: \[...\]
    processed = processed.replace(/\\\[(.*?)\\\]/g, (match, p1) => {
      try {
        return katex.renderToString(p1, { throwOnError: false, displayMode: true });
      } catch (err) {
        console.error("Error rendering display LaTeX:", err);
        return match;
      }
    });

    return processed;
  };

  return (
    <div
      className="math-content"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
