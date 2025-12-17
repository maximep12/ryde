import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { themeAtom } from '../../stores/theme'
import { ThemeProviderContext } from './contexts'

export type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useAtom(themeAtom)

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Function to apply theme with transition handling
    const applyTheme = () => {
      // Temporarily disable animations
      root.classList.add('disable-animations')
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }

      // Re-enable animations after a brief delay
      const timeout = setTimeout(() => {
        root.classList.remove('disable-animations')
      }, 50)

      return timeout
    }

    // Apply theme initially
    let timeout = applyTheme()

    // Set up listener for system theme changes
    const handleMediaChange = () => {
      if (theme === 'system') {
        clearTimeout(timeout)
        timeout = applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    // Cleanup
    return () => {
      clearTimeout(timeout)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [theme])

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
