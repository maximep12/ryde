import { DataTable } from '@/components/DataTable'
import { useUsers } from '@/hooks/queries/users/useUsers'
import { Avatar, AvatarFallback, Badge, Skeleton } from '@repo/ui/components'
import { ColumnDef } from '@tanstack/react-table'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'

export const Route = createFileRoute('/_auth/users/')({
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
  isActive: boolean | null
  createdAt: string
}

function UsersPage() {
  const { data, isLoading, error } = useUsers()

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
        cell: ({ row }) => row.original.givenName || '-',
      },
      {
        accessorKey: 'familyName',
        header: 'Last Name',
        cell: ({ row }) => row.original.familyName || '-',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'primary' : 'transparent'}>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
    ],
    [],
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage users in the system</p>
      </header>

      {error && <div className="text-destructive">Failed to load users: {error.message}</div>}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {data && <DataTable columns={columns} data={data.users as User[]} />}
    </div>
  )
}
