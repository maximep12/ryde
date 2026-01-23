import { getApi } from '@/stores/api'
import { useMutation } from '@tanstack/react-query'

interface DownloadInvalidResultsParams {
  uploadId: string
}

export function useDownloadInvalidResults() {
  return useMutation({
    mutationFn: async ({ uploadId }: DownloadInvalidResultsParams) => {
      const api = getApi()
      const res = await api.upload.details[':uploadId']['invalid-csv'].$get({
        param: { uploadId },
      })
      if (!res.ok) {
        throw new Error('Failed to download invalid results')
      }

      // Get the blob and trigger download
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'invalid-results.csv'

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })
}
