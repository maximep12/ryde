
FROM node:24-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN npm install -g corepack@latest && \
    corepack enable

COPY . /app
WORKDIR /app

RUN npm pkg delete scripts.prepare
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=1 pnpm install --frozen-lockfile --prod=false --filter=@repo/franklin-frontend... --config.dedupe-peer-dependents=false

ARG VITE_FRONTEND_ENV
ENV VITE_FRONTEND_ENV=$VITE_FRONTEND_ENV

RUN pnpm build --filter=@repo/franklin-frontend

FROM nginx:stable-alpine

RUN sed -i '1idaemon off;' /etc/nginx/nginx.conf
COPY apps/franklin-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/franklin-frontend/dist/ /app

EXPOSE 80

CMD ["nginx"]