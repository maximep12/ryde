'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { useOrders } from '@/hooks/queries/orders/useOrders'
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
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
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
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/orders/')({
  component: OrdersMonitorPage,
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
  const [page, setPage] = useState(1)
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [sorting, setSorting] = useState<SortingState>([])
  const [hasIssuesFilter, setHasIssuesFilter] = useState(false)
  const [hasResolvedIssuesFilter, setHasResolvedIssuesFilter] = useState(false)
  const [sourceFilters, setSourceFilters] = useState<string[]>([])
  const [requiresApprovalFilter, setRequiresApprovalFilter] = useState(false)
  const [wasApprovedFilter, setWasApprovedFilter] = useState(false)
  const pageSize = 15

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetStatusFilters, setSheetStatusFilters] = useState<string[]>([])
  const [sheetSourceFilters, setSheetSourceFilters] = useState<string[]>([])
  const [sheetHasIssuesFilter, setSheetHasIssuesFilter] = useState(false)
  const [sheetHasResolvedIssuesFilter, setSheetHasResolvedIssuesFilter] = useState(false)
  const [sheetRequiresApprovalFilter, setSheetRequiresApprovalFilter] = useState(false)
  const [sheetWasApprovedFilter, setSheetWasApprovedFilter] = useState(false)

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
      // Sync sheet state with current filters when opening
      setSheetStatusFilters(statusFilters)
      setSheetSourceFilters(sourceFilters)
      setSheetHasIssuesFilter(hasIssuesFilter)
      setSheetHasResolvedIssuesFilter(hasResolvedIssuesFilter)
      setSheetRequiresApprovalFilter(requiresApprovalFilter)
      setSheetWasApprovedFilter(wasApprovedFilter)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setStatusFilters(sheetStatusFilters)
    setSourceFilters(sheetSourceFilters)
    setHasIssuesFilter(sheetHasIssuesFilter)
    setHasResolvedIssuesFilter(sheetHasResolvedIssuesFilter)
    setRequiresApprovalFilter(sheetRequiresApprovalFilter)
    setWasApprovedFilter(sheetWasApprovedFilter)
    setPage(1)
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const dateString = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined

  const { data, isLoading, error } = useOrders({
    page,
    pageSize,
    statuses: statusFilters.length > 0 ? statusFilters : undefined,
    sources: sourceFilters.length > 0 ? sourceFilters : undefined,
    search: search || undefined,
    date: dateString,
    hasIssues: hasIssuesFilter || undefined,
    hasResolvedIssues: hasResolvedIssuesFilter || undefined,
    requiresApproval: requiresApprovalFilter || undefined,
    wasApproved: wasApprovedFilter || undefined,
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
          <div>
            <Link
              to="/clients/$clientId"
              params={{ clientId: row.original.clientId.toString() }}
              className="font-medium hover:underline"
            >
              {row.original.client.storeName}
            </Link>
            <p className="text-muted-foreground text-xs">{row.original.client.clientCode}</p>
          </div>
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
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const pagination = data?.pagination

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
          value={search}
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
                setSelectedDate(date)
                setPage(1)
              }}
            />
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedDate(undefined)
                  setPage(1)
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
                  value={sheetStatusFilters}
                  onChange={setSheetStatusFilters}
                  placeholder="All statuses"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Source</Label>
                <MultiSelect
                  options={sourceOptions}
                  value={sheetSourceFilters}
                  onChange={setSheetSourceFilters}
                  placeholder="All sources"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Issues</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="open-issues"
                      checked={sheetHasIssuesFilter}
                      onCheckedChange={(checked) => setSheetHasIssuesFilter(checked === true)}
                    />
                    <label htmlFor="open-issues" className="cursor-pointer text-sm">
                      Show orders with open issues
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="resolved-issues"
                      checked={sheetHasResolvedIssuesFilter}
                      onCheckedChange={(checked) =>
                        setSheetHasResolvedIssuesFilter(checked === true)
                      }
                    />
                    <label htmlFor="resolved-issues" className="cursor-pointer text-sm">
                      Show orders with resolved issues
                    </label>
                  </div>
                </div>
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Approval</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requires-approval"
                      checked={sheetRequiresApprovalFilter}
                      onCheckedChange={(checked) =>
                        setSheetRequiresApprovalFilter(checked === true)
                      }
                    />
                    <label htmlFor="requires-approval" className="cursor-pointer text-sm">
                      Show orders requiring approval
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="was-approved"
                      checked={sheetWasApprovedFilter}
                      onCheckedChange={(checked) => setSheetWasApprovedFilter(checked === true)}
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
                  setStatusFilters([])
                  setSourceFilters([])
                  setHasIssuesFilter(false)
                  setHasResolvedIssuesFilter(false)
                  setRequiresApprovalFilter(false)
                  setWasApprovedFilter(false)
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
            setStatusFilters([])
            setSourceFilters([])
            setSearch('')
            setSelectedDate(undefined)
            setHasIssuesFilter(false)
            setHasResolvedIssuesFilter(false)
            setRequiresApprovalFilter(false)
            setWasApprovedFilter(false)
            setPage(1)
          }}
        >
          <RotateCcwIcon className="size-4" />
          Reset Filters
        </Button>
        {pagination && (
          <div className="text-muted-foreground ml-auto text-sm">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} orders
          </div>
        )}
      </div>

      {error && <div className="text-destructive">Failed to load orders: {error.message}</div>}

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
          {(statusFilters.length > 0 ||
            sourceFilters.length > 0 ||
            selectedDate ||
            hasIssuesFilter ||
            hasResolvedIssuesFilter ||
            requiresApprovalFilter ||
            wasApprovedFilter) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {statusFilters.map((status) => (
                <span
                  key={`status-${status}`}
                  className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  Status: {status}
                  <button
                    onClick={() => setStatusFilters((prev) => prev.filter((s) => s !== status))}
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
                    onClick={() => setSourceFilters((prev) => prev.filter((s) => s !== source))}
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
                    onClick={() => {
                      setSelectedDate(undefined)
                      setPage(1)
                    }}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {hasIssuesFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Has Open Issues
                  <button
                    onClick={() => {
                      setHasIssuesFilter(false)
                      setPage(1)
                    }}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {hasResolvedIssuesFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Has Resolved Issues
                  <button
                    onClick={() => {
                      setHasResolvedIssuesFilter(false)
                      setPage(1)
                    }}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {requiresApprovalFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Requires Approval
                  <button
                    onClick={() => {
                      setRequiresApprovalFilter(false)
                      setPage(1)
                    }}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {wasApprovedFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
                  Manually Approved
                  <button
                    onClick={() => {
                      setWasApprovedFilter(false)
                      setPage(1)
                    }}
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
            hasIssuesFilter ||
            requiresApprovalFilter) && (
            <div className="space-y-2">
              {/* Warning box for orders with issues */}
              {data.ordersWithIssuesCount > 0 && !hasIssuesFilter && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                      <AlertTriangleIcon className="size-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        {data.ordersWithIssuesCount} order
                        {data.ordersWithIssuesCount !== 1 ? 's' : ''} with open issues
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        These orders require attention due to unresolved issues
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-300 bg-white text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
                    onClick={() => {
                      setHasIssuesFilter(true)
                      setPage(1)
                    }}
                  >
                    Show orders with issues
                  </Button>
                </div>
              )}

              {/* Active filter indicator for issues */}
              {hasIssuesFilter && (
                <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-900/50 dark:bg-orange-950/30">
                  <AlertTriangleIcon className="size-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Showing orders with open issues
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-orange-600 hover:bg-orange-100 hover:text-orange-800 dark:text-orange-400 dark:hover:bg-orange-900 dark:hover:text-orange-200"
                    onClick={() => {
                      setHasIssuesFilter(false)
                      setPage(1)
                    }}
                  >
                    <XIcon className="size-4" />
                    Clear filter
                  </Button>
                </div>
              )}

              {/* Info box for orders requiring approval */}
              {data.ordersRequiringApprovalCount > 0 && !requiresApprovalFilter && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <ClipboardCheckIcon className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        {data.ordersRequiringApprovalCount} order
                        {data.ordersRequiringApprovalCount !== 1 ? 's' : ''} requiring approval
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        These orders need to be reviewed and approved before processing
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    onClick={() => {
                      setRequiresApprovalFilter(true)
                      setPage(1)
                    }}
                  >
                    Show orders requiring approval
                  </Button>
                </div>
              )}

              {/* Active filter indicator for approval */}
              {requiresApprovalFilter && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-950/30">
                  <ClipboardCheckIcon className="size-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Showing orders requiring approval
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900 dark:hover:text-blue-200"
                    onClick={() => {
                      setRequiresApprovalFilter(false)
                      setPage(1)
                    }}
                  >
                    <XIcon className="size-4" />
                    Clear filter
                  </Button>
                </div>
              )}
            </div>
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
