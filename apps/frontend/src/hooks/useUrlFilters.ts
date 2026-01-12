import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import {
  parseSort,
  serializeSort,
  serializeArray,
  serializeDate,
  parseDate,
  parseArray,
} from '@repo/zod-schemas'

type FilterValue = string | number | boolean | undefined

type SearchParams = Record<string, FilterValue>

interface UseUrlFiltersOptions<T extends SearchParams> {
  /** Current search params from Route.useSearch() */
  search: T
  /** Default values - params matching defaults are omitted from URL */
  defaults: T
}

interface UseUrlFiltersReturn<T extends SearchParams> {
  /** Current filter values (parsed from URL) */
  filters: T

  /** Update a single filter value */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void

  /** Update multiple filter values at once */
  setFilters: (updates: Partial<T>) => void

  /** Reset all filters to defaults */
  resetFilters: () => void

  /** Check if any filters are active (non-default) */
  hasActiveFilters: boolean

  /** Get array filter as string[] */
  getArrayFilter: (key: keyof T) => string[]

  /** Set array filter from string[] */
  setArrayFilter: (key: keyof T, values: string[]) => void

  /** Get date filter as Date | undefined */
  getDateFilter: (key: keyof T) => Date | undefined

  /** Set date filter from Date | undefined */
  setDateFilter: (key: keyof T, date: Date | undefined) => void

  /** Get sort state for TanStack Table */
  getSortingState: () => Array<{ id: string; desc: boolean }>

  /** Set sort state from TanStack Table */
  setSortingState: (sorting: Array<{ id: string; desc: boolean }>) => void

  /** Go to specific page */
  setPage: (page: number) => void
}

/**
 * Hook for syncing filter state with URL search params.
 *
 * Features:
 * - Automatic URL serialization/deserialization
 * - Default values are omitted from URL (cleaner URLs)
 * - Page auto-resets to 1 when filters change
 * - Browser back/forward support via URL state
 *
 * @example
 * ```tsx
 * const search = Route.useSearch()
 * const {
 *   filters,
 *   setFilters,
 *   resetFilters,
 *   getArrayFilter,
 *   setArrayFilter,
 * } = useUrlFilters({
 *   search,
 *   defaults: ordersSearchDefaults,
 * })
 * ```
 */
export function useUrlFilters<T extends SearchParams>({
  search,
  defaults,
}: UseUrlFiltersOptions<T>): UseUrlFiltersReturn<T> {
  const navigate = useNavigate()

  // Build search params object, omitting values that match defaults
  const buildSearchParams = useCallback(
    (updates: Partial<T>): Record<string, FilterValue> => {
      const merged = { ...search, ...updates }
      const result: Record<string, FilterValue> = {}

      for (const key in merged) {
        const value = merged[key]
        const defaultValue = defaults[key]

        // Omit if matches default or is undefined/empty
        if (value !== defaultValue && value !== undefined && value !== '') {
          result[key] = value
        }
      }

      return result
    },
    [search, defaults],
  )

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const newSearch = buildSearchParams({ [key]: value } as unknown as Partial<T>)
      navigate({ search: newSearch as never })
    },
    [buildSearchParams, navigate],
  )

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      // Reset page to 1 when filters change (unless page is being set)
      const withPageReset = 'page' in updates ? updates : { ...updates, page: 1 }
      const newSearch = buildSearchParams(withPageReset as Partial<T>)
      navigate({ search: newSearch as never })
    },
    [buildSearchParams, navigate],
  )

  const resetFilters = useCallback(() => {
    navigate({ search: {} as never })
  }, [navigate])

  const hasActiveFilters = useMemo(() => {
    for (const key in search) {
      if (key === 'page' || key === 'pageSize') continue
      const value = search[key]
      const defaultValue = defaults[key]
      if (value !== defaultValue && value !== undefined && value !== '') {
        return true
      }
    }
    return false
  }, [search, defaults])

  // Array filter helpers
  const getArrayFilter = useCallback(
    (key: keyof T): string[] => {
      const value = search[key]
      if (typeof value !== 'string' || !value) return []
      return parseArray(value)
    },
    [search],
  )

  const setArrayFilter = useCallback(
    (key: keyof T, values: string[]) => {
      const serialized = serializeArray(values)
      setFilters({ [key]: serialized } as unknown as Partial<T>)
    },
    [setFilters],
  )

  // Date filter helpers
  const getDateFilter = useCallback(
    (key: keyof T): Date | undefined => {
      const value = search[key]
      return parseDate(value as string | undefined)
    },
    [search],
  )

  const setDateFilter = useCallback(
    (key: keyof T, date: Date | undefined) => {
      const serialized = serializeDate(date)
      setFilters({ [key]: serialized } as unknown as Partial<T>)
    },
    [setFilters],
  )

  // Sort helpers for TanStack Table
  const getSortingState = useCallback((): Array<{ id: string; desc: boolean }> => {
    const sortValue = search['sort' as keyof T]
    return parseSort(sortValue as string | undefined)
  }, [search])

  const setSortingState = useCallback(
    (sorting: Array<{ id: string; desc: boolean }>) => {
      const serialized = serializeSort(sorting)
      setFilters({ sort: serialized, page: 1 } as unknown as Partial<T>)
    },
    [setFilters],
  )

  const setPage = useCallback(
    (page: number) => {
      setFilter('page' as keyof T, page as T[keyof T])
    },
    [setFilter],
  )

  return {
    filters: search,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    getArrayFilter,
    setArrayFilter,
    getDateFilter,
    setDateFilter,
    getSortingState,
    setSortingState,
    setPage,
  }
}
