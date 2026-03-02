import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type ProductsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type Product = {
  id: number
  name: string | null
  description: string | null
  isWsc: boolean | null
  createdAt: string
  updatedAt: string
}

export type ProductsResponse = {
  items: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useProducts(params: ProductsQueryParams = {}) {
  const { page = 1, pageSize = 25, search, sortBy, sortOrder } = params

  return useQuery({
    queryKey: ['products', { page, pageSize, search, sortBy, sortOrder }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.products.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch products')
      }
      return res.json() as Promise<ProductsResponse>
    },
  })
}
