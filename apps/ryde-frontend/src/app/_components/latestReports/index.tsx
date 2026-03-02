import { AxiosError } from "axios"
import { useEffect, useState } from "react"
import { ClipLoader } from "react-spinners"
import { Button } from "../button"
import { downloadPeriodTargetReport, listLatestBannerReports } from "~/lib/api"
import { type BannerReportsList } from "~/types"
import { BANNERS } from "~/constants"
import { FileBox } from "../fileBox"

export function LatestReports() {
  const [isLoading, setIsLoading] = useState(true)
  const [latestUpdate, setLatestUpdate] = useState(new Date())
  const [result, setResult] = useState<BannerReportsList | null>()
  const [error, setError] = useState<string | null>()

  async function getPeriodTarget() {
    setIsLoading(true)
    try {
      await downloadPeriodTargetReport()
    } catch (error) {
      const defaultError = error as { message: string }
      let errorMessage = defaultError.message
      if (error instanceof AxiosError) {
        const dataMessage = error?.response?.data as { message: string }
        if (dataMessage) errorMessage = dataMessage.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  async function listLatestReports() {
    setIsLoading(true)
    setResult(null)
    try {
      const reports = await listLatestBannerReports()
      setResult(reports)
    } catch (error) {
      const defaultError = error as { message: string }
      let errorMessage = defaultError.message
      if (error instanceof AxiosError) {
        const dataMessage = error?.response?.data as { message: string }
        if (dataMessage) errorMessage = dataMessage.message
      }

      setError(errorMessage)
    } finally {
      setLatestUpdate(new Date())
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    listLatestReports()
  }, [])

  return (
    <div className="my-8 w-full">
      <div className="mb-8 flex w-full flex-wrap items-center justify-between gap-4">
        <p className="text-xl font-medium">Download period targets</p>
        <Button text="Download" onClick={getPeriodTarget} />
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <p className="text-xl font-medium">Banners reports</p>

        <div className="flex items-center">
          <div className="mr-4 flex flex-col justify-end">
            <span className="text-sm text-slate-600">Updated on:</span>
            {latestUpdate.toISOString()}
          </div>

          <Button text="Refresh" onClick={listLatestReports} />
        </div>
      </div>

      {isLoading ? (
        <ClipLoader />
      ) : (
        <div>
          {result ? (
            <div>
              <div className="mt-8">
                <p className="text-l font-bold uppercase">SFTP import</p>
                <FileBox
                  banner={BANNERS.RABBA}
                  provider="SFTP"
                  data={result.sftp.rabba}
                />
              </div>

              <div className="mt-8">
                <p className="text-l font-bold uppercase">Website import</p>

                <FileBox
                  banner={BANNERS.CIRCLE_K}
                  data={result.s3.circleK}
                  provider="S3"
                />

                <FileBox
                  banner={BANNERS.RABBA}
                  data={result.s3.rabba}
                  provider="S3"
                />
              </div>
            </div>
          ) : (
            <p>No download available.</p>
          )}
        </div>
      )}
    </div>
  )
}
