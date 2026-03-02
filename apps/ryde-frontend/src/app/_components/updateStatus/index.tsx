"use client"

import { usePathname } from "next/navigation"
import { useContext } from "react"
import { AuthContext } from "~/app/context"
import { UpdateDatesByRoute } from "./helpers"
import { ROLES, TWSC_ROLES } from "~/constants"

export function UpdateStatus() {
  const { userRole } = useContext(AuthContext)

  const isAdmin = userRole === ROLES.ADMIN

  const pathname = usePathname()
  const { updateDates } = useContext(AuthContext)

  if (!userRole || (userRole && !TWSC_ROLES.includes(userRole))) {
    return null
  }

  return (
    <div className="px-10 pt-5">
      <p className="text-xl font-medium">Updates {isAdmin}</p>
      <UpdateDatesByRoute route={pathname} updateDates={updateDates} />
    </div>
  )
}
