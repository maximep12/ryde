import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type DeleteReviewInput = {
  bookId: number
  reviewId: number
}

export function useDeleteReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, reviewId }: DeleteReviewInput) => {
      const api = getApi()
      const res = await api.example.books[':id'].reviews[':reviewId'].$delete({
        param: { id: bookId.toString(), reviewId: reviewId.toString() },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to delete review')
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
