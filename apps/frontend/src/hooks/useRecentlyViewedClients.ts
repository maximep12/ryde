import { useCallback, useEffect, useState } from 'react'
import { useMe } from './queries/auth/useMe'

export interface RecentlyViewedClient {
  id: number
  storeName: string
  clientCode: string
  storeType: string
  status: string
  viewedAt: number
}

const MAX_RECENT_CLIENTS = 3
const STORAGE_KEY_PREFIX = 'recently-viewed-clients'

function getStorageKey(userId: string | number) {
  return `${STORAGE_KEY_PREFIX}-${userId}`
}

export function useRecentlyViewedClients() {
  const { data: user } = useMe()
  const [recentClients, setRecentClients] = useState<RecentlyViewedClient[]>([])

  // Load from local storage when user is available
  useEffect(() => {
    if (!user?.id) return

    try {
      const stored = localStorage.getItem(getStorageKey(user.id))
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedClient[]
        setRecentClients(parsed)
      }
    } catch {
      // Ignore parse errors
    }
  }, [user?.id])

  const addRecentClient = useCallback(
    (client: Omit<RecentlyViewedClient, 'viewedAt'>) => {
      if (!user?.id) return

      setRecentClients((prev) => {
        // Remove existing entry for this client if present
        const filtered = prev.filter((c) => c.id !== client.id)

        // Add to beginning with timestamp
        const updated = [{ ...client, viewedAt: Date.now() }, ...filtered].slice(
          0,
          MAX_RECENT_CLIENTS,
        )

        // Persist to local storage
        try {
          localStorage.setItem(getStorageKey(user.id), JSON.stringify(updated))
        } catch {
          // Ignore storage errors
        }

        return updated
      })
    },
    [user],
  )

  return {
    recentClients,
    addRecentClient,
  }
}
