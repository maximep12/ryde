import { atomWithStorage } from 'jotai/utils'
import { store } from '.'

const RYDE_TOKEN_KEY = 'rydeToken'

export const rydeTokenAtom = atomWithStorage<string | null>(RYDE_TOKEN_KEY, null, undefined, {
  getOnInit: true,
})

export const getRydeToken = () => store.get(rydeTokenAtom)
export const setRydeToken = (token: string) => store.set(rydeTokenAtom, token)
export const destroyRydeToken = () => {
  localStorage.removeItem(RYDE_TOKEN_KEY)
  store.set(rydeTokenAtom, null)
}
