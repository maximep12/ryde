import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

// Risk level for stock health (high=negative stock, medium=below safety, low=ok)
export type RiskLevel = 'high' | 'medium' | 'low'

// Product status from SAP (03=Active/In-Use, 04=Phase Out, 05=Obsolete)
export type ProductStatus = '03' | '04' | '05' | null

// Validation status (validated=recent, stale=older than 3 months, pending=never validated)
export type ValidationStatus = 'validated' | 'stale' | 'pending'

export type ReportsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  plantNames?: string[]
  riskLevels?: string[]
  productStatuses?: string[]
  nextProblemPeriods?: string[]
  needsValidation?: boolean
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
  validationStatus: ValidationStatus
  validatedAt: string | null
  validatedBy: {
    id: string
    givenName: string | null
    familyName: string | null
  } | null
}

export type ReportsResponse = {
  items: ReportItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  reportsNeedingValidationCount: number
  reportsWithProblemsNext3MonthsCount: number
}

export function useReports(params: ReportsQueryParams = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    plantNames,
    riskLevels,
    productStatuses,
    nextProblemPeriods,
    needsValidation,
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
        nextProblemPeriods,
        needsValidation,
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
          ...(nextProblemPeriods &&
            nextProblemPeriods.length > 0 && { nextProblemPeriods: nextProblemPeriods.join(',') }),
          ...(needsValidation !== undefined && { needsValidation: needsValidation.toString() }),
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
  brand: string | null
  validationStatus: ValidationStatus
  validatedAt: string | null
  validatedBy: {
    id: string
    givenName: string | null
    familyName: string | null
  } | null
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
