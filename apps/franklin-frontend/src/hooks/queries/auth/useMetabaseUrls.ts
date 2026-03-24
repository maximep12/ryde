import { getApi } from '@/stores/api'
import { type MetabaseUrls, getSessionToken, setMetabaseUrls } from '@/stores/session'
import { useQuery } from '@tanstack/react-query'

async function fetchMetabaseUrls(): Promise<MetabaseUrls | null> {
  const token = getSessionToken()
  if (!token) return null

  const api = getApi()
  const res = await api.auth.me.$get()

  if (!res.ok) return null

  const data = await res.json()
  const urls = data.metabaseDashboardUrls as MetabaseUrls | null
  if (urls && Object.keys(urls).length > 0) {
    setMetabaseUrls(urls)
    return urls
  }
  return null
}

export function useMetabaseUrls() {
  return useQuery({
    queryKey: ['metabaseUrls'],
    queryFn: fetchMetabaseUrls,
    enabled: !!getSessionToken(),
    staleTime: 1000 * 60 * 30, // refresh every 30 min (URLs expire after 8h)
    retry: false,
  })
}
