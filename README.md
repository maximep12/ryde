# The Franklin Project

Official V7 starter kit to kickstart a prototype or a real app.

## Objective

Provide a way to quickly kick off a prototype or a new app with as little friction as possible, while following V7 standards, both technically and in terms of structure and formality.

The project aims to be as "LLM-friendly" as possible in order to greatly facilitate the work of Claude Code as a UI prototype generator.

It is essential to maintain this repository over time. It is also crucial to refine it and keep it up to date based on learnings and reflections within the company.

## Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS v4, Jotai
- **Backend**: Hono, Drizzle ORM
- **Database**: PostgreSQL, Redis
- **Tooling**: pnpm, Turborepo, Vite, TypeScript

## Getting Started

### Prerequisites

- Node.js >= 23
- pnpm >= 10
- Docker & Docker Compose

### Quick Start

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd the-franklin-project
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the interactive setup:

   ```bash
   pnpm init-project
   ```

   This will guide you through:
   - Naming your project (replaces "franklin" references)
   - Starting Docker containers (PostgreSQL, Redis)
   - Generating the `.env` file
   - Running database migrations
   - Seeding the database with initial data

4. Start development:
   ```bash
   pnpm dev
   ```

### Manual Setup

If you prefer to set things up manually:

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Start the databases:

   ```bash
   docker compose up -d
   ```

3. Run migrations:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. Seed the database (optional):
   ```bash
   pnpm db:seed
   ```

## Project Structure

```
├── apps/
│   ├── backend/          # Hono API server
│   ├── frontend/         # React SPA with TanStack Router
│   └── worker/           # Background job worker
├── packages/
│   ├── constants/        # Shared constants
│   ├── db/               # Drizzle ORM schema & migrations
│   ├── feature-flags/    # Feature flag utilities
│   ├── ui/               # Shared UI components
│   └── utils/            # Shared utilities
├── config/
│   ├── config-eslint-custom/
│   └── config-typescript/
└── scripts/
    └── init.ts           # Project initialization script
```

## Available Scripts

### Development

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start all apps in development mode |
| `pnpm dev:frontend` | Start frontend only                |
| `pnpm dev:backend`  | Start backend only                 |
| `pnpm dev:worker`   | Start worker only                  |

### Build

| Command               | Description         |
| --------------------- | ------------------- |
| `pnpm build`          | Build all apps      |
| `pnpm build:frontend` | Build frontend only |
| `pnpm build:backend`  | Build backend only  |

### Database

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:migrate`  | Apply pending migrations                |
| `pnpm db:seed`     | Seed database with initial data         |

### Quality

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm lint`       | Run ESLint                   |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm format`     | Format code with Prettier    |

## Default Credentials

After running `pnpm db:seed`, you can log in with:

- **Email**: admin@example.com
- **Password**: admin123

## Docker Services

| Service       | Port | Description         |
| ------------- | ---- | ------------------- |
| PostgreSQL    | 5432 | Primary database    |
| Redis         | 6379 | Cache & job queue   |
| Redis Insight | 5540 | Redis GUI           |
| Bull Board    | 3000 | Job queue dashboard |
