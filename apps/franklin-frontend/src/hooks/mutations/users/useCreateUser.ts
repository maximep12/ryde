import config from '@/config'
import { getSessionToken } from '@/stores/session'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export type UserRole = 'admin' | 'data_manager' | 'trade_rep'
export type UserStatus = 'active' | 'inactive' | 'pending'

type CreateUserInput = {
  email: string
  password?: string
  givenName?: string
  familyName?: string
  role?: UserRole
  status?: UserStatus
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const token = getSessionToken()
      const res = await fetch(`${config.backendURL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
