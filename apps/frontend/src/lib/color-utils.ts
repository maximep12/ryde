import { oklchToHex } from '@repo/utils'

/**
 * Get CSS variable value from the document root and convert to hex if needed
 *
 * @param variable - CSS variable name (e.g., "--map-route-color")
 * @param fallback - Fallback hex color if variable is not found (default: "#044750")
 * @returns Hex color string
 *
 * @example
 * getCssVariable("--map-route-color") // Uses default fallback #044750
 * getCssVariable("--map-route-color", "#3b82f6") // Custom fallback
 */
export const getCssVariable = (variable: string, fallback: string = '#044750'): string => {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()

  if (!value) return fallback

  // Convert oklch() to hex if needed (for libraries that don't support oklch)
  if (value.startsWith('oklch(')) {
    return oklchToHex(value)
  }

  return value
}
