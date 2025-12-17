import config from '@/config'
import { getApi, updateApiClient } from '@/stores/api'
import { destroySessionToken } from '@/stores/session'
import { FileRoutesByPath } from '@tanstack/react-router'

const useLogout = () => {
  const logout = async () => {
    const api = getApi()
    await api.auth.session.destroy.$post()

    destroySessionToken()
    updateApiClient(null)

    const { logoutUrl, logoutRedirectQuery } = config

    const origin = window.location.origin
    const pathname: keyof FileRoutesByPath = '/login'
    const redirectUrl = encodeURIComponent(`${origin}${pathname}`)

    window.location.replace(`${logoutUrl}?${logoutRedirectQuery}=${redirectUrl}`)
  }

  return { logout }
}

export default useLogout
