import { getApi } from '@/stores/api'
import { UPLOAD_REPORT_STATUS, UploadReportStatus } from '@repo/csv'
import { useQuery } from '@tanstack/react-query'

type UploadStatusSummary = {
  total: number
  valid: number
  invalid: number
}

type UploadStatusResponse = {
  metadata: {
    uuid: string
    type: string
    fileName: string
    fileKey: string
    localFileName: string | null
    uploadedBy: string
    uploadedAt: string
    error: string | null
  }
  status: UploadReportStatus
  summary: UploadStatusSummary | null
}

export function useUploadStatus(fileName: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['upload-status-summary', fileName],
    queryFn: async ({ signal }): Promise<UploadStatusResponse> => {
      if (!fileName) {
        throw new Error('fileName is required')
      }

      const api = getApi()
      // Use lightweight summary endpoint for polling
      const res = await api.upload.status.summary.$get(
        {
          query: { fileName },
        },
        {
          init: { signal },
        },
      )

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to get upload status')
      }

      return res.json() as Promise<UploadStatusResponse>
    },
    enabled: !!fileName && (options?.enabled ?? true),
    refetchInterval: (query) => {
      // Stop polling once completed or if there's an error
      const status = query.state.data?.status
      if (status === UPLOAD_REPORT_STATUS.COMPLETED) {
        return false
      }
      if (query.state.data?.metadata?.error) {
        return false
      }
      // Poll every 2 seconds while processing
      return 2000
    },
  })
}
