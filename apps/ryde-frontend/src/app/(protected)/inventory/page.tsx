"use client"
import { MetabaseEmbed } from "~/app/_components/metabaseDashboard"
import { useContext, useEffect, useState } from "react"
import { AuthContext } from "~/app/context"
import { ClipLoader } from "react-spinners"

export default function InventoryPage() {
  const { metabaseUrls, roleIsLoaded } = useContext(AuthContext)
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    if (metabaseUrls?.inventory) setUrl(metabaseUrls.inventory)
  }, [roleIsLoaded])

  if (!url) return <ClipLoader />

  return <MetabaseEmbed url={url} />
}
