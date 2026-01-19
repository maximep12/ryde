'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { FilterDivider } from '@/components/FilterDivider'
import { TableLoading } from '@/components/TableLoading'
import { useUsers } from '@/hooks/queries/users/useUsers'
import {
  Avatar,
  AvatarFallback,
  Button,
  Checkbox,
  Label,
  MultiSelect,
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
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/admin/users/')({
  component: UsersPage,
  staticData: {
    title: 'route.users',
    crumb: 'route.users',
  },
})

function getDepartmentColor(department: string) {
  const colors: Record<string, string> = {
    finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    procurement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    production_planning: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    manufacturing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    customer_service: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    it: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }
  return colors[department] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

type User = {
  id: string
  email: string
  givenName: string | null
  familyName: string | null
  department: string | null
  isActive: boolean | null
  createdAt: string
}

const PAGE_SIZE = 20

const departmentOptions = [
  { value: 'finance', label: 'Finance' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'production_planning', label: 'Production Planning' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'it', label: 'IT' },
  { value: 'external', label: 'External' },
]

function UsersPage() {
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  // Filter state
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([])
  const [showActive, setShowActive] = useState(true)
  const [showInactive, setShowInactive] = useState(true)

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDepartmentFilters, setSheetDepartmentFilters] = useState<string[]>([])
  const [sheetShowActive, setSheetShowActive] = useState(true)
  const [sheetShowInactive, setSheetShowInactive] = useState(true)

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      // Sync sheet state with current filters when opening
      setSheetDepartmentFilters(departmentFilters)
      setSheetShowActive(showActive)
      setSheetShowInactive(showInactive)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setDepartmentFilters(sheetDepartmentFilters)
    setShowActive(sheetShowActive)
    setShowInactive(sheetShowInactive)
    setPage(1)
    setSheetOpen(false)
  }

  const { data, isLoading, error } = useUsers({
    search,
    departments: departmentFilters.length > 0 ? departmentFilters : undefined,
    showActive,
    showInactive,
    page,
    pageSize: PAGE_SIZE,
  })

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'avatar',
        header: '',
        cell: ({ row }) => (
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {row.original.givenName?.[0]}
              {row.original.familyName?.[0]}
            </AvatarFallback>
          </Avatar>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'givenName',
        header: 'First Name',
        cell: ({ row }) => <span className="font-medium">{row.original.givenName || '-'}</span>,
      },
      {
        accessorKey: 'familyName',
        header: 'Last Name',
        cell: ({ row }) => <span className="font-medium">{row.original.familyName || '-'}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: 'department',
        header: t('department'),
        cell: ({ row }) =>
          row.original.department ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDepartmentColor(row.original.department)}`}
            >
              {t(`department.${row.original.department}`)}
            </span>
          ) : (
            '-'
          ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              row.original.isActive
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
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
    ],
    [t],
  )

  const users = (data?.users as User[]) ?? []
  const pagination = data?.pagination

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page when searching
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage users in the system</p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <DebouncedSearchInput
          placeholder="Search by name..."
          onSearch={handleSearch}
          value={search}
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
                <Label className="text-xs font-bold uppercase">Department</Label>
                <MultiSelect
                  options={departmentOptions}
                  value={sheetDepartmentFilters}
                  onChange={setSheetDepartmentFilters}
                  placeholder="All departments"
                />
              </div>
              <FilterDivider />
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Status</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-active"
                      checked={sheetShowActive}
                      onCheckedChange={(checked) => setSheetShowActive(checked === true)}
                    />
                    <label htmlFor="show-active" className="cursor-pointer text-sm">
                      Show active users
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-inactive"
                      checked={sheetShowInactive}
                      onCheckedChange={(checked) => setSheetShowInactive(checked === true)}
                    />
                    <label htmlFor="show-inactive" className="cursor-pointer text-sm">
                      Show inactive users
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
                  setDepartmentFilters([])
                  setShowActive(true)
                  setShowInactive(true)
                  setPage(1)
                  setSheetOpen(false)
                }}
              >
                Reset Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {pagination && (
          <div className="text-muted-foreground ml-auto text-sm">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} users
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {(departmentFilters.length > 0 || !showActive || !showInactive) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
          {departmentFilters.map((dept) => {
            const label = departmentOptions.find((d) => d.value === dept)?.label || dept
            return (
              <span
                key={`dept-${dept}`}
                className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white"
              >
                {label}
                <button
                  onClick={() => {
                    setDepartmentFilters((prev) => prev.filter((d) => d !== dept))
                    setPage(1)
                  }}
                  className="ml-0.5 hover:text-gray-300"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )
          })}
          {!showActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
              Hiding active users
              <button
                onClick={() => {
                  setShowActive(true)
                  setPage(1)
                }}
                className="ml-0.5 hover:text-gray-300"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          )}
          {!showInactive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
              Hiding inactive users
              <button
                onClick={() => {
                  setShowInactive(true)
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

      {error && <div className="text-destructive">Failed to load users: {error.message}</div>}

      {isLoading && <TableLoading />}

      {data && (
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
                    No users found.
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
    </div>
  )
}
