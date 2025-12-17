# FRANKLIN_ARCHITECTURE.md

This file provides guidance to Claude Code (claude.ai/code) when generating new prototypes based on the objectif of The Franklin Project.

The Franklin Architecture is based on a Turborepo monorepo architecture with pnpm workspaces containing:

**Applications:**

- `apps/backend` - Hono API server with TypeScript, PostgreSQL/Drizzle ORM, Redis
- `apps/frontend` - React SPA with Vite, TanStack Router, TanStack Query, Tailwind CSS
- `apps/worker` - Background job processing with BullMQ

**Packages:**

- `packages/db` - Drizzle ORM schemas, migrations, database utilities
- `packages/ui` - Shared React component library with shadcn/ui and React Aria
- `packages/constants` - Shared constants across applications
- `packages/utils` - Shared utility functions
- `packages/zod-schemas` - Shared validation schemas
- `packages/feature-flags` - Declaration of features flags
- `packages/queue` - Shared info about queues for background jobs so the backend can add jobs for the worker
- `packages/redis` - Configure types for Redis
