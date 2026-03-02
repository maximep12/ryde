"use client"

import { MetabaseEmbed } from "~/app/_components/metabaseDashboard"
import { useContext, useEffect, useState } from "react"
import { ClipLoader } from "react-spinners"
import { AuthContext } from "~/app/context"

export default function CommercialPage() {
  const { metabaseUrls, roleIsLoaded } = useContext(AuthContext)
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    if (metabaseUrls?.commercial) setUrl(metabaseUrls.commercial)
  }, [roleIsLoaded])

  if (!url) return <ClipLoader />

  return <MetabaseEmbed url={url} />
}
