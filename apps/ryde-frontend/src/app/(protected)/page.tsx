"use client"

import { useRouter } from "next/navigation"
import { useContext, useEffect } from "react"
import { AuthContext } from "~/app/context"
import { BRAND_ROLES, TWSC_ROLES } from "~/constants"

export default function DefaultPage() {
  const router = useRouter()
  const { userRole, roleIsLoaded } = useContext(AuthContext)

  useEffect(() => {
    if (roleIsLoaded && userRole) {
      if (TWSC_ROLES.includes(userRole)) {
        router.replace("/commercial")
      }
      if (BRAND_ROLES.includes(userRole)) {
        router.replace("/fileUpload")
      }

}
  }, [roleIsLoaded])

  return <></>
}
