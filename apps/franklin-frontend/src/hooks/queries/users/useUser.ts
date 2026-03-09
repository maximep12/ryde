import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.users[':userId'].$get({ param: { userId } })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
  })
}
