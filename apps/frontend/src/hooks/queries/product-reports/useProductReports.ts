import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type PerformanceLevel = 'high' | 'medium' | 'low'

export type ProductReportsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  productTypes?: string[]
  productGroups?: string[]
  performanceLevels?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type ProductReportItem = {
  productCode: string
  description: string
  productType: string | null
  productGroup: string | null
  totalUnitsSold: number
  totalRevenue: number
  orderCount: number
  avgOrderQuantity: number
  performanceLevel: PerformanceLevel
  lastValidatedAt: string | null
  hasComments: boolean
}

export type ProductReportsResponse = {
  items: ProductReportItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  lowPerformerCount: number
  highPerformerCount: number
  needsValidationCount: number
}

export function useProductReports(params: ProductReportsQueryParams = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    productTypes,
    productGroups,
    performanceLevels,
    sortBy,
    sortOrder,
  } = params

  return useQuery({
    queryKey: [
      'product-reports',
      {
        page,
        pageSize,
        search,
        productTypes,
        productGroups,
        performanceLevels,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example['product-reports'].$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(productTypes && productTypes.length > 0 && { productTypes: productTypes.join(',') }),
          ...(productGroups &&
            productGroups.length > 0 && { productGroups: productGroups.join(',') }),
          ...(performanceLevels &&
            performanceLevels.length > 0 && { performanceLevels: performanceLevels.join(',') }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch product reports')
      }
      return res.json() as Promise<ProductReportsResponse>
    },
  })
}

export type SalesByMonth = {
  month: string
  unitsSold: number
  revenue: number
}

export type SalesByRetailerType = {
  storeType: string
  unitsSold: number
  revenue: number
  percentage: number
}

export type TopRetailer = {
  clientCode: string
  storeName: string
  storeType: string
  unitsSold: number
  revenue: number
}

export type ProductReportDetailResponse = {
  productCode: string
  description: string
  productType: string | null
  productGroup: string | null
  gtin: string | null
  status: string | null
  totalUnitsSold: number
  totalRevenue: number
  orderCount: number
  avgOrderQuantity: number
  performanceLevel: PerformanceLevel
  lastValidatedAt: string | null
  salesByMonth: SalesByMonth[]
  salesByRetailerType: SalesByRetailerType[]
  topRetailers: TopRetailer[]
}

export function useProductReportDetail(productCode: string) {
  return useQuery({
    queryKey: ['product-reports', 'detail', productCode],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].$get({
        param: {
          productCode,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch product report detail')
      }
      return res.json() as Promise<ProductReportDetailResponse>
    },
    enabled: !!productCode,
  })
}

export type FilterOption = {
  value: string | null
  label: string | null
}

export type ProductReportsFilterOptionsResponse = {
  productTypes: FilterOption[]
  productGroups: FilterOption[]
  performanceLevels: FilterOption[]
}

export function useProductReportsFilterOptions() {
  return useQuery({
    queryKey: ['product-reports', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example['product-reports']['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<ProductReportsFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
