export const LANGUAGES = ['en', 'fr'] as const

export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, { enLabel: string; frLabel: string }> = {
  en: {
    enLabel: 'English',
    frLabel: 'Anglais',
  },
  fr: {
    enLabel: 'French',
    frLabel: 'Français',
  },
}
