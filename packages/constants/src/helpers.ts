/**
 * Creates an enum-like object from an array of string values.
 * Each value becomes both a key and its corresponding value in the returned object.
 *
 * @example
 * const CHANNEL_VALUES = ['DSS', 'MW', 'CDF'] as const
 * const CHANNELS = createEnum(CHANNEL_VALUES)
 * // Result: { DSS: 'DSS', MW: 'MW', CDF: 'CDF' }
 */
function createEnum<T extends readonly string[]>(values: T) {
  return Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K }
}

export { createEnum }
