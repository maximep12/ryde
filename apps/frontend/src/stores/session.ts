import { atomWithStorage } from 'jotai/utils'
import { store } from '.'

const SESSION_TOKEN_KEY = 'sessionToken'
const METABASE_URLS_KEY = 'metabaseUrls'

export type MetabaseUrls = {
  amazon: string
  commercial: string
  inventory: string
  reports: string
  sellout: string
}

export const sessionTokenAtom = atomWithStorage<string | null>(SESSION_TOKEN_KEY, null, undefined, {
  getOnInit: true,
})

export const metabaseUrlsAtom = atomWithStorage<MetabaseUrls | null>(
  METABASE_URLS_KEY,
  null,
  undefined,
  { getOnInit: true },
)

export const getSessionToken = () => store.get(sessionTokenAtom)
export const setSessionToken = (token: string) => store.set(sessionTokenAtom, token)
export const destroySessionToken = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY)
  store.set(sessionTokenAtom, null)
}

export const getMetabaseUrls = () => store.get(metabaseUrlsAtom)
export const setMetabaseUrls = (urls: MetabaseUrls | null) => store.set(metabaseUrlsAtom, urls)
export const destroyMetabaseUrls = () => {
  localStorage.removeItem(METABASE_URLS_KEY)
  store.set(metabaseUrlsAtom, null)
}
