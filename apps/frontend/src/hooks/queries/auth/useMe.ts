import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.users.me.$post()
      if (!res.ok) {
        throw new Error('Failed to fetch user')
      }
      return res.json()
    },
  })
}
