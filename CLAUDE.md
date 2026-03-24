# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objective

Provide a way to quickly kick off a prototype or a new app with as little friction as possible, while following V7 standards, both technically and in terms of structure and formality.

The project aims to be as "LLM-friendly" as possible in order to greatly facilitate the work of Claude Code as a UI prototype generator.

It is essential to maintain this repository over time. It is also crucial to refine it and keep it up to date based on learnings and reflections within the company.

## Data Structure and Seed

Whenever there are changes to data structures (changes in the db or redis package), let's make sure the seed data is adjusted accordingly in both directories if there are any.

The seeding approach is intentionally simple: **delete all data and regenerate from seed**. This ensures no bugs arise from data inconsistencies during quick iterations of data structures. The `clearAllData` function in `packages/db/src/seed/index.ts` deletes all tables in the correct order (child tables first) before seeding.

## React Compiler Compatibility

This project uses React Compiler. Some libraries are not compatible with React Compiler's automatic memoization, such as TanStack React Table (see below).

### TanStack React Table

`useReactTable` returns functions that cannot be safely memoized. Any component using `useReactTable` must include the `'use no memo'` directive at the top of the file to opt out of React Compiler optimization for that component.

```tsx
'use no memo'

import { useReactTable } from '@tanstack/react-table'
// ...
```

## React Components General Guidelines

Try to componentize things when we start reuse frontend code or if an element is rendered multiple times at different places or at the same place. Also, for complex and rich components, try to adopt the Compound Components pattern, which is a provider pattern with composition (see the File Upload component).

## MCP Servers

This project includes three MCP (Model Context Protocol) servers configured in `.mcp.json`:

### context7

Provides up-to-date, version-specific documentation for libraries. Add "use context7" to your prompt to fetch current official documentation and code examples.

### postgres

Read-only access to the PostgreSQL database. Use this to inspect schemas and run read-only queries.

### browser (Puppeteer)

Browser automation capabilities. Use this to take screenshots, navigate web pages, and interact with elements in a real browser environment.

# Banner Helper Optimization Standard

When writing or refactoring banner processing functions in `apps/backend/src/routers/banners/helpers.ts`, always use Map-based lookups instead of linear `.find()` scans.

## Why

The original Circle K QC+ATL implementation used `.find()` inside loops, causing O(n²) performance on large CSV imports (thousands of rows × hundreds of customers). Refactored to O(1) Map lookups and adopted as the standard for all banners.

## Patterns

### 1. Customer lookup by batId — build Map once, before the week loop

```ts
// ✅ Do this — O(1) per lookup
const customerByBatId = new Map(customers.map((c) => [String(c.batId), c]))
const customer = customerByBatId.get(erp)

// ❌ Not this — O(n) per lookup
const customer = customers.find((c) => String(c.batId) === erp)
```

### 2. Customer IDs — hoist out of the week loop

```ts
// ✅ Compute once before the loop
const customerIds = customers.map((c) => c.id)

// ❌ Not inside each week iteration
validWeeks.map(async ([weekKey, weekRows]) => {
  const customerIds = customers.map((c) => c.id) // recomputed every week
})
```

### 3. Order lookup by customerId — Map per week

```ts
// ✅ Do this — O(1) per lookup
const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
const existingOrder = orderByCustomerId.get(customer.id)

// ❌ Not this — O(n) per lookup
const existingOrder = existingOrderRows.find((o) => o.customerId === customer.id)
```

### 4. Existing content lookup by UPC — nested Map (orderId → upc → row)

```ts
// ✅ Do this — O(1) per lookup
const existingContentByOrderId = new Map<
  number,
  Map<string | null, typeof ordersContent.$inferSelect>
>()
for (const row of existingContentRows) {
  let upcMap = existingContentByOrderId.get(row.billingDocumentId)
  if (!upcMap) {
    upcMap = new Map()
    existingContentByOrderId.set(row.billingDocumentId, upcMap)
  }
  upcMap.set(row.upc, row)
}
// Then:
const existing = existingUpcMap?.get(item.upc)

// ❌ Not this — O(n) per lookup
const existingContent = existingContentByOrderId.get(existingOrder.id) ?? []
const existing = existingContent.find((c) => c.upc === item.upc)
```

## Reference implementation

See `processCircleKQcAtlFile` in `apps/backend/src/routers/banners/helpers.ts` for the canonical example.
