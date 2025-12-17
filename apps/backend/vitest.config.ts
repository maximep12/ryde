/// <reference types="vitest/config" />
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env file from the root of the monorepo
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '')

  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: {
        '@repo/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
        '@repo/permissions': path.resolve(__dirname, '../../packages/permissions/src/index.ts'),
        '@repo/constants': path.resolve(__dirname, '../../packages/constants/src/index.ts'),
      },
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', '.git'],
      env: {
        ...env,
        NODE_ENV: 'development',
      },
    },
  }
})
