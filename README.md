# Finance Dashboard UI

A frontend-only finance dashboard built with React + TypeScript. This project is designed specifically for the assignment requirements and focuses on clear UI structure, useful interactions, role-based behavior simulation, and maintainable state handling.

## Tech Stack

- React 19
- TypeScript
- Vite
- Recharts (time-based and category visualizations)
- CSS (custom responsive styling)

## Setup

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Assignment Requirement Coverage

### 1. Dashboard Overview

- Summary cards: Total Balance, Income, Expenses
- Time-based visualization: Balance trend line chart
- Categorical visualization: Spending breakdown donut chart

### 2. Transactions Section

- Transaction list shows:
  - Date
  - Amount
  - Category
  - Type (income/expense)
- Includes:
  - Search (description/category)
  - Filters (type/category)
  - Sorting (date and amount)

### 3. Basic Role-Based UI

- Role switcher: Viewer/Admin
- Viewer: read-only transaction data
- Admin: can add and edit transactions from the UI
- No backend RBAC (frontend simulation only)

### 4. Insights Section

- Highest spending category
- Monthly comparison (latest month vs previous month)
- Savings rate insight

### 5. State Management

Managed with React state and memoized selectors:

- Transactions dataset
- Filters and sorting
- Search query
- Selected role
- Admin transaction editor form state

### 6. UI/UX Expectations

- Clean, readable card/table layout
- Responsive for desktop and mobile
- Graceful empty states for filters and charts

## Optional Enhancements Included

- Local storage persistence for transactions
- Polished interactive controls and transitions

## Project Notes

- Data is mock/static and frontend-only by design.
- This is intentionally not production backend-integrated.
- Assumption: all amounts are stored as positive numbers and classified by transaction type.

## Commit Strategy Used

The work was split into major feature commits for traceability:

1. Dashboard foundation shell and data model setup
2. Overview charts and finance aggregations
3. Search/filter/sort transactions UX
4. Admin-only add/edit transaction flows
5. Insights cards and local persistence
6. Documentation and requirement mapping
