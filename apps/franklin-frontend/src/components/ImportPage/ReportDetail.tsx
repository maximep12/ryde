import { type ImportReport } from '@/hooks/queries/imports/useImportReports'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components'
import { useRouter } from '@tanstack/react-router'
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon, ClockIcon, FileIcon } from 'lucide-react'

declare module '@tanstack/react-router' {
  interface HistoryState {
    report?: ImportReport
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB')} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function ImportReportDetail({ report }: { report: ImportReport | undefined }) {
  const router = useRouter()

  if (!report) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
        <p className="text-muted-foreground">
          Report data unavailable. Please navigate back and try again.
        </p>
      </div>
    )
  }

  const failed = !!report.failure
  const duration = formatDuration(report.reportStart, report.reportEnd)
  const rejected = report.warnings?.rejected ?? []
  const identical = report.extra?.identical

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
        <ArrowLeftIcon className="mr-2 size-4" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full">
          <FileIcon className="text-muted-foreground size-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{report.fileName ?? 'Unknown file'}</h1>
          <p className="text-muted-foreground text-sm">{formatDateTime(report.createdAt)}</p>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
            failed
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {failed ? (
            <AlertCircleIcon className="size-4" />
          ) : (
            <CheckCircle2Icon className="size-4" />
          )}
          {failed ? 'Failed' : 'Success'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Created
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{report.created ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Updated
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{report.updated ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Deleted
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{report.deleted ?? '—'}</p>
          </CardContent>
        </Card>
        {identical != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wider uppercase">
                identical
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{identical}</p>
            </CardContent>
          </Card>
        )}
        {duration && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wider uppercase">
                <ClockIcon className="size-3" /> Duration
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{duration}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Failure */}
      {report.failure && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircleIcon className="size-4" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-300">{report.failure}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejected rows */}
      {rejected.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rejected rows ({rejected.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {rejected.map((w, i) => (
                <li key={i} className="font-mono text-sm text-amber-700 dark:text-amber-400">
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
