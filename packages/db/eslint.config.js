import nodeConfig from '@repo/config-eslint-custom/node'

export default [
  // Ignore large generated seed files that cause ESLint to hang
  {
    ignores: ['src/seed/forecasts.ts', 'src/seed/products.ts', 'src/seed/inventory.ts'],
  },
  ...nodeConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
  },
]
