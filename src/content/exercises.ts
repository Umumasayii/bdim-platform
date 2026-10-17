import type { FormulaExercise, LabExercise } from "@/lib/types";

// Expected-output checks were computed from the synthetic datasets in
// datasets.ts. A check passes only when the real program output contains them.
export const labExercises: LabExercise[] = [
  {
    id: "py-summary-stats",
    title: "Calculate summary statistics",
    language: "python",
    level: "Beginner",
    free: true,
    datasetIds: ["sales"],
    instructions:
      "Load `sales.csv` with pandas. Print the number of rows, the **total revenue**, and the **mean units per order rounded to 1 decimal place**.",
    starterCode: `import pandas as pd

df = pd.read_csv("sales.csv")
print(df.head())

# 1. Number of rows
# 2. Total revenue
# 3. Mean units per order, rounded to 1 decimal
`,
    solution: `import pandas as pd

df = pd.read_csv("sales.csv")
print("Rows:", len(df))
print("Total revenue:", df["revenue"].sum())
print("Mean units:", round(df["units"].mean(), 1))
`,
    expectedOutputIncludes: ["40", "27077400", "98.4"],
  },
  {
    id: "py-sales-by-region",
    title: "Revenue by region",
    language: "python",
    level: "Beginner",
    free: true,
    datasetIds: ["sales"],
    instructions: "Compute **total revenue by region**, sorted from highest to lowest, and print the result.",
    starterCode: `import pandas as pd

df = pd.read_csv("sales.csv")

# Group by region, sum revenue, sort descending
`,
    solution: `import pandas as pd

df = pd.read_csv("sales.csv")
by_region = df.groupby("region")["revenue"].sum().sort_values(ascending=False)
print(by_region)
`,
    expectedOutputIncludes: ["West", "7831500"],
  },
  {
    id: "py-missing-values",
    title: "Clean missing values in a dataset",
    language: "python",
    level: "Beginner",
    free: true,
    datasetIds: ["survey"],
    instructions:
      "In `survey.csv`, print the number of missing values per column. Then fill missing `income` values with the **median income of the respondent's district**, and print the missing count again to confirm it is zero.",
    starterCode: `import pandas as pd

df = pd.read_csv("survey.csv")

# 1. Missing values per column

# 2. Fill missing income with the district median

# 3. Confirm no income values are missing
`,
    solution: `import pandas as pd

df = pd.read_csv("survey.csv")
print(df.isna().sum())

district_median = df.groupby("district")["income"].transform("median")
df["income"] = df["income"].fillna(district_median)

print("Missing income after cleaning:", df["income"].isna().sum())
`,
    expectedOutputIncludes: ["13", "Missing income after cleaning: 0"],
  },
  {
    id: "py-regression",
    title: "Build a regression model",
    language: "python",
    level: "Intermediate",
    free: true,
    datasetIds: ["yields"],
    instructions:
      "Fit a simple linear regression of `yield_t_ha` on `fertiliser_kg`. Print the **slope rounded to 4 decimal places** and interpret it in a comment.",
    starterCode: `import pandas as pd
from sklearn.linear_model import LinearRegression

df = pd.read_csv("yields.csv")

# Fit yield_t_ha ~ fertiliser_kg and print the slope (4 decimals)
`,
    solution: `import pandas as pd
from sklearn.linear_model import LinearRegression

df = pd.read_csv("yields.csv")
model = LinearRegression().fit(df[["fertiliser_kg"]], df["yield_t_ha"])
print("Slope:", round(model.coef_[0], 4))
print("Intercept:", round(model.intercept_, 2))
# Each extra kg of fertiliser is associated with ~0.0097 t/ha higher yield
# in this synthetic sample (an association, not proof of causation).
`,
    expectedOutputIncludes: ["0.0097"],
  },
  {
    id: "py-survey-likert",
    title: "Analyse survey responses",
    language: "python",
    level: "Beginner",
    free: true,
    datasetIds: ["survey"],
    instructions:
      "Summarise the 1–5 `satisfaction` score: print the percentage distribution (excluding missing), then the **top-two-box share** (scores 4 or 5) as a percentage rounded to 1 decimal.",
    starterCode: `import pandas as pd

df = pd.read_csv("survey.csv")
sat = df["satisfaction"].dropna()

# 1. Percentage distribution
# 2. Top-two-box share (4 or 5), rounded to 1 decimal
`,
    solution: `import pandas as pd

df = pd.read_csv("survey.csv")
sat = df["satisfaction"].dropna()
print((sat.value_counts(normalize=True).sort_index() * 100).round(1))
top2 = (sat >= 4).mean() * 100
print("Top-two-box:", round(top2, 1), "%")
`,
    expectedOutputIncludes: ["61.4"],
  },
  {
    id: "py-labour-market",
    title: "Labour market indicators",
    language: "python",
    level: "Intermediate",
    free: true,
    datasetIds: ["employment"],
    instructions:
      "Using the synthetic labour-force sample, compute the **unemployment rate** (unemployed ÷ labour force, where the labour force is employed + unemployed) as a percentage rounded to 1 decimal. Then compute it by `age_group`.",
    starterCode: `import pandas as pd

df = pd.read_csv("employment.csv")
print(df["status"].value_counts())

# Labour force = Employed + Unemployed
`,
    solution: `import pandas as pd

df = pd.read_csv("employment.csv")
lf = df[df["status"].isin(["Employed", "Unemployed"])]
rate = (lf["status"] == "Unemployed").mean() * 100
print("Unemployment rate:", round(rate, 1), "%")
by_age = lf.groupby("age_group")["status"].apply(lambda s: round((s == "Unemployed").mean() * 100, 1))
print(by_age)
`,
    expectedOutputIncludes: ["35.1"],
  },
  {
    id: "sql-revenue-by-region",
    title: "Write SQL queries to aggregate sales",
    language: "sql",
    level: "Beginner",
    free: true,
    datasetIds: ["sales"],
    instructions:
      "Using the `sales` table, return each `region` with its **total revenue** as `total_revenue`, highest first.",
    starterCode: `-- Total revenue by region, highest first
SELECT *
FROM sales
LIMIT 5;
`,
    solution: `SELECT region, SUM(revenue) AS total_revenue
FROM sales
GROUP BY region
ORDER BY total_revenue DESC;
`,
    expectedOutputIncludes: ["West", "7831500"],
  },
  {
    id: "sql-join-customers",
    title: "Find customers without orders",
    language: "sql",
    level: "Intermediate",
    free: true,
    datasetIds: ["sales", "customers"],
    instructions: "List the `customer_id` and `customer_name` of customers who have **no rows** in `sales`.",
    starterCode: `SELECT c.customer_id, c.customer_name
FROM customers c
-- join sales and keep customers with no match
;
`,
    solution: `SELECT c.customer_id, c.customer_name
FROM customers c
LEFT JOIN sales s ON s.customer_id = c.customer_id
WHERE s.order_id IS NULL;
`,
    expectedOutputIncludes: ["C13", "C14", "C15"],
  },
  {
    id: "sql-rank-products",
    title: "Top product in each region",
    language: "sql",
    level: "Advanced",
    free: false,
    datasetIds: ["sales"],
    instructions:
      "Return the product with the **highest total revenue in each region**, with its revenue. Use a CTE and a window function.",
    starterCode: `WITH totals AS (
  SELECT region, product, SUM(revenue) AS revenue
  FROM sales
  GROUP BY region, product
)
SELECT * FROM totals;
`,
    solution: `WITH totals AS (
  SELECT region, product, SUM(revenue) AS revenue
  FROM sales
  GROUP BY region, product
), ranked AS (
  SELECT *, RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
  FROM totals
)
SELECT region, product, revenue
FROM ranked
WHERE rnk = 1
ORDER BY revenue DESC;
`,
    expectedOutputIncludes: ["North", "4176000"],
  },
  {
    id: "r-summary-by-group",
    title: "Median income by district in R",
    language: "r",
    level: "Beginner",
    free: true,
    datasetIds: ["survey"],
    instructions:
      "Read `survey.csv` and compute the **median income by district**, ignoring missing values. Base R is enough.",
    starterCode: `df <- read.csv("survey.csv")
head(df)

# Median income by district (ignore NA)
`,
    solution: `df <- read.csv("survey.csv")
aggregate(income ~ district, data = df, FUN = median)
`,
    expectedOutputIncludes: ["Gasabo", "157000"],
  },
];

