import tailwindcss from '@tailwindcss/vite'
import tanstackRouter from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tsconfigPaths(),
    tailwindcss(),
  ],
  server: {
    port: process.env.ADMIN_WEB_PORT ? parseInt(process.env.ADMIN_WEB_PORT, 10) : 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: ['volume-seven'],
  },
})
