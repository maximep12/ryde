import nodeConfig from '@repo/config-eslint-custom/node'

export default [
  ...nodeConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
  },
]
