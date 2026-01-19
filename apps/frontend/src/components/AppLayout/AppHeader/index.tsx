import type { Theme } from '@/components/ThemeProvider'
import { useTheme } from '@/components/ThemeProvider/hooks'
import useLogout from '@/hooks/queries/auth/useLogout'
import { useMe } from '@/hooks/queries/auth/useMe'
import { setLocale } from '@/stores/i18n'
import { Language } from '@repo/constants'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  SidebarTrigger,
} from '@repo/ui/components'
import {
  GlobeIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const

const THEMES = [
  { value: 'light', icon: SunIcon, labelKey: 'theme.light' },
  { value: 'dark', icon: MoonIcon, labelKey: 'theme.dark' },
  { value: 'system', icon: MonitorIcon, labelKey: 'theme.system' },
] as const

export function AppHeader() {
  const { t, i18n } = useTranslation('ui')
  const { theme, setTheme } = useTheme()
  const { data: user } = useMe()
  const { logout } = useLogout()

  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) ?? LANGUAGES[0]
  const currentTheme = THEMES.find((th) => th.value === theme) ?? THEMES[0]
  const CurrentThemeIcon = currentTheme.icon

  const displayName = user
    ? `${user.givenName ?? ''} ${user.familyName ?? ''}`.trim() || user.email
    : ''

  const handleLanguageChange = (code: Language) => {
    i18n.changeLanguage(code)
    setLocale(code)
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('themeSelector.toggle')}>
              <CurrentThemeIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {THEMES.map((th) => {
              const isSelected = theme === th.value
              return (
                <DropdownMenuItem
                  key={th.value}
                  onClick={() => setTheme(th.value as Theme)}
                  className={
                    isSelected
                      ? 'bg-primary/10 text-primary hover:bg-accent hover:text-accent-foreground'
                      : ''
                  }
                >
                  <th.icon
                    className={`size-4 ${isSelected ? 'text-primary group-hover:text-accent-foreground' : ''}`}
                  />
                  <span>{t(th.labelKey)}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={t('languageSelector.toggle')}>
              <GlobeIcon className="size-4" />
              <span className="ml-1">{currentLanguage.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as Language)}
                className={
                  i18n.language === lang.code
                    ? 'bg-primary/10 text-primary hover:bg-accent hover:text-accent-foreground'
                    : ''
                }
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <UserIcon className="size-4" />
              <span className="ml-1">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} variant="destructive">
              <LogOutIcon className="size-4" />
              <span>{t('auth.logOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
