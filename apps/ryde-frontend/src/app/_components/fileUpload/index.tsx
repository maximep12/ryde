"use client"

import { FileUploader } from "react-drag-drop-files"
import { useContext, useState } from "react"
import ClipLoader from "react-spinners/ClipLoader"
import { AxiosError } from "axios"
import { BRAND_ROLES, ERRORS, TWSC_ROLES } from "~/constants"
import { AuthContext } from "~/app/context"
import { getJwtFromCookie } from "~/lib/auth"
import { SuccessBox } from "../successBox"
import { type BannerUploadResult, type UploadResult } from "~/types"

type FileUploaderProps = {
  title: string
  type: Array<string>
  action: ({
    file,
  }: {
    file: File
  }) => Promise<UploadResult | BannerUploadResult>
}

export function FileUpload({ title, type, action }: FileUploaderProps) {
  const { userRole } = useContext(AuthContext)

  const [file, setFile] = useState<File | null>(null)
  const [successState, setSuccessState] = useState<string | null>(null)
  const [result, setResult] = useState<
    UploadResult | BannerUploadResult | null
  >(null)
  const [error, setError] = useState<string | null>()
  const [isV7Error, setisV7Error] = useState<boolean | null>()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleChange = (file: File | File[]) => {
    const selectedFile = Array.isArray(file) ? file[0] ?? null : file
    setFile(selectedFile)
  }

  async function submitClick() {
    const token = getJwtFromCookie()
    if (!token) {
      setError(ERRORS.invalidToken)
      return
    }

    if (!file) {
      setError("Please upload a file before submitting.")
      return
    }
    setError(null)
    setResult(null)
    setSuccessState(null)
    setIsSubmitting(true)

    try {
      const response = await action({ file })

      setSuccessState(response.result.status)
      setResult(response)
    } catch (error) {
      const defaultError = error as {
        message: string
        response: { status: number }
      }

      if (defaultError.response.status === 406) {
        setisV7Error(false)
      } else {
        setisV7Error(true)
      }

      let errorMessage = defaultError.message
      if (error instanceof AxiosError) {
        const dataMessage = error?.response?.data as { message: string }
        if (dataMessage) errorMessage = dataMessage.message
      }
      
      setError(
        userRole && TWSC_ROLES.includes(userRole) && errorMessage
          ? errorMessage
          : "Could not save your file.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function removeFile() {
    setFile(null)
    setError(null)
    setResult(null)
    setSuccessState(null)
  }

  if (!userRole) return <ClipLoader />

  function getBg() {
    if (error) return "red"
    if (!result) return "transparent"
    if ("warnings" in result && result.warnings.length) return "yellow"
    return "green"
  }
  const bgColor = getBg()
  const newLine = "%0D%0A"

  const emailBody = `Hi, ${newLine}${
    TWSC_ROLES.includes(userRole)
      ? `I tried to submit a file and got this error: ${newLine} ${error}`
      : `I tried to submit a file and got an error.`
  } ${newLine} Here is my file: (insert your file here) ${newLine} Thank you`
  const href = `mailto:maxime@volume7.io?subject=${userRole.toUpperCase()} Sell-out file: ERROR&body=${emailBody}`

  function ClickHereText() {
    return (
      <p>
        Please click{" "}
        <a className="font-semibold underline" href={href}>
          here
        </a>{" "}
        to send your file by e-mail.
      </p>
    )
  }

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex shrink-0 gap-1.5">
          {type.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <FileUploader handleChange={handleChange} name="file" types={type} />
        </div>
        {!isSubmitting ? (
          <button
            onClick={submitClick}
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:bg-slate-700"
          >
            Upload
          </button>
        ) : (
          <div className="flex shrink-0 items-center px-5 py-2.5">
            <ClipLoader size={20} />
          </div>
        )}
      </div>

      {file && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <svg
            className="h-4 w-4 shrink-0 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
            />
          </svg>
          <span className="min-w-0 truncate text-slate-600">
            {file.name}
          </span>
          <button
            className="ml-auto shrink-0 text-xs text-slate-400 transition-colors hover:text-red-500"
            onClick={removeFile}
          >
            Remove
          </button>
        </div>
      )}

      {(successState ?? error) && (
        <div className="mt-4">
          <SuccessBox bgColor={bgColor}>
            <p className="text-sm font-medium">{successState}</p>
            {result?.result && "unit" in result?.result ? (
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">Result</p>
                <p>
                  Created {result.result.unit}:
                  <span className="font-medium"> {result.result.created}</span>
                </p>
                <p>
                  Updated {result.result.unit}:
                  <span className="font-medium"> {result.result.updated}</span>
                </p>
              </div>
            ) : null}
            {result && "rows" in result ? (
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">Rows</p>
                <p>
                  Received:
                  <span className="font-medium"> {result.rows.received}</span>
                </p>
                <p>
                  Rejected:
                  <span className="font-medium"> {result.rows.rejected}</span>
                </p>
                <p>
                  Created:
                  <span className="font-medium"> {result.rows.created}</span>
                </p>
                <p>
                  Updated:
                  <span className="font-medium"> {result.rows.updated}</span>
                </p>
                <p>
                  Deleted:
                  <span className="font-medium"> {result.rows.deleted}</span>
                </p>
                <p>
                  Identical:
                  <span className="font-medium"> {result.rows.identical}</span>
                </p>
              </div>
            ) : null}

            {result && "warnings" in result && result?.warnings?.length ? (
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">Rows rejected:</p>
                {result.warnings.map((rejection, index) => (
                  <p key={index}>{rejection}</p>
                ))}
              </div>
            ) : null}

            {error && (
              <div className="text-sm">
                <p className="font-medium">Error</p>
                {BRAND_ROLES.includes(userRole) ? (
                  <ClickHereText />
                ) : file ? (
                  <div className="space-y-1">
                    <p>
                      {isV7Error
                        ? "An unknown error occured. Volume 7 is aware and investigating the problem."
                        : "The file you submitted contains error. Please fix the errors and re-submit it."}
                    </p>
                    <p>{error}</p>
                    {isV7Error ? <ClickHereText /> : null}
                  </div>
                ) : (
                  <p>{error}</p>
                )}
              </div>
            )}
          </SuccessBox>
        </div>
      )}
    </div>
  )
}
