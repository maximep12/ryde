import nodeConfig from '@repo/config-eslint-custom/node'

export default [
  ...nodeConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    // Ignore legacy JS files that haven't been migrated yet
    ignores: [
      'src/modules/**',
      'src/models/**',
      'src/config/**',
      'src/db/index.js',
      'src/lib/FileDownloader/**',
      'src/lib/Workers/**',
    ],
  },
]
