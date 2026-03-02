import { Button } from "../button"
import { downloadBannerReport } from "~/lib/api"
import { type BannerReport } from "~/types"
import { snakeCase } from "lodash"
import { useState } from "react"
import { SuccessBox } from "../successBox"
import { AxiosError } from "axios"

export function FileDownload({
  report,
  banner,
  provider,
}: {
  report: BannerReport
  banner: string
  provider: string
}) {
  const [error, setError] = useState<string | null>()

  async function onDownloadClick({ fileName }: { fileName: string }) {
    try {
      await downloadBannerReport({
        banner: snakeCase(banner),
        provider,
        fileName,
      })
    } catch (error) {
      const defaultError = error as { message: string }
      let errorMessage = defaultError.message
      if (error instanceof AxiosError) {
        const dataMessage = error?.response?.data as { message: string }
        if (dataMessage) errorMessage = dataMessage.message
      }

      setError(errorMessage)
    }
  }

  return (
    <div className="rounded-sm p-4 hover:bg-slate-100">
      <div className="flex justify-between gap-4 max-sm:flex-col sm:items-center">
        <div>
          <p className="mb-2 break-words font-semibold">{report.name}</p>
          <p className="text-sm">
            <span className="text-slate-600">Uploaded by:</span> {report.by}
          </p>

          <p className="text-sm">
            <span className="text-slate-600">Uploaded on: </span>
            {new Date(report.date).toLocaleDateString()} -
            {new Date(report.date).toLocaleTimeString()}
          </p>
        </div>

        <div className="w-min">
          <Button
            onClick={async () =>
              await onDownloadClick({ fileName: report.name })
            }
            text="Download"
          />
        </div>
      </div>
      {error ? (
        <SuccessBox bgColor="red">
          <p>{error}</p>
        </SuccessBox>
      ) : null}
    </div>
  )
}
