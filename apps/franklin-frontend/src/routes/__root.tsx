import { RouterContext } from '@/main'
import { getLocale } from '@/stores/i18n'
import { NotFoundPage } from './_auth/not-found'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from '../i18n'

const shouldEnableDevTools = import.meta.env.DEV

i18n.use(initReactI18next).init({
  lng: getLocale(),
  resources,
  fallbackLng: 'en',
  debug: !!import.meta.env.DEV,
  interpolation: {
    escapeValue: false,
  },
  saveMissing: true,
})

export const Route = createRootRouteWithContext<RouterContext>()({
  notFoundComponent: NotFoundPage,
  component: () => {
    return (
      <>
        <Outlet />

        {shouldEnableDevTools && (
          <>
            <TanStackRouterDevtools />
            <ReactQueryDevtools />
          </>
        )}
      </>
    )
  },
})
