# Ryde Backend Refactoring Plan

> **Living document** — update the status checkboxes and notes as each phase is completed across branches.

## Context

`apps/ryde-backend` is a legacy Koa/JavaScript/Knex/Objection.js backend pasted from another project without being adapted to this monorepo (turborepo). It is being converted to **Hono/TypeScript/Drizzle ORM**, following the patterns established in `apps/franklin-backend`. Work is done controller-by-controller in separate Git branches. The old code stays functional throughout.

## Strategy

- Convert `apps/ryde-backend` in-place (same directory, new structure)
- Work in Git feature branches, one per module (see branch names below)
- The Drizzle schema in `packages/db/src/schema/` already covers all ryde domain tables — **no new tables needed**
- Follow `apps/franklin-backend` patterns exactly for structure, error handling, and middleware
- Auth differs: ryde uses **stateless JWT tokens** (not DB sessions like franklin)

## Key Architectural Differences vs Franklin Backend

| Concern               | Franklin                       | Ryde (new)                                             |
| --------------------- | ------------------------------ | ------------------------------------------------------ |
| Auth                  | DB session tokens              | Stateless JWT (`jsonwebtoken`)                         |
| Role check            | `verifySession` + `attachUser` | `verifyJWT` + `requireRoles('Admin', ...)`             |
| File processing       | S3 presigned uploads           | Direct file upload + vendor-specific Excel/CSV parsers |
| Storage               | AWS S3 only                    | AWS S3 + Azure Blob + SFTP                             |
| Background jobs       | None                           | Bull (Redis) job queues                                |
| External integrations | None                           | Slack, Metabase, ADVANCE DB                            |

## Branch Naming Convention

```
feat/ryde-backend-hono-setup
feat/ryde-backend-auth
feat/ryde-backend-users
feat/ryde-backend-customers
feat/ryde-backend-products
feat/ryde-backend-banners
feat/ryde-backend-competitor-sales
feat/ryde-backend-orders
feat/ryde-backend-amazon
feat/ryde-backend-misc
```

---

## Completion Status

- [x] **Phase 1** — Project Setup (`feat/ryde-backend-hono-setup`)
- [x] **Phase 2** — Auth & Token Routers (`feat/ryde-backend-auth`)
- [x] **Phase 3** — Users Router (`feat/ryde-backend-users`)
- [x] **Phase 4** — Customers Router (`feat/ryde-backend-customers`)
- [x] **Phase 5** — Products Router (`feat/ryde-backend-products`)
- [ ] **Phase 6** — Banners Router (`feat/ryde-backend-banners`)
- [x] **Phase 7** — Competitor Sales Router (`feat/ryde-backend-competitor-sales`)
- [x] **Phase 8** — Orders Routers (`feat/ryde-backend-orders`)
- [x] **Phase 9** — Amazon & Forecast Routers (`feat/ryde-backend-amazon`)
- [ ] **Phase 10** — Misc Routers (`feat/ryde-backend-misc`)

---

## Phase 1: Project Setup

**Branch:** `feat/ryde-backend-hono-setup`

Create the full TypeScript Hono project scaffold inside `apps/ryde-backend/`, mirroring `apps/franklin-backend`.

### Files to Create

| File                                | Notes                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                      | Mirror franklin-backend + add `jsonwebtoken`, `@types/jsonwebtoken`, `exceljs`, `csv-parse`, `@aws-sdk/client-s3`, `@azure/storage-blob`, `bull`, `axios`, `ssh2-sftp-client` |
| `tsconfig.json`                     | Mirror franklin-backend                                                                                                                                                       |
| `tsup.config.ts`                    | Mirror franklin-backend                                                                                                                                                       |
| `vitest.config.ts`                  | Mirror franklin-backend                                                                                                                                                       |
| `src/index.ts`                      | Hono app with JWT middleware chain                                                                                                                                            |
| `src/db.ts`                         | `drizzle(env.DATABASE_URL, { schema })` using `@repo/db`                                                                                                                      |
| `src/redis.ts`                      | IORedis setup                                                                                                                                                                 |
| `src/lib/utils/env.ts`              | All env vars (DATABASE*URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN, S3*_, SLACK*TOKEN, SFTP*_, etc.)                                                                           |
| `src/lib/utils/crypto.ts`           | bcrypt password hashing (matches old backend)                                                                                                                                 |
| `src/lib/errors/index.ts`           | Global error handler (copy from franklin-backend)                                                                                                                             |
| `src/lib/errors/zValidatorThrow.ts` | Copy from franklin-backend                                                                                                                                                    |
| `src/middlewares/auth.ts`           | JWT verification + role-based guards                                                                                                                                          |
| `src/middlewares/httpLogger.ts`     | Copy from franklin-backend                                                                                                                                                    |
| `src/lib/FileParser/excel.ts`       | Generic Excel parser (port from `src/lib/FileParser/excel.js`)                                                                                                                |
| `src/lib/slack.ts`                  | Slack notifications helper                                                                                                                                                    |

