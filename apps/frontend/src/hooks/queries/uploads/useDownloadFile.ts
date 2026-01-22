import { getApi } from '@/stores/api'
import { UploadType } from '@repo/csv'
import { useMutation } from '@tanstack/react-query'

interface DownloadFileParams {
  fileName: string
  uploadType: UploadType
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async ({ fileName, uploadType }: DownloadFileParams) => {
      const api = getApi()
      const res = await api.upload['signed-url'].download.$post({
        json: {
          fileName,
          uploadType,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to get download URL')
      }
      const data = await res.json()
      return data.url
    },
    onSuccess: (url) => {
      // Open the signed URL in a new tab to trigger download
      window.open(url, '_blank')
    },
  })
}
