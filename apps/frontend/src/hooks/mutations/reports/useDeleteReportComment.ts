import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type DeleteReportCommentInput = {
  plantName: string
  materialNumber: string
  commentId: number
}

export function useDeleteReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plantName, materialNumber, commentId }: DeleteReportCommentInput) => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].comments[':commentId'].$delete(
        {
          param: { plantName, materialNumber, commentId: commentId.toString() },
        },
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to delete comment')
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
