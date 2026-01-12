'use no memo'

import { ActiveFilterBar, AlertBox, AlertBoxContainer } from '@/components/AlertBox'
import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import { useOrders } from '@/hooks/queries/orders/useOrders'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import {
  Button,
  Calendar,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components'
import { serializeArray } from '@repo/zod-schemas'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  Columns3Icon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ordersSearchDefaults, ordersSearchSchema } from './searchSchema'

export const Route = createFileRoute('/_auth/orders/')({
  component: OrdersMonitorPage,
  validateSearch: ordersSearchSchema,
  staticData: {
    title: 'route.ordersMonitor',
    crumb: 'route.ordersMonitor',
  },
})

type Order = {
  id: number
  orderNumber: string
  clientId: number
  orderDate: string
  totalAmount: number
  status: string
  requiresApproval: boolean
  hasOpenIssues: boolean
  shippingAddress: string | null
  notes: string | null
  createdAt: string
  client: {
    id: number
    clientCode: string
    storeName: string
    storeType: string
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

function OrdersMonitorPage() {
  // Get search params from URL
  const search = Route.useSearch()

  // Initialize URL filters hook
  const {
    filters,
    setFilters,
    resetFilters,
    getArrayFilter,
    setArrayFilter,
    getDateFilter,
    setDateFilter,
    getSortingState,
    setSortingState,
    setPage,
  } = useUrlFilters({
    search,
    defaults: ordersSearchDefaults,
  })

  // Derived state from URL
  const statusFilters = getArrayFilter('statuses')
  const sourceFilters = getArrayFilter('sources')
  const selectedDate = getDateFilter('date')
  const sorting = getSortingState()

  // Column visibility (local only - not in URL)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Sheet state (local only - for batching filter changes before applying to URL)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetFilters, setSheetFilters] = useState({
    statuses: [] as string[],
    sources: [] as string[],
    hasIssues: false,
    hasResolvedIssues: false,
    requiresApproval: false,
    wasApproved: false,
  })

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const sourceOptions = [
    { value: 'edi', label: 'EDI' },
    { value: 'manual', label: 'Manual' },
  ]

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      // Sync sheet state with current URL filters when opening
      setSheetFilters({
        statuses: statusFilters,
        sources: sourceFilters,
        hasIssues: filters.hasIssues ?? false,
        hasResolvedIssues: filters.hasResolvedIssues ?? false,
        requiresApproval: filters.requiresApproval ?? false,
        wasApproved: filters.wasApproved ?? false,
      })
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setFilters({
      statuses: serializeArray(sheetFilters.statuses),
      sources: serializeArray(sheetFilters.sources),
      hasIssues: sheetFilters.hasIssues || undefined,
      hasResolvedIssues: sheetFilters.hasResolvedIssues || undefined,
      requiresApproval: sheetFilters.requiresApproval || undefined,
      wasApproved: sheetFilters.wasApproved || undefined,
    })
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setFilters({ search: value || undefined })
  }

  // Extract sort params from sorting state
  const sortBy = sorting.length > 0 ? sorting[0]?.id : undefined
  const sortOrder = sorting.length > 0 ? (sorting[0]?.desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, error } = useOrders({
    page: filters.page,
    pageSize: filters.pageSize,
    statuses: statusFilters.length > 0 ? statusFilters : undefined,
    sources: sourceFilters.length > 0 ? sourceFilters : undefined,
    search: filters.search || undefined,
    date: filters.date,
    hasIssues: filters.hasIssues || undefined,
    hasResolvedIssues: filters.hasResolvedIssues || undefined,
    requiresApproval: filters.requiresApproval || undefined,
    wasApproved: filters.wasApproved || undefined,
    sortBy,
    sortOrder,
  })

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'indicators',
        header: '',
        cell: ({ row }) => {
          const { requiresApproval, hasOpenIssues } = row.original
          if (!requiresApproval && !hasOpenIssues) return null
          return (
            <div className="flex flex-col items-center gap-0.5">
              {hasOpenIssues && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangleIcon className="size-3.5 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent side="right">Has open issues</TooltipContent>
                </Tooltip>
              )}
              {requiresApproval && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ClipboardCheckIcon className="size-3.5 text-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent side="right">Requires approval</TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
        enableSorting: false,
        meta: { className: 'w-6 pl-3 pr-0' },
      },
      {
        accessorKey: 'orderNumber',
        header: 'Order #',
        cell: ({ row }) => (
          <Link
            to="/orders/$orderId"
            params={{ orderId: row.original.id.toString() }}
            className="font-mono text-sm font-medium hover:underline"
          >
            {row.original.orderNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'client.storeName',
        header: 'Client',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[180px]">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: row.original.clientId.toString() }}
                  className="block truncate font-medium hover:underline"
                >
                  {row.original.client.storeName}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {row.original.client.clientCode}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white">
              <p>{row.original.client.storeName}</p>
              <p className="text-xs text-gray-400">{row.original.client.clientCode}</p>
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'orderDate',
        header: 'Order Date',
        cell: ({ row }) => {
          const date = new Date(row.original.orderDate)
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
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => `$${(row.original.totalAmount / 100).toFixed(2)}`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(row.original.status)}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
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
          <Link
            to="/orders/$orderId"
            params={{ orderId: row.original.id.toString() }}
            className="flex items-center justify-end text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
          >
            <ChevronRightIcon className="size-5" />
          </Link>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: (data?.items as unknown as Order[]) ?? [],
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

  const pagination = data?.pagination

  // Check if any filters are active (for badge display)
  const hasActiveFilters =
    statusFilters.length > 0 ||
    sourceFilters.length > 0 ||
    selectedDate ||
    filters.hasIssues ||
    filters.hasResolvedIssues ||
    filters.requiresApproval ||
    filters.wasApproved

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Orders Monitor</h1>
        <p className="text-muted-foreground mt-1">View and track all orders in the system</p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search orders..."
          onSearch={handleSearch}
          value={filters.search ?? ''}
          delay={300}
          className="max-w-[300px] min-w-[200px] flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-normal">
              <CalendarIcon className="size-4" />
              {selectedDate ? selectedDate.toLocaleDateString('en-GB') : 'All time'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setDateFilter('date', date)
              }}
            />
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setDateFilter('date', undefined)
                }}
              >
                All time
              </Button>
            </div>
          </PopoverContent>
        </Popover>
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
                <Label className="text-xs font-bold uppercase">Status</Label>
                <MultiSelect
                  options={statusOptions}
                  value={sheetFilters.statuses}
                  onChange={(statuses) => setSheetFilters((prev) => ({ ...prev, statuses }))}
                  placeholder="All statuses"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Source</Label>
                <MultiSelect
                  options={sourceOptions}
                  value={sheetFilters.sources}
                  onChange={(sources) => setSheetFilters((prev) => ({ ...prev, sources }))}
                  placeholder="All sources"
                />
              </div>
              <FilterDivider />
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Issues</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="open-issues"
                      checked={sheetFilters.hasIssues}
                      onCheckedChange={(checked) =>
                        setSheetFilters((prev) => ({ ...prev, hasIssues: checked === true }))
                      }
                    />
                    <label htmlFor="open-issues" className="cursor-pointer text-sm">
                      Show orders with open issues
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="resolved-issues"
                      checked={sheetFilters.hasResolvedIssues}
                      onCheckedChange={(checked) =>
                        setSheetFilters((prev) => ({ ...prev, hasResolvedIssues: checked === true }))
                      }
                    />
                    <label htmlFor="resolved-issues" className="cursor-pointer text-sm">
                      Show orders with resolved issues
                    </label>
                  </div>
                </div>
              </div>
              <FilterDivider />
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Approval</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requires-approval"
                      checked={sheetFilters.requiresApproval}
                      onCheckedChange={(checked) =>
                        setSheetFilters((prev) => ({ ...prev, requiresApproval: checked === true }))
                      }
                    />
                    <label htmlFor="requires-approval" className="cursor-pointer text-sm">
                      Show orders requiring approval
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="was-approved"
                      checked={sheetFilters.wasApproved}
                      onCheckedChange={(checked) =>
                        setSheetFilters((prev) => ({ ...prev, wasApproved: checked === true }))
                      }
                    />
                    <label htmlFor="was-approved" className="cursor-pointer text-sm">
                      Show manually approved orders
                    </label>
                  </div>
                </div>
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
                  setFilters({
                    statuses: undefined,
                    sources: undefined,
                    hasIssues: undefined,
                    hasResolvedIssues: undefined,
                    requiresApproval: undefined,
                    wasApproved: undefined,
                  })
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
        {pagination && (
          <>
            <div className="text-muted-foreground ml-auto text-sm">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}-
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} orders
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

      {error && <div className="text-destructive">Failed to load orders: {error.message}</div>}

      {isLoading && <TableLoading />}

      {data && (
        <>
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {statusFilters.map((status) => (
                <span
                  key={`status-${status}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Status: {status}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'statuses',
                        statusFilters.filter((s) => s !== status),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {sourceFilters.map((source) => (
                <span
                  key={`source-${source}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Source: {source.toUpperCase()}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'sources',
                        sourceFilters.filter((s) => s !== source),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {selectedDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Date: {selectedDate.toLocaleDateString('en-GB')}
                  <button
                    onClick={() => setDateFilter('date', undefined)}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {filters.hasIssues && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Has Open Issues
                  <button
                    onClick={() => setFilters({ hasIssues: undefined })}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {filters.hasResolvedIssues && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Has Resolved Issues
                  <button
                    onClick={() => setFilters({ hasResolvedIssues: undefined })}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {filters.requiresApproval && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Requires Approval
                  <button
                    onClick={() => setFilters({ requiresApproval: undefined })}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {filters.wasApproved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Manually Approved
                  <button
                    onClick={() => setFilters({ wasApproved: undefined })}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Alert boxes and active filter indicators */}
          {(data.ordersWithIssuesCount > 0 ||
            data.ordersRequiringApprovalCount > 0 ||
            filters.hasIssues ||
            filters.requiresApproval) && (
            <AlertBoxContainer>
              {/* Warning box for orders with issues */}
              {data.ordersWithIssuesCount > 0 && !filters.hasIssues && (
                <AlertBox
                  variant="orange"
                  icon={AlertTriangleIcon}
                  title={`${data.ordersWithIssuesCount} order${data.ordersWithIssuesCount !== 1 ? 's' : ''} with open issues`}
                  description="These orders require attention due to unresolved issues"
                  actionLabel="Show orders with issues"
                  onAction={() => {
                    setFilters({ hasIssues: true })
                  }}
                />
              )}

              {/* Active filter indicator for issues */}
              {filters.hasIssues && (
                <ActiveFilterBar
                  variant="orange"
                  icon={AlertTriangleIcon}
                  label="Showing orders with open issues"
                  onClear={() => {
                    setFilters({ hasIssues: undefined })
                  }}
                />
              )}

              {/* Info box for orders requiring approval */}
              {data.ordersRequiringApprovalCount > 0 && !filters.requiresApproval && (
                <AlertBox
                  variant="blue"
                  icon={ClipboardCheckIcon}
                  title={`${data.ordersRequiringApprovalCount} order${data.ordersRequiringApprovalCount !== 1 ? 's' : ''} requiring approval`}
                  description="These orders need to be reviewed and approved before processing"
                  actionLabel="Show orders requiring approval"
                  onAction={() => {
                    setFilters({ requiresApproval: true })
                  }}
                />
              )}

              {/* Active filter indicator for approval */}
              {filters.requiresApproval && (
                <ActiveFilterBar
                  variant="blue"
                  icon={ClipboardCheckIcon}
                  label="Showing orders requiring approval"
                  onClear={() => {
                    setFilters({ requiresApproval: undefined })
                  }}
                />
              )}
            </AlertBoxContainer>
          )}

          <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-muted/50 border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`font-semibold ${(header.column.columnDef.meta as { className?: string })?.className ?? ''}`}
                      >
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
                        <TableCell
                          key={cell.id}
                          className={`py-2 ${(cell.column.columnDef.meta as { className?: string })?.className ?? ''}`}
                        >
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
                      No orders found.
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
                onClick={() => setPage(Math.max(1, filters.page - 1))}
                disabled={filters.page === 1}
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
                onClick={() => setPage(Math.min(pagination.totalPages, filters.page + 1))}
                disabled={filters.page === pagination.totalPages}
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
