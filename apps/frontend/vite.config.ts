import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    sentryVitePlugin({
      org: 'volume7',
      project: 'fuze-frontend',
      authToken: env.VITE_SENTRY_AUTH_TOKEN,
      release: {
        name: pkg.version,
      },
    }),
  ],
  server: {
    port: process.env.ADMIN_WEB_PORT
      ? parseInt(process.env.ADMIN_WEB_PORT, 10)
      : 5173,
    host: true,
  },
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
  },
});
