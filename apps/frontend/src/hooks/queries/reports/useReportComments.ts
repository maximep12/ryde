import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type ReportComment = {
  id: number
  plantName: string
  materialNumber: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string | null
  author: {
    id: string
    givenName: string | null
    familyName: string | null
    email: string
  }
}

export function useReportComments(plantName: string, materialNumber: string) {
  return useQuery({
    queryKey: ['report', plantName, materialNumber, 'comments'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].comments.$get({
        param: { plantName, materialNumber },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch report comments')
      }
      return res.json() as Promise<ReportComment[]>
    },
    enabled: !!plantName && !!materialNumber,
  })
}
