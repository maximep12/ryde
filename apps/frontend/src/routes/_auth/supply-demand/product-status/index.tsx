'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import {
  Product,
  useProductFilterOptions,
  useProducts,
} from '@/hooks/queries/products/useProducts'
import {
  Button,
  MultiSelect,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
import { createFileRoute } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/product-status/')({
  component: ProductStatusPage,
  staticData: {
    title: 'route.supplyDemandProductStatus',
    crumb: 'route.supplyDemandProductStatus',
  },
})

function getStatusColor(status: string | null) {
  const colors: Record<string, string> = {
    '03': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    '04': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    '05': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status ?? ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

function getStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    '03': 'Active',
    '04': 'Phase Out',
    '05': 'Obsolete',
  }
  return labels[status ?? ''] || status || 'Unknown'
}

function ProductStatusPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [productTypeFilters, setProductTypeFilters] = useState<string[]>([])
  const [productGroupFilters, setProductGroupFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const pageSize = 25

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetProductTypeFilters, setSheetProductTypeFilters] = useState<string[]>([])
  const [sheetProductGroupFilters, setSheetProductGroupFilters] = useState<string[]>([])
  const [sheetStatusFilters, setSheetStatusFilters] = useState<string[]>([])

  // Fetch filter options
  const { data: filterOptions } = useProductFilterOptions()

  const productTypeOptions = useMemo(
    () =>
      filterOptions?.productTypes.map((t) => ({
        value: t.value ?? '',
        label: `${t.value} (${t.count})`,
      })) ?? [],
    [filterOptions],
  )

  const productGroupOptions = useMemo(
    () =>
      filterOptions?.productGroups
        .filter((g) => g.count > 10) // Only show groups with more than 10 products
        .slice(0, 20) // Limit to top 20
        .map((g) => ({
          value: g.value ?? '',
          label: `${g.value} (${g.count})`,
        })) ?? [],
    [filterOptions],
  )

  const statusOptions = [
    { value: '03', label: 'Active (03)' },
    { value: '04', label: 'Phase Out (04)' },
    { value: '05', label: 'Obsolete (05)' },
  ]

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetProductTypeFilters(productTypeFilters)
      setSheetProductGroupFilters(productGroupFilters)
      setSheetStatusFilters(statusFilters)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setProductTypeFilters(sheetProductTypeFilters)
    setProductGroupFilters(sheetProductGroupFilters)
    setStatusFilters(sheetStatusFilters)
    setPage(1)
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const { data, isLoading, error } = useProducts({
    page,
    pageSize,
    search: search || undefined,
    productTypes: productTypeFilters.length > 0 ? productTypeFilters : undefined,
    productGroups: productGroupFilters.length > 0 ? productGroupFilters : undefined,
    statuses: statusFilters.length > 0 ? statusFilters : undefined,
  })

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'productCode',
        header: 'Product Code',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">{row.original.productCode}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="truncate">{row.original.description}</p>
          </div>
        ),
      },
      {
        accessorKey: 'productType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            {row.original.productType ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'productGroup',
        header: 'Group',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.productGroup ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'gtin',
        header: 'GTIN',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.gtin ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row.original.status)}`}
          >
            {getStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        accessorKey: 'statusValidFrom',
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex cursor-help items-center gap-1">
                <ClockIcon className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white">Valid From</TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }) => {
          if (!row.original.statusValidFrom) return '-'
          const date = new Date(row.original.statusValidFrom)
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex cursor-help items-center justify-center">
                  <ClockIcon className="text-muted-foreground size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white">
                {date.toLocaleDateString('en-GB')}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const pagination = data?.pagination

  const hasActiveFilters =
    productTypeFilters.length > 0 || productGroupFilters.length > 0 || statusFilters.length > 0

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Product Status</h1>
        <p className="text-muted-foreground mt-1">
          View and filter all products in the system
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by code, description, or GTIN..."
          onSearch={handleSearch}
          value={search}
          delay={300}
          className="max-w-[350px] min-w-[200px] flex-1"
        />
        <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontalIcon className="size-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs">
                  {productTypeFilters.length + productGroupFilters.length + statusFilters.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Status</label>
                <MultiSelect
                  options={statusOptions}
                  value={sheetStatusFilters}
                  onChange={setSheetStatusFilters}
                  placeholder="All statuses"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Product Type</label>
                <MultiSelect
                  options={productTypeOptions}
                  value={sheetProductTypeFilters}
                  onChange={setSheetProductTypeFilters}
                  placeholder="All types"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Product Group</label>
                <MultiSelect
                  options={productGroupOptions}
                  value={sheetProductGroupFilters}
                  onChange={setSheetProductGroupFilters}
                  placeholder="All groups"
                />
              </div>
            </div>
            <SheetFooter className="border-t p-4">
              <Button className="w-full" onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setProductTypeFilters([])
                  setProductGroupFilters([])
                  setStatusFilters([])
                  setPage(1)
                  setSheetOpen(false)
                }}
              >
                Reset Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button
          variant="outline"
          onClick={() => {
            setProductTypeFilters([])
            setProductGroupFilters([])
            setStatusFilters([])
            setSearch('')
            setPage(1)
          }}
        >
          <RotateCcwIcon className="size-4" />
          Reset
        </Button>
        {pagination && (
          <div className="text-muted-foreground ml-auto text-sm">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} products
          </div>
        )}
      </div>

      {error && <div className="text-destructive">Failed to load products: {error.message}</div>}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {data && (
        <>
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {statusFilters.map((status) => (
                <span
                  key={`status-${status}`}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Status: {getStatusLabel(status)}
                  <button
                    onClick={() => setStatusFilters((prev) => prev.filter((s) => s !== status))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {productTypeFilters.map((type) => (
                <span
                  key={`type-${type}`}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Type: {type}
                  <button
                    onClick={() => setProductTypeFilters((prev) => prev.filter((t) => t !== type))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {productGroupFilters.map((group) => (
                <span
                  key={`group-${group}`}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Group: {group}
                  <button
                    onClick={() =>
                      setProductGroupFilters((prev) => prev.filter((g) => g !== group))
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
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
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </div>
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
        </>
      )}
    </div>
  )
}
