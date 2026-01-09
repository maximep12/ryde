'use no memo'

import { ActiveFilterBar, AlertBox, AlertBoxContainer } from '@/components/AlertBox'
import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import {
  ProductStatus,
  ReportItem,
  useReports,
  useReportsFilterOptions,
} from '@/hooks/queries/reports/useReports'
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
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  Columns3Icon,
  FileTextIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/reports/')({
  component: ReportsPage,
  staticData: {
    title: 'route.supplyDemandReports',
    crumb: 'route.supplyDemandReports',
  },
})

function getPlantAcronym(plantName: string) {
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

// Risk level styling (for stock health)
function getRiskColor(risk: string) {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[risk] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

function getRiskLabel(risk: string) {
  const labels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }
  return labels[risk] || risk
}

// Product status styling (for material lifecycle: 03=In-Use, 04=Phase Out, 05=Obsolete)
function getProductStatusDotColor(status: ProductStatus) {
  const colors: Record<string, string> = {
    '03': 'bg-green-500', // Active/In-Use
    '04': 'bg-yellow-500', // Phase Out
    '05': 'bg-red-500', // Obsolete
  }
  return status ? colors[status] || 'bg-gray-400' : 'bg-gray-400'
}

function getProductStatusLabel(status: ProductStatus) {
  const labels: Record<string, string> = {
    '03': 'In-Use',
    '04': 'Phase Out',
    '05': 'Obsolete',
  }
  return status ? labels[status] || 'Unknown' : 'Unknown'
}

// Risk level options with contextual labels
const RISK_LEVEL_OPTIONS = [
  { value: 'high', label: 'High (Negative stock projected)' },
  { value: 'medium', label: 'Medium (Below safety stock)' },
  { value: 'low', label: 'Low (Healthy stock levels)' },
]

// Product status options
const PRODUCT_STATUS_OPTIONS = [
  { value: '03', label: 'In-Use (Active)' },
  { value: '04', label: 'Phase Out' },
  { value: '05', label: 'Obsolete' },
]

// Generate next problem period options (current month through December next year)
function generateProblemPeriodOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const endYear = currentYear + 1
  const endMonth = 12

  const monthNames = [
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

  let year = currentYear
  let month = currentMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const value = `${year}-${String(month).padStart(2, '0')}`
    const label = `${monthNames[month - 1]} ${year}`
    options.push({ value, label })

    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return options
}

const PROBLEM_PERIOD_OPTIONS = generateProblemPeriodOptions()

// Helper to get the next N months as YYYY-MM strings
function getNextNMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1 // 1-indexed

  for (let i = 0; i < n; i++) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return months
}

function ReportsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [plantNameFilters, setPlantNameFilters] = useState<string[]>([])
  const [riskLevelFilters, setRiskLevelFilters] = useState<string[]>([])
  const [productStatusFilters, setProductStatusFilters] = useState<string[]>([])
  const [nextProblemPeriodFilter, setNextProblemPeriodFilter] = useState<string[]>([])
  const [needsValidationFilter, setNeedsValidationFilter] = useState(false)
  const pageSize = 25

  // Get the next 3 months for the "problems" shortcut
  const next3Months = useMemo(() => getNextNMonths(3), [])

  // Derived state - is the "problems in next 3 months" filter active?
  const isProblemsNext3MonthsActive = useMemo(() => {
    const hasHighMediumRisk =
      riskLevelFilters.length === 2 &&
      riskLevelFilters.includes('high') &&
      riskLevelFilters.includes('medium')
    const hasNext3MonthsPeriod =
      nextProblemPeriodFilter.length === 3 &&
      next3Months.every((m) => nextProblemPeriodFilter.includes(m))
    return hasHighMediumRisk && hasNext3MonthsPeriod
  }, [riskLevelFilters, nextProblemPeriodFilter, next3Months])

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetPlantNameFilters, setSheetPlantNameFilters] = useState<string[]>([])
  const [sheetRiskLevelFilters, setSheetRiskLevelFilters] = useState<string[]>([])
  const [sheetProductStatusFilters, setSheetProductStatusFilters] = useState<string[]>([])
  const [sheetNextProblemPeriodFilter, setSheetNextProblemPeriodFilter] = useState<string[]>([])
  const [sheetNeedsValidationFilter, setSheetNeedsValidationFilter] = useState(false)

  // Fetch filter options
  const { data: filterOptions } = useReportsFilterOptions()

  const plantNameOptions = useMemo(
    () =>
      filterOptions?.plantNames.map((p) => ({
        value: p.value ?? '',
        label: `${p.value} (${p.count})`,
      })) ?? [],
    [filterOptions],
  )

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetPlantNameFilters(plantNameFilters)
      setSheetRiskLevelFilters(riskLevelFilters)
      setSheetProductStatusFilters(productStatusFilters)
      setSheetNextProblemPeriodFilter(nextProblemPeriodFilter)
      setSheetNeedsValidationFilter(needsValidationFilter)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setPlantNameFilters(sheetPlantNameFilters)
    setRiskLevelFilters(sheetRiskLevelFilters)
    setProductStatusFilters(sheetProductStatusFilters)
    setNextProblemPeriodFilter(sheetNextProblemPeriodFilter)
    setNeedsValidationFilter(sheetNeedsValidationFilter)
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

  const { data, isLoading, error } = useReports({
    page,
    pageSize,
    search: search || undefined,
    plantNames: plantNameFilters.length > 0 ? plantNameFilters : undefined,
    riskLevels: riskLevelFilters.length > 0 ? riskLevelFilters : undefined,
    productStatuses: productStatusFilters.length > 0 ? productStatusFilters : undefined,
    nextProblemPeriods: nextProblemPeriodFilter.length > 0 ? nextProblemPeriodFilter : undefined,
    needsValidation: needsValidationFilter || undefined,
    sortBy,
    sortOrder,
  })

  // Problems count from backend (counts reports with problems in next 3 months)
  const problemsNext3MonthsCount = data?.reportsWithProblemsNext3MonthsCount ?? 0

  const columns = useMemo<ColumnDef<ReportItem>[]>(
    () => [
      {
        id: 'validationStatus',
        header: '',
        cell: ({ row }) => {
          const needsValidation =
            row.original.validationStatus === 'pending' || row.original.validationStatus === 'stale'
          if (!needsValidation) return null
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <ClipboardCheckIcon className="size-4 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white">
                {row.original.validationStatus === 'stale'
                  ? 'Validation expired (older than 3 months)'
                  : 'Requires validation'}
              </TooltipContent>
            </Tooltip>
          )
        },
        enableSorting: false,
        size: 8,
        maxSize: 8,
        minSize: 8,
      },
      {
        accessorKey: 'materialNumber',
        header: 'Material',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-start gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${getProductStatusDotColor(row.original.productStatus)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-black text-white">
                    {getProductStatusLabel(row.original.productStatus)}
                  </TooltipContent>
                </Tooltip>
                <div>
                  <span className="font-mono text-xs font-medium">
                    {row.original.materialNumber}
                  </span>
                  <p className="text-muted-foreground mt-0.5 max-w-xs truncate text-xs">
                    {row.original.materialDescription ?? '-'}
                  </p>
                </div>
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
        accessorKey: 'currentStock',
        header: 'Current Stock',
        cell: ({ row }) => (
          <span className="inline-flex min-w-[60px] items-center justify-center rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium dark:bg-slate-800">
            {row.original.currentStock.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'safetyStock',
        header: 'Safety Stock',
        cell: ({ row }) => (
          <span className="inline-flex min-w-[60px] items-center justify-center rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium dark:bg-slate-800">
            {row.original.safetyStock.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'risk',
        header: 'Risk',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRiskColor(row.original.risk)}`}
          >
            {getRiskLabel(row.original.risk)}
          </span>
        ),
      },
      {
        accessorKey: 'firstProblemDate',
        header: 'Next Problem',
        cell: ({ row }) => {
          if (!row.original.firstProblemDate) {
            return <span className="text-muted-foreground text-xs">-</span>
          }
          const date = new Date(row.original.firstProblemDate)
          return (
            <span className="text-xs">
              {date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </span>
          )
        },
      },
      {
        id: 'lastValidatedAt',
        accessorKey: 'validatedAt',
        header: 'Last Validated',
        cell: ({ row }) => {
          if (!row.original.validatedAt) {
            return <span className="text-muted-foreground font-bold">-</span>
          }
          const date = new Date(row.original.validatedAt)
          return (
            <span className="text-xs">
              {date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link
            to="/supply-demand/reports/$plantName/$materialNumber"
            params={{
              plantName: encodeURIComponent(row.original.plantName),
              materialNumber: row.original.materialNumber,
            }}
            className="flex items-center justify-end text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
          >
            <ChevronRightIcon className="size-5" />
          </Link>
        ),
        enableSorting: false,
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
    plantNameFilters.length > 0 ||
    riskLevelFilters.length > 0 ||
    productStatusFilters.length > 0 ||
    nextProblemPeriodFilter.length > 0 ||
    needsValidationFilter

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <FileTextIcon className="text-muted-foreground size-6" />
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Stock forecast analysis and problem detection by plant and material
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
                  {plantNameFilters.length +
                    riskLevelFilters.length +
                    productStatusFilters.length +
                    nextProblemPeriodFilter.length +
                    (needsValidationFilter ? 1 : 0)}
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
                  value={sheetPlantNameFilters}
                  onChange={setSheetPlantNameFilters}
                  placeholder="All plants"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Risk Level</Label>
                <MultiSelect
                  options={RISK_LEVEL_OPTIONS}
                  value={sheetRiskLevelFilters}
                  onChange={setSheetRiskLevelFilters}
                  placeholder="All risk levels"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Material Status</Label>
                <MultiSelect
                  options={PRODUCT_STATUS_OPTIONS}
                  value={sheetProductStatusFilters}
                  onChange={setSheetProductStatusFilters}
                  placeholder="All statuses"
                />
              </div>
              <FilterDivider />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Next Problem Period</Label>
                <MultiSelect
                  options={PROBLEM_PERIOD_OPTIONS}
                  value={sheetNextProblemPeriodFilter}
                  onChange={setSheetNextProblemPeriodFilter}
                  placeholder="Any period"
                />
              </div>
              <FilterDivider />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="needs-validation-filter"
                  checked={sheetNeedsValidationFilter}
                  onCheckedChange={(checked) => setSheetNeedsValidationFilter(!!checked)}
                />
                <Label htmlFor="needs-validation-filter" className="cursor-pointer text-sm">
                  Show only reports requiring validation
                </Label>
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
                  setPlantNameFilters([])
                  setRiskLevelFilters([])
                  setProductStatusFilters([])
                  setNextProblemPeriodFilter([])
                  setNeedsValidationFilter(false)
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
            setPlantNameFilters([])
            setRiskLevelFilters([])
            setProductStatusFilters([])
            setNextProblemPeriodFilter([])
            setNeedsValidationFilter(false)
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
                if (column.id === 'actions' || column.id === 'validationStatus') return null
                const columnHeader =
                  column.id === 'materialNumber'
                    ? 'Material'
                    : column.id === 'plantName'
                      ? 'Plant'
                      : column.id === 'currentStock'
                        ? 'Current Stock'
                        : column.id === 'safetyStock'
                          ? 'Safety Stock'
                          : column.id === 'risk'
                            ? 'Risk'
                            : column.id === 'firstProblemDate'
                              ? 'Next Problem'
                              : column.id === 'lastValidatedAt'
                                ? 'Last Validated'
                                : column.id
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
                    onClick={() => setPlantNameFilters((prev) => prev.filter((p) => p !== plant))}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              {riskLevelFilters.map((risk) => {
                const option = RISK_LEVEL_OPTIONS.find((o) => o.value === risk)
                return (
                  <span
                    key={`risk-${risk}`}
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                  >
                    Risk: {option?.label ?? risk}
                    <button
                      onClick={() => setRiskLevelFilters((prev) => prev.filter((r) => r !== risk))}
                      className="ml-0.5 hover:text-gray-300"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                )
              })}
              {productStatusFilters.map((status) => {
                const option = PRODUCT_STATUS_OPTIONS.find((o) => o.value === status)
                return (
                  <span
                    key={`status-${status}`}
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                  >
                    Status: {option?.label ?? status}
                    <button
                      onClick={() =>
                        setProductStatusFilters((prev) => prev.filter((s) => s !== status))
                      }
                      className="ml-0.5 hover:text-gray-300"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                )
              })}
              {nextProblemPeriodFilter.map((period) => {
                const option = PROBLEM_PERIOD_OPTIONS.find((o) => o.value === period)
                return (
                  <span
                    key={`period-${period}`}
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
                  >
                    Next Problem: {option?.label ?? period}
                    <button
                      onClick={() =>
                        setNextProblemPeriodFilter((prev) => prev.filter((p) => p !== period))
                      }
                      className="ml-0.5 hover:text-gray-300"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                )
              })}
              {needsValidationFilter && (
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                  Requires Validation
                  <button
                    onClick={() => setNeedsValidationFilter(false)}
                    className="ml-0.5 hover:text-gray-300"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Alert boxes */}
          {problemsNext3MonthsCount > 0 ||
          isProblemsNext3MonthsActive ||
          data.reportsNeedingValidationCount > 0 ||
          needsValidationFilter ? (
            <AlertBoxContainer>
              {/* Problems alert box or active filter bar */}
              {problemsNext3MonthsCount > 0 && !isProblemsNext3MonthsActive && (
                <AlertBox
                  variant="red"
                  icon={AlertTriangleIcon}
                  title={`${problemsNext3MonthsCount} item${problemsNext3MonthsCount !== 1 ? 's' : ''} with stock problems in the next 3 months`}
                  description="These items have projected stock issues that need attention"
                  actionLabel="Show problems only"
                  onAction={() => {
                    setRiskLevelFilters(['high', 'medium'])
                    setNextProblemPeriodFilter(next3Months)
                    setPage(1)
                  }}
                />
              )}
              {isProblemsNext3MonthsActive && (
                <ActiveFilterBar
                  variant="red"
                  icon={AlertTriangleIcon}
                  label="Showing reports with stock problems in the next 3 months"
                  onClear={() => {
                    setRiskLevelFilters([])
                    setNextProblemPeriodFilter([])
                    setPage(1)
                  }}
                />
              )}

              {/* Validation alert box or active filter bar */}
              {data.reportsNeedingValidationCount > 0 && !needsValidationFilter && (
                <AlertBox
                  variant="blue"
                  icon={ClipboardCheckIcon}
                  title={`${data.reportsNeedingValidationCount} report${data.reportsNeedingValidationCount !== 1 ? 's' : ''} requiring validation`}
                  description="These reports have never been validated or their validation is older than 3 months"
                  actionLabel="Show reports requiring validation"
                  onAction={() => {
                    setNeedsValidationFilter(true)
                    setPage(1)
                  }}
                />
              )}
              {needsValidationFilter && (
                <ActiveFilterBar
                  variant="blue"
                  icon={ClipboardCheckIcon}
                  label="Showing reports requiring validation"
                  onClear={() => {
                    setNeedsValidationFilter(false)
                    setPage(1)
                  }}
                />
              )}
            </AlertBoxContainer>
          ) : null}

          <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-muted/50 border-b">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="font-semibold"
                        style={{
                          width:
                            header.id === 'validationStatus'
                              ? `${header.column.getSize()}px`
                              : undefined,
                        }}
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
                      className={`cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50`}
                      onClick={() => {
                        window.location.href = `/supply-demand/reports/${encodeURIComponent(row.original.plantName)}/${row.original.materialNumber}`
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="py-2"
                          style={{
                            width:
                              cell.column.id === 'validationStatus'
                                ? `${cell.column.getSize()}px`
                                : undefined,
                          }}
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
