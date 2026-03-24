import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    format: ['esm'],
    entryPoints: ['src/index.ts'],
    sourcemap: true,
  }
})