const shopGrid = {
  columns: ["A", "B", "C", "D"],
  rows: 7,
  expected: null,
  cells: {
    A1: "Month", B1: "Target", C1: "Actual", D1: "Region",
    A2: "Jan", B2: 500, C2: 470, D2: "Kigali",
    A3: "Feb", B3: 500, C3: 530, D3: "Kigali",
    A4: "Mar", B4: 550, C4: 610, D4: "North",
    A5: "Apr", B5: 550, C5: 505, D5: "North",
    A6: "May", B6: 600, C6: 640, D6: "Kigali",
    A7: "Jun", B7: 600, C7: 590, D7: "South",
  },
};

export const formulaExercises: FormulaExercise[] = [
  {
    id: "fx-total-actual",
    title: "Total actual sales",
    level: "Beginner",
    instructions: "Return the **total of the Actual column** (C2:C7).",
    grid: { ...shopGrid, expected: 3345 },
    targetLabel: "Total actual",
    hint: "SUM adds a range.",
    solutionFormula: "=SUM(C2:C7)",
  },
  {
    id: "fx-months-on-target",
    title: "Months that met target",
    level: "Intermediate",
    instructions: "Count the months where **Actual is greater than or equal to Target**. Tip: SUMPRODUCT works well here.",
    grid: { ...shopGrid, expected: 3 },
    targetLabel: "Months on target",
    hint: "=SUMPRODUCT(--(C2:C7>=B2:B7)) compares each pair of cells.",
    solutionFormula: "=SUMPRODUCT(--(C2:C7>=B2:B7))",
  },
  {
    id: "fx-kigali-average",
    title: "Average actual for Kigali",
    level: "Beginner",
    instructions: "Return the **average Actual value for the Kigali region**.",
    grid: { ...shopGrid, expected: 546.6666666666666 },
    targetLabel: "Kigali average",
    hint: "AVERAGEIF(range, criteria, average_range)",
    solutionFormula: '=AVERAGEIF(D2:D7,"Kigali",C2:C7)',
  },
  {
    id: "fx-achievement-rate",
    title: "Overall achievement rate",
    level: "Intermediate",
    instructions: "Return total Actual ÷ total Target, **rounded to 3 decimal places**.",
    grid: { ...shopGrid, expected: 1.014 },
    targetLabel: "Achievement",
    hint: "Combine ROUND and two SUMs.",
    solutionFormula: "=ROUND(SUM(C2:C7)/SUM(B2:B7),3)",
  },
  {
    id: "fx-best-month",
    title: "Best month",
    level: "Advanced",
    instructions: "Return the **name of the month** with the highest Actual value.",
    grid: { ...shopGrid, expected: "May" },
    targetLabel: "Best month",
    hint: "Combine INDEX and MATCH with MAX, or use XLOOKUP.",
    solutionFormula: "=INDEX(A2:A7,MATCH(MAX(C2:C7),C2:C7,0))",
  },
];

export const exerciseById = (id: string) => labExercises.find((e) => e.id === id);
