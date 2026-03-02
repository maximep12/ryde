import config from '@/config'
import { fetchWithThrow } from '@/lib/queries'
import { AUTHORIZATION_HEADER_PREFIX } from '@repo/constants'
import { AppType } from '@repo/franklin-backend/app'
import { hc } from 'hono/client'
import { atom } from 'jotai'
import { store } from '.'
import { sessionTokenAtom } from './session'

export const createHonoClient = (sessionToken: string | null) => {
  if (sessionToken) {
    return hc<AppType>(config.backendURL, {
      headers: {
        Authorization: `${AUTHORIZATION_HEADER_PREFIX}${sessionToken}`,
      },
      fetch: fetchWithThrow,
    })
  }

  return hc<AppType>(config.backendURL)
}

export type HonoClient = ReturnType<typeof createHonoClient>

export const apiAtom = atom<{ api: HonoClient }>({
  api: createHonoClient(store.get(sessionTokenAtom)),
})

export const updateApiClient = (sessionToken: string | null) => {
  const api = createHonoClient(sessionToken)
  store.set(apiAtom, { api })
}

export const getApi = () => store.get(apiAtom).api
