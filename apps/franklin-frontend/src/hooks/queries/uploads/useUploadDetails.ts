import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type UploadResult = {
  id: string
  rowIndex: number
  data: Record<string, unknown> | null
  validationDetails: Record<string, unknown> | null
  isValid: boolean
  isProcessed: boolean
}

export type UploadDetailsSummary = {
  total: number
  valid: number
  invalid: number
  isProcessed: boolean
}

export type UploadDetailsMetadata = {
  uuid: string
  type: string
  fileName: string
  fileKey: string
  localFileName: string | null
  attributes: Record<string, string> | null
  error: string | null
  createdAt: string
  uploadedBy: string
  user: {
    givenName: string | null
    familyName: string | null
  } | null
}

export type UploadDetailsResponse = {
  upload: UploadDetailsMetadata
  summary: UploadDetailsSummary | null
  results: UploadResult[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

type UseUploadDetailsParams = {
  uploadId: string
  page?: number
  pageSize?: number
  filter?: 'all' | 'valid' | 'invalid'
}

export function useUploadDetails({
  uploadId,
  page = 1,
  pageSize = 20,
  filter,
}: UseUploadDetailsParams) {
  return useQuery({
    queryKey: ['upload-details', uploadId, page, pageSize, filter],
    queryFn: async ({ signal }): Promise<UploadDetailsResponse> => {
      const api = getApi()
      const res = await api.upload.details[':uploadId'].$get(
        {
          param: { uploadId },
          query: {
            page: page.toString(),
            pageSize: pageSize.toString(),
            filter,
          },
        },
        {
          init: { signal },
        },
      )

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to fetch upload details')
      }

      return res.json() as Promise<UploadDetailsResponse>
    },
    enabled: !!uploadId,
    retry: false,
  })
}
