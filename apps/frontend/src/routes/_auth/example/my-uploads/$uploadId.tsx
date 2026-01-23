'use no memo'

import { useCurrentItem } from '@/contexts/CurrentItemContext'
import { useDownloadFile } from '@/hooks/queries/uploads/useDownloadFile'
import { useDownloadInvalidResults } from '@/hooks/queries/uploads/useDownloadInvalidResults'
import { useUploadDetails } from '@/hooks/queries/uploads/useUploadDetails'
import { CSV_UPLOAD_TYPE_LABELS, UploadType } from '@repo/csv'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  KeyIcon,
  Loader2Icon,
  UserIcon,
  XCircleIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  filter: z.enum(['all', 'valid', 'invalid']).optional(),
})

export const Route = createFileRoute('/_auth/example/my-uploads/$uploadId')({
  component: UploadDetailsPage,
  validateSearch: searchSchema,
  staticData: {
    title: 'route.uploadDetails',
    crumb: 'route.uploadDetails',
  },
})

function formatDateTime(date: string | Date) {
  const d = new Date(date)
  return `${d.toLocaleDateString('en-GB')} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

// Truncate file name for sidebar display
function truncateFileName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name
  const extension = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : ''
  const baseName = name.slice(0, name.length - extension.length)
  const truncatedBase = baseName.slice(0, maxLength - extension.length - 3)
  return `${truncatedBase}...${extension}`
}

function UploadDetailsPage() {
  const { uploadId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const downloadFile = useDownloadFile()
  const downloadInvalidResults = useDownloadInvalidResults()
  const { setCurrentItem } = useCurrentItem()

  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | undefined>(search.filter)

  const { data, isLoading, error } = useUploadDetails({
    uploadId,
    page: search.page,
    pageSize: 20,
    filter,
  })

  // Register file name in sidebar when data loads
  useEffect(() => {
    if (data?.upload) {
      const fileName = data.upload.localFileName || data.upload.fileName
      setCurrentItem('/example/my-uploads', truncateFileName(fileName))
    }
  }, [data?.upload, setCurrentItem])

  const handlePageChange = (newPage: number) => {
    navigate({
      to: '/example/my-uploads/$uploadId',
      params: { uploadId },
      search: { page: newPage, filter },
    })
  }

  const handleFilterChange = (newFilter: 'all' | 'valid' | 'invalid') => {
    const filterValue = newFilter === 'all' ? undefined : newFilter
    setFilter(filterValue)
    navigate({
      to: '/example/my-uploads/$uploadId',
      params: { uploadId },
      search: { page: 1, filter: filterValue },
    })
  }

  const handleDownload = () => {
    if (data?.upload) {
      downloadFile.mutate({
        fileName: data.upload.fileName,
        uploadType: data.upload.type as UploadType,
      })
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/example/my-uploads" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to My Uploads
          </Link>
        </Button>
        <div className="text-destructive">Failed to load upload: {error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/example/my-uploads" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to My Uploads
          </Link>
        </Button>
        <div className="text-muted-foreground">Upload not found</div>
      </div>
    )
  }

  const { upload, summary, results, pagination } = data
  const uploadTypeLabel = CSV_UPLOAD_TYPE_LABELS[upload.type as UploadType] || upload.type

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/example/my-uploads" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to My Uploads
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={downloadFile.isPending}>
            {downloadFile.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            Download Original File
          </Button>
          {summary && summary.invalid > 0 && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
              onClick={() => downloadInvalidResults.mutate({ uploadId })}
              disabled={downloadInvalidResults.isPending}
            >
              {downloadInvalidResults.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              Download Invalid Rows
            </Button>
          )}
        </div>
      </div>

      {/* Upload Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
                <FileIcon className="size-8" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {upload.localFileName || upload.fileName}
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {uploadTypeLabel}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{formatDateTime(upload.createdAt)}</span>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Uploaded By */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <UserIcon className="size-4" />
                Uploaded By
              </h3>
              <p className="text-sm">
                {upload.user
                  ? `${upload.user.givenName || ''} ${upload.user.familyName || ''}`.trim() ||
                    'Unknown'
                  : 'Unknown'}
              </p>
            </div>

            {/* File Key */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <KeyIcon className="size-4" />
                File Key
              </h3>
              <p className="font-mono text-xs">{upload.fileKey}</p>
            </div>
          </div>

          {/* Error Message */}
          {upload.error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircleIcon className="size-5" />
                <span className="font-semibold">Processing Error</span>
              </div>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{upload.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Summary</CardTitle>
            <CardDescription>
              {summary.isProcessed ? 'Processing complete' : 'Processing in progress...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{summary.total}</p>
                <p className="text-muted-foreground text-sm">Total Records</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900/50 dark:bg-green-950/30">
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {summary.valid}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">Valid Records</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {summary.invalid}
                </p>
                <p className="text-sm text-red-600 dark:text-red-500">Invalid Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Processed Results</CardTitle>
              <CardDescription>
                {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
                {filter && filter !== 'all' && ` (filtered: ${filter})`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={!filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'valid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('valid')}
              >
                <CheckCircleIcon className="mr-1 size-4" />
                Valid
              </Button>
              <Button
                variant={filter === 'invalid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('invalid')}
              >
                <XCircleIcon className="mr-1 size-4" />
                Invalid
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No results found
              {filter && ` with filter: ${filter}`}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {result.isValid ? (
                            <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircleIcon className="size-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className="font-mono text-sm">{result.rowIndex}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {result.data ? (
                          <DataWithValidation
                            data={result.data}
                            validationDetails={result.validationDetails}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component to display data with validation errors highlighted
function DataWithValidation({
  data,
  validationDetails,
}: {
  data: Record<string, unknown>
  validationDetails?: Record<string, unknown> | null
}) {
  const entries = Object.entries(data)

  // Parse validation details to determine which fields have errors
  const fieldErrors = new Map<string, string>()

  if (validationDetails) {
    // Check if this is Zod field errors (all values are strings = field error messages)
    const detailEntries = Object.entries(validationDetails)
    const isZodFieldErrors =
      detailEntries.length > 0 && detailEntries.every(([, value]) => typeof value === 'string')

    if (isZodFieldErrors) {
      // Zod errors: field -> error message
      for (const [field, message] of detailEntries) {
        fieldErrors.set(field, String(message))
      }
    } else {
      // Check for specific validation flags
      if (validationDetails.isEmailConflict === true && 'email' in validationDetails) {
        fieldErrors.set('email', 'Email belongs to different client')
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => {
        const errorMessage = fieldErrors.get(key)
        const isError = !!errorMessage

        const badgeClass = isError
          ? 'inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs dark:bg-red-900/40'
          : 'inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800'
        const keyClass = isError ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
        const valueClass = isError ? 'ml-1 font-medium text-red-700 dark:text-red-300' : 'ml-1 font-medium'

        const badge = (
          <span className={badgeClass}>
            <span className={keyClass}>{key}:</span>
            <span className={valueClass}>{String(value)}</span>
          </span>
        )

        if (isError) {
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>{errorMessage}</TooltipContent>
            </Tooltip>
          )
        }

        return <span key={key}>{badge}</span>
      })}
    </div>
  )
}

