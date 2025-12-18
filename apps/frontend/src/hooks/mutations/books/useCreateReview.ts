import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type CreateReviewInput = {
  bookId: number
  rating: number
  title?: string
  content?: string
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, rating, title, content }: CreateReviewInput) => {
      const api = getApi()
      const res = await api.example.books[':id'].reviews.$post({
        param: { id: bookId.toString() },
        json: { rating, title, content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to create review')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['book', variables.bookId, 'reviews'] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.bookId] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}
