import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type ForecastsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  regions?: string[]
  countries?: string[]
  brands?: string[]
  plants?: string[]
  years?: number[]
  months?: number[]
  negativeSalesOnly?: boolean
}

export type ForecastItem = {
  id: number
  country: string
  region: string | null
  client: string | null
  brandType: string | null
  brand: string | null
  productDescription: string | null
  format: string | null
  year: number | null
  productCode: string | null
  month: number | null
  quantity: number
  volume: string | null
  sales: string | null
  seller: string | null
  clientActive: string | null
  plant: string | null
  createdAt: string
  updatedAt: string | null
}

export type ForecastsResponse = {
  items: ForecastItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useForecasts(params: ForecastsQueryParams = {}) {
  const { page = 1, pageSize = 25, search, regions, countries, brands, plants, years, months, negativeSalesOnly } = params

  return useQuery({
    queryKey: [
      'forecasts',
      {
        page,
        pageSize,
        search,
        regions,
        countries,
        brands,
        plants,
        years,
        months,
        negativeSalesOnly,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api.forecasts.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(regions && regions.length > 0 && { regions: regions.join(',') }),
          ...(countries && countries.length > 0 && { countries: countries.join(',') }),
          ...(brands && brands.length > 0 && { brands: brands.join(',') }),
          ...(plants && plants.length > 0 && { plants: plants.join(',') }),
          ...(years && years.length > 0 && { years: years.join(',') }),
          ...(months && months.length > 0 && { months: months.join(',') }),
          ...(negativeSalesOnly && { negativeSalesOnly: 'true' }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch forecasts')
      }
      return res.json() as Promise<ForecastsResponse>
    },
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type NumberFilterOption = {
  value: number | null
  count: number
}

export type ForecastsFilterOptionsResponse = {
  regions: FilterOption[]
  countries: FilterOption[]
  brands: FilterOption[]
  plants: FilterOption[]
  years: NumberFilterOption[]
  months: NumberFilterOption[]
}

export function useForecastsFilterOptions() {
  return useQuery({
    queryKey: ['forecasts', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.forecasts['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<ForecastsFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
