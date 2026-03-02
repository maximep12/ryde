"use client"

import { MetabaseEmbed } from "~/app/_components/metabaseDashboard"
import { useContext, useEffect, useState } from "react"
import { AuthContext } from "~/app/context"
import { ClipLoader } from "react-spinners"
import { ROLES } from "~/constants"
import { LatestReports } from "~/app/_components/latestReports"

export default function ReportsPage() {
  const { metabaseUrls, roleIsLoaded, userRole } = useContext(AuthContext)
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    if (metabaseUrls?.reports) setUrl(metabaseUrls.reports)
  }, [roleIsLoaded])

  if (!url) return <ClipLoader />

  return (
    <>
      <div className="my-2 border-2 p-2">
        <p className="text-xl font-medium">
          Follow these steps to download a report:
        </p>
        <ol className="list-inside list-decimal">
          <li>Apply the filters you need for your report.</li>
          <li>At the top right of each table, you have access to: ...</li>
          <li>Click on Download results.</li>
          <li>Select the file format you need.</li>
          <li>
            Wait for your file to download (larger amount of rows will take
            longer to download).
          </li>
        </ol>
      </div>

      <MetabaseEmbed url={url} />

      {userRole && userRole === ROLES.ADMIN ? <LatestReports /> : null}
    </>
  )
}
