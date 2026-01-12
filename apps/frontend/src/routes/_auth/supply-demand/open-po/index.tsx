'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import {
  OpenPurchaseOrder,
  useOpenPurchaseOrders,
  useOpenPurchaseOrdersFilterOptions,
} from '@/hooks/queries/open-purchase-orders/useOpenPurchaseOrders'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { openPoSearchDefaults, openPoSearchSchema } from './searchSchema'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components'
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
  ClipboardListIcon,
  Columns3Icon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/open-po/')({
  component: OpenPOPage,
  validateSearch: openPoSearchSchema,
  staticData: {
    title: 'route.supplyDemandOpenPO',
    crumb: 'route.supplyDemandOpenPO',
  },
})

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPlantAcronym(plantName: string | null) {
  if (!plantName) return '-'
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

function parseSupplier(supplier: string | null): { name: string; id: string | null } {
  if (!supplier) return { name: '-', id: null }
  const match = supplier.match(/^(.+?)\s*\((\d+)\)$/)
  if (match) {
    return { name: match[1]!.trim(), id: match[2]! }
  }
  return { name: supplier, id: null }
}

function OpenPOPage() {
  const search = Route.useSearch()
  const {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    getArrayFilter,
    setArrayFilter,
    getSortingState,
    setSortingState,
    setPage,
  } = useUrlFilters({
    search,
    defaults: openPoSearchDefaults,
  })

  const plantFilters = getArrayFilter('plants')
  const orderTypeFilters = getArrayFilter('orderTypes')
  const supplierFilters = getArrayFilter('suppliers')
  const pageSize = filters.pageSize ?? 25

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetFilters, setSheetFilters] = useState({
    plants: [] as string[],
    orderTypes: [] as string[],
    suppliers: [] as string[],
  })

  // Fetch filter options
  const { data: filterOptions } = useOpenPurchaseOrdersFilterOptions()

  const plantOptions = useMemo(
    () =>
      filterOptions?.plants.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const orderTypeOptions = useMemo(
    () =>
      filterOptions?.orderTypes.map((t) => ({
        value: t.value ?? '',
        label: `${t.value} (${t.count})`,
      })) ?? [],
    [filterOptions],
  )

  const supplierOptions = useMemo(
    () =>
      filterOptions?.suppliers
        .slice(0, 30) // Limit to top 30
        .map((s) => ({
          value: s.value ?? '',
          label: `${s.value} (${s.count})`,
        })) ?? [],
    [filterOptions],
  )

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetFilters({
        plants: plantFilters,
        orderTypes: orderTypeFilters,
        suppliers: supplierFilters,
      })
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setFilters({
      plants: sheetFilters.plants.length > 0 ? sheetFilters.plants.join(',') : undefined,
      orderTypes: sheetFilters.orderTypes.length > 0 ? sheetFilters.orderTypes.join(',') : undefined,
      suppliers: sheetFilters.suppliers.length > 0 ? sheetFilters.suppliers.join(',') : undefined,
    })
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setFilter('search', value || undefined)
  }

  // Extract sort params from sorting state
  const sorting = getSortingState()
  const sortBy = sorting.length > 0 ? sorting[0]?.id : undefined
  const sortOrder = sorting.length > 0 ? (sorting[0]?.desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, error } = useOpenPurchaseOrders({
    page: filters.page ?? 1,
    pageSize,
    search: filters.search || undefined,
    plants: plantFilters.length > 0 ? plantFilters : undefined,
    orderTypes: orderTypeFilters.length > 0 ? orderTypeFilters : undefined,
    suppliers: supplierFilters.length > 0 ? supplierFilters : undefined,
    sortBy,
    sortOrder,
  })

  const columns = useMemo<ColumnDef<OpenPurchaseOrder>[]>(
    () => [
      {
        accessorKey: 'purchaseOrder',
        header: 'PO Number',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">{row.original.purchaseOrder}</span>
        ),
      },
      {
        accessorKey: 'material',
        header: 'Material',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px]">
                <p className="truncate text-sm">{row.original.material ?? '-'}</p>
                {row.original.materialNumber && (
                  <p className="text-muted-foreground font-mono text-xs">
                    {row.original.materialNumber}
                  </p>
                )}
              </div>
            </TooltipTrigger>
            {row.original.material && (
              <TooltipContent className="max-w-[400px] bg-black text-white">
                {row.original.material}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'plantName',
        header: 'Plant',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                {getPlantAcronym(row.original.plantName)}
              </span>
            </TooltipTrigger>
            {row.original.plantName && (
              <TooltipContent className="bg-black text-white">
                {row.original.plantName}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => {
          const { name, id } = parseSupplier(row.original.supplier)
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[200px]">
                  <p className="truncate text-sm">{name}</p>
                  {id && <p className="text-muted-foreground font-mono text-xs">{id}</p>}
                </div>
              </TooltipTrigger>
              {row.original.supplier && (
                <TooltipContent className="max-w-[400px] bg-black text-white">
                  {name}
                </TooltipContent>
              )}
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'orderQuantity',
        header: 'Order Qty',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.orderQuantity
              ? parseFloat(row.original.orderQuantity).toLocaleString()
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'quantityToBeDelivered',
        header: 'To Deliver',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.quantityToBeDelivered
              ? parseFloat(row.original.quantityToBeDelivered).toLocaleString()
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'nextScheduleLineDate',
        header: 'Next Date',
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.nextScheduleLineDate)}</span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: data?.items ?? [],
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

  const hasActiveFilters =
    plantFilters.length > 0 || orderTypeFilters.length > 0 || supplierFilters.length > 0

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <ClipboardListIcon className="text-muted-foreground size-6" />
          <h1 className="text-2xl font-bold">Open PO</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          View open purchase orders and their delivery schedules
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by PO, material, or supplier..."
          onSearch={handleSearch}
          value={filters.search ?? ''}
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
                  {plantFilters.length + orderTypeFilters.length + supplierFilters.length}
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
                <Label className="text-xs font-bold uppercase">Plant</Label>
                <MultiSelect
                  options={plantOptions}
                  value={sheetFilters.plants}
                  onChange={(plants) => setSheetFilters((prev) => ({ ...prev, plants }))}
                  placeholder="All plants"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Order Type</Label>
                <MultiSelect
                  options={orderTypeOptions}
                  value={sheetFilters.orderTypes}
                  onChange={(orderTypes) => setSheetFilters((prev) => ({ ...prev, orderTypes }))}
                  placeholder="All types"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Supplier</Label>
                <MultiSelect
                  options={supplierOptions}
                  value={sheetFilters.suppliers}
                  onChange={(suppliers) => setSheetFilters((prev) => ({ ...prev, suppliers }))}
                  placeholder="All suppliers"
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
                  resetFilters()
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
          Reset
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

      {error && (
        <div className="text-destructive">Failed to load open purchase orders: {error.message}</div>
      )}

      {isLoading && <TableLoading />}

      {data && (
        <>
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {plantFilters.map((plant) => (
                <span
                  key={`plant-${plant}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Plant: {plant}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'plants',
                        plantFilters.filter((p) => p !== plant),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {orderTypeFilters.map((type) => (
                <span
                  key={`type-${type}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Type: {type}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'orderTypes',
                        orderTypeFilters.filter((t) => t !== type),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {supplierFilters.map((supplier) => (
                <span
                  key={`supplier-${supplier}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Supplier: {supplier.substring(0, 30)}...
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'suppliers',
                        supplierFilters.filter((s) => s !== supplier),
                      )
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
                      No open purchase orders found.
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
                onClick={() => setPage(Math.max(1, (filters.page ?? 1) - 1))}
                disabled={(filters.page ?? 1) === 1}
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
                onClick={() => setPage(Math.min(pagination.totalPages, (filters.page ?? 1) + 1))}
                disabled={(filters.page ?? 1) === pagination.totalPages}
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
