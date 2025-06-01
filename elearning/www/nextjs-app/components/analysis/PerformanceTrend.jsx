"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function PerformanceTrend({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");

    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.color,
          backgroundColor: `white`,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + "%",
              color: "#6B7280", // Gray text for ticks
            },
            grid: {
              color: "rgba(226, 232, 240, 0.6)", // Light gray grid lines
            },
          },
          x: {
            ticks: {
              color: "#6B7280", // Gray text for ticks
            },
            grid: {
              color: "rgba(226, 232, 240, 0.6)", // Light gray grid lines
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 20,
              color: "#4B5563", // Darker gray for legend text
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw}%`,
            },
            backgroundColor: "rgba(255, 255, 255, 0.9)", // Light background
            titleColor: "#1F2937", // Dark text for title
            bodyColor: "#4B5563", // Gray text for body
            borderColor: "#E5E7EB", // Light border
            borderWidth: 1,
          },
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={chartRef} />;
}
