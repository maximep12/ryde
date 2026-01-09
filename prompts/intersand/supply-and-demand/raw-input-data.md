# Raw Input Data Page Generation Methodology

This document describes the methodology for generating a new Supply & Demand data page from a CSV file. Follow these steps when the user provides a new CSV file to create a corresponding route.

## Overview

When a CSV file is provided (e.g., from `seed-data-csv/` directory), the process involves:

1. Analyzing the CSV structure using shell commands
2. Creating/updating database schema
3. Embedding data directly in seed files (no CSV parsing at runtime)
4. Creating backend API endpoints
5. Creating frontend page with table and filters
6. Adding navigation and i18n entries

## Step 1: Analyze CSV Structure

Use shell commands to understand the CSV file structure:

```bash
# View the header row
head -1 "seed-data-csv/YourFile.csv"

# Count total rows (excluding header)
tail -n +2 "seed-data-csv/YourFile.csv" | wc -l

# View sample data rows
head -5 "seed-data-csv/YourFile.csv"

# Check for unique values in a column (e.g., column 7 for status)
cut -d',' -f7 "seed-data-csv/YourFile.csv" | sort | uniq -c
```

## Step 2: Create Database Schema

Create schema file at `packages/db/src/schema/<tablename>.ts`:

```typescript
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const tableName = pgTable('table_name', {
  id: serial('id').primaryKey(),
  // Add columns based on CSV structure
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 10 }),
  // Always include timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
})
```

Export from `packages/db/src/schema/index.ts`:

```typescript
export * from './tablename'
```

## Step 3: Generate and Run Migration

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate
```

## Step 4: Create Seed File with Embedded Data

Create seed file at `packages/db/src/seed/<tablename>.ts`.

**Important**: Do NOT parse CSV at runtime. Instead, embed the data directly in the seed file as a TypeScript array. For large datasets (1000+ rows), add `// @ts-nocheck` at the top to avoid TypeScript complexity errors.

```typescript
// @ts-nocheck
import { db } from '../client'
import { tableName } from '../schema'

// Data extracted from CSV and embedded directly
const data = [
  {
    code: 'ABC123',
    description: 'Some description',
    status: '03',
  },
  // ... all rows from CSV
]

export async function seedTableName() {
  console.log('Seeding table_name...')

  await db.insert(tableName).values(data)

  console.log(`Seeded ${data.length} records`)
}
```

### CSV to TypeScript Conversion

Use shell commands to convert CSV data to TypeScript array format:

```bash
# Example: Convert CSV to TypeScript object array
tail -n +2 "seed-data-csv/YourFile.csv" | while IFS=',' read -r col1 col2 col3; do
  echo "  { code: '$col1', description: '$col2', status: '$col3' },"
done
```

For complex CSVs with special characters or quoted fields, consider using a simple script or manually formatting.

## Step 5: Update Main Seed Index

Add to `packages/db/src/seed/index.ts`:

```typescript
import { seedTableName } from './tablename'

// In clearAllData function, add table to deletion order (child tables first)
await db.delete(tableName)

// In main seed function
await seedTableName()
```

## Step 6: Create Backend API

### 6a. Query Schema (`apps/backend/src/routers/<name>/schemas.ts`)

```typescript
import { z } from 'zod'

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  // Add filter fields based on data
  statuses: z.string().optional(),
})
```

### 6b. Helpers (`apps/backend/src/routers/<name>/helpers.ts`)

```typescript
import { db } from '@repo/db/client'
import { tableName } from '@repo/db/schema'
import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'

export async function getItems(params: QueryParams) {
  const { page, pageSize, search, statuses } = params
  const offset = (page - 1) * pageSize

  const conditions = []

  if (search) {
    conditions.push(
      or(ilike(tableName.code, `%${search}%`), ilike(tableName.description, `%${search}%`)),
    )
  }

  if (statuses?.length) {
    conditions.push(inArray(tableName.status, statuses))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [items, totalResult] = await Promise.all([
    db.select().from(tableName).where(whereClause).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(tableName).where(whereClause),
  ])

  const total = totalResult[0]?.count ?? 0

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getFilterOptions() {
  // Return distinct values for filter dropdowns
  const statuses = await db
    .select({ value: tableName.status, count: count() })
    .from(tableName)
    .groupBy(tableName.status)
    .orderBy(sql`count(*) desc`)

  return { statuses }
}
```

### 6c. Handlers (`apps/backend/src/routers/<name>/handlers.ts`)

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { querySchema } from './schemas'
import { getItems, getFilterOptions } from './helpers'

