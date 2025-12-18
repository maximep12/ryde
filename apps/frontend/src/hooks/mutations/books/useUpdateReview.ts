import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type UpdateReviewInput = {
  bookId: number
  reviewId: number
  rating?: number
  title?: string
  content?: string
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, reviewId, rating, title, content }: UpdateReviewInput) => {
      const api = getApi()
      const res = await api.example.books[':id'].reviews[':reviewId'].$patch({
        param: { id: bookId.toString(), reviewId: reviewId.toString() },
        json: { rating, title, content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to update review')
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
