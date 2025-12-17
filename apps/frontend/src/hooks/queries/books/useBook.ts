import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useBook(id: number) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.books[':id'].$get({
        param: { id: id.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch book')
      }
      return res.json()
    },
    enabled: !!id,
  })
}
