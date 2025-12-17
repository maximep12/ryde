# Multi-stage Dockerfile for @repo/admin-web
# Optimized for production with layer caching

# Stage 1: Dependencies - Install all dependencies (cached layer)
FROM node:22-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /app

# Copy ONLY files needed for dependency resolution (changes rarely)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json from each workspace package (for pnpm workspace resolution)
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/database-legacy/package.json ./packages/database-legacy/
COPY packages/database-schema/package.json ./packages/database-schema/
COPY packages/domain/dispatch/package.json ./packages/domain/dispatch/
COPY packages/domain/location/package.json ./packages/domain/location/
COPY packages/domain/tenant/package.json ./packages/domain/tenant/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/logger/package.json ./packages/logger/
COPY packages/schema/package.json ./packages/schema/
COPY packages/tenancy/package.json ./packages/tenancy/
COPY packages/testing/package.json ./packages/testing/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/admin-web/package.json ./apps/admin-web/
COPY apps/migrations/package.json ./apps/migrations/

# Install dependencies with cache mount (speeds up rebuilds)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder - Build application
FROM deps AS builder
ENV NODE_ENV=production

# NOW copy source code (changes frequently, but deps are cached)
COPY packages ./packages
COPY apps ./apps

# Set build-time environment variables (VITE_ vars are baked into the bundle)
ARG VITE_MAPBOX_PK
ENV VITE_MAPBOX_PK=${VITE_MAPBOX_PK}

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_MAPBOX_STYLE
ENV VITE_MAPBOX_STYLE=${VITE_MAPBOX_STYLE}

# Build the web app
# Uses turbo remote cache if secrets are provided (secrets NOT stored in image)
RUN --mount=type=secret,id=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM \
    TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN 2>/dev/null || echo "") \
    TURBO_API=$(cat /run/secrets/TURBO_API 2>/dev/null || echo "") \
    TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM 2>/dev/null || echo "") \
    pnpm turbo build --filter=@repo/admin-web

# Stage 3: Production - Serve with nginx
FROM nginx:stable-alpine

RUN sed -i '1idaemon off;' /etc/nginx/nginx.conf
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin-web/dist /app

EXPOSE 80

CMD ["nginx"]
