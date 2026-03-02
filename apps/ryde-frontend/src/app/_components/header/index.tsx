"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useContext, useEffect, useState } from "react"
import { AuthContext } from "~/app/context"
import {
  ADMIN_TABS,
  DATA_MANAGER_TABS,
  ROLES,
  TRADE_TABS,
  TWSC_ROLES,
} from "~/constants"
import rydeLogo from "~/images/ryde-logo.png"
import { clearJwtCookie } from "~/lib/auth"
import { cn } from "~/lib/utils"

type tabProps = {
  active: boolean
  name: string
  destination: string
}
function Tab({ active, name, destination }: tabProps) {
  return (
    <Link
      href={`/${destination}`}
      className={cn(
        "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active && "bg-white text-slate-800",
      )}
    >
      {name}
    </Link>
  )
}

export function Header() {
  const pathName = usePathname()
  const router = useRouter()
  const { userRole, setUserRole } = useContext(AuthContext)
  const [pillText, setPillText] = useState<string | null>(null)
  const [tabs, setTabs] = useState<Array<{ name: string; route: string }>>([])

  useEffect(() => {
    if (userRole) {
      setPillText(userRole.toUpperCase())

      setTabs(
        userRole === ROLES.ADMIN
          ? Object.values(ADMIN_TABS)
          : userRole === ROLES.DATA_MANAGER
            ? Object.values(DATA_MANAGER_TABS)
            : userRole === ROLES.TRADE
              ? Object.values(TRADE_TABS)
              : [],
      )
    }
  }, [userRole])

  const logoDestination =
    userRole && TWSC_ROLES.includes(userRole) ? "/commercial" : "/unauthorized"

  return (
    <div className="sticky top-0 z-50 flex w-full items-center justify-between space-x-4 bg-slate-800 px-10 py-8 text-white">
      <div className="flex shrink-0 items-center gap-6">
        <Link href={logoDestination}>
          <Image src={rydeLogo} alt="Ryde Logo" className="h-10 w-auto" />
        </Link>
        {pillText && (
          <div className="flex h-8 items-center justify-center rounded-full bg-green-800 px-3 text-xs">
            {pillText}
          </div>
        )}
      </div>
      <div className="ml-10 flex items-center gap-2">
        {tabs.map((t, index) => (
          <Tab
            active={pathName.includes(t.route)}
            key={index}
            destination={t.route}
            name={t.name}
          />
        ))}
        <button
          onClick={() => {
            clearJwtCookie()
            sessionStorage.clear()
            setUserRole(null)
            router.push("/login")
          }}
          className="ml-4 rounded-md px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
