import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

interface UseMyUploadsParams {
  types?: string[]
  search?: string
  sort?: string
  page?: number
  pageSize?: number
  validationStatus?: 'valid' | 'invalid'
}

export function useMyUploads(params: UseMyUploadsParams = {}) {
  const { types, search, sort, page = 1, pageSize = 20, validationStatus } = params

  const typesKey = types?.length ? types.join(',') : ''
  const searchKey = search || ''
  const sortKey = sort || 'createdAt.desc'

  return useQuery({
    queryKey: ['my-uploads', typesKey, searchKey, sortKey, page, pageSize, validationStatus],
    queryFn: async () => {
      const api = getApi()
      const res = await api.upload['my-uploads'].$get({
        query: {
          type: types?.length ? JSON.stringify(types) : undefined,
          sort: sortKey,
          page: page.toString(),
          pageSize: pageSize.toString(),
          validationStatus,
          search: search || undefined,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch uploads')
      }
      return res.json()
    },
    retry: false,
    staleTime: 5000, // 5 seconds - uploads list changes frequently
    refetchOnWindowFocus: true,
  })
}
