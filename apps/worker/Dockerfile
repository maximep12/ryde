FROM node:23-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN npm install -g corepack@latest && \
    corepack enable && \
    apk add --no-cache tini

COPY . /app
WORKDIR /app

RUN npm pkg delete scripts.prepare && \
  addgroup -S worker && adduser -S worker -G worker

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=1 pnpm install --frozen-lockfile --prod --filter=@repo/worker... --config.dedupe-peer-dependents=false
# Remove everything except node_modules
RUN find apps packages -mindepth 2 \
  ! -path "*/node_modules*" \
  -exec rm -rf {} +

FROM base AS build
# The CI=1 env var is, counter-intuitively, required to allow pnpm to install devDependencies
# https://github.com/pnpm/pnpm/issues/6615#issuecomment-1656945689
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=1 pnpm install --frozen-lockfile --prod=false --filter=@repo/worker... --config.dedupe-peer-dependents=false
RUN pnpm build --filter=@repo/worker
# Remove everything except dist
RUN find apps packages -mindepth 2 \
  ! -path "*/dist*" \
  -exec rm -rf {} +


FROM base

COPY --from=prod-deps --chown=worker:worker /app /app
COPY --from=build --chown=worker:worker /app /app

WORKDIR /app/apps/worker
USER worker

ENTRYPOINT ["/sbin/tini", "--", "node", "dist"]