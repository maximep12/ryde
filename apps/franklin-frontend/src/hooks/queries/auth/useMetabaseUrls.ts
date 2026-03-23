import config from '@/config'
import { getRydeToken, MetabaseUrls, setMetabaseUrls } from '@/stores/ryde-session'
import { useQuery } from '@tanstack/react-query'

async function fetchMetabaseUrls(): Promise<MetabaseUrls | null> {
  const token = getRydeToken()
  if (!token) return null

  const res = await fetch(`${config.rydeBackendURL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

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
    enabled: !!getRydeToken(),
    staleTime: 1000 * 60 * 30, // refresh every 30 min (URLs expire after 8h)
    retry: false,
  })
}
