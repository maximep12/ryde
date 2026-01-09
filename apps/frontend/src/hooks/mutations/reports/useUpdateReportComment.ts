import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type UpdateReportCommentInput = {
  plantName: string
  materialNumber: string
  commentId: number
  content: string
}

export function useUpdateReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      plantName,
      materialNumber,
      commentId,
      content,
    }: UpdateReportCommentInput) => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].comments[':commentId'].$patch({
        param: { plantName, materialNumber, commentId: commentId.toString() },
        json: { content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to update comment')
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
