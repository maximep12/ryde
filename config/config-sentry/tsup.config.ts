import { defineConfig } from 'tsup'

export default defineConfig(() => {
  return {
    format: ['esm'],
    entryPoints: ['src/*.ts'],
  }
})
