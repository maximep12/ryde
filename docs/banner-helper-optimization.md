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
