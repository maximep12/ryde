import { getApi } from '@/stores/api'
import { UploadType } from '@repo/csv'
import { useMutation } from '@tanstack/react-query'

type UploadFileInput = {
  file: File
  uploadType: UploadType
  attributes?: Record<string, string>
}

type UploadFileResponse = {
  fileName: string
  fileKey: string
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      file,
      uploadType,
      attributes,
    }: UploadFileInput): Promise<UploadFileResponse> => {
      const api = getApi()

      // Step 1: Get presigned URL from backend
      const signedUrlRes = await api.upload['signed-url'].upload.$post({
        json: {
          uploadType,
          localFileName: file.name,
          attributes,
        },
      })

      if (!signedUrlRes.ok) {
        const errorData = (await signedUrlRes.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to get upload URL')
      }

      const { url, fileName, fileKey } = await signedUrlRes.json()

      // Step 2: Upload file directly to S3 using presigned URL
      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'text/csv',
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to S3')
      }

      return { fileName, fileKey }
    },
  })
}