export const router = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await getItems({
      ...params,
      statuses: params.statuses?.split(','),
    })
    return c.json(result)
  })
  .get('/filter-options', async (c) => {
    const options = await getFilterOptions()
    return c.json(options)
  })
```

### 6d. Register Router (`apps/backend/src/index.ts`)

```typescript
import { router as nameRouter } from './routers/name/handlers'

// In app definition
.route('/name', nameRouter)
```

## Step 7: Create Frontend Hook

Create `apps/frontend/src/hooks/queries/<name>/use<Name>.ts`:

```typescript
import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type Item = {
  id: number
  code: string
  description: string
  status: string | null
  createdAt: string
  updatedAt: string | null
}

export type QueryParams = {
  page?: number
  pageSize?: number
  search?: string
  statuses?: string[]
}

export function useItems(params: QueryParams = {}) {
  const { page = 1, pageSize = 25, search, statuses } = params

  return useQuery({
    queryKey: ['items', { page, pageSize, search, statuses }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.name.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(statuses?.length && { statuses: statuses.join(',') }),
        },
      })
      if (!res.ok) throw new Error('Failed to fetch items')
      return res.json()
    },
  })
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['items', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.name['filter-options'].$get()
      if (!res.ok) throw new Error('Failed to fetch filter options')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}
```

## Step 8: Create Route Page

Create `apps/frontend/src/routes/_auth/supply-demand/<name>/index.tsx`.

**Important**: Add `'use no memo'` directive at the top when using TanStack Table (React Compiler compatibility).

Base the page on the Product Status page pattern:

- DebouncedSearchInput for text search
- Sheet with MultiSelect filters
- TanStack Table with sorting
- Pagination controls
- Filter badges display

Key components to import from `@repo/ui/components`:

- Button, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter
- MultiSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- Skeleton, Tooltip, TooltipContent, TooltipTrigger

## Step 9: Add Navigation

Update `apps/frontend/src/components/AppLayout/AppSidebar/navigation.ts`:

```typescript
export const supplyDemandNavigation: NavigationItem[] = [
  {
    title: 'route.supplyDemandProductStatus',
    path: '/supply-demand/product-status',
    icon: PackageIcon,
  },
  { title: 'route.supplyDemandNewPage', path: '/supply-demand/new-page', icon: SomeIcon }, // Add between existing items
  { title: 'route.supplyDemandReports', path: '/supply-demand/reports', icon: FileTextIcon },
  { title: 'route.supplyDemandUpload', path: '/supply-demand/upload', icon: UploadIcon },
]
```

## Step 10: Add i18n Translation

Update `apps/frontend/src/i18n/en/routes.json`:

```json
{
  "route.supplyDemandNewPage": "New Page Title"
}
```

## Step 11: Verify and Test

```bash
# Run type checks
cd apps/backend && pnpm tsc --noEmit
cd apps/frontend && pnpm tsc --noEmit

# Seed database
pnpm db:seed

# Start dev servers and verify page works
pnpm dev
```

## UI/UX Guidelines

- Use status badges with color coding (green for active, yellow for warning, red for inactive)
- Use monospace font (`font-mono`) for codes, IDs, and GTINs
- Use tooltips with clock icons for dates to save column width
- Apply `whitespace-nowrap` and `justify-center` to badge text
- Keep column widths minimal to prevent horizontal scrolling
- Show filter count badge on the Filters button

## File Checklist

- [ ] `packages/db/src/schema/<name>.ts` - Database schema
- [ ] `packages/db/src/schema/index.ts` - Export schema
- [ ] `packages/db/src/seed/<name>.ts` - Seed data (embedded, not CSV parsing)
- [ ] `packages/db/src/seed/index.ts` - Register seed function
- [ ] `apps/backend/src/routers/<name>/schemas.ts` - Zod validation
- [ ] `apps/backend/src/routers/<name>/helpers.ts` - Database queries
- [ ] `apps/backend/src/routers/<name>/handlers.ts` - API endpoints
- [ ] `apps/backend/src/index.ts` - Register router
- [ ] `apps/frontend/src/hooks/queries/<name>/use<Name>.ts` - React Query hook
- [ ] `apps/frontend/src/routes/_auth/supply-demand/<name>/index.tsx` - Page component
- [ ] `apps/frontend/src/components/AppLayout/AppSidebar/navigation.ts` - Nav item
- [ ] `apps/frontend/src/i18n/en/routes.json` - Translation
