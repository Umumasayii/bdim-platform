// Lesson bodies (simple Markdown: ## headings, paragraphs, lists, ```code```,
// `inline`, **bold**, [links](url)). Keyed by lesson id. Lessons without an
// entry show an honest "materials in preparation" notice.
export const sampleLessonContent: Record<string, string> = {
  "advanced-excel-m1-l1": `
## Why formulas break when you copy them

When you copy a formula, Excel adjusts its cell references relative to the new position. That is usually what you want — until a formula needs to keep pointing at one fixed cell, such as an exchange rate or a target.

## Three kinds of reference

- \`A1\` — **relative**: both column and row shift when copied.
- \`$A$1\` — **absolute**: nothing shifts.
- \`$A1\` or \`A$1\` — **mixed**: only the unlocked part shifts.

## Worked example

Column B holds sales in Rwandan francs and cell \`F1\` holds the RWF → USD rate. In C2 you write:

\`\`\`
=B2/$F$1
\`\`\`

Copy it down to C3 and Excel writes \`=B3/$F$1\`: the sales reference moves, the rate stays fixed.

## Tip

Press **F4** while the cursor is on a reference to cycle through \`A1 → $A$1 → A$1 → $A1\`.

## Practise

Try the *Total revenue for one region* challenge in the Excel practice zone.
`,
  "advanced-excel-m1-l3": `
## Joining two tables

You often need information from a second table: a district name for a district code, or a price for a product ID. Lookups do this without copying and pasting.

## XLOOKUP

\`\`\`
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])
\`\`\`

Example: find the price of the product in A2 from a price list in columns H:I.

\`\`\`
=XLOOKUP(A2, $H$2:$H$50, $I$2:$I$50, "Not listed")
\`\`\`

## INDEX/MATCH (older versions of Excel)

\`\`\`
=INDEX($I$2:$I$50, MATCH(A2, $H$2:$H$50, 0))
\`\`\`

The \`0\` in MATCH asks for an **exact** match. Forgetting it is one of the most common causes of wrong results.

## Good practice

- Lock lookup ranges with \`$\` so they don't move when copied.
- Use an explicit *not found* value instead of hiding errors with IFERROR everywhere.
- Check for duplicate keys in the lookup table: a lookup returns only the first match.
`,
  "power-bi-dashboards-m3-l1": `
## Two ways to calculate

Power BI lets you write DAX in **calculated columns** and in **measures**. They look similar but behave very differently.

## Calculated columns

- Computed **once per row** when data refreshes.
- Stored in the model, so they use memory.
- Good for values you want to slice or filter by, e.g. an age band.

\`\`\`
Age Band = IF(Customers[Age] < 25, "Under 25", "25 and over")
\`\`\`

## Measures

- Computed **at query time**, for whatever filters the visual applies.
- Not stored row by row.
- Right for totals, ratios and KPIs.

\`\`\`
Total Revenue = SUM(Sales[Revenue])
Revenue per Customer = DIVIDE([Total Revenue], DISTINCTCOUNT(Sales[CustomerID]))
\`\`\`

## Rule of thumb

If the result should change when a user clicks a slicer, write a **measure**. If you need to group or filter by it, use a **column**.
`,
  "data-cleaning-reporting-m2-l1": `
## Missing values are information

Before choosing how to handle missing values, ask **why** they are missing. A blank income may mean "refused", "don't know", "not applicable", or a data entry error. Each needs different treatment.

## Common options

- **Delete rows** (listwise deletion): simple, but can bias results if missingness is related to the outcome.
- **Flag** missing values with a category such as "Not reported" for categorical variables.
- **Impute** with a median, group median or a model — and document it.

## A practical sequence

1. Count missing values per column.
2. Look for patterns: are they concentrated in one district, enumerator or date?
3. Decide per variable, and record the decision in the cleaning log.
4. Report how many records were affected.

## Try it

Open the *Clean missing values* exercise in the Coding Lab. It uses a small synthetic dataset and runs real Python in your browser.
`,
  "r-programming-m1-l1": `
## R in a few minutes

R is a language built for statistics and data analysis. You will usually work in **RStudio** or **Positron**, with a script on one side and the console on the other.

## Your first commands

\`\`\`r
2 + 3
incomes <- c(120, 85, 240, 60, 95)
mean(incomes)
median(incomes)
\`\`\`

\`<-\` assigns a value to a name. \`c()\` combines values into a vector.

## Work in projects

Create an **RStudio project** for each analysis. It keeps data, scripts and outputs together and makes file paths simple.

## Practise

The Coding Lab includes an R exercise that summarises data by group. It runs R in your browser using WebAssembly — the first run takes a little longer while R downloads.
`,
  "python-programming-m1-l1": `
## Values and names

Python stores values in **variables**. You create one by assigning with \`=\`.

\`\`\`python
district = "Huye"
households = 1250
avg_size = 4.3
\`\`\`

## Types you will use most

- \`str\` — text, e.g. \`"Musanze"\`
- \`int\` and \`float\` — whole and decimal numbers
- \`bool\` — \`True\` / \`False\`

## Operators

\`\`\`python
population = households * avg_size
print(round(population))
\`\`\`

## Practise

Open the Coding Lab, choose Python and try printing a calculation of your own.
`,
  "python-programming-m1-l2": `
## Collections

A **list** holds an ordered collection; a **dictionary** maps keys to values.

\`\`\`python
districts = ["Gasabo", "Kicukiro", "Nyarugenge"]
population = {"Gasabo": 879505, "Kicukiro": 491731}
\`\`\`

## Loops

\`\`\`python
for d in districts:
    print(d.upper())
\`\`\`

## Why it matters for data

pandas is built on these ideas: a DataFrame column behaves a lot like a list, and a row can be read like a dictionary.
`,
  "python-programming-m2-l1": `
## Loading data with pandas

\`\`\`python
import pandas as pd
df = pd.read_csv("sales.csv")
\`\`\`

## First look

- \`df.head()\` — the first rows
- \`df.shape\` — rows and columns
- \`df.info()\` — column types and missing values
- \`df.describe()\` — summary statistics for numeric columns

## Read the output critically

Do the numbers make sense? Are there negative quantities, impossible dates or unexpected categories? A first look is also a first quality check.

## Try it

The *Calculate summary statistics* exercise in the Coding Lab loads a small sales dataset so you can run these commands yourself.
`,
  "sql-querying-m1-l1": `
## Asking a table a question

\`\`\`sql
SELECT region, product, revenue
FROM sales
WHERE revenue > 100000
ORDER BY revenue DESC;
\`\`\`

- \`SELECT\` chooses columns.
- \`FROM\` names the table.
- \`WHERE\` filters rows.
- \`ORDER BY\` sorts results.

## Good habits

Name the columns you need instead of \`SELECT *\`, and add \`LIMIT\` while exploring large tables.
`,
  "sql-querying-m1-l2": `
## Totals by group

\`GROUP BY\` collapses rows that share a value and lets you aggregate the rest.

\`\`\`sql
SELECT region, SUM(revenue) AS total_revenue
FROM sales
GROUP BY region
ORDER BY total_revenue DESC;
\`\`\`

## Rules to remember

- Every selected column must be either in the \`GROUP BY\` or inside an aggregate (\`SUM\`, \`COUNT\`, \`AVG\`, \`MIN\`, \`MAX\`).
- \`COUNT(*)\` counts rows; \`COUNT(column)\` ignores NULLs.

## Try it

Open *Write SQL queries to aggregate sales* in the Coding Lab. The query runs against a real in-browser SQLite database.
`,
  "sql-querying-m1-l3": `
## WHERE vs HAVING

- \`WHERE\` filters **rows** before grouping.
- \`HAVING\` filters **groups** after aggregation.

\`\`\`sql
SELECT region, SUM(revenue) AS total
FROM sales
WHERE year = 2025
GROUP BY region
HAVING SUM(revenue) > 500000;
\`\`\`
`,
  "descriptive-inferential-statistics-m1-l1": `
## Two ways to describe "typical"

The **mean** adds all values and divides by the count. The **median** is the middle value when data are sorted.

## When they disagree

Consider monthly incomes (in thousand RWF) for seven households:

\`\`\`
60, 70, 75, 80, 90, 100, 900
\`\`\`

- Mean ≈ 196
- Median = 80

One very high income pulls the mean far above what most households earn. For **skewed** variables such as income, expenditure or farm size, the median is usually the better summary — and it's good practice to report both.

## Rule of thumb

- Roughly symmetric data: mean and median are similar; the mean is fine.
- Skewed data or outliers: report the median (and the IQR).
`,
  "kobotoolbox-m1-l2": `
## Ask only relevant questions

The \`relevant\` column in an XLSForm shows a question only when a condition is true. This shortens interviews and prevents impossible answers.

## Example

In the survey sheet (columns: type, name, label, relevant):

\`\`\`
select_one yes_no   has_farm     Does the household operate a farm?
integer             farm_size    How many hectares?      \${has_farm} = 'yes'
\`\`\`

\`farm_size\` appears only if \`has_farm\` is yes.

## Tips

- Reference other questions with \`\${name}\`.
- Combine conditions with \`and\` / \`or\`.
- Test every path through the form before deploying.
`,
  "questionnaire-design-m1-l1": `
## Four common wording problems

- **Leading**: "Don't you agree the new market improved your income?" — suggests the answer.
- **Double-barrelled**: "How satisfied are you with the price and quality?" — two questions in one.
- **Vague time frames**: "Do you often buy fertiliser?" — what is "often"?
- **Jargon**: technical terms respondents may not share.

## Better versions

- "How, if at all, has your income changed since the new market opened?"
- Split into two questions: one for price, one for quality.
- "In the last 12 months, how many times did you buy fertiliser?"

## Check every question

Can every respondent understand it the same way, and can they actually know the answer?
`,
  "data-science-foundations-m3-l1": `
## How do you know a model is useful?

A model is only useful if it performs well on **new** data. To estimate that, keep part of the data aside as a **test set**.

\`\`\`python
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
\`\`\`

## Always start with a baseline

A baseline is the simplest reasonable prediction — for example, predicting the average value, or the most common class. If your model can't beat the baseline, it isn't adding value.

## Avoid peeking

Never tune your model on the test set. Use cross-validation on the training data, and look at the test set once, at the end.
`,
  "model-evaluation-m1-l2": `
## The confusion matrix

For a yes/no prediction, every case falls into one of four cells:

- **True positive (TP)** — predicted yes, actually yes
- **False positive (FP)** — predicted yes, actually no
- **False negative (FN)** — predicted no, actually yes
- **True negative (TN)** — predicted no, actually no

## Key metrics

- **Precision** = TP / (TP + FP): of those flagged, how many were right?
- **Recall** = TP / (TP + FN): of the real positives, how many did we find?
- **F1** combines both.

## Which matters more?

It depends on the cost of mistakes. Missing a child at risk of malnutrition (FN) is usually worse than an extra screening visit (FP), so recall matters more there.
`,
  "arcgis-pro-m1-l2": `
## Why layers don't line up

Every spatial dataset uses a **coordinate reference system (CRS)**. If two layers use different systems and aren't projected correctly, features appear in the wrong place.

## Geographic vs projected

- **Geographic** (e.g. WGS 84, EPSG:4326): latitude/longitude in degrees. Good for storage and GPS, poor for measuring distances.
- **Projected** (e.g. a UTM zone): coordinates in metres, suited to measuring distances and areas.

Rwanda spans **UTM zones 35S and 36S**. Check the metadata of each dataset to confirm which CRS it actually uses.

## Practical rule

Store data in a known CRS, and **project to a metric CRS before measuring** buffers, distances or areas.
`,
};
