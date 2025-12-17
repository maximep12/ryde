import { formatHex, oklch } from 'culori'

/**
 * Convert oklch() CSS color to hex for libraries that don't support oklch
 * (e.g., Mapbox, Canvas API)
 *
 * @param oklchString - CSS color string in oklch() format
 * @returns Hex color string (e.g., "#3b82f6")
 *
 * @example
 * oklchToHex("oklch(0.3648 0.0632 210.66)") // "#1e40af"
 */
export const oklchToHex = (oklchString: string): string => {
  try {
    const color = oklch(oklchString)
    if (!color) return oklchString

    const hex = formatHex(color)
    return hex
  } catch {
    return oklchString
  }
}

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
