import { z } from 'zod'

/**
 * Parses comma-separated string from URL into string array.
 * Returns undefined for empty/missing values (keeps URL clean).
 * Example: "pending,shipped" -> ["pending", "shipped"]
 */
export const commaSeparatedArray = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || val.trim() === '') return undefined
    return val.split(',').filter(Boolean)
  })

/**
 * Serializes string array to comma-separated string for URL.
 * Returns undefined for empty arrays (keeps URL clean).
 */
export function serializeArray(arr: string[] | undefined): string | undefined {
  if (!arr || arr.length === 0) return undefined
  return arr.join(',')
}

/**
 * Optional boolean from URL string.
 * Only returns true if explicitly "true", otherwise undefined.
 * This keeps URLs clean - false/undefined values are omitted.
 */
export const optionalBooleanParam = z
  .string()
  .optional()
  .transform((val) => {
    if (val === 'true') return true
    return undefined
  })

/**
 * Serializes boolean for URL - only includes if true.
 */
export function serializeBoolean(val: boolean | undefined): string | undefined {
  return val === true ? 'true' : undefined
}

/**
 * Page number schema - coerces to number, defaults to 1.
 */
export const pageParam = z.coerce.number().int().min(1).catch(1)

/**
 * Page size schema factory with configurable default.
 */
export function pageSizeParam(defaultSize: number) {
  return z.coerce.number().int().min(1).max(100).catch(defaultSize)
}

/**
 * Date parameter as YYYY-MM-DD string.
 * Validates format optionally.
 */
export const dateParam = z.string().optional().catch(undefined)

/**
 * Serializes Date to YYYY-MM-DD string for URL.
 */
export function serializeDate(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return date.toISOString().split('T')[0]
}

/**
 * Parses YYYY-MM-DD string to Date object.
 */
export function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined
  const date = new Date(dateStr + 'T00:00:00')
  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Sort parameter type.
 */
export type SortParam = { id: string; desc: boolean }

/**
 * Sort parameter combining column ID and direction.
 * URL format: "columnId.asc" or "columnId.desc"
 */
export const sortParam = z
  .string()
  .optional()
  .transform((val): SortParam | undefined => {
    if (!val) return undefined
    const lastDotIndex = val.lastIndexOf('.')
    if (lastDotIndex === -1) return undefined
    const id = val.slice(0, lastDotIndex)
    const order = val.slice(lastDotIndex + 1)
    if (!id || (order !== 'asc' && order !== 'desc')) return undefined
    return { id, desc: order === 'desc' }
  })

/**
 * Serializes sort state to URL string.
 * Only takes first sort column (single-column sort).
 */
export function serializeSort(
  sorting: Array<{ id: string; desc: boolean }> | undefined,
): string | undefined {
  if (!sorting || sorting.length === 0) return undefined
  const first = sorting[0]
  if (!first) return undefined
  return `${first.id}.${first.desc ? 'desc' : 'asc'}`
}

/**
 * Parses sort URL param to array format (TanStack Table SortingState).
 */
export function parseSort(sortStr: string | undefined): Array<{ id: string; desc: boolean }> {
  if (!sortStr) return []
  const lastDotIndex = sortStr.lastIndexOf('.')
  if (lastDotIndex === -1) return []
  const id = sortStr.slice(0, lastDotIndex)
  const order = sortStr.slice(lastDotIndex + 1)
  if (!id || (order !== 'asc' && order !== 'desc')) return []
  return [{ id, desc: order === 'desc' }]
}

/**
 * Parses comma-separated string to array.
 * Returns empty array if undefined/empty.
 */
export function parseArray(val: string | undefined): string[] {
  if (!val || val.trim() === '') return []
  return val.split(',').filter(Boolean)
}
