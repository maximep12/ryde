import { getApi } from '@/stores/api'
import { destroyRydeToken } from '@/stores/ryde-session'
import { destroySessionToken, getSessionToken } from '@/stores/session'
import { MILLIS } from '@repo/constants'
import { useQuery } from '@tanstack/react-query'

const redirectToLogin = () => window.location.replace(`/login?redirect=${window.location.pathname}`)

export async function handleInvalidSession() {
  destroySessionToken()
  destroyRydeToken()
  redirectToLogin()
}

export async function verifySession() {
  const sessionToken = getSessionToken()
  if (!sessionToken) {
    redirectToLogin()
    return
  }

  try {
    const api = getApi()
    const res = await api.auth.session.verify.$post({ json: { sessionToken } })
    if (res.status !== 204) {
      handleInvalidSession()
      return res
    }

    return { sessionToken }
  } catch (error) {
    console.error(error)

    handleInvalidSession()
    throw error
  }
}

export function useVerifySession() {
  return useQuery({
    queryKey: ['verifiedSession'],
    queryFn: async () => await verifySession(),
    staleTime: MILLIS.SECOND * 25,
    refetchInterval: MILLIS.SECOND * 25,
  })
}
