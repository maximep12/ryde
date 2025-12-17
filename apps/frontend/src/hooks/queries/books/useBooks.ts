import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

type UseBooksParams = {
  page?: number
  pageSize?: number
  search?: string
  genre?: string
  author?: string
}

export function useBooks(params: UseBooksParams = {}) {
  const { page = 1, pageSize = 10, search, genre, author } = params

  return useQuery({
    queryKey: ['books', { page, pageSize, search, genre, author }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.books.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(genre && { genre }),
          ...(author && { author }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch books')
      }
      return res.json()
    },
  })
}
