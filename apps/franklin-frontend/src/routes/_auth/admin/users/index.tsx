'use no memo'

import { DebouncedSearchInput } from '@/components/DebouncedSearchInput'
import { TableLoading } from '@/components/TableLoading'
import { useUsers } from '@/hooks/queries/users/useUsers'
import {
  Avatar,
  AvatarFallback,
  Button,
  Checkbox,
  Label,
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
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/admin/users/')({
  component: UsersPage,
  staticData: {
    title: 'route.users',
    crumb: 'route.users',
  },
})

type User = {
  id: string
  email: string
  givenName: string | null
  familyName: string | null
  role: string | null
  status: string | null
  createdAt: string
}

const PAGE_SIZE = 20

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin: {
    label: 'Admin',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  data_manager: {
    label: 'Data Manager',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  trade_rep: {
    label: 'Trade Rep',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-black text-white dark:bg-white dark:text-black' },
  inactive: {
    label: 'Inactive',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

function UsersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const [showActive, setShowActive] = useState(true)
  const [showInactive, setShowInactive] = useState(true)
  const [showPending, setShowPending] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetShowActive, setSheetShowActive] = useState(true)
  const [sheetShowInactive, setSheetShowInactive] = useState(true)
  const [sheetShowPending, setSheetShowPending] = useState(true)

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setSheetShowActive(showActive)
      setSheetShowInactive(showInactive)
      setSheetShowPending(showPending)
    }
    setSheetOpen(open)
  }

  const applyFilters = () => {
    setShowActive(sheetShowActive)
    setShowInactive(sheetShowInactive)
    setShowPending(sheetShowPending)
    setPage(1)
    setSheetOpen(false)
  }

  const { data, isLoading, error } = useUsers({
    search,
    showActive,
    showInactive,
    showPending,
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
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const config = row.original.role ? ROLE_CONFIG[row.original.role] : null
          return config ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
            >
              {config.label}
            </span>
          ) : (
            '-'
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const config = row.original.status ? STATUS_CONFIG[row.original.status] : null
          return config ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
            >
              {config.label}
            </span>
          ) : (
            '-'
          )
        },
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
    [],
  )

  const users = (data?.users as User[]) ?? []
  const pagination = data?.pagination

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users in the system</p>
        </div>
        <Button asChild>
          <Link to="/admin/users/create">
            <PlusIcon className="size-4" />
            Create User
          </Link>
        </Button>
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-pending"
                      checked={sheetShowPending}
                      onCheckedChange={(checked) => setSheetShowPending(checked === true)}
                    />
                    <label htmlFor="show-pending" className="cursor-pointer text-sm">
                      Show pending users
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
                  setShowActive(true)
                  setShowInactive(true)
                  setShowPending(true)
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

      {(!showActive || !showInactive || !showPending) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
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
          {!showPending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-white">
              Hiding pending users
              <button
                onClick={() => {
                  setShowPending(true)
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
                    className={`hover:bg-muted/60 cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                    onClick={() =>
                      navigate({ to: '/admin/users/$userId', params: { userId: row.original.id } })
                    }
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
