---
name: financial-data-formatting
description: Use when displaying or formatting financial amounts, currencies, percentages, dates, or numbers in this dashboard. Follow the existing frontend formatting conventions without changing financial calculations.
---

# Financial Data Formatting

## Objective

Keep financial values clear and consistent across dashboard KPIs, charts, tooltips, and tables. Format values for display only; do not change their underlying values or financial calculations.

## When to Use

- Adding or changing a displayed financial amount, currency, percentage, date, or number.
- Reviewing whether a dashboard value follows the existing format.
- Showing missing or unavailable financial data.

## Inputs

Identify from the code and task:

- The value and its type: amount, currency, percentage, date, or other number.
- Its display context, such as a KPI, chart axis, tooltip, table, or empty/loading state.
- Existing formatters or utilities to reuse, especially `formatCurrency` and `formatPercent` in `frontend/src/lib/financial-utils.ts`.

Do not ask for information that can be determined from the repository. If the value's type or context is unclear after inspecting the relevant code, ask only for that missing detail.

## Repository Conventions

- **Currency and amounts:** Use `formatCurrency(value)` for full USD values. It uses `Intl.NumberFormat("en-US")`, USD, and zero fraction digits. Examples include KPI values, chart tooltips, and accessible chart tables.
- **Compact chart labels:** Preserve context-specific compact labels when space is limited. The income/outcome axis uses whole thousands, for example `$12k`; this is not a replacement for formatting full values in tooltips or tables.
- **Percentages:** Use `formatPercent(value)` for standard display, with one decimal place and a `%` suffix. Profit-margin tooltips and accessible tables also display one decimal. The chart axis uses whole percentages for readability.
- **Calculations:** Keep amounts and percentages at their existing numeric precision. Apply rounding only when formatting text; do not round source values or change formulas to make a display match.
- **Calendar dates:** `FinancialMovement.create_date` is an ISO `YYYY-MM-DD` calendar date. For month grouping, use its year-month portion rather than parsing it as a local `Date`, which can shift the calendar day or month. Month labels currently use `en-US` abbreviated month and year, such as `Jan 2026`.
- **Missing values:** KPI metrics use `null` before data is available and display an em dash (`—`). Empty charts display their existing empty-state message; tooltips render nothing when no payload is available. Do not silently convert a missing value to zero, since zero is a real financial value. Preserve the state already used by the relevant component.

## Expected Behavior

1. Inspect the relevant formatter, type, component, and nearby examples before choosing a display format.
2. Reuse existing helpers whenever their output matches the context. Do not add a duplicate formatter for the same convention.
3. Keep compact chart-axis labels distinct from full-value labels in KPIs, tooltips, and tables.
4. Preserve raw numbers and financial formulas; formatting must not mutate data or affect calculations.
5. Preserve the component's existing behavior for loading, empty, null, and absent values.
6. When adding a genuinely new format, keep it local to the existing utility layer and add focused examples or tests where appropriate.

## Examples From This Repository

```ts
formatCurrency(metrics.totalIncome); // "$12,345"
formatPercent(metrics.profitPercent); // "18.4%"
movement.create_date.slice(0, 7); // "2026-01" calendar month key
```

```tsx
value={metrics ? formatCurrency(metrics.totalIncome) : "—"}
```

Use compact chart ticks only where the chart already calls for them; keep tooltip and table values in the full display format.

## Acceptance Criteria

- The value is formatted consistently with its type and display context.
- Existing formatters are reused; no duplicate formatter is introduced without a distinct requirement.
- Calculated and source financial values remain unchanged.
- Missing data remains distinguishable from numeric zero and follows the component's existing state behavior.
- Calendar dates retain their intended day and month.
- Examples and tests reflect actual repository conventions.