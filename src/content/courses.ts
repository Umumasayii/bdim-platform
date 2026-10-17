// Seed course catalogue. Titles and outlines are editable defaults: BDIM can
// change any of this from /admin/courses (stored in the database), or here
// before seeding. Durations are indicative. No prices are set: every course
// uses quote-based pricing until BDIM formally decides otherwise.
import type {
  Assignment,
  CategoryId,
  Course,
  CourseModule,
  DeliveryFormat,
  Lesson,
  Level,
  Quiz,
} from "@/lib/types";
import { sampleLessonContent } from "./lesson-content";

type L = [title: string, summary: string, minutes: number, extra?: Partial<Lesson>];
type M = [title: string, summary: string, lessons: L[], extra?: { quiz?: Omit<Quiz, "id">; assignment?: Omit<Assignment, "id"> }];

interface CourseInput {
  slug: string;
  title: string;
  category: CategoryId;
  level: Level;
  summary: string;
  description: string;
  prerequisites: string[];
  skills: string[];
  objectives: string[];
  tools: string[];
  duration: string;
  formats?: DeliveryFormat[];
  featured?: boolean;
  enrollmentMode?: "open" | "approval";
  modules: M[];
}

let order = 0;

function build(input: CourseInput): Course {
  const modules: CourseModule[] = input.modules.map(([title, summary, lessons, extra], mi) => {
    const moduleId = `${input.slug}-m${mi + 1}`;
    return {
      id: moduleId,
      title,
      summary,
      lessons: lessons.map(([lt, ls, minutes, lx], li) => {
        const id = `${moduleId}-l${li + 1}`;
        return {
          id,
          title: lt,
          summary: ls,
          durationMinutes: minutes,
          content: sampleLessonContent[id],
          ...lx,
        };
      }),
      quiz: extra?.quiz ? { id: `${moduleId}-quiz`, ...extra.quiz } : undefined,
      assignment: extra?.assignment ? { id: `${moduleId}-assignment`, ...extra.assignment } : undefined,
    };
  });
  order += 1;
  return {
    id: input.slug,
    slug: input.slug,
    title: input.title,
    category: input.category,
    level: input.level,
    summary: input.summary,
    description: input.description,
    prerequisites: input.prerequisites,
    skills: input.skills,
    objectives: input.objectives,
    tools: input.tools,
    formats: input.formats ?? ["Live online", "In person (Kigali)", "Corporate / group"],
    duration: input.duration,
    modules,
    pricing: { mode: "quote", note: "Pricing is negotiable for individuals, groups and organizations." },
    enrollmentMode: input.enrollmentMode ?? "approval",
    certificate: { enabled: true, requireAllLessons: true, minQuizScore: 70 },
    featured: input.featured ?? false,
    published: true,
    sortOrder: order,
  };
}

const q = (prompt: string, options: string[], answerIndex: number, explanation: string) => ({
  id: "",
  prompt,
  options,
  answerIndex,
  explanation,
});

function quiz(title: string, questions: ReturnType<typeof q>[], passMark = 70): Omit<Quiz, "id"> {
  return { title, passMark, questions: questions.map((x, i) => ({ ...x, id: `q${i + 1}` })) };
}

