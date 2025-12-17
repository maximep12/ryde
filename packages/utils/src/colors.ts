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
