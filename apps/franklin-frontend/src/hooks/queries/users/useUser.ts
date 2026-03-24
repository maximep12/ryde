import config from '@/config'
import { getSessionToken } from '@/stores/session'
import { useQuery } from '@tanstack/react-query'

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const token = getSessionToken()
      const res = await fetch(`${config.backendURL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
  })
}
