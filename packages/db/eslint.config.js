import nodeConfig from '@repo/config-eslint-custom/node'

export default [
  // Ignore seed files - they use non-null assertions for simplicity
  {
    ignores: ['src/seed/**'],
  },
  ...nodeConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
  },
]
