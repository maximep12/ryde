/**
 * Helper to conditionally apply a function only if the value is defined
 * Useful for building dynamic query conditions
 */
export function ifDefined<T, R>(value: T | undefined | null, fn: (value: T) => R): R | undefined {
  if (value === undefined || value === null) return undefined
  return fn(value)
}
