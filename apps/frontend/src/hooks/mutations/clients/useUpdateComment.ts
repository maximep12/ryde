import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type UpdateCommentInput = {
  clientId: number
  commentId: number
  content: string
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, commentId, content }: UpdateCommentInput) => {
      const api = getApi()
      const res = await api.example.clients[':id'].comments[':commentId'].$patch({
        param: { id: clientId.toString(), commentId: commentId.toString() },
        json: { content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to update comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId, 'comments'] })
    },
  })
}
