'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import {
  InventoryItem,
  useInventory,
  useInventoryFilterOptions,
} from '@/hooks/queries/inventory/useInventory'
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
  SortingState,
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
  PackageIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/inventory/')({
  component: InventoryPage,
  staticData: {
    title: 'route.supplyDemandInventory',
    crumb: 'route.supplyDemandInventory',
  },
})

function getPlantAcronym(plantName: string | null) {
  if (!plantName) return '-'
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

function InventoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [plantFilters, setPlantFilters] = useState<string[]>([])
  const [storageLocationFilters, setStorageLocationFilters] = useState<string[]>([])
  const [baseUnitFilters, setBaseUnitFilters] = useState<string[]>([])
  const pageSize = 25

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetPlantFilters, setSheetPlantFilters] = useState<string[]>([])
  const [sheetStorageLocationFilters, setSheetStorageLocationFilters] = useState<string[]>([])
  const [sheetBaseUnitFilters, setSheetBaseUnitFilters] = useState<string[]>([])

  // Fetch filter options
  const { data: filterOptions } = useInventoryFilterOptions()

  const plantOptions = useMemo(
    () =>
      filterOptions?.plants.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} - ${p.label || 'Unknown'} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const storageLocationOptions = useMemo(
    () =>
      filterOptions?.storageLocations
        .filter((l) => l.count > 5) // Only show locations with more than 5 items
        .slice(0, 30) // Limit to top 30
        .map((l) => ({
          value: l.value ?? '',
          label: `${l.value} - ${l.label || 'Unknown'} (${l.count})`,
        })) ?? [],
    [filterOptions],
  )

  const baseUnitOptions = useMemo(
    () =>
      filterOptions?.baseUnits.map((u) => ({
        value: u.value ?? '',
        label: `${u.value} (${u.count})`,
      })) ?? [],
    [filterOptions],
  )

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetPlantFilters(plantFilters)
      setSheetStorageLocationFilters(storageLocationFilters)
      setSheetBaseUnitFilters(baseUnitFilters)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setPlantFilters(sheetPlantFilters)
    setStorageLocationFilters(sheetStorageLocationFilters)
    setBaseUnitFilters(sheetBaseUnitFilters)
    setPage(1)
    setSheetOpen(false)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // Extract sort params from sorting state
  const sortBy = sorting.length > 0 ? sorting[0]?.id : undefined
  const sortOrder = sorting.length > 0 ? (sorting[0]?.desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, error } = useInventory({
    page,
    pageSize,
    search: search || undefined,
    plants: plantFilters.length > 0 ? plantFilters : undefined,
    storageLocations: storageLocationFilters.length > 0 ? storageLocationFilters : undefined,
    baseUnits: baseUnitFilters.length > 0 ? baseUnitFilters : undefined,
    sortBy,
    sortOrder,
  })

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: 'material',
        header: 'Material',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <span className="font-mono text-xs font-medium">{row.original.material}</span>
                <p className="text-muted-foreground mt-0.5 max-w-xs truncate text-xs">
                  {row.original.materialDescription ?? '-'}
                </p>
              </div>
            </TooltipTrigger>
            {row.original.materialDescription && (
              <TooltipContent className="max-w-[400px] bg-black text-white">
                {row.original.materialDescription}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'plant',
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
        accessorKey: 'storageLocation',
        header: 'Storage',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <span className="font-mono text-xs">{row.original.storageLocation ?? '-'}</span>
                {row.original.storageLocationDescription && (
                  <p className="text-muted-foreground mt-0.5 max-w-[150px] truncate text-xs">
                    {row.original.storageLocationDescription}
                  </p>
                )}
              </div>
            </TooltipTrigger>
            {row.original.storageLocationDescription && (
              <TooltipContent className="max-w-[300px] bg-black text-white">
                {row.original.storageLocationDescription}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'unrestrictedStock',
        header: 'Stock',
        cell: ({ row }) => (
          <span className="inline-flex min-w-[60px] items-center justify-center rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium dark:bg-slate-800">
            {row.original.unrestrictedStock.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'baseUnit',
        header: 'Unit',
        cell: ({ row }) => (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            {row.original.baseUnit ?? '-'}
          </span>
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
      setSorting(updater)
      setPage(1)
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  })

  const pagination = data?.pagination

  const hasActiveFilters =
    plantFilters.length > 0 || storageLocationFilters.length > 0 || baseUnitFilters.length > 0

  // Helper to get plant name from options
  const getPlantLabel = (plantCode: string) => {
    const plant = filterOptions?.plants.find((p) => p.value === plantCode)
    return plant?.label ? `${plantCode} - ${plant.label}` : plantCode
  }

  // Helper to get storage location name from options
  const getStorageLocationLabel = (locationCode: string) => {
    const location = filterOptions?.storageLocations.find((l) => l.value === locationCode)
    return location?.label ? `${locationCode} - ${location.label}` : locationCode
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <PackageIcon className="text-muted-foreground size-6" />
          <h1 className="text-2xl font-bold">Inventory</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          View stock levels by material, plant, and storage location
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by material, description, or plant..."
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
                  {plantFilters.length + storageLocationFilters.length + baseUnitFilters.length}
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
                  value={sheetPlantFilters}
                  onChange={setSheetPlantFilters}
                  placeholder="All plants"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Storage Location</Label>
                <MultiSelect
                  options={storageLocationOptions}
                  value={sheetStorageLocationFilters}
                  onChange={setSheetStorageLocationFilters}
                  placeholder="All locations"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Base Unit</Label>
                <MultiSelect
                  options={baseUnitOptions}
                  value={sheetBaseUnitFilters}
                  onChange={setSheetBaseUnitFilters}
                  placeholder="All units"
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
                  setPlantFilters([])
                  setStorageLocationFilters([])
                  setBaseUnitFilters([])
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
            setPlantFilters([])
            setStorageLocationFilters([])
            setBaseUnitFilters([])
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
            {pagination.total} items
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3Icon className="size-4" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <div className="space-y-2">
              {table.getAllLeafColumns().map((column) => {
                const columnId = column.id
                const columnHeader =
                  columnId === 'material'
                    ? 'Material'
                    : columnId === 'plant'
                      ? 'Plant'
                      : columnId === 'storageLocation'
                        ? 'Storage'
                        : columnId === 'unrestrictedStock'
                          ? 'Stock'
                          : columnId === 'baseUnit'
                            ? 'Unit'
                            : columnId
                return (
                  <div key={column.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${column.id}`}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                    />
                    <label htmlFor={`col-${column.id}`} className="cursor-pointer text-sm">
                      {columnHeader}
                    </label>
                  </div>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {error && <div className="text-destructive">Failed to load inventory: {error.message}</div>}

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
                  Plant: {getPlantLabel(plant)}
                  <button
                    onClick={() => setPlantFilters((prev) => prev.filter((p) => p !== plant))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {storageLocationFilters.map((location) => (
                <span
                  key={`location-${location}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Location: {getStorageLocationLabel(location)}
                  <button
                    onClick={() =>
                      setStorageLocationFilters((prev) => prev.filter((l) => l !== location))
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {baseUnitFilters.map((unit) => (
                <span
                  key={`unit-${unit}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Unit: {unit}
                  <button
                    onClick={() => setBaseUnitFilters((prev) => prev.filter((u) => u !== unit))}
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
                      No inventory items found.
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