### Auth Middleware Pattern

```typescript
// verifyJWT — extracts Bearer token, verifies with jsonwebtoken, sets user in context
export const verifyJWT = createMiddleware<{ Variables: ContextVariables }>(async (c, next) => { ... })

// requireRoles — factory returning middleware that checks user role
export const requireRoles = (...roles: string[]) =>
  createMiddleware<{ Variables: ContextVariables }>(async (c, next) => { ... })

// Pre-built guards (matching old apps/ryde-backend/src/utils/handlers.js)
export const tokenIsValid = requireRoles('Admin')
export const canUploadRabba = requireRoles('Admin', 'rabba')
export const canUploadCircleK = requireRoles('Admin', 'circle k')
export const canUploadCentralMarket = requireRoles('Admin', 'central market')
export const canUploadNapOrange = requireRoles('Admin')
export const canUploadSobeys = requireRoles('Admin')
export const canUploadLoblaws = requireRoles('Admin')
export const canUploadParkland = requireRoles('Admin')
export const canUploadPetroCanada = requireRoles('Admin')
export const canUpload7Eleven = requireRoles('Admin')
```

### Verification

- `pnpm dev` starts without errors
- `GET /healthz` returns `200`

---

## Phase 2: Auth & Token Routers

**Branch:** `feat/ryde-backend-auth`

| Method | Path                   | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| POST   | `/auth/request-access` | Create pending user                       |
| POST   | `/auth/login`          | Verify bcrypt password, return signed JWT |
| GET    | `/auth/me`             | Return user from JWT payload              |
| POST   | `/token`               | Validate JWT token                        |

**Reference:** `apps/ryde-backend/src/modules/auth/`, `apps/ryde-backend/src/modules/login/`, `apps/ryde-backend/src/modules/token/`

**Files:** `src/routers/auth/handlers.ts`, `helpers.ts`, `schemas.ts`

---

## Phase 3: Users Router

**Branch:** `feat/ryde-backend-users`

| Method | Path           | Description               |
| ------ | -------------- | ------------------------- |
| GET    | `/users`       | List all users with roles |
| PATCH  | `/users/batch` | Batch update user roles   |

**Reference:** `apps/ryde-backend/src/modules/users/`

**Files:** `src/routers/users/handlers.ts`, `helpers.ts`, `schemas.ts`

---

## Phase 4: Customers Router

**Branch:** `feat/ryde-backend-customers`

| Method | Path                 | Middleware     | Description                           |
| ------ | -------------------- | -------------- | ------------------------------------- |
| POST   | `/customers`         | `tokenIsValid` | Upload customer master data (Excel)   |
| POST   | `/customers/targets` | `tokenIsValid` | Upload customer sales targets (Excel) |

**Reference:** `apps/ryde-backend/src/modules/customers/`

**Files:** `src/routers/customers/handlers.ts`, `helpers.ts`, `schemas.ts`, `src/lib/FileParser/customerExcel.ts`

---

## Phase 5: Products Router

**Branch:** `feat/ryde-backend-products`

| Method | Path                | Middleware     | Description                     |
| ------ | ------------------- | -------------- | ------------------------------- |
| POST   | `/products`         | `tokenIsValid` | Create products from CSV        |
| POST   | `/products/formats` | `tokenIsValid` | Create product formats from CSV |

**Reference:** `apps/ryde-backend/src/modules/products/`

**Files:** `src/routers/products/handlers.ts`, `helpers.ts`, `schemas.ts`

---

## Phase 6: Banners Router

**Branch:** `feat/ryde-backend-banners`

| Method | Path                     | Middleware               |
| ------ | ------------------------ | ------------------------ |
| POST   | `/banners/rabba`         | `canUploadRabba`         |
| POST   | `/banners/circleK`       | `canUploadCircleK`       |
| POST   | `/banners/circleK/qcatl` | `canUploadCircleK`       |
| POST   | `/banners/centralMarket` | `canUploadCentralMarket` |
| POST   | `/banners/napOrange`     | `canUploadNapOrange`     |
| POST   | `/banners/sobeys`        | `canUploadSobeys`        |
| POST   | `/banners/loblaws`       | `canUploadLoblaws`       |
| POST   | `/banners/parkland`      | `canUploadParkland`      |
| POST   | `/banners/petrocanada`   | `canUploadPetroCanada`   |
| POST   | `/banners/7eleven`       | `canUpload7Eleven`       |

