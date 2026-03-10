import config from '@/config'
import { getRydeToken } from '@/stores/ryde-session'
import { useQuery } from '@tanstack/react-query'

export type ImportReport = {
  id: number
  type: string
  failure: string | null
  warnings: unknown
  reportStart: string | null
  reportEnd: string | null
  created: number | null
  updated: number | null
  deleted: number | null
  extra: { rejected?: string[]; identical?: number } | null
  fileName: string | null
  createdAt: string
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

export function useImportReports(endpoint: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['import-reports', endpoint, page, pageSize],
    queryFn: async (): Promise<ReportsResponse> => {
      const token = getRydeToken()
      const url = new URL(`${config.rydeBackendURL}${endpoint}`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(pageSize))

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
