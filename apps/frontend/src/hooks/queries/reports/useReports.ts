import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

// Risk level for stock health (high=negative stock, medium=below safety, low=ok)
export type RiskLevel = 'high' | 'medium' | 'low'

// Product status from SAP (03=Active/In-Use, 04=Phase Out, 05=Obsolete)
export type ProductStatus = '03' | '04' | '05' | null

export type ReportsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  plantNames?: string[]
  riskLevels?: string[]
  productStatuses?: string[]
  nextProblemPeriod?: string
  status?: 'all' | 'problems' | 'ok'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type ReportItem = {
  plantName: string
  materialNumber: string
  materialDescription: string | null
  productStatus: ProductStatus
  currentStock: number
  safetyStock: number
  risk: RiskLevel
  firstProblemDate: string | null
}

export type ReportsResponse = {
  items: ReportItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useReports(params: ReportsQueryParams = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    plantNames,
    riskLevels,
    productStatuses,
    nextProblemPeriod,
    status = 'all',
    sortBy,
    sortOrder,
  } = params

  return useQuery({
    queryKey: [
      'reports',
      {
        page,
        pageSize,
        search,
        plantNames,
        riskLevels,
        productStatuses,
        nextProblemPeriod,
        status,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api.reports.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          status,
          ...(search && { search }),
          ...(plantNames && plantNames.length > 0 && { plantNames: plantNames.join(',') }),
          ...(riskLevels && riskLevels.length > 0 && { riskLevels: riskLevels.join(',') }),
          ...(productStatuses &&
            productStatuses.length > 0 && { productStatuses: productStatuses.join(',') }),
          ...(nextProblemPeriod && { nextProblemPeriod }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch reports')
      }
      return res.json() as Promise<ReportsResponse>
    },
  })
}

export type MonthlyProjection = {
  year: number
  month: number
  isActual: boolean
  demand: number
  supply: number
  monthEndStock: number
  risk: RiskLevel
}

export type StorageLocation = {
  code: string
  description: string | null
}

export type ReportDetailResponse = {
  plantName: string
  materialNumber: string
  materialDescription: string | null
  productStatus: ProductStatus
  currentStock: number
  safetyStock: number
  risk: RiskLevel
  firstProblemDate: string | null
  projections: MonthlyProjection[]
  purchaserName: string | null
  leadTime: number | null
  storageLocations: StorageLocation[]
  openPoCount: number
}

export function useReportDetail(plantName: string, materialNumber: string) {
  return useQuery({
    queryKey: ['reports', 'detail', plantName, materialNumber],
    queryFn: async () => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].$get({
        param: {
          plantName,
          materialNumber,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch report detail')
      }
      return res.json() as Promise<ReportDetailResponse>
    },
    enabled: !!plantName && !!materialNumber,
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type ReportsFilterOptionsResponse = {
  plantNames: FilterOption[]
}

export function useReportsFilterOptions() {
  return useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.reports['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<ReportsFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
