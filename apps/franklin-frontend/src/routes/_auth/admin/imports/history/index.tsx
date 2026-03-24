'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import {
  useImportReports,
  useDistinctReportTypes,
  type ImportReport,
  type ReportFilters,
} from '@/hooks/queries/imports/useImportReports'
import {
  Button,
  Calendar,
  MultiSelect,
  type MultiSelectOption,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

export const Route = createFileRoute('/_auth/admin/imports/history/')({
  component: HistoryPage,
  staticData: {
    title: 'route.history',
    crumb: 'route.history',
  },
})

function formatType(type: string) {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const IMPORT_TYPE_LABELS: Record<string, string> = {
  RABBA: 'Sell-Out',
  CIRCLE_K_GLOBAL: 'Sell-Out',
  CIRCLE_K_QC_ATL: 'Sell-Out',
  CENTRAL_MARKET: 'Sell-Out',
  NAP_ORANGE: 'Sell-Out',
  SOBEYS: 'Sell-Out',
  LOBLAWS: 'Sell-Out',
  '7_ELEVEN': 'Sell-Out',
  PARKLAND: 'Sell-Out',
  PETRO_CANADA: 'Sell-Out',
  BG_FUELS: 'Sell-Out',
}

const BANNER_LABELS: Record<string, string> = {
  RABBA: 'Rabba',
  CIRCLE_K_GLOBAL: 'Circle K ON',
  CIRCLE_K_QC_ATL: 'Circle K QC-ATL',
  CENTRAL_MARKET: 'Central Market',
  NAP_ORANGE: 'NAP Orange',
  SOBEYS: 'Sobeys',
  LOBLAWS: 'Loblaws',
  '7_ELEVEN': '7-Eleven',
  PARKLAND: 'Parkland',
  PETRO_CANADA: 'Petro Canada',
  BG_FUELS: 'Bg Fuels',
}

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
    accessorKey: 'type',
    header: 'Import Type',
    cell: ({ row }) => (
      <span className="font-medium">
        {IMPORT_TYPE_LABELS[row.original.type] ?? formatType(row.original.type)}
      </span>
    ),
  },
  {
    id: 'banner',
    header: 'Banner',
    cell: ({ row }) => <span>{BANNER_LABELS[row.original.type] ?? '—'}</span>,
  },
  {
    id: 'uploader',
    header: 'Uploaded By',
    cell: ({ row }) => {
      const r = row.original
      if (r.uploaderGivenName || r.uploaderFamilyName) {
        return <span>{[r.uploaderGivenName, r.uploaderFamilyName].filter(Boolean).join(' ')}</span>
      }
      if (r.uploadedBy) return <span>{r.uploadedBy === 'sftp' ? 'SFTP' : r.uploadedBy}</span>
      return <span className="text-muted-foreground">—</span>
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
          {failed ? (
            <AlertCircleIcon className="size-3" />
          ) : (
            <CheckCircle2Icon className="size-3" />
          )}
          {failed ? 'Failed' : 'Success'}
        </span>
      )
    },
  },
]

function HistoryPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedImportTypes, setSelectedImportTypes] = useState<string[]>([])
  const [selectedBanners, setSelectedBanners] = useState<string[]>([])
  const [uploadedBy, setUploadedBy] = useState('')
  const [status, setStatus] = useState<string>('')

  const { data: allTypes } = useDistinctReportTypes()

  // Derive unique import type options and banner options from distinct types
  const importTypeOptions = useMemo((): MultiSelectOption[] => {
    if (!allTypes) return []
    const seen = new Set<string>()
    const options: MultiSelectOption[] = []
    for (const t of allTypes) {
      const label = IMPORT_TYPE_LABELS[t] ?? formatType(t)
      if (!seen.has(label)) {
        seen.add(label)
        options.push({ value: label, label })
      }
    }
    return options
  }, [allTypes])

  // Map from import type label to raw type values (for query filtering)
  const importTypeLabelToRawTypes = useMemo(() => {
    if (!allTypes) return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const t of allTypes) {
      const label = IMPORT_TYPE_LABELS[t] ?? formatType(t)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(t)
    }
    return map
  }, [allTypes])

  const bannerOptions = useMemo((): MultiSelectOption[] => {
    if (!allTypes) return []
    return allTypes
      .filter((t) => BANNER_LABELS[t])
      .map((t) => ({ value: t, label: BANNER_LABELS[t]! }))
  }, [allTypes])

  // Build filters for the query
  const filters = useMemo((): ReportFilters => {
    const f: ReportFilters = {}

    const typeSet = new Set<string>()
    const hasImportTypeFilter = selectedImportTypes.length > 0
    const hasBannerFilter = selectedBanners.length > 0

    if (hasImportTypeFilter) {
      for (const label of selectedImportTypes) {
        const rawTypes = importTypeLabelToRawTypes.get(label)
        if (rawTypes) rawTypes.forEach((t) => typeSet.add(t))
      }
    }

    if (hasBannerFilter) {
      if (hasImportTypeFilter) {
        // Intersect: only keep types that match both filters
        const bannerSet = new Set(selectedBanners)
        const intersected = Array.from(typeSet).filter((t) => bannerSet.has(t))
        if (intersected.length) {
          f.types = intersected
        } else {
          f.types = ['__none__']
        }
      } else {
        f.types = selectedBanners
      }
    } else if (typeSet.size) {
      f.types = Array.from(typeSet)
    }

    if (dateRange?.from) f.dateFrom = format(dateRange.from, 'yyyy-MM-dd')
    if (dateRange?.to) f.dateTo = format(dateRange.to, 'yyyy-MM-dd')
    if (status === 'success' || status === 'failed') f.status = status
    if (uploadedBy.trim()) f.uploadedBy = uploadedBy.trim()

    return f
  }, [
    selectedImportTypes,
    selectedBanners,
    importTypeLabelToRawTypes,
    dateRange,
    status,
    uploadedBy,
  ])

  const { data, isLoading } = useImportReports('/banners/reports/all', page, pageSize, filters)

  const tableData = useMemo(() => data?.reports ?? [], [data])
  const pagination = data?.pagination

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const hasActiveFilters = !!(
    dateRange ||
    selectedImportTypes.length ||
    selectedBanners.length ||
    uploadedBy ||
    status
  )

  function clearFilters() {
    setDateRange(undefined)
    setSelectedImportTypes([])
    setSelectedBanners([])
    setUploadedBy('')
    setStatus('')
    setPage(1)
  }

  function handleFilterChange<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function handleRowClick(report: ImportReport) {
    navigate({
      to: '/admin/imports/history/$reportId',
      params: { reportId: String(report.id) },
      state: { report },
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Import History</h1>
        <p className="text-muted-foreground mt-1">All file imports performed on the platform.</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[260px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 size-4 shrink-0" />
                <span className="truncate">
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                      : format(dateRange.from, 'MMM d, yyyy')
                    : 'All dates'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range)
                  setPage(1)
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Import Type */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">Import Type</label>
          <MultiSelect
            options={importTypeOptions}
            value={selectedImportTypes}
            onChange={handleFilterChange(setSelectedImportTypes)}
            placeholder="All types"
            className="h-8 w-[180px] text-sm"
          />
        </div>

        {/* Banner */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">Banner</label>
          <MultiSelect
            options={bannerOptions}
            value={selectedBanners}
            onChange={handleFilterChange(setSelectedBanners)}
            placeholder="All banners"
            className="h-8 w-[180px] text-sm"
          />
        </div>

        {/* Uploaded By */}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">Uploaded By</label>
          <DebouncedSearchInput
            placeholder="Search..."
            value={uploadedBy}
            onSearch={(value) => {
              setUploadedBy(value)
              setPage(1)
            }}
            className="w-[150px]"
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">Status</label>
          <Select value={status} onValueChange={handleFilterChange(setStatus)}>
            <SelectTrigger className="w-[130px]" size="sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <XIcon className="mr-1 size-3" />
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoaderIcon className="text-muted-foreground size-6 animate-spin" />
        </div>
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
                    className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/60 cursor-pointer`}
                    onClick={() => handleRowClick(row.original)}
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
                    No imports found.
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
  )
}
