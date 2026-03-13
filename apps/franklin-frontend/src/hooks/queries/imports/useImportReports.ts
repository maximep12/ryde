import config from '@/config'
import { getRydeToken } from '@/stores/ryde-session'
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
