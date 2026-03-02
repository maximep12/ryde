"use client"

import { useContext, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Header } from "~/app/_components/header"
import { UpdateStatus } from "~/app/_components/updateStatus"
import { AuthContext } from "~/app/context"
import { ROLES } from "~/constants"

const ROUTE_PERMISSIONS: Array<{ routes: string[]; allowedRoles: string[] }> =
  [
    {
      routes: [
        "/commercial",
        "/trade",
        "/sellout",
        "/inventory",
        "/reports",
        "/amazon",
      ],
      allowedRoles: [ROLES.ADMIN, ROLES.TRADE, ROLES.DATA_MANAGER],
    },
    {
      routes: ["/fileUpload"],
      allowedRoles: [ROLES.ADMIN, ROLES.DATA_MANAGER],
    },
    {
      routes: ["/settings"],
      allowedRoles: [ROLES.ADMIN],
    },
  ]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, roleIsLoaded } = useContext(AuthContext)

  useEffect(() => {
    if (!roleIsLoaded) return

    if (!userRole || userRole === ROLES.UNAUTHORIZED) {
      router.replace("/login")
      return
    }

    const rule = ROUTE_PERMISSIONS.find(({ routes }) =>
      routes.some((route) => pathname.startsWith(route)),
    )

    if (rule && !rule.allowedRoles.includes(userRole)) {
      router.replace("/commercial")
    }
  }, [roleIsLoaded, userRole, pathname, router])

  if (!roleIsLoaded) return null
  if (!userRole || userRole === ROLES.UNAUTHORIZED) return null

  return (
    <>
      <Header />
      <UpdateStatus />
      <div className="my-8 w-full px-10">{children}</div>
    </>
  )
}
