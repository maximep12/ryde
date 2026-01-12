'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import {
  OneLineSdItem,
  useOneLineSd,
  useOneLineSdFilterOptions,
} from '@/hooks/queries/one-line-sd/useOneLineSd'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { oneLineSdSearchDefaults, oneLineSdSearchSchema } from './searchSchema'
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
  Columns3Icon,
  FileSpreadsheetIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/one-line-sd/')({
  component: OneLineSdPage,
  validateSearch: oneLineSdSearchSchema,
  staticData: {
    title: 'route.supplyDemandOneLineSd',
    crumb: 'route.supplyDemandOneLineSd',
  },
})

function getPlantAcronym(plantName: string) {
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

function OneLineSdPage() {
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
    defaults: oneLineSdSearchDefaults,
  })

  const plantNameFilters = getArrayFilter('plantNames')
  const materialGroupFilters = getArrayFilter('materialGroups')
  const purchasingGroupFilters = getArrayFilter('purchasingGroups')
  const pageSize = filters.pageSize ?? 25

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetFilters, setSheetFilters] = useState({
    plantNames: [] as string[],
    materialGroups: [] as string[],
    purchasingGroups: [] as string[],
  })

  // Fetch filter options
  const { data: filterOptions } = useOneLineSdFilterOptions()

  const plantNameOptions = useMemo(
    () =>
      filterOptions?.plantNames.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const materialGroupOptions = useMemo(
    () =>
      filterOptions?.materialGroups.map((m) => ({
        value: m.value ?? '',
        label: `${m.value} (${m.count})`,
      })) ?? [],
    [filterOptions],
  )

  const purchasingGroupOptions = useMemo(
    () =>
      filterOptions?.purchasingGroups.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} - ${p.label || 'Unknown'} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetFilters({
        plantNames: plantNameFilters,
        materialGroups: materialGroupFilters,
        purchasingGroups: purchasingGroupFilters,
      })
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setFilters({
      plantNames:
        sheetFilters.plantNames.length > 0 ? sheetFilters.plantNames.join(',') : undefined,
      materialGroups:
        sheetFilters.materialGroups.length > 0 ? sheetFilters.materialGroups.join(',') : undefined,
      purchasingGroups:
        sheetFilters.purchasingGroups.length > 0
          ? sheetFilters.purchasingGroups.join(',')
          : undefined,
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

  const { data, isLoading, error } = useOneLineSd({
    page: filters.page ?? 1,
    pageSize,
    search: filters.search || undefined,
    plantNames: plantNameFilters.length > 0 ? plantNameFilters : undefined,
    materialGroups: materialGroupFilters.length > 0 ? materialGroupFilters : undefined,
    purchasingGroups: purchasingGroupFilters.length > 0 ? purchasingGroupFilters : undefined,
    sortBy,
    sortOrder,
  })

  const columns = useMemo<ColumnDef<OneLineSdItem>[]>(
    () => [
      {
        accessorKey: 'materialNumber',
        header: 'Material',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <span className="font-mono text-xs font-medium">{row.original.materialNumber}</span>
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
        accessorKey: 'plantName',
        header: 'Plant',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                {getPlantAcronym(row.original.plantName)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white">
              {row.original.plantName}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'materialGroup',
        header: 'Material Group',
        cell: ({ row }) => (
          <span className="block text-center font-mono text-xs">
            {row.original.materialGroup ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'purchasingGroup',
        header: 'Purchasing',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-xs">{row.original.purchasingGroup ?? '-'}</span>
            </TooltipTrigger>
            {row.original.purchasingGroupName && (
              <TooltipContent className="bg-black text-white">
                {row.original.purchasingGroupName}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'safetyStock',
        header: 'Safety Stock',
        cell: ({ row }) => (
          <span className="inline-flex min-w-[60px] items-center justify-center rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium dark:bg-slate-800">
            {(row.original.safetyStock ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'plannedDeliveryTime',
        header: 'Lead Time',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.plannedDeliveryTime ?? '-'} days</span>
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
    plantNameFilters.length > 0 ||
    materialGroupFilters.length > 0 ||
    purchasingGroupFilters.length > 0

  // Helper to get purchasing group name from options
  const getPurchasingGroupLabel = (groupCode: string) => {
    const group = filterOptions?.purchasingGroups.find((p) => p.value === groupCode)
    return group?.label ? `${groupCode} - ${group.label}` : groupCode
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <FileSpreadsheetIcon className="text-muted-foreground size-6" />
          <h1 className="text-2xl font-bold">One Line S&D</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Supply and demand data by material, plant, and purchasing group
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by material, description, or plant..."
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
                  {plantNameFilters.length +
                    materialGroupFilters.length +
                    purchasingGroupFilters.length}
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
                  options={plantNameOptions}
                  value={sheetFilters.plantNames}
                  onChange={(plantNames) => setSheetFilters((prev) => ({ ...prev, plantNames }))}
                  placeholder="All plants"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Material Group</Label>
                <MultiSelect
                  options={materialGroupOptions}
                  value={sheetFilters.materialGroups}
                  onChange={(materialGroups) =>
                    setSheetFilters((prev) => ({ ...prev, materialGroups }))
                  }
                  placeholder="All material groups"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Purchasing Group</Label>
                <MultiSelect
                  options={purchasingGroupOptions}
                  value={sheetFilters.purchasingGroups}
                  onChange={(purchasingGroups) =>
                    setSheetFilters((prev) => ({ ...prev, purchasingGroups }))
                  }
                  placeholder="All purchasing groups"
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
                  columnId === 'materialNumber'
                    ? 'Material'
                    : columnId === 'plantName'
                      ? 'Plant'
                      : columnId === 'materialGroup'
                        ? 'Material Group'
                        : columnId === 'purchasingGroup'
                          ? 'Purchasing'
                          : columnId === 'safetyStock'
                            ? 'Safety Stock'
                            : columnId === 'plannedDeliveryTime'
                              ? 'Lead Time'
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

      {error && <div className="text-destructive">Failed to load data: {error.message}</div>}

      {isLoading && <TableLoading />}

      {data && (
        <>
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Active filters:</span>
              {plantNameFilters.map((plant) => (
                <span
                  key={`plant-${plant}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Plant: {plant}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'plantNames',
                        plantNameFilters.filter((p) => p !== plant),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {materialGroupFilters.map((group) => (
                <span
                  key={`matgroup-${group}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Material Group: {group}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'materialGroups',
                        materialGroupFilters.filter((g) => g !== group),
                      )
                    }
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {purchasingGroupFilters.map((group) => (
                <span
                  key={`purchgroup-${group}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Purchasing: {getPurchasingGroupLabel(group)}
                  <button
                    onClick={() =>
                      setArrayFilter(
                        'purchasingGroups',
                        purchasingGroupFilters.filter((g) => g !== group),
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
                      No data found.
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
