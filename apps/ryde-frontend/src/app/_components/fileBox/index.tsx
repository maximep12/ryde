import { type BannerReport } from "~/types"
import { FileDownload } from "../fileDownload"
import { useMemo, useState } from "react"
import { Button } from "../button"

const PAGE_LIMIT = 5

export function FileBox({
  provider,
  banner,
  data,
}: {
  provider: string
  banner: string
  data: Array<BannerReport>
}) {
  const [page, setPage] = useState(1)
  const offset = page * PAGE_LIMIT

  const brackets = {
    start: (page - 1) * PAGE_LIMIT + 1,
    end: page * PAGE_LIMIT,
  }

  const canGoBack = page > 1
  const canGoForward = data.length > page * PAGE_LIMIT

  const reports = useMemo(
    () => data.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT),
    [page],
  )

  function updatePage(action: string) {
    if (action === "up") {
      if (canGoForward) setPage(page + 1)
    } else {
      if (canGoBack) setPage(page - 1)
    }
  }

  return (
    <div className="my-4 rounded border-2 px-4 py-3">
      <div>
        <p className="text-xs text-slate-600">Banner</p>
        <p className="text-lg">{banner}</p>
      </div>

      <div className="space-y-2">
        {reports.map((report) => (
          <FileDownload
            key={report.name}
            banner={banner}
            provider={provider}
            report={report}
          />
        ))}
      </div>

      {!data.length ? <p>No files available.</p> : null}
      <div className="flex space-x-5">
        <Button
          onClick={() => updatePage("down")}
          disabled={!canGoBack}
          text="Previous"
        />
        <Button
          onClick={() => updatePage("up")}
          disabled={!canGoForward}
          text="Next"
        />
      </div>
      <p>
        Showing {brackets.start} - {brackets.end}
      </p>
    </div>
  )
}
