import { atomWithStorage } from 'jotai/utils'
import { store } from '.'
import { Theme } from '../components/ThemeProvider'

const THEME_STORAGE_KEY = 'ui-theme'

export const themeAtom = atomWithStorage<Theme>(THEME_STORAGE_KEY, 'system', undefined, {
  getOnInit: true,
})

export const getTheme = () => store.get(themeAtom)
export const setTheme = (theme: Theme) => store.set(themeAtom, theme)
