import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useSessionRevalidateOnFocus() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['verifiedSession'] })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [queryClient])
}
