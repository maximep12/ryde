import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type CreateCommentInput = {
  clientId: number
  content: string
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, content }: CreateCommentInput) => {
      const api = getApi()
      const res = await api.example.clients[':id'].comments.$post({
        param: { id: clientId.toString() },
        json: { content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to create comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId, 'comments'] })
    },
  })
}
