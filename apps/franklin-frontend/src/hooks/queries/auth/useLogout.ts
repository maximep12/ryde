import { getApi, updateApiClient } from '@/stores/api'
import { destroyRydeToken } from '@/stores/ryde-session'
import { destroySessionToken } from '@/stores/session'

const useLogout = () => {
  const logout = async () => {
    const api = getApi()
    await api.auth.session.destroy.$post()

    destroySessionToken()
    destroyRydeToken()
    updateApiClient(null)

    window.location.replace('/login')
  }

  return { logout }
}

export default useLogout
