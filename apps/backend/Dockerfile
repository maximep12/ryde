FROM node:23-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV PORT=5000

ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

RUN npm install -g corepack@latest && \
    corepack enable && \
    apk add --no-cache tini

COPY . /app
WORKDIR /app

RUN npm pkg delete scripts.prepare && \
  addgroup -S backend && adduser -S backend -G backend

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=1 pnpm install --frozen-lockfile --prod --filter=@repo/backend... --config.dedupe-peer-dependents=false
# Remove everything except node_modules
RUN find apps packages -mindepth 2 \
  ! -path "*/node_modules*" \
  -exec rm -rf {} +

FROM base AS build
# The CI=1 env var is, counter-intuitively, required to allow pnpm to install devDependencies
# https://github.com/pnpm/pnpm/issues/6615#issuecomment-1656945689
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=1 pnpm install --frozen-lockfile --prod=false --filter=@repo/backend... --config.dedupe-peer-dependents=false
RUN pnpm build --filter=@repo/backend
# Remove everything except dist
RUN find apps packages -mindepth 2 \
  ! -path "*/dist*" \
  -exec rm -rf {} +


FROM base

COPY --from=prod-deps --chown=backend:backend /app /app
COPY --from=build --chown=backend:backend /app /app

RUN corepack enable && corepack install
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /app/apps/backend
USER backend
EXPOSE ${PORT}

ENTRYPOINT ["/sbin/tini", "--", "pnpm", "start"]