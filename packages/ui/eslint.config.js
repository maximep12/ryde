import config from '@repo/config-eslint-custom/vite'

export default [
  ...config,
  {
    rules: {
      // UI components don't need i18n enforcement
      'i18next/no-literal-string': 'off',
      // Allow setState in effects for state sync patterns
      'react-hooks/set-state-in-effect': 'off',
      // Allow Math.random in useMemo for skeleton widths
      'react-hooks/purity': 'off',
    },
  },
]