export const seedCourses: Course[] = [
  // ───────────── Data analytics & business intelligence ─────────────
  build({
    slug: "advanced-excel",
    title: "Advanced Microsoft Excel for Data Analysis",
    category: "analytics-bi",
    level: "Beginner",
    featured: true,
    enrollmentMode: "open",
    summary: "Turn raw spreadsheets into reliable analysis with lookups, PivotTables, Power Query and clear charts.",
    description:
      "A practical course for people who already use Excel but want to work faster and more reliably. You will clean messy exports, build lookup-driven models, summarise thousands of rows with PivotTables, and present results that decision-makers understand.",
    prerequisites: ["Basic Excel navigation (entering data, simple formulas)"],
    skills: ["XLOOKUP & INDEX/MATCH", "Conditional aggregation", "PivotTables", "Power Query", "Dashboard charts"],
    objectives: [
      "Write robust formulas with absolute/relative references and named ranges",
      "Summarise data with SUMIFS, COUNTIFS, AVERAGEIFS and PivotTables",
      "Clean and reshape data with Power Query instead of manual edits",
      "Build a one-page summary dashboard for a business or programme",
    ],
    tools: ["Microsoft Excel 365", "Power Query"],
    duration: "4 weeks · 2 sessions per week",
    modules: [
      ["Formulas that don't break", "References, named ranges and logical functions.", [
        ["Relative vs absolute references", "Why formulas break when copied, and how to fix them.", 25, { isSample: true }],
        ["Logical tests with IF, IFS and AND/OR", "Categorise records with clear business rules.", 30],
        ["Lookups with XLOOKUP and INDEX/MATCH", "Combine tables safely, with sensible not-found handling.", 35, { isSample: true }],
      ], { quiz: quiz("Formula fundamentals check", [
        q("You copy =B2*$C$1 from D2 to D3. What does D3 contain?", ["=B3*$C$1", "=B3*$C$2", "=B2*$C$1", "=C3*$D$1"], 0, "The relative reference B2 shifts to B3; the absolute $C$1 stays fixed."),
        q("Which function returns a value from a table using a key, with a built-in not-found argument?", ["VLOOKUP", "XLOOKUP", "HLOOKUP", "MATCH"], 1, "XLOOKUP has an if_not_found argument and works in either direction."),
        q("=IF(A2>=50,\"Pass\",\"Fail\") with A2 = 50 returns…", ["Pass", "Fail", "#VALUE!", "TRUE"], 0, ">= includes 50, so the result is Pass."),
      ]) }],
      ["Summarising data", "Conditional aggregation and PivotTables.", [
        ["SUMIFS, COUNTIFS and AVERAGEIFS", "Answer 'how much, how many' questions by group.", 35],
        ["PivotTables and slicers", "Summarise thousands of rows in seconds.", 40],
        ["Calculated fields and grouping dates", "Monthly and quarterly views without helper columns.", 30],
      ], { assignment: { title: "Regional sales summary", brief: "Using the sample sales file, produce a PivotTable of revenue by region and month, and write three sentences describing the main pattern." } }],
      ["Cleaning with Power Query", "Repeatable data preparation.", [
        ["Importing and profiling data", "Spot blanks, duplicates and wrong types early.", 30],
        ["Transform steps: split, unpivot, merge", "Reshape exports into analysis-ready tables.", 40],
        ["Refreshing a cleaned dataset", "Replace manual cleaning with one-click refresh.", 20],
      ]],
      ["Presenting results", "Charts and a one-page dashboard.", [
        ["Choosing the right chart", "Comparisons, trends and composition.", 25],
        ["Building a summary dashboard", "Layout, KPIs and slicers on one page.", 45],
      ], { assignment: { title: "One-page dashboard", brief: "Build a one-page Excel dashboard for a fictional cooperative's monthly sales, with at least three KPIs and one slicer." } }],
    ],
  }),
  build({
    slug: "power-bi-dashboards",
    title: "Power BI & Dashboard Development",
    category: "analytics-bi",
    level: "Intermediate",
    featured: true,
    summary: "Model data, write DAX measures and publish dashboards that leadership teams use every week.",
    description:
      "Learn the full Power BI workflow: connect and transform data, design a star-schema model, write DAX measures, and design reports that answer specific management questions. Examples cover sales, programme monitoring and service delivery.",
    prerequisites: ["Comfortable with Excel tables and PivotTables"],
    skills: ["Power Query", "Data modelling (star schema)", "DAX measures", "Report design", "Publishing & sharing"],
    objectives: [
      "Build a clean star-schema model from several source tables",
      "Write DAX measures for totals, ratios, time intelligence and targets",
      "Design report pages around decisions rather than visuals",
      "Publish, schedule refresh and manage access",
    ],
    tools: ["Power BI Desktop", "Power BI Service", "DAX"],
    duration: "5 weeks · 2 sessions per week",
    modules: [
      ["Getting data in shape", "Power Query for BI.", [
        ["Connecting to Excel, CSV and databases", "Typical sources in organizations.", 30],
        ["Shaping data in Power Query", "Types, merges and appends.", 35],
      ]],
      ["Modelling", "Relationships and the star schema.", [
        ["Facts, dimensions and relationships", "Why the model matters more than the visuals.", 35],
        ["Date tables", "The foundation for time intelligence.", 25],
      ]],
      ["DAX measures", "Calculations that answer questions.", [
        ["Measures vs calculated columns", "When to use each, and why it matters for performance.", 30, { isSample: true }],
        ["CALCULATE and filter context", "The most important idea in DAX.", 45],
        ["Time intelligence", "Year-to-date, previous period and growth.", 35],
      ], { quiz: quiz("DAX essentials", [
        q("Which is evaluated in filter context at query time?", ["A calculated column", "A measure", "A Power Query step", "A relationship"], 1, "Measures are computed for each filter context when a visual is rendered."),
        q("CALCULATE is mainly used to…", ["Create tables", "Modify the filter context of an expression", "Rename columns", "Import data"], 1, "CALCULATE evaluates an expression under modified filters."),
      ]) }],
      ["Designing and publishing", "From report to decisions.", [
        ["Designing a KPI page", "Hierarchy, colour and annotation.", 40],
        ["Publishing and refresh", "Workspaces, sharing and scheduled refresh.", 30],
      ], { assignment: { title: "Programme monitoring dashboard", brief: "Build a two-page Power BI report for a fictional health programme using the provided indicator data: one overview page and one drill-down page by district." } }],
    ],
  }),
  build({
    slug: "data-cleaning-reporting",
    title: "Data Cleaning, Transformation & Reporting",
    category: "analytics-bi",
    level: "Beginner",
    summary: "Make messy data trustworthy: detect errors, fix them reproducibly and report clearly.",
    description:
      "Most analysis time goes into preparing data. This course teaches a disciplined approach to cleaning: profiling, validation rules, documented transformations and clear reporting of what was changed.",
    prerequisites: ["Basic Excel or any analysis tool"],
    skills: ["Data profiling", "Validation rules", "Handling missing values", "Reshaping data", "Cleaning logs"],
    objectives: [
      "Profile a dataset and list its quality problems",
      "Apply documented, repeatable cleaning steps",
      "Choose appropriate treatment for missing values and outliers",
      "Write a short data quality report for stakeholders",
    ],
    tools: ["Excel / Power Query", "Python (pandas) or R (dplyr)"],
    duration: "3 weeks",
    modules: [
      ["Profiling", "Know your data before you change it.", [
        ["Types, ranges and distributions", "A checklist for first contact with a dataset.", 30],
        ["Duplicates and identifiers", "Finding and resolving duplicate records.", 25],
      ]],
      ["Cleaning", "Reproducible fixes.", [
        ["Missing values: delete, flag or impute?", "Decisions with consequences for your results.", 35, { isSample: true, exerciseId: "py-missing-values" }],
        ["Recoding and standardising categories", "Consistent labels for districts, sectors and more.", 30],
        ["Reshaping: wide and long formats", "Getting data into the shape analysis needs.", 30],
      ]],
      ["Reporting", "Communicate what you did.", [
        ["Cleaning logs and data dictionaries", "Documentation others can audit.", 25],
        ["The data quality summary", "A one-page report for decision-makers.", 25],
      ], { assignment: { title: "Clean a survey extract", brief: "Clean the provided survey extract, keep a cleaning log of every change, and submit a one-page quality summary." } }],
    ],
  }),
  build({
    slug: "business-analytics-kpis",
    title: "Business Analytics & KPI Development",
    category: "analytics-bi",
    level: "Intermediate",
    summary: "Define the right indicators, measure them consistently and use them to steer performance.",
    description:
      "Learn how to translate goals into measurable KPIs, set baselines and targets, and analyse performance drivers. Suitable for managers, analysts and M&E officers working with businesses, NGOs and public institutions.",
    prerequisites: ["Basic spreadsheet skills"],
    skills: ["KPI design", "Baselines & targets", "Variance analysis", "Cohort and funnel analysis", "Performance reporting"],
    objectives: [
      "Write SMART KPIs linked to organizational goals",
      "Calculate and interpret growth, ratios and variance to target",
      "Analyse funnels and cohorts to find performance drivers",
      "Produce a monthly performance review pack",
    ],
    tools: ["Excel", "Power BI"],
    duration: "3 weeks",
    modules: [
      ["Designing indicators", "From goals to KPIs.", [
        ["Leading and lagging indicators", "What to measure, and when.", 25],
        ["Baselines, targets and definitions", "Making indicators consistent over time.", 30],
      ]],
      ["Analysing performance", "Finding what drives results.", [
        ["Variance and growth analysis", "Month-on-month, year-on-year and vs target.", 35],
        ["Funnels and cohorts", "Where customers or beneficiaries drop off.", 35],
      ]],
      ["Reporting performance", "Making KPIs useful.", [
        ["The monthly performance pack", "Structure, narrative and actions.", 30],
      ], { assignment: { title: "KPI framework", brief: "Draft a KPI framework (5–8 indicators with definitions, baselines and targets) for a business or programme you know." } }],
    ],
  }),

  // ───────────── Programming & statistical computing ─────────────
  build({
    slug: "r-programming",
    title: "R Programming for Data Analysis",
    category: "programming",
    level: "Beginner",
    featured: true,
    summary: "Import, clean, analyse and visualise data in R with the tidyverse, and produce reproducible reports.",
    description:
      "A hands-on introduction to R for analysts, researchers and students. You will work with real-world style datasets, learn dplyr and ggplot2, and finish with a reproducible report generated from code.",
    prerequisites: ["No programming experience required"],
    skills: ["R & RStudio", "dplyr", "ggplot2", "Data import", "R Markdown / Quarto"],
    objectives: [
      "Write R scripts to import and clean data",
      "Summarise data by group with dplyr",
      "Create publication-quality charts with ggplot2",
      "Produce a reproducible report with Quarto or R Markdown",
    ],
    tools: ["R", "RStudio / Positron", "tidyverse", "Quarto"],
    duration: "5 weeks",
    modules: [
      ["R foundations", "Objects, vectors and data frames.", [
        ["Your first R session", "Console, scripts and projects.", 25, { isSample: true }],
        ["Vectors, data frames and types", "How R stores data.", 30],
      ]],
      ["Data wrangling with dplyr", "The verbs of data manipulation.", [
        ["filter, select, mutate", "Subsetting and creating variables.", 35, { exerciseId: "r-summary-by-group" }],
        ["group_by and summarise", "Group statistics in a few lines.", 35],
        ["Joining tables", "left_join and friends.", 30],
      ], { quiz: quiz("dplyr check", [
        q("Which verb keeps rows that meet a condition?", ["select()", "filter()", "mutate()", "arrange()"], 1, "filter() subsets rows; select() picks columns."),
        q("To compute the mean income by district you would use…", ["group_by(district) |> summarise(mean(income))", "select(district, income)", "mutate(mean(income))", "arrange(district)"], 0, "Group first, then summarise."),
      ]) }],
      ["Visualisation", "ggplot2 grammar of graphics.", [
        ["Building plots layer by layer", "Aesthetics, geoms and scales.", 40],
        ["Facets, labels and themes", "From draft to publication-ready.", 30],
      ]],
      ["Reproducible reporting", "Code, results and text together.", [
        ["Quarto / R Markdown reports", "Automate your report.", 40],
      ], { assignment: { title: "Reproducible district report", brief: "Produce a short Quarto report that summarises a provided dataset by district with at least two charts." } }],
    ],
  }),
  build({
    slug: "python-programming",
    title: "Python Programming for Data",
    category: "programming",
    level: "Beginner",
    featured: true,
    enrollmentMode: "open",
    summary: "Learn Python from zero and use pandas to analyse real datasets.",
    description:
      "Start with core Python, then move quickly to pandas for loading, cleaning and summarising data. Exercises run in the browser-based Coding Lab, so you can practise without installing anything.",
    prerequisites: ["No programming experience required"],
    skills: ["Python syntax", "Functions", "pandas DataFrames", "Grouping & aggregation", "Basic plotting"],
    objectives: [
      "Write Python scripts using variables, loops and functions",
      "Load and inspect data with pandas",
      "Clean, filter and aggregate data",
      "Communicate findings with simple charts",
    ],
    tools: ["Python 3", "pandas", "Jupyter / VS Code"],
    duration: "5 weeks",
    modules: [
      ["Python basics", "The language essentials.", [
        ["Variables, types and operators", "The building blocks.", 25],
        ["Lists, dictionaries and loops", "Working with collections.", 35],
        ["Writing functions", "Reusable, testable code.", 30],
      ]],
      ["pandas fundamentals", "DataFrames for analysis.", [
        ["Loading and inspecting data", "read_csv, head, info and describe.", 30, { isSample: true, exerciseId: "py-summary-stats" }],
        ["Selecting and filtering", "loc, boolean masks and query.", 35],
        ["groupby and aggregation", "Summaries by category.", 35, { exerciseId: "py-sales-by-region" }],
      ], { quiz: quiz("pandas check", [
        q("Which method shows the first five rows of a DataFrame?", ["df.first()", "df.head()", "df.top()", "df.show()"], 1, "head() returns the first n rows (default 5)."),
        q("df.groupby('region')['sales'].sum() returns…", ["Total sales per region", "The number of regions", "A sorted DataFrame", "Mean sales"], 0, "It groups by region and sums sales within each group."),
        q("What does df.isna().sum() give you?", ["Row totals", "Missing values per column", "Duplicates per column", "Column types"], 1, "isna() flags missing values; sum() counts them per column."),
      ]) }],
      ["Cleaning and preparing data", "Common real-world fixes.", [
        ["Missing values and types", "fillna, dropna and astype.", 30, { exerciseId: "py-missing-values" }],
        ["Working with text and dates", "String methods and datetime.", 30],
      ], { assignment: { title: "Labour market mini-analysis", brief: "Using the synthetic employment dataset in the Coding Lab, compute employment rates by age group and sex, and write a short interpretation." } }],
    ],
  }),
  build({
    slug: "sql-querying",
    title: "SQL & Database Querying",
    category: "programming",
    level: "Beginner",
    featured: true,
    enrollmentMode: "open",
    summary: "Query relational databases confidently: filter, join, aggregate and build analysis-ready tables.",
    description:
      "SQL is the common language of data teams. Practise every concept against real tables in the browser-based Coding Lab, from SELECT basics to window functions.",
    prerequisites: ["None"],
    skills: ["SELECT & WHERE", "JOINs", "GROUP BY & HAVING", "Subqueries & CTEs", "Window functions"],
    objectives: [
      "Retrieve and filter data from one or more tables",
      "Aggregate data correctly with GROUP BY and HAVING",
      "Combine tables with the right kind of JOIN",
      "Use CTEs and window functions for analysis",
    ],
    tools: ["SQL (SQLite, PostgreSQL, MySQL dialects)"],
    duration: "4 weeks",
    modules: [
      ["Querying one table", "The core of SQL.", [
        ["SELECT, WHERE and ORDER BY", "Retrieve exactly what you need.", 25],
        ["Aggregation with GROUP BY", "Totals and averages by group.", 35, { isSample: true, exerciseId: "sql-revenue-by-region" }],
        ["HAVING vs WHERE", "Filtering before and after aggregation.", 20],
      ], { quiz: quiz("SQL aggregation check", [
        q("Which clause filters groups after aggregation?", ["WHERE", "HAVING", "ORDER BY", "LIMIT"], 1, "HAVING filters aggregated groups; WHERE filters rows before grouping."),
        q("COUNT(*) vs COUNT(column): which ignores NULLs?", ["COUNT(*)", "COUNT(column)", "Both", "Neither"], 1, "COUNT(column) counts non-NULL values only."),
      ]) }],
      ["Combining tables", "Joins and set operations.", [
        ["INNER and LEFT JOIN", "Matching records across tables.", 35, { exerciseId: "sql-join-customers" }],
        ["Avoiding duplicate counts", "Join cardinality pitfalls.", 25],
      ]],
      ["Analytical SQL", "CTEs and window functions.", [
        ["Common table expressions", "Readable multi-step queries.", 30],
        ["Window functions", "Ranking, running totals and moving averages.", 40, { exerciseId: "sql-rank-products" }],
      ], { assignment: { title: "Sales analysis queries", brief: "Write five queries against the sample sales database answering the business questions provided in the brief." } }],
    ],
  }),
  build({
    slug: "statistical-computing-automation",
    title: "Statistical Computing & Report Automation",
    category: "programming",
    level: "Advanced",
    summary: "Automate recurring analyses and reports with Python and R — from raw data to finished document.",
    description:
      "For analysts who produce the same tables and reports every month or quarter. Learn to structure analysis code, parameterise reports and schedule them, so repeat work takes minutes instead of days.",
    prerequisites: ["Working knowledge of Python or R", "Basic statistics"],
    skills: ["Functions & modules", "Parameterised reports", "Scheduling", "Version control basics", "Testing analysis code"],
    objectives: [
      "Structure analysis projects for reuse",
      "Generate parameterised reports for each district, programme or client",
      "Automate data refresh and report generation",
      "Add simple checks that catch data errors before they reach a report",
    ],
    tools: ["Python", "R", "Quarto", "Git"],
    duration: "4 weeks",
    modules: [
      ["Organising analysis code", "Projects others can run.", [
        ["Project structure and functions", "From long scripts to tidy modules.", 35],
        ["Version control with Git", "Track changes and collaborate.", 35],
      ]],
      ["Automated reporting", "One template, many reports.", [
        ["Parameterised Quarto reports", "A report per district in one run.", 40],
        ["Exporting tables and charts", "Word, PDF, Excel and HTML outputs.", 30],
      ]],
      ["Reliability", "Trustworthy pipelines.", [
        ["Data validation checks", "Fail early when data is wrong.", 30],
        ["Scheduling and logging", "Run on a timetable, know when it fails.", 25],
      ], { assignment: { title: "Automated monthly report", brief: "Build a parameterised report that produces one PDF per region from the sample dataset." } }],
    ],
  }),

  // ───────────── Statistics & research ─────────────
  build({
    slug: "descriptive-inferential-statistics",
    title: "Descriptive & Inferential Statistics",
    category: "statistics-research",
    level: "Beginner",
    featured: true,
    enrollmentMode: "open",
    summary: "Understand the statistics behind every report: summaries, sampling, confidence intervals and hypothesis tests.",
    description:
      "A clear, applied introduction to statistics. Each concept is explained with examples from health, agriculture, education and business, and practised in software.",
    prerequisites: ["Secondary-school mathematics"],
    skills: ["Measures of centre & spread", "Distributions", "Sampling", "Confidence intervals", "Hypothesis testing"],
    objectives: [
      "Choose and interpret appropriate summary statistics",
      "Explain sampling variability and the standard error",
      "Construct and interpret confidence intervals",
      "Run and interpret common hypothesis tests (t-test, chi-square)",
    ],
    tools: ["Excel", "R or Python", "STATA / SPSS (optional)"],
    duration: "5 weeks",
    modules: [
      ["Describing data", "Summaries and charts.", [
        ["Mean, median and when they disagree", "Skewed data, like income, needs care.", 25, { isSample: true }],
        ["Spread: range, IQR and standard deviation", "How variable is the data?", 30],
        ["Describing categorical data", "Frequencies, proportions and cross-tabs.", 25],
      ], { quiz: quiz("Describing data check", [
        q("Household incomes are strongly right-skewed. Which is the better 'typical' value?", ["Mean", "Median", "Range", "Maximum"], 1, "The median is not pulled up by a few very large incomes."),
        q("Which measure of spread is robust to outliers?", ["Standard deviation", "Range", "Interquartile range", "Variance"], 2, "The IQR uses the middle 50% of the data."),
      ]) }],
      ["From samples to populations", "Sampling and estimation.", [
        ["Sampling distributions and the standard error", "Why estimates vary between samples.", 35],
        ["Confidence intervals", "Estimating with honest uncertainty.", 35],
      ]],
      ["Testing hypotheses", "Evidence, not certainty.", [
        ["p-values and significance", "What they mean, and what they don't.", 35],
        ["t-tests and chi-square tests", "Comparing groups.", 40],
      ], { quiz: quiz("Inference check", [
        q("A 95% confidence interval means…", ["There is a 95% chance the sample mean is in the interval", "The procedure captures the true value in 95% of repeated samples", "95% of the data lies in the interval", "The result is 95% important"], 1, "Confidence refers to the long-run behaviour of the method."),
        q("A p-value of 0.03 means…", ["The null hypothesis is 3% likely", "If the null were true, data this extreme would occur about 3% of the time", "The effect is large", "There is a 97% chance the result is correct"], 1, "It's a statement about the data assuming the null hypothesis."),
      ]), assignment: { title: "Compare two groups", brief: "Use the sample dataset to test whether mean yields differ between two farming practices, and report the result in plain language." } }],
    ],
  }),
  build({
    slug: "regression-analysis",
    title: "Regression Analysis",
    category: "statistics-research",
    level: "Intermediate",
    summary: "Model relationships with linear and logistic regression, check assumptions and report results responsibly.",
    description:
      "Regression is the workhorse of applied research. Learn to specify, estimate, diagnose and interpret models, and to avoid the common traps of confounding and over-interpretation.",
    prerequisites: ["Descriptive & Inferential Statistics or equivalent"],
    skills: ["Simple & multiple regression", "Dummy variables & interactions", "Diagnostics", "Logistic regression", "Reporting"],
    objectives: [
      "Fit and interpret linear regression models",
      "Include categorical predictors and interactions",
      "Diagnose assumption violations and influential points",
      "Fit and interpret logistic regression for binary outcomes",
    ],
    tools: ["R", "Python (statsmodels)", "STATA"],
    duration: "4 weeks",
    modules: [
      ["Linear regression", "Relationships with one or more predictors.", [
        ["Simple linear regression", "Slope, intercept and R².", 30, { exerciseId: "py-regression" }],
        ["Multiple regression and confounding", "Holding other factors constant.", 35],
        ["Categorical predictors and interactions", "Dummies and effect modification.", 35],
      ]],
      ["Checking models", "Assumptions and diagnostics.", [
        ["Residual diagnostics", "Linearity, constant variance and normality.", 30],
        ["Multicollinearity and influence", "VIF, leverage and Cook's distance.", 30],
      ]],
      ["Binary outcomes", "Logistic regression.", [
        ["Odds, log-odds and odds ratios", "Interpreting coefficients.", 35],
        ["Reporting regression results", "Tables and plain-language findings.", 25],
      ], { assignment: { title: "Determinants analysis", brief: "Fit a regression model explaining household expenditure in the sample dataset, check diagnostics and write a results paragraph." } }],
    ],
  }),
  build({
    slug: "survey-data-analysis",
    title: "Survey Data Analysis",
    category: "statistics-research",
    level: "Intermediate",
    summary: "Analyse household and programme surveys correctly — weights, clusters, indicators and tabulation plans.",
    description:
      "Survey data needs special care. Learn how sampling designs affect estimates, how to apply weights, and how to produce indicator tables that match standard practice in national and programme surveys.",
    prerequisites: ["Basic statistics", "Some experience with STATA, SPSS, R or Python"],
    skills: ["Survey weights", "Complex sample designs", "Indicator construction", "Tabulation plans", "Multiple-response questions"],
    objectives: [
      "Explain stratification, clustering and weighting",
      "Compute weighted estimates and standard errors",
      "Construct indicators from raw questionnaire variables",
      "Produce a tabulation plan and summary tables",
    ],
    tools: ["STATA (svy)", "R (survey)", "SPSS Complex Samples"],
    duration: "4 weeks",
    modules: [
      ["Survey design essentials", "How the sample shapes the analysis.", [
        ["Stratification, clustering and weights", "Why unweighted results can mislead.", 35],
        ["Declaring the survey design", "svyset and survey design objects.", 30],
      ]],
      ["Indicators and tables", "From questions to indicators.", [
        ["Constructing indicators", "Numerators, denominators and definitions.", 35],
        ["Multiple-response and Likert items", "Summarising complex question types.", 30, { exerciseId: "py-survey-likert" }],
        ["Tabulation plans", "Planning tables before analysing.", 25],
      ], { assignment: { title: "Indicator table", brief: "Using the sample household survey, produce a weighted table of three indicators by province with confidence intervals." } }],
    ],
  }),
  build({
    slug: "stata",
    title: "STATA for Data Management & Analysis",
    category: "statistics-research",
    level: "Beginner",
    summary: "Manage, analyse and document survey and research data in STATA with reproducible do-files.",
    description:
      "STATA is widely used for survey and economic research in East Africa. Learn data management, labelling, merging, descriptive and regression analysis — all through documented do-files.",
    prerequisites: ["Basic statistics"],
    skills: ["Do-files", "Labels & recoding", "Merge & append", "Descriptive statistics", "Regression in STATA"],
    objectives: [
      "Write do-files that document every analysis step",
      "Clean, label and reshape datasets",
      "Merge household and individual-level files",
      "Produce descriptive and regression output tables",
    ],
    tools: ["STATA"],
    duration: "4 weeks",
    modules: [
      ["Working in STATA", "Do-files and data basics.", [
        ["The STATA interface and do-files", "Reproducible from day one.", 25],
        ["Variables, labels and value labels", "Making data self-documenting.", 30],
      ]],
      ["Data management", "Real-world restructuring.", [
        ["Recode, generate and replace", "Creating analysis variables.", 30],
        ["Merge, append and reshape", "Combining survey modules.", 40],
      ]],
      ["Analysis and output", "From results to tables.", [
        ["Descriptive tables", "tabulate, summarize and table.", 30],
        ["Regression and exporting results", "regress, logit and esttab/etable.", 35],
      ], { assignment: { title: "Merge and analyse", brief: "Merge household and member files from the sample survey and produce a table of household size by region." } }],
    ],
  }),
  build({
    slug: "spss",
    title: "SPSS for Research & Survey Analysis",
    category: "statistics-research",
    level: "Beginner",
    summary: "Use IBM SPSS to manage data, run statistical tests and report research results clearly.",
    description:
      "A friendly route into statistical analysis for students and researchers. Learn SPSS menus and syntax for data preparation, descriptive statistics, tests of association and reporting.",
    prerequisites: ["None"],
    skills: ["Variable view & data view", "Recoding", "Descriptive statistics", "Cross-tabs & chi-square", "t-tests & ANOVA"],
    objectives: [
      "Define variables and value labels correctly",
      "Recode and compute variables, saving syntax",
      "Run and interpret common statistical tests",
      "Export tables and charts for reports",
    ],
    tools: ["IBM SPSS Statistics"],
    duration: "3 weeks",
    modules: [
      ["Data preparation", "Setting up data properly.", [
        ["Defining variables and labels", "Variable view done right.", 25],
        ["Recode, compute and syntax", "Menus that leave an audit trail.", 30],
      ]],
      ["Analysis", "Common research tests.", [
        ["Descriptives and cross-tabulations", "Summaries and associations.", 30],
        ["t-tests, ANOVA and correlation", "Comparing means and relationships.", 35],
      ], { assignment: { title: "Research results chapter", brief: "Analyse the sample dataset and write a short results section with three tables." } }],
    ],
  }),
  build({
    slug: "research-methodology",
    title: "Research Methodology & Quantitative Analysis",
    category: "statistics-research",
    level: "Intermediate",
    summary: "Design rigorous studies: research questions, sampling, measurement, analysis plans and ethics.",
    description:
      "For students, researchers and M&E professionals designing studies and evaluations. Covers the full cycle from research question to analysis plan, with attention to validity, ethics and data protection.",
    prerequisites: ["Basic statistics recommended"],
    skills: ["Research questions & hypotheses", "Study designs", "Sampling & sample size", "Measurement & validity", "Analysis plans"],
    objectives: [
      "Formulate clear, answerable research questions",
      "Select an appropriate study design and sampling strategy",
      "Calculate sample sizes for common designs",
      "Write a pre-specified analysis plan with ethical safeguards",
    ],
    tools: ["Any statistics package", "Sample size calculators"],
    duration: "4 weeks",
    modules: [
      ["Designing the study", "Questions and designs.", [
        ["From problem to research question", "Scoping questions you can answer.", 30],
        ["Experimental, quasi-experimental and observational designs", "Strengths and limits.", 35],
      ]],
      ["Sampling and measurement", "Getting the right data.", [
        ["Sampling strategies and sample size", "Precision, power and cost.", 40],
        ["Validity, reliability and indicators", "Measuring what matters.", 30],
      ]],
      ["Analysis and ethics", "Planning and protecting.", [
        ["Writing an analysis plan", "Decide before you look.", 30],
        ["Research ethics and data protection", "Consent, confidentiality and storage.", 25],
      ], { assignment: { title: "Study protocol outline", brief: "Write a 2-page protocol outline for a study on a topic of your choice, including design, sampling and analysis plan." } }],
    ],
  }),

  // ───────────── Survey & field data systems ─────────────
  build({
    slug: "kobotoolbox",
    title: "KoBoToolbox for Digital Data Collection",
    category: "survey-systems",
    level: "Beginner",
    featured: true,
    summary: "Build XLSForm questionnaires, deploy them to enumerators and manage incoming data in KoBoToolbox.",
    description:
      "KoBoToolbox is widely used by NGOs, researchers and public institutions. Learn to design XLSForms with skip logic and validation, deploy to mobile devices, and export clean data for analysis.",
    prerequisites: ["Basic Excel"],
    skills: ["XLSForm design", "Skip logic & constraints", "Repeat groups", "Deployment & KoboCollect", "Data export"],
    objectives: [
      "Build a complete XLSForm with relevant, constraint and calculation columns",
      "Use groups, repeats and cascading selects",
      "Deploy forms and manage enumerator devices",
      "Monitor submissions and export analysis-ready data",
    ],
    tools: ["KoBoToolbox", "KoboCollect", "XLSForm"],
    duration: "3 weeks",
    modules: [
      ["XLSForm essentials", "Survey, choices and settings sheets.", [
        ["Question types and the survey sheet", "Text, integer, select_one and more.", 30],
        ["Skip logic with relevant", "Ask only the right questions.", 30, { isSample: true }],
        ["Constraints and validation", "Stop errors at the source.", 30],
      ], { quiz: quiz("XLSForm check", [
        q("Which column hides a question unless a condition is met?", ["constraint", "relevant", "calculation", "required"], 1, "relevant controls whether a question is displayed."),
        q("A constraint of . >= 0 and . <= 120 on an age question…", ["Hides the question", "Rejects ages outside 0–120", "Calculates age", "Makes the question required"], 1, "Constraints validate the answer entered."),
      ]) }],
      ["Advanced forms", "Real survey structures.", [
        ["Groups and repeats", "Household rosters.", 35],
        ["Calculations and cascading selects", "Province → district → sector lists.", 35],
      ]],
      ["Deployment and data management", "From field to dataset.", [
        ["Deploying and testing forms", "Pilots that catch problems.", 25],
        ["Monitoring and exporting data", "Daily checks and exports.", 25],
      ], { assignment: { title: "Household survey form", brief: "Build and deploy a short household survey form with a member roster, skip logic and at least three constraints." } }],
    ],
  }),
  build({
    slug: "surveycto",
    title: "SurveyCTO for Research-Grade Data Collection",
    category: "survey-systems",
    level: "Intermediate",
    summary: "Run high-quality, secure field data collection with SurveyCTO's advanced features.",
    description:
      "For research teams running large or sensitive surveys. Covers advanced form logic, encryption, case management, audits and quality monitoring workflows.",
    prerequisites: ["XLSForm basics (e.g. KoBoToolbox course)"],
    skills: ["Advanced XLSForm", "Encryption", "Case management", "Text audits & sensors", "Monitoring workflows"],
    objectives: [
      "Build complex forms with advanced functions and plug-ins",
      "Configure encryption and user roles for sensitive data",
      "Use case management for panel and follow-up surveys",
      "Set up quality checks using audits and dashboards",
    ],
    tools: ["SurveyCTO", "SurveyCTO Collect"],
    duration: "3 weeks",
    modules: [
      ["Advanced form design", "Beyond the basics.", [
        ["Advanced functions and pre-loading", "Use existing data in forms.", 35],
        ["Encryption and security", "Protecting respondents.", 30],
      ]],
      ["Field operations", "Managing teams and cases.", [
        ["Case management", "Follow-up and panel surveys.", 35],
        ["Audits, sensors and monitoring", "Spotting quality issues early.", 35],
      ]],
    ],
  }),
  build({
    slug: "questionnaire-design",
    title: "Questionnaire Design & Validation",
    category: "survey-systems",
    level: "Beginner",
    summary: "Write clear, unbiased questions and validate your questionnaire before fieldwork starts.",
    description:
      "Good data starts with good questions. Learn the principles of question wording, response options, sequencing and translation, and how to pre-test and validate instruments.",
    prerequisites: ["None"],
    skills: ["Question wording", "Response scales", "Questionnaire flow", "Translation", "Cognitive testing & piloting"],
    objectives: [
      "Write clear, neutral and answerable questions",
      "Choose appropriate response formats and scales",
      "Structure a questionnaire logically",
      "Pre-test and revise an instrument using pilot evidence",
    ],
    tools: ["Word / Excel", "XLSForm"],
    duration: "2 weeks",
    modules: [
      ["Writing questions", "Wording and response options.", [
        ["Common question-wording errors", "Leading, double-barrelled and vague questions.", 30, { isSample: true }],
        ["Response scales", "Likert, frequency and rating scales.", 25],
      ], { quiz: quiz("Question wording check", [
        q("'How satisfied are you with the price and quality of the service?' is a problem because it is…", ["Leading", "Double-barrelled", "Too short", "Open-ended"], 1, "It asks about two things (price and quality) in one question."),
      ]) }],
      ["Validating the instrument", "Testing before fieldwork.", [
        ["Cognitive interviews and pilots", "Finding problems early.", 30],
        ["Translation and back-translation", "Keeping meaning across languages.", 25],
      ]],
    ],
  }),
  build({
    slug: "digital-data-collection",
    title: "Digital Data Collection Systems",
    category: "survey-systems",
    level: "Beginner",
    summary: "Plan and run a digital data collection system end to end — tools, devices, teams and data flow.",
    description:
      "An operations-focused course for project and field managers. Choose the right tool, plan devices and connectivity, train enumerators and design the data flow from the field to the analysis team.",
    prerequisites: ["None"],
    skills: ["Tool selection", "Device & connectivity planning", "Enumerator training", "Data flow design", "Data protection"],
    objectives: [
      "Compare KoBoToolbox, SurveyCTO, ODK and similar tools",
      "Plan logistics for devices, power and connectivity",
      "Design enumerator training and field protocols",
      "Define a secure data flow and backup routine",
    ],
    tools: ["ODK", "KoBoToolbox", "SurveyCTO"],
    duration: "2 weeks",
    modules: [
      ["Planning the system", "Tools and logistics.", [
        ["Choosing a data collection platform", "Requirements, cost and security.", 30],
        ["Devices, power and connectivity", "Planning for field realities.", 25],
      ]],
      ["Running fieldwork", "People and processes.", [
        ["Enumerator training", "Practical, scenario-based training.", 30],
        ["Data flow, backups and protection", "From device to server to analyst.", 30],
      ]],
    ],
  }),
  build({
    slug: "data-quality-field-monitoring",
    title: "Data Quality Assurance & Field Monitoring",
    category: "survey-systems",
    level: "Intermediate",
    summary: "Detect and fix data problems during fieldwork with high-frequency checks and back-checks.",
    description:
      "Learn the quality assurance practices used by research teams: daily high-frequency checks, enumerator performance monitoring, back-checks and feedback loops.",
    prerequisites: ["Experience with survey data", "Basic Excel, STATA, R or Python"],
    skills: ["High-frequency checks", "Back-checks", "Enumerator monitoring", "Outlier detection", "Field feedback"],
    objectives: [
      "Design a set of daily high-frequency checks",
      "Run back-checks and compare results",
      "Monitor enumerator performance fairly",
      "Report and resolve issues with field teams",
    ],
    tools: ["STATA / R / Python", "Excel", "Survey platform dashboards"],
    duration: "2 weeks",
    modules: [
      ["Checks during fieldwork", "Catching problems early.", [
        ["High-frequency checks", "Duplicates, outliers, durations and consistency.", 35],
        ["Back-checks", "Re-interviewing a sample to verify quality.", 25],
      ]],
      ["Acting on results", "Feedback and correction.", [
        ["Enumerator dashboards", "Fair, useful performance indicators.", 30],
        ["Issue logs and resolution", "Closing the loop with the field.", 20],
      ]],
    ],
  }),

  // ───────────── Data science & AI ─────────────
  build({
    slug: "data-science-foundations",
    title: "Data Science Foundations",
    category: "data-science-ai",
    level: "Beginner",
    featured: true,
    summary: "The full data science workflow — question, data, analysis, model and communication — in one course.",
    description:
      "An end-to-end introduction for aspiring data scientists. You will frame questions, prepare data, explore it, build a first predictive model and communicate results, using Python.",
    prerequisites: ["Basic Python or completion of Python Programming for Data"],
    skills: ["Problem framing", "Data preparation", "EDA", "First models", "Communicating results"],
    objectives: [
      "Frame a business or policy problem as a data question",
      "Prepare and explore a dataset in Python",
      "Build and evaluate a simple predictive model",
      "Present results with honest uncertainty",
    ],
    tools: ["Python", "pandas", "scikit-learn", "Jupyter"],
    duration: "6 weeks",
    modules: [
      ["The data science workflow", "From question to answer.", [
        ["Framing a data question", "Outcomes, decisions and constraints.", 25],
        ["Data sources and ethics", "Where data comes from and who it affects.", 25],
      ]],
      ["Exploring data", "Understanding before modelling.", [
        ["Summaries and visual exploration", "Patterns, gaps and surprises.", 35, { exerciseId: "py-summary-stats" }],
        ["Feature preparation", "Encoding, scaling and missing values.", 35],
      ]],
      ["First models", "Prediction basics.", [
        ["Train/test split and baselines", "How to know if a model is useful.", 30, { isSample: true }],
        ["Linear and logistic regression with scikit-learn", "Your first predictive models.", 40, { exerciseId: "py-regression" }],
      ], { quiz: quiz("Modelling basics", [
        q("Why do we keep a test set aside?", ["To train faster", "To estimate performance on unseen data", "To increase accuracy", "To remove outliers"], 1, "The test set gives an honest estimate of generalisation."),
        q("A baseline model is…", ["The final model", "A simple reference to beat", "A model with no errors", "The most complex model"], 1, "Baselines tell you whether a model adds value."),
      ]), assignment: { title: "End-to-end mini project", brief: "Choose one of the sample datasets, frame a question, build a simple model and present your results in five slides." } }],
    ],
  }),
  build({
    slug: "exploratory-data-analysis",
    title: "Exploratory Data Analysis",
    category: "data-science-ai",
    level: "Intermediate",
    summary: "Systematically explore datasets to find patterns, problems and hypotheses worth testing.",
    description:
      "EDA is where most insights are found. Learn a structured approach to univariate, bivariate and multivariate exploration, and how to turn findings into clear questions.",
    prerequisites: ["Python or R basics"],
    skills: ["Univariate analysis", "Relationships & correlation", "Group comparisons", "Visual EDA", "Documenting findings"],
    objectives: [
      "Apply a repeatable EDA checklist",
      "Visualise distributions and relationships effectively",
      "Detect data problems and outliers",
      "Write up EDA findings as testable hypotheses",
    ],
    tools: ["Python (pandas, matplotlib, seaborn)", "R (ggplot2)"],
    duration: "3 weeks",
    modules: [
      ["Single variables", "Distributions and outliers.", [
        ["Distributions and summary statistics", "Shape, centre and spread.", 30],
        ["Outliers: errors or insights?", "Investigate before you delete.", 25],
      ]],
      ["Relationships", "Two or more variables.", [
        ["Correlation and scatterplots", "Strength, direction and caveats.", 30],
        ["Comparing groups", "Box plots, facets and grouped summaries.", 30, { exerciseId: "py-sales-by-region" }],
      ]],
    ],
  }),
  build({
    slug: "machine-learning",
    title: "Machine Learning",
    category: "data-science-ai",
    level: "Advanced",
    featured: true,
    summary: "Build, tune and evaluate supervised and unsupervised models with scikit-learn.",
    description:
      "A rigorous, practical machine learning course: tree-based models, regularisation, cross-validation, pipelines and clustering, with attention to fairness and deployment realities.",
    prerequisites: ["Data Science Foundations or equivalent", "Comfort with Python and pandas"],
    skills: ["Supervised learning", "Pipelines", "Cross-validation & tuning", "Tree ensembles", "Clustering"],
    objectives: [
      "Build reproducible scikit-learn pipelines",
      "Tune models with cross-validation without leaking information",
      "Compare linear, tree and ensemble models",
      "Apply clustering for segmentation problems",
    ],
    tools: ["Python", "scikit-learn", "pandas"],
    duration: "6 weeks",
    modules: [
      ["Supervised learning", "Core algorithms.", [
        ["Regularised linear models", "Ridge, lasso and why they help.", 35],
        ["Decision trees and random forests", "Non-linear patterns.", 40],
        ["Gradient boosting", "Strong models for tabular data.", 35],
      ]],
      ["Doing it properly", "Validation and pipelines.", [
        ["Pipelines and preprocessing", "Avoiding data leakage.", 35],
        ["Cross-validation and hyperparameter tuning", "Choosing models fairly.", 35],
      ], { quiz: quiz("Validation check", [
        q("Scaling the full dataset before splitting into train and test causes…", ["Faster training", "Data leakage", "Better generalisation", "Nothing"], 1, "Test-set information leaks into training. Fit preprocessing on training data only."),
        q("k-fold cross-validation is used to…", ["Increase dataset size", "Estimate performance more reliably", "Remove features", "Speed up training"], 1, "Each fold acts as a validation set once."),
      ]) }],
      ["Unsupervised learning", "Finding structure.", [
        ["k-means and hierarchical clustering", "Segmenting customers and regions.", 35],
      ], { assignment: { title: "Prediction workflow", brief: "Build a full pipeline to predict loan default on the synthetic dataset and justify your model choice." } }],
    ],
  }),
  build({
    slug: "predictive-modeling",
    title: "Predictive Modelling for Decisions",
    category: "data-science-ai",
    level: "Advanced",
    summary: "Build predictive models that support real decisions — forecasting, risk scoring and targeting.",
    description:
      "Focuses on applying models to operational decisions: demand forecasting, risk scoring and beneficiary targeting, including thresholds, costs and monitoring after deployment.",
    prerequisites: ["Machine Learning or equivalent"],
    skills: ["Risk scoring", "Time-series forecasting", "Decision thresholds", "Cost-sensitive evaluation", "Model monitoring"],
    objectives: [
      "Translate a decision problem into a modelling task",
      "Build and evaluate forecasts and risk scores",
      "Choose thresholds based on costs and capacity",
      "Plan monitoring for drift after deployment",
    ],
    tools: ["Python", "scikit-learn", "statsmodels"],
    duration: "4 weeks",
    modules: [
      ["From decision to model", "Problem design.", [
        ["Decisions, costs and targets", "What a 'good' prediction means.", 30],
        ["Forecasting basics", "Trend, seasonality and baselines.", 35],
      ]],
      ["Using predictions", "Thresholds and monitoring.", [
        ["Choosing thresholds", "Capacity and cost trade-offs.", 30],
        ["Monitoring models in production", "Drift and retraining.", 25],
      ]],
    ],
  }),
  build({
    slug: "model-evaluation",
    title: "Model Evaluation & Validation",
    category: "data-science-ai",
    level: "Intermediate",
    summary: "Measure model performance properly: the right metrics, honest validation and fairness checks.",
    description:
      "A focused course on evaluating models — the skill that separates useful models from misleading ones. Covers metrics for regression and classification, imbalanced data, calibration and subgroup analysis.",
    prerequisites: ["Basic modelling experience"],
    skills: ["Regression metrics", "Confusion matrix", "ROC & PR curves", "Calibration", "Subgroup / fairness analysis"],
    objectives: [
      "Select metrics that match the decision problem",
      "Evaluate classifiers on imbalanced data",
      "Assess calibration and stability",
      "Check performance across subgroups",
    ],
    tools: ["Python", "scikit-learn"],
    duration: "2 weeks",
    modules: [
      ["Metrics", "Measuring performance.", [
        ["Regression metrics: MAE, RMSE, R²", "What each tells you.", 25],
        ["Classification metrics and the confusion matrix", "Precision, recall and F1.", 35, { isSample: true }],
        ["ROC-AUC vs PR-AUC", "Ranking performance and rare positives.", 30],
      ], { quiz: quiz("Metrics check", [
        q("Only 2% of cases are positive. A model predicting 'negative' for everyone has accuracy…", ["2%", "50%", "98%", "0%"], 2, "Accuracy is misleading on imbalanced data."),
        q("Recall measures…", ["Share of predicted positives that are correct", "Share of actual positives that are found", "Overall accuracy", "False positive rate"], 1, "Recall = TP / (TP + FN)."),
      ]) }],
      ["Validation", "Trustworthy estimates.", [
        ["Calibration", "Do predicted probabilities mean what they say?", 25],
        ["Subgroup analysis", "Does the model work for everyone?", 25],
      ]],
    ],
  }),
  build({
    slug: "practical-ai",
    title: "Practical AI Applications",
    category: "data-science-ai",
    level: "Intermediate",
    summary: "Use modern AI tools — including large language models — responsibly for analysis, reporting and services.",
    description:
      "A practical look at how organizations can use AI today: text classification, summarisation, extraction and assistants built on large language models, with attention to accuracy checks, privacy and governance.",
    prerequisites: ["Basic Python recommended"],
    skills: ["LLM capabilities & limits", "Prompt design", "Text classification & extraction", "Evaluation", "AI governance"],
    objectives: [
      "Identify tasks where AI adds value and where it doesn't",
      "Design prompts and workflows with human review",
      "Evaluate AI outputs for accuracy and bias",
      "Draft a simple AI use policy for an organization",
    ],
    tools: ["Python", "LLM APIs", "Spreadsheet-based workflows"],
    duration: "3 weeks",
    modules: [
      ["Understanding AI tools", "Capabilities and limits.", [
        ["What large language models can and cannot do", "Strengths, failure modes and costs.", 30],
        ["Prompt design for analysis tasks", "Clear instructions and examples.", 30],
      ]],
      ["Applying AI responsibly", "Workflows and governance.", [
        ["Text classification and information extraction", "Coding open-ended survey responses.", 35],
        ["Evaluating outputs and human review", "Measuring accuracy before trusting results.", 30],
        ["Privacy, consent and AI policy", "Protecting people and data.", 25],
      ]],
    ],
  }),
  build({
    slug: "automl",
    title: "Automated Machine Learning (AutoML)",
    category: "data-science-ai",
    level: "Advanced",
    summary: "Use AutoML tools to speed up model development — while keeping validation and judgement in human hands.",
    description:
      "Learn when AutoML helps and when it hides problems. Compare AutoML outputs with hand-built baselines, understand what the tools search over, and validate results properly.",
    prerequisites: ["Machine Learning or equivalent"],
    skills: ["AutoML concepts", "Search spaces", "Leaderboards & validation", "Explainability", "Choosing tools"],
    objectives: [
      "Explain what AutoML automates and what it doesn't",
      "Run AutoML experiments with proper validation",
      "Compare AutoML models with transparent baselines",
      "Explain and document the selected model",
    ],
    tools: ["Python AutoML libraries (e.g. FLAML, auto-sklearn, H2O)", "scikit-learn"],
    duration: "2 weeks",
    modules: [
      ["AutoML in practice", "Tools and experiments.", [
        ["How AutoML works", "Search, ensembling and budgets.", 30],
        ["Running and validating AutoML experiments", "Avoiding leaderboard illusions.", 35],
        ["Explaining the chosen model", "Feature importance and documentation.", 30],
      ]],
    ],
  }),

  // ───────────── GIS & spatial analytics ─────────────
  build({
    slug: "arcgis-pro",
    title: "ArcGIS Pro Essentials",
    category: "gis",
    level: "Beginner",
    featured: true,
    summary: "Create, edit, analyse and map spatial data in ArcGIS Pro.",
    description:
      "A practical introduction to ArcGIS Pro for planners, researchers and analysts. Work with administrative boundaries, points of service and land-use layers to produce clear maps and simple analyses.",
    prerequisites: ["Basic computer skills"],
    skills: ["ArcGIS Pro projects", "Coordinate systems", "Editing & attributes", "Geoprocessing", "Map layouts"],
    objectives: [
      "Set up projects and manage spatial data in ArcGIS Pro",
      "Understand and apply coordinate reference systems",
      "Run common geoprocessing tools",
      "Produce print-ready map layouts",
    ],
    tools: ["ArcGIS Pro"],
    duration: "4 weeks",
    modules: [
      ["GIS foundations", "Spatial data concepts.", [
        ["Vector and raster data", "Points, lines, polygons and grids.", 25],
        ["Coordinate reference systems", "Why your layers don't line up.", 30, { isSample: true }],
      ], { quiz: quiz("GIS foundations check", [
        q("To measure distances in metres you should use…", ["A geographic CRS (degrees)", "A projected CRS (metres)", "No CRS", "Any CRS"], 1, "Projected systems like UTM use linear units."),
        q("A layer of health facilities is best stored as…", ["Points", "Polygons", "Raster", "Lines"], 0, "Facilities are discrete locations."),
      ]) }],
      ["Working with data", "Editing and attributes.", [
        ["Attribute tables and joins", "Linking statistics to boundaries.", 30],
        ["Editing features", "Digitising and topology basics.", 30],
      ]],
      ["Analysis and maps", "Answering spatial questions.", [
        ["Buffers, overlays and spatial joins", "Distance and coverage analysis.", 40],
        ["Map layouts", "Legends, scale bars and export.", 30],
      ], { assignment: { title: "District service map", brief: "Produce a map of service points with 5 km buffers and a table of the population share covered (synthetic data provided)." } }],
    ],
  }),
  build({
    slug: "spatial-data-management",
    title: "Spatial Data Management",
    category: "gis",
    level: "Intermediate",
    summary: "Organise, clean and maintain spatial databases that teams can trust.",
    description:
      "Learn to build and maintain spatial data infrastructure: geodatabases, metadata, data standards, quality control and sharing.",
    prerequisites: ["ArcGIS Pro Essentials or QGIS experience"],
    skills: ["Geodatabases", "Metadata & standards", "Topology & QC", "Versioning", "Sharing data"],
    objectives: [
      "Design a geodatabase schema for an organization",
      "Apply metadata and naming standards",
      "Run spatial quality control checks",
      "Share data securely with internal and external users",
    ],
    tools: ["ArcGIS Pro", "QGIS", "PostGIS (introduction)"],
    duration: "3 weeks",
    modules: [
      ["Organising spatial data", "Structure and standards.", [
        ["Geodatabase design", "Feature classes, domains and subtypes.", 35],
        ["Metadata and standards", "Data others can understand.", 25],
      ]],
      ["Quality and sharing", "Trustworthy data.", [
        ["Topology and quality control", "Gaps, overlaps and errors.", 30],
        ["Sharing and access", "Web layers and permissions.", 25],
      ]],
    ],
  }),
  build({
    slug: "mapping-visualization",
    title: "Mapping & Spatial Visualisation",
    category: "gis",
    level: "Beginner",
    summary: "Design clear, honest maps — choropleths, symbols and web maps that communicate.",
    description:
      "Maps persuade. Learn cartographic principles to design maps that communicate accurately, including classification, colour, labelling and interactive web maps.",
    prerequisites: ["Basic GIS or completion of ArcGIS Pro Essentials"],
    skills: ["Choropleth maps", "Classification methods", "Colour & symbology", "Labelling", "Web maps"],
    objectives: [
      "Choose an appropriate map type for the data",
      "Classify and symbolise data honestly",
      "Design readable layouts",
      "Publish an interactive web map",
    ],
    tools: ["ArcGIS Pro", "ArcGIS Online", "QGIS"],
    duration: "2 weeks",
    modules: [
      ["Thematic mapping", "Map types and classification.", [
        ["Choropleths: rates, not counts", "Normalising data for fair comparison.", 30],
        ["Classification methods", "Equal interval, quantiles and natural breaks.", 25],
      ]],
      ["Design and publishing", "From desktop to web.", [
        ["Colour, symbology and labels", "Readable, accessible maps.", 30],
        ["Web maps and dashboards", "Sharing interactive maps.", 30],
      ]],
    ],
  }),
  build({
    slug: "geospatial-analysis",
    title: "Geospatial Analysis",
    category: "gis",
    level: "Advanced",
    summary: "Answer spatial questions with proximity, hotspot, suitability and raster analysis.",
    description:
      "Applied spatial analysis for agriculture, health, planning and environment: accessibility, clustering, suitability modelling and raster analysis with remote-sensing derived layers.",
    prerequisites: ["ArcGIS Pro Essentials", "Basic statistics"],
    skills: ["Proximity & accessibility", "Hotspot analysis", "Suitability modelling", "Raster analysis", "Spatial statistics"],
    objectives: [
      "Measure access to services using distance and travel time",
      "Detect spatial clusters and hotspots",
      "Build a weighted suitability model",
      "Analyse raster layers such as land cover and elevation",
    ],
    tools: ["ArcGIS Pro (Spatial Analyst)", "Python (geopandas)"],
    duration: "4 weeks",
    modules: [
      ["Spatial relationships", "Proximity and clustering.", [
        ["Accessibility analysis", "Distance and travel time to services.", 35],
        ["Hotspot and cluster analysis", "Where are values unusually high?", 35],
      ]],
      ["Surfaces and suitability", "Raster-based analysis.", [
        ["Raster analysis fundamentals", "Reclassify, map algebra and zonal statistics.", 35],
        ["Suitability modelling", "Combining criteria with weights.", 35],
      ], { assignment: { title: "Suitability model", brief: "Build a suitability model for siting a new collection centre using the synthetic layers, and justify the weights." } }],
    ],
  }),
];
