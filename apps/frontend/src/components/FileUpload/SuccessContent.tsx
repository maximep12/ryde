import { Button } from '@repo/ui/components'
import { Link } from '@tanstack/react-router'
import { AlertTriangleIcon, CheckCircleIcon, ExternalLinkIcon, XCircleIcon } from 'lucide-react'
import { useFileUpload } from './context'
import { ResetButton } from './ResetButton'

type SuccessContentProps = {
  children?: React.ReactNode
}

export function SuccessContent({ children }: SuccessContentProps) {
  const { file, uploadStatus, resultsSummary, uploadId } = useFileUpload()

  if (uploadStatus !== 'success') return null

  if (children) return <>{children}</>

  const { total, valid, invalid } = resultsSummary ?? { total: 0, valid: 0, invalid: 0 }

  // All records valid
  if (invalid === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
          <CheckCircleIcon className="text-primary size-8" />
        </div>
        <p className="text-primary text-center font-medium">Upload successful!</p>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          {valid} {valid === 1 ? 'record' : 'records'} imported from {file?.name}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <ResetButton>Upload another file</ResetButton>
          {uploadId && (
            <Button variant="outline" asChild>
              <Link to="/example/my-uploads/$uploadId" params={{ uploadId }}>
                View Report
                <ExternalLinkIcon className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // All records invalid
  if (valid === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircleIcon className="size-8 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-center font-medium text-red-700 dark:text-red-400">
          No records imported
        </p>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          All {total} {total === 1 ? 'record' : 'records'} failed validation (likely duplicates)
        </p>
        <div className="mt-6 flex items-center gap-3">
          <ResetButton>Try another file</ResetButton>
          {uploadId && (
            <Button variant="outline" asChild>
              <Link to="/example/my-uploads/$uploadId" params={{ uploadId }}>
                View Report
                <ExternalLinkIcon className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Mixed results - some valid, some invalid
  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <AlertTriangleIcon className="size-8 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="text-center font-medium text-amber-700 dark:text-amber-400">
        Partial import completed
      </p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        {valid} of {total} {total === 1 ? 'record' : 'records'} imported from {file?.name}
      </p>
      <p className="mt-1 text-center text-sm text-amber-600 dark:text-amber-400">
        {invalid} {invalid === 1 ? 'record' : 'records'} failed validation
      </p>
      <div className="mt-6 flex items-center gap-3">
        <ResetButton>Upload another file</ResetButton>
        {uploadId && (
          <Button variant="outline" asChild>
            <Link to="/example/my-uploads/$uploadId" params={{ uploadId }}>
              View Report
              <ExternalLinkIcon className="ml-1 size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
