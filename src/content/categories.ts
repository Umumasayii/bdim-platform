import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "analytics-bi",
    title: "Data Analytics & Business Intelligence",
    short: "Analytics & BI",
    description: "Excel, Power BI, KPI design and reporting that managers actually read.",
  },
  {
    id: "programming",
    title: "Programming & Statistical Computing",
    short: "Programming",
    description: "R, Python and SQL for reproducible analysis and automation.",
  },
  {
    id: "statistics-research",
    title: "Statistics & Research",
    short: "Statistics",
    description: "From descriptive statistics to regression, with STATA, SPSS and sound research design.",
  },
  {
    id: "survey-systems",
    title: "Survey & Field Data Systems",
    short: "Survey systems",
    description: "KoBoToolbox, SurveyCTO, questionnaire design and field data quality.",
  },
  {
    id: "data-science-ai",
    title: "Data Science & Artificial Intelligence",
    short: "Data science & AI",
    description: "Exploratory analysis, machine learning, model evaluation and practical AI.",
  },
  {
    id: "gis",
    title: "GIS & Spatial Analytics",
    short: "GIS",
    description: "ArcGIS Pro, spatial data management, mapping and geospatial analysis.",
  },
];

/** The eight areas shown in "Explore our learning ecosystem". */
export const ecosystem = [
  {
    title: "Data Analytics",
    text: "Clean, summarise and explain data with Excel, SQL and clear reporting.",
    href: "/courses?category=analytics-bi",
    icon: "BarChart3",
  },
  {
    title: "Data Science & Statistics",
    text: "Probability, inference and regression applied to real decisions.",
    href: "/courses?category=statistics-research",
    icon: "Sigma",
  },
  {
    title: "Programming & Automation",
    text: "Python, R and SQL scripts that replace repetitive manual work.",
    href: "/courses?category=programming",
    icon: "Code2",
  },
  {
    title: "Business Intelligence",
    text: "Power BI dashboards and KPIs that leadership teams can act on.",
    href: "/courses?category=analytics-bi",
    icon: "LayoutDashboard",
  },
  {
    title: "AI & Machine Learning",
    text: "Predictive models, evaluation and responsible, practical AI.",
    href: "/courses?category=data-science-ai",
    icon: "BrainCircuit",
  },
  {
    title: "GIS & Spatial Analytics",
    text: "Maps and spatial analysis for planning, agriculture and service delivery.",
    href: "/courses?category=gis",
    icon: "Map",
  },
  {
    title: "Survey Design & Data Collection",
    text: "Questionnaires and digital tools that produce clean data from the field.",
    href: "/courses?category=survey-systems",
    icon: "ClipboardList",
  },
  {
    title: "Research and Monitoring & Evaluation",
    text: "Research design, indicators and evidence for programmes and policy.",
    href: "/courses?category=statistics-research",
    icon: "Target",
  },
] as const;
