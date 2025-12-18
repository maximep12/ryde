import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useBookReviews(bookId: number) {
  return useQuery({
    queryKey: ['book', bookId, 'reviews'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.books[':id'].reviews.$get({
        param: { id: bookId.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch reviews')
      }
      return res.json()
    },
    enabled: !!bookId,
  })
}
