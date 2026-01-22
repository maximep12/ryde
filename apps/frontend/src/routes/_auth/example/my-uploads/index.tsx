'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import { useDownloadFile } from '@/hooks/queries/uploads/useDownloadFile'
import { useMyUploads } from '@/hooks/queries/uploads/useMyUploads'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { CSV_UPLOAD_TYPE_LABELS, UPLOAD_TYPES, UploadType } from '@repo/csv'
import {
  Button,
  Checkbox,
  Label,
  MultiSelect,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components'
import { serializeArray } from '@repo/zod-schemas'
import { createFileRoute } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns3Icon,
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { myUploadsSearchDefaults, myUploadsSearchSchema } from './searchSchema'

export const Route = createFileRoute('/_auth/example/my-uploads/')({
  component: MyUploadsPage,
  validateSearch: myUploadsSearchSchema,
  staticData: {
    title: 'route.myUploads',
    crumb: 'route.myUploads',
  },
})

type Upload = {
  uuid: string
  type: string
  fileName: string
  localFileName: string | null
  createdAt: string
}

const uploadTypeOptions = UPLOAD_TYPES.map((type) => ({
  value: type,
  label: CSV_UPLOAD_TYPE_LABELS[type],
}))

// Separate component for download button to isolate mutation state
function DownloadButton({ fileName, uploadType }: { fileName: string; uploadType: UploadType }) {
  const downloadFile = useDownloadFile()
  const isDownloading = downloadFile.isPending

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadFile.mutate({ fileName, uploadType })}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <DownloadIcon className="size-4" />
      )}
      Download
    </Button>
  )
}

// Define columns outside component - no state dependencies
const columns: ColumnDef<Upload>[] = [
  {
    id: 'icon',
    header: '',
    cell: () => (
      <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded">
        <FileIcon className="size-4" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'localFileName',
    accessorKey: 'localFileName',
    header: 'File Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.localFileName || row.original.fileName}</span>
    ),
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Upload Type',
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {CSV_UPLOAD_TYPE_LABELS[row.original.type as UploadType] || row.original.type}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Uploaded At',
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DownloadButton
        fileName={row.original.fileName}
        uploadType={row.original.type as UploadType}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

function MyUploadsPage() {
  const search = Route.useSearch()

  const {
    filters,
    setFilters,
    resetFilters,
    getArrayFilter,
    setArrayFilter,
    getSortingState,
    setSortingState,
    setPage,
  } = useUrlFilters({
    search,
    defaults: myUploadsSearchDefaults,
  })

  const typeFilters = getArrayFilter('types')
  const urlSorting = getSortingState()
  // Default to createdAt descending if no sort specified
  const sorting = urlSorting.length > 0 ? urlSorting : [{ id: 'createdAt', desc: true }]

  // Column visibility (local only)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Sheet state for filter panel
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetFilters, setSheetFilters] = useState({
    types: [] as string[],
  })

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetFilters({
        types: typeFilters,
      })
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setFilters({
      types: serializeArray(sheetFilters.types),
    })
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setFilters({ search: value || undefined })
  }

  const { data, isLoading, error } = useMyUploads({
    types: typeFilters.length > 0 ? typeFilters : undefined,
    search: filters.search || undefined,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
  })

  const uploads = (data?.myUploads as Upload[]) ?? []
  const totalCount = (data?.count as number) ?? 0
  const totalPages = Math.ceil(totalCount / (filters.pageSize ?? 20))

  const table = useReactTable({
    data: uploads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSortingState(newSorting)
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  })

  const hasActiveFilters = typeFilters.length > 0

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">My Uploads</h1>
        <p className="text-muted-foreground mt-1">View and download your uploaded files</p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search uploads..."
          onSearch={handleSearch}
          value={filters.search ?? ''}
          delay={300}
          className="max-w-[300px] min-w-[200px] flex-1"
        />
        <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontalIcon className="size-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-6 p-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Upload Type</Label>
                <MultiSelect
                  options={uploadTypeOptions}
                  value={sheetFilters.types}
                  onChange={(types) => setSheetFilters((prev) => ({ ...prev, types }))}
                  placeholder="All types"
                />
              </div>
              <FilterDivider />
            </div>
            <SheetFooter className="border-t p-4">
              <Button className="w-full" onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilters({ types: undefined })
                  setSheetOpen(false)
                }}
              >
                Reset Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button variant="outline" onClick={resetFilters}>
          <RotateCcwIcon className="size-4" />
          Reset Filters
        </Button>
        {totalCount > 0 && (
          <>
            <div className="text-muted-foreground ml-auto text-sm">
              Showing {(filters.page - 1) * (filters.pageSize ?? 20) + 1}-
              {Math.min(filters.page * (filters.pageSize ?? 20), totalCount)} of {totalCount}{' '}
              uploads
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3Icon className="size-4" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48">
                <div className="space-y-2">
                  {table.getAllColumns().map((column) => {
                    if (!column.getCanHide()) return null
                    return (
                      <div key={column.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`column-${column.id}`}
                          checked={column.getIsVisible()}
                          onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                        />
                        <label
                          htmlFor={`column-${column.id}`}
                          className="cursor-pointer text-sm capitalize"
                        >
                          {typeof column.columnDef.header === 'string'
                            ? column.columnDef.header
                            : column.id.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      {error && <div className="text-destructive">Failed to load uploads: {error.message}</div>}

      {isLoading && <TableLoading />}

      {data && (
        <>
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {typeFilters.map((type) => {
                const label = uploadTypeOptions.find((o) => o.value === type)?.label || type
                return (
                  <span
                    key={`type-${type}`}
                    className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                  >
                    Type: {label}
                    <button
                      onClick={() =>
                        setArrayFilter(
                          'types',
                          typeFilters.filter((t) => t !== type),
                        )
                      }
                      className="ml-0.5 hover:text-gray-300"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-muted/50 border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-semibold">
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex cursor-pointer items-center gap-2 select-none'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <>
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ArrowUpIcon className="size-4" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ArrowDownIcon className="size-4" />
                                ) : (
                                  <ArrowUpDownIcon className="text-muted-foreground/50 size-4" />
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
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
                      No uploads found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, filters.page - 1))}
                disabled={filters.page === 1}
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </Button>
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                Page {filters.page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, filters.page + 1))}
                disabled={filters.page === totalPages}
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
