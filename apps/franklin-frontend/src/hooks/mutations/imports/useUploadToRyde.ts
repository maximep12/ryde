import config from '@/config'
import { getRydeToken } from '@/stores/ryde-session'
import { useMutation } from '@tanstack/react-query'

type UploadToRydeInput = {
  file: File
  endpoint: string
}

export type UploadResult = {
  result: {
    created: number
    updated: number
    unit: string
    status: string
    rejected?: string[]
  }
  rows: {
    received: number
    rejected: number
    created: number
    updated: number
    deleted: number
    identical: number
  }
  warnings?: string[]
}

export function useUploadToRyde() {
  return useMutation({
    mutationFn: async ({ file, endpoint }: UploadToRydeInput): Promise<UploadResult> => {
      const token = getRydeToken()
      const res = await fetch(`${config.rydeBackendURL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Disposition': `filename=${file.name}`,
        },
        body: file,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message ?? `Upload failed (${res.status})`)
      }

      return res.json()
    },
  })
}
