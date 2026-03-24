import { updateApiClient } from '@/stores/api'
import { destroyMetabaseUrls, destroySessionToken } from '@/stores/session'

const useLogout = () => {
  const logout = async () => {
    destroySessionToken()
    destroyMetabaseUrls()
    updateApiClient(null)

    window.location.replace('/login')
  }

  return { logout }
}

export default useLogout
