"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function SpiderChart({ data }) {
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
      type: "radar",
      data: {
        labels: data.categories,
        datasets: [
          {
            label: "Current Period",
            data: data.currentPeriod,
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(99, 102, 241, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(99, 102, 241, 1)",
          },
          {
            label: "Previous Period",
            data: data.previousPeriod,
            backgroundColor: "rgba(236, 72, 153, 0.2)",
            borderColor: "rgba(236, 72, 153, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(236, 72, 153, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(236, 72, 153, 1)",
          },
          {
            label: "Class Average",
            data: data.classAverage,
            backgroundColor: "rgba(74, 222, 128, 0.2)",
            borderColor: "rgba(74, 222, 128, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(74, 222, 128, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(74, 222, 128, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: {
              display: true,
              color: "rgba(0, 0, 0, 0.1)",
            },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: {
              stepSize: 20,
              backdropColor: "transparent",
            },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 20,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw}%`,
            },
          },
        },
        elements: {
          line: {
            tension: 0.1,
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
