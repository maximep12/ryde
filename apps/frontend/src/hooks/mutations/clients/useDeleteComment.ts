import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type DeleteCommentInput = {
  clientId: number
  commentId: number
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, commentId }: DeleteCommentInput) => {
      const api = getApi()
      const res = await api.clients[':id'].comments[':commentId'].$delete({
        param: { id: clientId.toString(), commentId: commentId.toString() },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to delete comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId, 'comments'] })
    },
  })
}
