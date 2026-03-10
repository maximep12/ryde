'use no memo'

import { FileDrop } from '@/components/FileDrop'
import { useUploadToRyde, type UploadResult } from '@/hooks/mutations/imports/useUploadToRyde'
import { useImportReports, type ImportReport } from '@/hooks/queries/imports/useImportReports'
import { getRydeToken } from '@/stores/ryde-session'
import { destroySessionToken } from '@/stores/session'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LogOutIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

type ImportPageProps = {
  title: string
  description: string
  uploadEndpoint: string
  reportsEndpoint: string
  expectedColumns: string[]
  unit: string
  uploadType: string
  /** File extensions to accept, e.g. ['.xlsx', '.xls']. Defaults to ['.xlsx', '.xls', '.csv'] */
  accept?: string[]
  onRowClick?: (report: ImportReport) => void
  onBack?: () => void
}

// =============================================================================
// REPORTS TABLE COLUMNS
// =============================================================================

const columns: ColumnDef<ImportReport>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return (
        <div>
          <p>{date.toLocaleDateString('en-GB')}</p>
          <p className="text-muted-foreground text-xs">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'fileName',
    header: 'File',
    cell: ({ row }) => (
      <span className="text-muted-foreground block max-w-[200px] truncate">
        {row.original.fileName || '—'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const failed = !!row.original.failure
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            failed
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {failed ? 'Failed' : 'Success'}
        </span>
      )
    },
  },
  {
    accessorKey: 'created',
    header: 'Created',
    cell: ({ row }) => <span className="tabular-nums">{row.original.created ?? '—'}</span>,
  },
  {
    accessorKey: 'updated',
    header: 'Updated',
    cell: ({ row }) => <span className="tabular-nums">{row.original.updated ?? '—'}</span>,
  },
  {
    id: 'failure',
    header: 'Note',
    cell: ({ row }) => (
      <span className="text-muted-foreground block max-w-[240px] truncate text-xs">
        {row.original.failure || '—'}
      </span>
    ),
  },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ImportPage({
  title,
  description,
  uploadEndpoint,
  reportsEndpoint,
  expectedColumns,
  unit,
  uploadType,
  accept,
  onRowClick,
  onBack,
}: ImportPageProps) {
  const hasRydeToken = !!getRydeToken()
  const queryClient = useQueryClient()
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const uploadMutation = useUploadToRyde()
  const { data: reportsData, isLoading: reportsLoading } = useImportReports(reportsEndpoint, page)

  const tableData = useMemo(() => reportsData?.reports ?? [], [reportsData])
  const pagination = reportsData?.pagination

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleUpload = (file: File): Promise<void> => {
    setUploadResult(null)
    setUploadError(null)
    return new Promise((resolve, reject) => {
      uploadMutation.mutate(
        { file, endpoint: uploadEndpoint },
        {
          onSuccess: (data) => {
            setUploadResult(data)
            queryClient.invalidateQueries({ queryKey: ['import-reports', reportsEndpoint] })
            resolve()
          },
          onError: (err) => {
            setUploadError(err.message)
            reject(err)
          },
        },
      )
    })
  }

  const handleReset = () => {
    setUploadResult(null)
    setUploadError(null)
    uploadMutation.reset()
  }

  return (
    <div className="space-y-8">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
      )}

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </header>

      {/* Re-login banner when ryde token is missing */}
      {!hasRydeToken && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <div className="flex items-center gap-3">
            <AlertCircleIcon className="size-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your session needs to be refreshed to use this feature. Please sign out and sign back
              in.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              destroySessionToken()
              window.location.href = '/login'
            }}
          >
            <LogOutIcon className="size-4" />
            Sign out
          </Button>
        </div>
      )}

      {/* Upload section */}
      <FileDrop accept={accept} onUpload={handleUpload} onReset={handleReset} />

      {/* Feedback box */}
      {(uploadResult || uploadError) && (
        <div
          className={`rounded-lg border p-4 ${
            uploadError
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'
          }`}
        >
          {uploadError ? (
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Upload failed</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-300">{uploadError}</p>
              </div>
            </div>
          ) : uploadResult ? (
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="space-y-2">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  {uploadResult.result.status}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="text-muted-foreground">Received:</span>{' '}
                    <strong className="tabular-nums">{uploadResult.rows.received}</strong> {unit}
                  </span>
                  <span>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    <strong className="tabular-nums">{uploadResult.rows.created}</strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Updated:</span>{' '}
                    <strong className="tabular-nums">{uploadResult.rows.updated}</strong>
                  </span>
                  {uploadResult.rows.rejected > 0 && (
                    <span className="text-red-600">
                      <span>Rejected:</span>{' '}
                      <strong className="tabular-nums">{uploadResult.rows.rejected}</strong>
                    </span>
                  )}
                  {uploadResult.rows.identical > 0 && (
                    <span>
                      <span className="text-muted-foreground">Identical:</span>{' '}
                      <strong className="tabular-nums">{uploadResult.rows.identical}</strong>
                    </span>
                  )}
                </div>
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Warnings ({uploadResult.warnings.length})
                    </p>
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto">
                      {uploadResult.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-600 dark:text-amber-300">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Expected columns */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Expected columns
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = expectedColumns.join(',') + '\n'
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${uploadType}-template.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <DownloadIcon className="size-4" />
            Download template
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {expectedColumns.map((col) => (
            <span
              key={col}
              className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Previous uploads table */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Previous uploads</h2>

        {reportsLoading ? (
          <div className="bg-muted/30 h-32 animate-pulse rounded-lg" />
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-muted/50 border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-semibold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} ${onRowClick ? 'hover:bg-muted/60 cursor-pointer' : ''}`}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No uploads yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeftIcon className="size-4" />
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
