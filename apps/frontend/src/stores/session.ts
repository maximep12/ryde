import { atomWithStorage } from 'jotai/utils'
import { store } from '.'

const SESSION_TOKEN_KEY = 'sessionToken'

export const sessionTokenAtom = atomWithStorage<string | null>(SESSION_TOKEN_KEY, null, undefined, {
  getOnInit: true,
})

export const getSessionToken = () => store.get(sessionTokenAtom)
export const setSessionToken = (token: string) => store.set(sessionTokenAtom, token)
export const destroySessionToken = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY)
  store.set(sessionTokenAtom, null)
}
