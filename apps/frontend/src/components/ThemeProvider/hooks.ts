import { useContext, useEffect, useState } from 'react'
import { ThemeProviderContext } from './contexts'

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

export const useAppliedTheme = () => {
  const { theme } = useTheme()
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>(
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme,
  )

  useEffect(() => {
    // If theme is explicitly light or dark, use that
    if (theme !== 'system') {
      setAppliedTheme(theme)
      return
    }

    // If theme is system, check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Update initial value
    setAppliedTheme(mediaQuery.matches ? 'dark' : 'light')

    // Listen for changes
    const handleChange = () => {
      setAppliedTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return {
    appliedTheme,
    isDarkTheme: appliedTheme === 'dark',
    isLightTheme: appliedTheme === 'light',
  }
}
