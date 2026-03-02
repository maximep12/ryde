/* eslint-disable @typescript-eslint/no-empty-function */
"use client"

import {
  type ReactNode,
  createContext,
  useState,
  useEffect,
  type SetStateAction,
  type Dispatch,
} from "react"
import { ROLES } from "~/constants"
import { getMe } from "~/lib/api"
import { getJwtFromCookie, decodeJwtPayload } from "~/lib/auth"
import { type MetabaseUrls, type UpdateDates } from "~/types"

type AuthContextType = {
  updateDates: UpdateDates | null
  setUpdateDates: Dispatch<SetStateAction<UpdateDates | null>>
  userRole: string | null
  setUserRole: Dispatch<SetStateAction<string | null>>
  userId: string | null
  metabaseUrls: MetabaseUrls | null
  setMetabaseUrls: Dispatch<SetStateAction<MetabaseUrls | null>>
  roleIsLoaded: boolean
}

export const AuthContext = createContext<AuthContextType>({
  updateDates: null,
  setUpdateDates: () => null,
  userRole: null,
  setUserRole: () => null,
  userId: null,
  metabaseUrls: null,
  setMetabaseUrls: () => null,
  roleIsLoaded: false,
})

export function AppContext({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [updateDates, setUpdateDates] = useState<UpdateDates | null>(null)
  const [metabaseUrls, setMetabaseUrls] = useState<MetabaseUrls | null>(null)
  const [roleIsLoaded, setRoleIsLoaded] = useState(false)

  useEffect(() => {
    const jwt = getJwtFromCookie()
    if (jwt) {
      getMe()
        .then(({ user, dates, metabaseDashboardUrls }) => {
          setUserRole(user.role.role)
          setUserId(user.id)
          setUpdateDates(dates)
          setMetabaseUrls(metabaseDashboardUrls)
        })
        .catch(() => {
          const payload = decodeJwtPayload(jwt)
          setUserRole(payload?.role ?? ROLES.UNAUTHORIZED)
        })
        .finally(() => setRoleIsLoaded(true))
    } else {
      setUserRole(ROLES.UNAUTHORIZED)
      setRoleIsLoaded(true)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        updateDates,
        setUpdateDates,
        userRole,
        setUserRole,
        userId,
        metabaseUrls: metabaseUrls,
        setMetabaseUrls: setMetabaseUrls,
        roleIsLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