**Reference:** `apps/ryde-backend/src/modules/banners/`

**Files:** `src/routers/banners/handlers.ts`, `helpers.ts`, `src/lib/FileParser/circleKExcel.ts`, `parklandExcel.ts`, `petroCanadaExcel.ts`, `sevenElevenExcel.ts`

---

## Phase 7: Competitor Sales Router

**Branch:** `feat/ryde-backend-competitor-sales`

| Method | Path                 | Middleware       |
| ------ | -------------------- | ---------------- |
| POST   | `/competitors/rabba` | `canUploadRabba` |

**Reference:** `apps/ryde-backend/src/modules/competitorSales/`

**Files:** `src/routers/competitorSales/handlers.ts`, `helpers.ts`

---

## Phase 8: Orders Routers

**Branch:** `feat/ryde-backend-orders`

| Method | Path                                     | Middleware     |
| ------ | ---------------------------------------- | -------------- |
| POST   | `/sellin-orders/file`                    | `tokenIsValid` |
| POST   | `/sellin-orders-confirmed/file`          | `tokenIsValid` |
| POST   | `/sellin-orders-confirmed/file/7-eleven` | `tokenIsValid` |

**Reference:** `apps/ryde-backend/src/modules/sellinOrders/`, `apps/ryde-backend/src/modules/sellinOrdersConfirmed/`

**Files:** `src/routers/sellinOrders/handlers.ts`, `helpers.ts`, `src/routers/sellinOrdersConfirmed/handlers.ts`, `helpers.ts`

---

## Phase 9: Amazon & Forecast Routers

**Branch:** `feat/ryde-backend-amazon`

| Method | Path                     | Middleware     |
| ------ | ------------------------ | -------------- |
| POST   | `/amazon-orders/file`    | `tokenIsValid` |
| POST   | `/amazon-orders/bundles` | `tokenIsValid` |
| POST   | `/forecast/amazon`       | `tokenIsValid` |

**Reference:** `apps/ryde-backend/src/modules/amazonOrders/`, `apps/ryde-backend/src/modules/forecast/`

**Files:** `src/routers/amazonOrders/handlers.ts`, `helpers.ts`, `src/routers/forecast/handlers.ts`, `helpers.ts`

---

## Phase 10: Misc Routers

**Branch:** `feat/ryde-backend-misc`

| Method | Path                                    | Middleware     |
| ------ | --------------------------------------- | -------------- |
| POST   | `/customerProductStatus`                | `tokenIsValid` |
| GET    | `/download/circleK`                     | `tokenIsValid` |
| GET    | `/download/rabba/:container`            | `tokenIsValid` |
| GET    | `/download/list`                        | `tokenIsValid` |
| GET    | `/download/period-targets`              | `tokenIsValid` |
| GET    | `/download/:banner/:provider/:fileName` | `tokenIsValid` |
| GET    | `/workers/rabba/:container`             | `tokenIsValid` |

**Reference:** `apps/ryde-backend/src/modules/customerProductStatus/`, `files/`, `workers/`

**Files:** `src/routers/customerProductStatus/`, `src/routers/files/`, `src/routers/workers/`, `src/lib/FileDownloader/s3.ts`, `azure.ts`, `src/lib/SFTP/index.ts`, `src/lib/Workers/index.ts`

---

## Key Reference Files

| File                                                      | Purpose                                     |
| --------------------------------------------------------- | ------------------------------------------- |
| `apps/franklin-backend/src/index.ts`                      | Hono app setup template                     |
| `apps/franklin-backend/src/middlewares/auth.ts`           | Middleware pattern                          |
| `apps/franklin-backend/src/lib/errors/index.ts`           | Error handler                               |
| `apps/franklin-backend/src/lib/errors/zValidatorThrow.ts` | Validation wrapper                          |
| `packages/db/src/schema/`                                 | All Drizzle table definitions               |
| `apps/ryde-backend/src/modules/`                          | All 17 old modules (business logic to port) |
| `apps/ryde-backend/src/utils/handlers.js`                 | Old role middleware guards                  |
| `apps/ryde-backend/src/config/index.js`                   | Old env var reference                       |

---

## Verification Per Phase

1. `tsc --noEmit` — no TypeScript errors
2. `pnpm lint` — no ESLint errors
3. Manually test endpoints with curl or Postman against local Docker Compose
4. Confirm Drizzle queries match the old Knex/Objection queries in the reference module
