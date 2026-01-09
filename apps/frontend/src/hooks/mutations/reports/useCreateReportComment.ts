import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type CreateReportCommentInput = {
  plantName: string
  materialNumber: string
  content: string
}

export function useCreateReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plantName, materialNumber, content }: CreateReportCommentInput) => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].comments.$post({
        param: { plantName, materialNumber },
        json: { content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to create comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['report', variables.plantName, variables.materialNumber, 'comments'],
      })
    },
  })
}
