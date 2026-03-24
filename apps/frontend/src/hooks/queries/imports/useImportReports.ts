import config from '@/config'
import { getSessionToken } from '@/stores/session'
import { useQuery } from '@tanstack/react-query'

export type ImportReport = {
  id: number
  type: string
  failure: string | null
  warnings: { rejected?: string[] }
  reportStart: string | null
  reportEnd: string | null
  created: number | null
  updated: number | null
  deleted: number | null
  extra: { identical?: number } | null
  fileName: string | null
  createdAt: string
  downloadPath: string | null
  uploadedBy: string | null
  uploaderGivenName: string | null
  uploaderFamilyName: string | null
}

type ReportsResponse = {
  reports: ImportReport[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ReportFilters = {
  types?: string[]
  dateFrom?: string
  dateTo?: string
  status?: 'success' | 'failed'
  uploadedBy?: string
}

export function useImportReports(
  endpoint: string,
  page = 1,
  pageSize = 10,
  filters?: ReportFilters,
) {
  return useQuery({
    queryKey: ['import-reports', endpoint, page, pageSize, filters],
    queryFn: async (): Promise<ReportsResponse> => {
      const token = getSessionToken()
      const url = new URL(`${config.backendURL}${endpoint}`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(pageSize))

      if (filters?.types?.length) url.searchParams.set('types', filters.types.join(','))
      if (filters?.dateFrom) url.searchParams.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) url.searchParams.set('dateTo', filters.dateTo)
      if (filters?.status) url.searchParams.set('status', filters.status)
      if (filters?.uploadedBy) url.searchParams.set('uploadedBy', filters.uploadedBy)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch reports (${res.status})`)
      }

      return res.json()
    },
  })
}

export function useDistinctReportTypes() {
  return useQuery({
    queryKey: ['import-report-types'],
    queryFn: async (): Promise<string[]> => {
      const token = getSessionToken()
      const res = await fetch(`${config.backendURL}/banners/reports/types`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch report types (${res.status})`)
      }

      const data = (await res.json()) as { types: string[] }
      return data.types
    },
  })
}

export function useImportReport(id: number) {
  return useQuery({
    queryKey: ['import-report', id],
    queryFn: async (): Promise<ImportReport> => {
      const token = getSessionToken()
      const res = await fetch(`${config.backendURL}/banners/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch report (${res.status})`)
      }

      const data = (await res.json()) as { report: ImportReport }
      return data.report
    },
  })
}
