import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole, UserStatus } from './useCreateUser'

type UpdateUserInput = {
  userId: string
  givenName?: string
  familyName?: string
  role?: UserRole
  status?: UserStatus
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, ...body }: UpdateUserInput) => {
      const api = getApi()
      const res = await api.example.users[':userId'].$patch({ param: { userId }, json: body })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
    },
  })
}
