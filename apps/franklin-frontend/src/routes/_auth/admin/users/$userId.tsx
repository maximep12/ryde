import type { UserRole, UserStatus } from '@/hooks/mutations/users/useCreateUser'
import { useUpdateUser } from '@/hooks/mutations/users/useUpdateUser'
import { useUser } from '@/hooks/queries/users/useUser'
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/admin/users/$userId')({
  component: EditUserPage,
  staticData: {
    title: 'route.editUser',
    crumb: 'route.editUser',
  },
})

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full control' },
  {
    value: 'trade_rep',
    label: 'Trade Rep',
    description: 'View access on Commercial, Sell-Out, Inventory, Reports and Amazon',
  },
  {
    value: 'data_manager',
    label: 'Data Manager',
    description: 'A trade rep that can also upload files',
  },
]

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

type FormValues = {
  email: string
  givenName: string
  familyName: string
  role: UserRole
  status: UserStatus
}

type User = {
  id: string
  email: string
  givenName: string | null
  familyName: string | null
  role: string | null
  status: string | null
}

function EditUserPage() {
  const { userId } = Route.useParams()
  const { data: user, isLoading, error } = useUser(userId)

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/users">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-muted-foreground mt-1">Update user information</p>
        </div>
      </header>

      {error && <div className="text-destructive">Failed to load user: {error.message}</div>}
      {isLoading && <div className="text-muted-foreground">Loading...</div>}
      {user && <EditUserForm userId={userId} user={user as User} />}
    </div>
  )
}

function EditUserForm({ userId, user }: { userId: string; user: User }) {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useUpdateUser()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      email: user.email ?? '',
      givenName: user.givenName ?? '',
      familyName: user.familyName ?? '',
      role: (user.role as UserRole) ?? undefined,
      status: (user.status as UserStatus) ?? undefined,
    },
  })

  // Radix Select items register in a useEffect after first paint.
  // Reset after mount so the trigger re-evaluates with registered items.
  useEffect(() => {
    reset({
      email: user.email ?? '',
      givenName: user.givenName ?? '',
      familyName: user.familyName ?? '',
      role: (user.role as UserRole) ?? undefined,
      status: (user.status as UserStatus) ?? undefined,
    })
  }, [user.id])

  const onSubmit = async (data: FormValues) => {
    try {
      await mutateAsync({
        userId,
        givenName: data.givenName || undefined,
        familyName: data.familyName || undefined,
        role: data.role,
        status: data.status,
      })
      toast.success('User updated successfully')
      navigate({ to: '/admin/users' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="givenName">First Name</Label>
              <Input id="givenName" placeholder="John" {...register('givenName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="familyName">Last Name</Label>
              <Input id="familyName" placeholder="Doe" {...register('familyName')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" disabled {...register('email')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="role"
              control={control}
              rules={{ required: 'Role is required' }}
              render={({ field }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-muted-foreground text-xs">
                      {ROLE_OPTIONS.find((r) => r.value === field.value)?.description}
                    </p>
                  )}
                </>
              )}
            />
            {errors.role && <p className="text-destructive text-sm">{errors.role.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status is required' }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-destructive text-sm">{errors.status.message}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !watch('role') || !watch('status')}>
          <SaveIcon className="size-4" />
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
