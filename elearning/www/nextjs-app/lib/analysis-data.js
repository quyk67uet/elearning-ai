export const studentPerformanceData = {
  overallProgress: 68,
  skillsData: {
    categories: [
      "Comprehension",
      "Writing",
      "Arithmetic",
      "Modeling",
      "Application",
      "Computation",
    ],
    currentPeriod: [75, 60, 85, 45, 70, 80],
    previousPeriod: [65, 55, 80, 40, 65, 75],
    classAverage: [70, 65, 75, 60, 65, 70],
  },
  knowledgeGaps: {
    mathematicsKnowledge: [
      {
        title: "Arithmetic",
        mistakes: [
          { text: "Slow or incorrect", highlight: "basic calculations" },
          {
            text: "Difficulty with",
            highlight: "fractions, decimals & percentages",
          },
          { text: "Trouble with", highlight: "order of operations" },
        ],
      },
      {
        title: "Algebra",
        mistakes: [
          { text: "Confusion with", highlight: "variable manipulation" },
          { text: "Errors in", highlight: "equation solving steps" },
          { text: "Misunderstanding of", highlight: "function notation" },
        ],
      },
    ],
    mathematicsProcesses: [
      {
        title: "Problem Solving",
        level: "Developing",
        issues: [
          "Does not justify responses logically",
          "Does not reflect on and explains procedures",
          "Struggles to identify relevant information in word problems",
        ],
      },
      {
        title: "Mathematical Communication",
        level: "Emerging",
        issues: [
          "Inconsistent use of mathematical terminology",
          "Difficulty explaining reasoning process",
          "Limited ability to represent problems visually",
        ],
      },
    ],
  },
  performanceTrend: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Comprehension",
        data: [60, 65, 68, 70, 72, 75],
        color: "rgba(99, 102, 241, 1)",
      },
      {
        label: "Arithmetic",
        data: [75, 78, 80, 82, 83, 85],
        color: "rgba(236, 72, 153, 1)",
      },
      {
        label: "Modeling",
        data: [30, 32, 35, 38, 42, 45],
        color: "rgba(74, 222, 128, 1)",
      },
    ],
  },
  areasForImprovement: [
    {
      title: "Algebraic Equation Solving",
      issues: [
        "Maintaining equation balance",
        "Frequent errors in variable isolation during 3+ step problems",
        "Multi-step algebraic manipulations",
      ],
      recommendations: [
        "Identifying key problem components",
        "Breaking down multi-step equations",
        "Applying algebraic manipulation techniques",
      ],
      masteryLevel: 2,
    },
    {
      title: "Word Problem Interpretation",
      issues: [
        "Difficulty translating word problems into equations",
        "Missing key information in problem statements",
        "Confusion with multi-step word problems",
      ],
      recommendations: [
        "Practicing keyword identification",
        "Creating visual representations of problems",
        "Working with simplified problems first",
      ],
      masteryLevel: 1,
    },
  ],
  strengths: [
    {
      title: "Basic Arithmetic",
      skills: [
        "Quick and accurate with basic operations",
        "Strong understanding of place value",
        "Effective mental math strategies",
      ],
      masteryLevel: 5,
    },
    {
      title: "Geometric Reasoning",
      skills: [
        "Strong spatial visualization skills",
        "Accurate application of geometric formulas",
        "Clear understanding of geometric properties",
      ],
      masteryLevel: 4,
    },
  ],
  recommendedActions: [
    {
      title: "Algebraic Equation Mastery",
      description:
        "Focus on step-by-step equation solving techniques to improve algebraic manipulation skills.",
      priority: "high",
      resources: [
        {
          type: "video",
          title: "Balancing Equations: The Basics",
          duration: "15 min",
        },
        {
          type: "practice",
          title: "Step-by-Step Equation Solving",
          duration: "20 problems",
        },
        {
          type: "lesson",
          title: "Advanced Algebraic Techniques",
          duration: "30 min",
        },
      ],
    },
    {
      title: "Word Problem Translation",
      description:
        "Learn strategies for converting word problems into mathematical equations.",
      priority: "medium",
      resources: [
        {
          type: "lesson",
          title: "Keyword Identification in Word Problems",
          duration: "20 min",
        },
        {
          type: "practice",
          title: "Word Problem Translation Practice",
          duration: "15 problems",
        },
      ],
    },
    {
      title: "Modeling Improvement",
      description:
        "Develop skills in creating mathematical models from real-world scenarios.",
      priority: "high",
      resources: [
        {
          type: "video",
          title: "Introduction to Mathematical Modeling",
          duration: "25 min",
        },
        {
          type: "practice",
          title: "Basic Modeling Exercises",
          duration: "10 problems",
        },
      ],
    },
    {
      title: "Fraction Operations Review",
      description:
        "Strengthen your understanding of operations with fractions.",
      priority: "low",
      resources: [
        {
          type: "review",
          title: "Fraction Operations Quick Review",
          duration: "10 min",
        },
        {
          type: "practice",
          title: "Mixed Fraction Problems",
          duration: "12 problems",
        },
      ],
    },
  ],
  chapters: [
    {
      id: "ch1",
      name: "Numbers and Operations",
      number: 1,
      description: "Understanding numbers, operations, and their properties",
      status: "completed",
      completionRate: 100,
      topics: [
        {
          id: "t1",
          name: "Whole Numbers",
          description: "Operations with whole numbers",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t2",
          name: "Fractions",
          description: "Understanding and operations with fractions",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t3",
          name: "Decimals",
          description: "Understanding and operations with decimals",
          status: "completed",
          completionRate: 100,
        },
      ],
      tests: [
        {
          id: "test1",
          name: "Number Operations Quiz",
          questions: 10,
          duration: "20 min",
          score: 85,
        },
        {
          id: "test2",
          name: "Fractions and Decimals Test",
          questions: 15,
          duration: "30 min",
          score: 80,
        },
      ],
    },
    {
      id: "ch2",
      name: "Algebra and Functions",
      number: 2,
      description: "Understanding patterns, relations, and functions",
      status: "in-progress",
      completionRate: 65,
      topics: [
        {
          id: "t4",
          name: "Variables and Expressions",
          description: "Using variables in expressions",
          status: "completed",
          completionRate: 100,
        },
        {
          id: "t5",
          name: "Equations",
          description: "Solving linear equations",
          status: "in-progress",
          completionRate: 70,
        },
        {
          id: "t6",
          name: "Functions",
          description: "Understanding and graphing functions",
          status: "not-started",
          completionRate: 0,
        },
      ],
      tests: [
        {
          id: "test3",
          name: "Expressions Quiz",
          questions: 10,
          duration: "20 min",
          score: 75,
        },
        {
          id: "test4",
          name: "Equations Test",
          questions: 15,
          duration: "30 min",
          score: null,
        },
      ],
    },
    {
      id: "ch3",
      name: "Geometry and Measurement",
      number: 3,
      description: "Understanding shapes, sizes, and properties of objects",
      status: "not-started",
      completionRate: 0,
      topics: [
        {
          id: "t7",
          name: "Basic Shapes",
          description: "Properties of 2D shapes",
          status: "not-started",
          completionRate: 0,
        },
        {
          id: "t8",
          name: "Area and Perimeter",
          description: "Calculating area and perimeter",
          status: "not-started",
          completionRate: 0,
        },
        {
          id: "t9",
          name: "Volume",
          description: "Calculating volume of 3D shapes",
          status: "not-started",
          completionRate: 0,
        },
      ],
      tests: [
        {
          id: "test5",
          name: "Geometry Basics",
          questions: 10,
          duration: "20 min",
          score: null,
        },
        {
          id: "test6",
          name: "Area and Volume",
          questions: 15,
          duration: "30 min",
          score: null,
        },
      ],
    },
  ],
};
