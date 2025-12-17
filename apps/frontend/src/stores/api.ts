import config from '@/config'
import { AppType } from '@repo/backend/app'
import { AUTHORIZATION_HEADER_PREFIX } from '@repo/constants'
import { hc } from 'hono/client'
import { atom } from 'jotai'
import { store } from '.'
import { sessionTokenAtom } from './session'

const fetchWithThrow = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const res = await fetch(input, { ...init, credentials: 'include' })
  if (!res.ok) {
    const contentType = res.headers.get('Content-Type')

    if (contentType && contentType.includes('application/json')) {
      const json = await res.json()
      throw json
    }

    throw res
  }

  return res
}

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
