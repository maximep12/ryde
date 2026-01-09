'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import {
  ForecastItem,
  useForecasts,
  useForecastsFilterOptions,
} from '@/hooks/queries/forecasts/useForecasts'
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
  GlobeIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/forecasts/')({
  component: ForecastsPage,
  staticData: {
    title: 'route.supplyDemandForecasts',
    crumb: 'route.supplyDemandForecasts',
  },
})

function getPlantAcronym(plantName: string | null) {
  if (!plantName) return '-'
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function ForecastsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    country: false,
    seller: false,
    sourceYear: false,
  })
  const [regionFilters, setRegionFilters] = useState<string[]>([])
  const [countryFilters, setCountryFilters] = useState<string[]>([])
  const [brandFilters, setBrandFilters] = useState<string[]>([])
  const [plantFilters, setPlantFilters] = useState<string[]>([])
  const [yearFilters, setYearFilters] = useState<number[]>([])
  const [monthFilters, setMonthFilters] = useState<number[]>([])
  const [negativeSalesOnly, setNegativeSalesOnly] = useState(false)
  const [positiveSalesOnly, setPositiveSalesOnly] = useState(false)
  const [clientStatusFilter, setClientStatusFilter] = useState<'active' | 'inactive' | null>(null)
  const pageSize = 25

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetRegionFilters, setSheetRegionFilters] = useState<string[]>([])
  const [sheetCountryFilters, setSheetCountryFilters] = useState<string[]>([])
  const [sheetBrandFilters, setSheetBrandFilters] = useState<string[]>([])
  const [sheetPlantFilters, setSheetPlantFilters] = useState<string[]>([])
  const [sheetYearFilters, setSheetYearFilters] = useState<string[]>([])
  const [sheetMonthFilters, setSheetMonthFilters] = useState<string[]>([])
  const [sheetNegativeSalesOnly, setSheetNegativeSalesOnly] = useState(false)
  const [sheetPositiveSalesOnly, setSheetPositiveSalesOnly] = useState(false)
  const [sheetClientStatusFilter, setSheetClientStatusFilter] = useState<'active' | 'inactive' | null>(null)

  // Fetch filter options
  const { data: filterOptions } = useForecastsFilterOptions()

  const regionOptions = useMemo(
    () =>
      filterOptions?.regions.map((r) => ({
        value: r.value ?? '',
        label: `${r.value} (${r.count})`,
      })) ?? [],
    [filterOptions],
  )

  const countryOptions = useMemo(
    () =>
      filterOptions?.countries.map((c) => ({
        value: c.value ?? '',
        label: `${c.value} (${c.count})`,
      })) ?? [],
    [filterOptions],
  )

  const brandOptions = useMemo(
    () =>
      filterOptions?.brands
        .slice(0, 50) // Limit to top 50 brands
        .map((b) => ({
          value: b.value ?? '',
          label: `${b.value} (${b.count})`,
        })) ?? [],
    [filterOptions],
  )

  const plantOptions = useMemo(
    () =>
      filterOptions?.plants.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const yearOptions = useMemo(
    () =>
      filterOptions?.years.map((y) => ({
        value: String(y.value ?? ''),
        label: `${y.value} (${y.count})`,
      })) ?? [],
    [filterOptions],
  )

  const monthOptions = useMemo(
    () =>
      filterOptions?.months.map((m) => ({
        value: String(m.value ?? ''),
        label: `${MONTH_NAMES[(m.value ?? 1) - 1]} (${m.count})`,
      })) ?? [],
    [filterOptions],
  )

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetRegionFilters(regionFilters)
      setSheetCountryFilters(countryFilters)
      setSheetBrandFilters(brandFilters)
      setSheetPlantFilters(plantFilters)
      setSheetYearFilters(yearFilters.map(String))
      setSheetMonthFilters(monthFilters.map(String))
      setSheetNegativeSalesOnly(negativeSalesOnly)
      setSheetPositiveSalesOnly(positiveSalesOnly)
      setSheetClientStatusFilter(clientStatusFilter)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setRegionFilters(sheetRegionFilters)
    setCountryFilters(sheetCountryFilters)
    setBrandFilters(sheetBrandFilters)
    setPlantFilters(sheetPlantFilters)
    setYearFilters(sheetYearFilters.map(Number))
    setMonthFilters(sheetMonthFilters.map(Number))
    setNegativeSalesOnly(sheetNegativeSalesOnly)
    setPositiveSalesOnly(sheetPositiveSalesOnly)
    setClientStatusFilter(sheetClientStatusFilter)
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

  const { data, isLoading, error } = useForecasts({
    page,
    pageSize,
    search: search || undefined,
    regions: regionFilters.length > 0 ? regionFilters : undefined,
    countries: countryFilters.length > 0 ? countryFilters : undefined,
    brands: brandFilters.length > 0 ? brandFilters : undefined,
    plants: plantFilters.length > 0 ? plantFilters : undefined,
    years: yearFilters.length > 0 ? yearFilters : undefined,
    months: monthFilters.length > 0 ? monthFilters : undefined,
    negativeSalesOnly: negativeSalesOnly || undefined,
    positiveSalesOnly: positiveSalesOnly || undefined,
    clientStatus: clientStatusFilter || undefined,
    sortBy,
    sortOrder,
  })

  const columns = useMemo<ColumnDef<ForecastItem>[]>(
    () => [
      {
        accessorKey: 'region',
        header: () => <GlobeIcon className="size-4" />,
        size: 60,
        cell: ({ row }) => <span className="text-xs">{row.original.region ?? '-'}</span>,
      },
      {
        accessorKey: 'country',
        header: 'Ctry',
        size: 50,
        cell: ({ row }) => (
          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-slate-800">
            {row.original.country}
          </span>
        ),
      },
      {
        accessorKey: 'client',
        header: 'Client',
        cell: ({ row }) => {
          const isInactive = row.original.clientActive?.toLowerCase() === 'n'
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex max-w-[120px] items-center gap-1 text-xs">
                  {isInactive && <XIcon className="size-3 shrink-0 text-red-500" />}
                  <span className="truncate">{row.original.client ?? '-'}</span>
                </span>
              </TooltipTrigger>
              {row.original.client && (
                <TooltipContent className="max-w-[400px] bg-black text-white">
                  {row.original.client}
                  {isInactive && <span className="ml-1 text-red-400">(Inactive)</span>}
                </TooltipContent>
              )}
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'brand',
        header: 'Brand',
        size: 120,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <span className="max-w-[100px] rounded bg-blue-100 px-2 py-0.5 text-center text-xs dark:bg-blue-900">
              {row.original.brand ?? '-'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'productDescription',
        header: 'Product',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px]">
                <p className="truncate text-sm">{row.original.productDescription ?? '-'}</p>
                {row.original.productCode && (
                  <p className="text-muted-foreground font-mono text-xs">
                    {row.original.productCode}
                  </p>
                )}
              </div>
            </TooltipTrigger>
            {row.original.productDescription && (
              <TooltipContent className="max-w-[400px] bg-black text-white">
                <p>{row.original.productDescription}</p>
                {row.original.productCode && (
                  <p className="text-xs text-gray-400">{row.original.productCode}</p>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'plant',
        header: 'Plant',
        cell: ({ row }) =>
          row.original.plant ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                  {getPlantAcronym(row.original.plant)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white">{row.original.plant}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => {
          const month = row.original.month ? MONTH_NAMES[row.original.month - 1] : null
          const year = row.original.year
          if (!month && !year) return <span className="text-xs">-</span>
          return (
            <span className="text-xs">
              {month} {year}
            </span>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <span className="inline-flex min-w-[50px] items-center justify-center rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium dark:bg-slate-800">
              {row.original.quantity.toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'volume',
        header: 'Vol.',
        size: 70,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs">
            {row.original.volume
              ? parseFloat(row.original.volume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'sales',
        header: 'Sales',
        cell: ({ row }) => {
          const sales = row.original.sales ? parseFloat(row.original.sales) : null
          if (sales === null) return <div className="flex justify-end"><span className="font-mono text-xs">-</span></div>

          const formattedSales = `$${sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

          return (
            <div className="flex justify-end">
              <span className={`rounded px-2 py-0.5 font-mono text-xs text-white ${sales < 0 ? 'bg-red-600' : 'bg-green-600'}`}>
                {formattedSales}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'seller',
        header: 'Seller',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[120px] truncate text-xs">{row.original.seller ?? '-'}</span>
            </TooltipTrigger>
            {row.original.seller && (
              <TooltipContent className="bg-black text-white">{row.original.seller}</TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        accessorKey: 'sourceYear',
        header: 'Source Year',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.sourceYear ?? '-'}</span>
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
    regionFilters.length > 0 ||
    countryFilters.length > 0 ||
    brandFilters.length > 0 ||
    plantFilters.length > 0 ||
    yearFilters.length > 0 ||
    monthFilters.length > 0 ||
    negativeSalesOnly ||
    positiveSalesOnly ||
    clientStatusFilter !== null

  const resetFilters = () => {
    setRegionFilters([])
    setCountryFilters([])
    setBrandFilters([])
    setPlantFilters([])
    setNegativeSalesOnly(false)
    setPositiveSalesOnly(false)
    setClientStatusFilter(null)
    setYearFilters([])
    setMonthFilters([])
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="text-muted-foreground size-6" />
          <h1 className="text-2xl font-bold">Forecasts</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          View sales forecasts by country, client, and product
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by client, brand, product..."
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
                  {countryFilters.length +
                    brandFilters.length +
                    plantFilters.length +
                    yearFilters.length +
                    monthFilters.length}
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
                <Label className="text-xs font-bold uppercase">Region</Label>
                <MultiSelect
                  options={regionOptions}
                  value={sheetRegionFilters}
                  onChange={setSheetRegionFilters}
                  placeholder="All regions"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Country</Label>
                <MultiSelect
                  options={countryOptions}
                  value={sheetCountryFilters}
                  onChange={setSheetCountryFilters}
                  placeholder="All countries"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Brand</Label>
                <MultiSelect
                  options={brandOptions}
                  value={sheetBrandFilters}
                  onChange={setSheetBrandFilters}
                  placeholder="All brands"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Plant</Label>
                <MultiSelect
                  options={plantOptions}
                  value={sheetPlantFilters}
                  onChange={setSheetPlantFilters}
                  placeholder="All plants"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Year</Label>
                <MultiSelect
                  options={yearOptions}
                  value={sheetYearFilters}
                  onChange={setSheetYearFilters}
                  placeholder="All years"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Month</Label>
                <MultiSelect
                  options={monthOptions}
                  value={sheetMonthFilters}
                  onChange={setSheetMonthFilters}
                  placeholder="All months"
                />
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              {/* Client Status */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Client Status</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="active-clients"
                      checked={sheetClientStatusFilter === 'active'}
                      onCheckedChange={(checked) =>
                        setSheetClientStatusFilter(checked ? 'active' : null)
                      }
                    />
                    <label htmlFor="active-clients" className="cursor-pointer text-sm">
                      Show only active clients
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="inactive-clients"
                      checked={sheetClientStatusFilter === 'inactive'}
                      onCheckedChange={(checked) =>
                        setSheetClientStatusFilter(checked ? 'inactive' : null)
                      }
                    />
                    <label htmlFor="inactive-clients" className="cursor-pointer text-sm">
                      Show only inactive clients
                    </label>
                  </div>
                </div>
              </div>
              <div className="mx-auto h-px w-1/2 bg-gray-200 dark:bg-gray-700" />
              {/* Sales */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Sales</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="positive-sales"
                      checked={sheetPositiveSalesOnly}
                      onCheckedChange={(checked) => {
                        setSheetPositiveSalesOnly(checked === true)
                        if (checked) setSheetNegativeSalesOnly(false)
                      }}
                    />
                    <label htmlFor="positive-sales" className="cursor-pointer text-sm">
                      Show only positive sales
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="negative-sales"
                      checked={sheetNegativeSalesOnly}
                      onCheckedChange={(checked) => {
                        setSheetNegativeSalesOnly(checked === true)
                        if (checked) setSheetPositiveSalesOnly(false)
                      }}
                    />
                    <label htmlFor="negative-sales" className="cursor-pointer text-sm">
                      Show only negative sales
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
                  setRegionFilters([])
                  setCountryFilters([])
                  setBrandFilters([])
                  setPlantFilters([])
                  setYearFilters([])
                  setMonthFilters([])
                  setNegativeSalesOnly(false)
                  setPositiveSalesOnly(false)
                  setClientStatusFilter(null)
                  setPage(1)
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
                  columnId === 'region'
                    ? 'Region'
                    : columnId === 'country'
                      ? 'Ctry'
                      : columnId === 'client'
                        ? 'Client'
                        : columnId === 'brand'
                          ? 'Brand'
                          : columnId === 'productDescription'
                            ? 'Product'
                            : columnId === 'plant'
                              ? 'Plant'
                              : columnId === 'period'
                                ? 'Period'
                                : columnId === 'quantity'
                                  ? 'Qty'
                                  : columnId === 'volume'
                                    ? 'Vol.'
                                    : columnId === 'sales'
                                      ? 'Sales'
                                      : columnId === 'seller'
                                        ? 'Seller'
                                        : columnId === 'sourceYear'
                                          ? 'Source Year'
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

      {error && <div className="text-destructive">Failed to load forecasts: {error.message}</div>}

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
              {regionFilters.map((region) => (
                <span
                  key={`region-${region}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Region: {region}
                  <button
                    onClick={() => setRegionFilters((prev) => prev.filter((r) => r !== region))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {countryFilters.map((country) => (
                <span
                  key={`country-${country}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Country: {country}
                  <button
                    onClick={() => setCountryFilters((prev) => prev.filter((c) => c !== country))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {brandFilters.map((brand) => (
                <span
                  key={`brand-${brand}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Brand: {brand}
                  <button
                    onClick={() => setBrandFilters((prev) => prev.filter((b) => b !== brand))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {plantFilters.map((plant) => (
                <span
                  key={`plant-${plant}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Plant: {plant}
                  <button
                    onClick={() => setPlantFilters((prev) => prev.filter((p) => p !== plant))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {yearFilters.map((year) => (
                <span
                  key={`year-${year}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Year: {year}
                  <button
                    onClick={() => setYearFilters((prev) => prev.filter((y) => y !== year))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {monthFilters.map((month) => (
                <span
                  key={`month-${month}`}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                >
                  Month: {MONTH_NAMES[month - 1]}
                  <button
                    onClick={() => setMonthFilters((prev) => prev.filter((m) => m !== month))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {positiveSalesOnly && (
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                  Positive Sales Only
                  <button
                    onClick={() => setPositiveSalesOnly(false)}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {negativeSalesOnly && (
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                  Negative Sales Only
                  <button
                    onClick={() => setNegativeSalesOnly(false)}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {clientStatusFilter && (
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                  {clientStatusFilter === 'active' ? 'Active Clients' : 'Inactive Clients'}
                  <button
                    onClick={() => setClientStatusFilter(null)}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
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
                      No forecast items found.
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
