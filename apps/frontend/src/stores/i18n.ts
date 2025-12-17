import { Language } from '@repo/constants'
import { atomWithStorage } from 'jotai/utils'
import { store } from '.'

const LOCALE_STORAGE_KEY = 'locale'

export const localeAtom = atomWithStorage<Language>(LOCALE_STORAGE_KEY, 'en', undefined, {
  getOnInit: true,
})

export const getLocale = () => store.get(localeAtom)
export const setLocale = (locale: Language) => store.set(localeAtom, locale)
