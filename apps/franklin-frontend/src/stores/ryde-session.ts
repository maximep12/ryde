import { atomWithStorage } from 'jotai/utils'
import { store } from '.'

const RYDE_TOKEN_KEY = 'rydeToken'
const METABASE_URLS_KEY = 'metabaseUrls'

export type MetabaseUrls = {
  amazon: string
  commercial: string
  inventory: string
  reports: string
  sellout: string
}

export const rydeTokenAtom = atomWithStorage<string | null>(RYDE_TOKEN_KEY, null, undefined, {
  getOnInit: true,
})

export const metabaseUrlsAtom = atomWithStorage<MetabaseUrls | null>(
  METABASE_URLS_KEY,
  null,
  undefined,
  { getOnInit: true },
)

export const getRydeToken = () => store.get(rydeTokenAtom)
export const setRydeToken = (token: string) => store.set(rydeTokenAtom, token)
export const destroyRydeToken = () => {
  localStorage.removeItem(RYDE_TOKEN_KEY)
  store.set(rydeTokenAtom, null)
}

export const getMetabaseUrls = () => store.get(metabaseUrlsAtom)
export const setMetabaseUrls = (urls: MetabaseUrls | null) => store.set(metabaseUrlsAtom, urls)
export const destroyMetabaseUrls = () => {
  localStorage.removeItem(METABASE_URLS_KEY)
  store.set(metabaseUrlsAtom, null)
}
