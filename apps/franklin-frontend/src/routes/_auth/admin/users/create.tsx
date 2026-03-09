import { useCreateUser, type UserRole } from '@/hooks/mutations/users/useCreateUser'
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
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/admin/users/create')({
  component: CreateUserPage,
  staticData: {
    title: 'route.createUser',
    crumb: 'route.createUser',
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

type FormValues = {
  email: string
  givenName: string
  familyName: string
  role: UserRole
}

function CreateUserPage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateUser()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: '', givenName: '', familyName: '', role: undefined },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await mutateAsync({
        email: data.email,
        givenName: data.givenName || undefined,
        familyName: data.familyName || undefined,
        role: data.role,
      })
      toast.success('User created successfully')
      navigate({ to: '/admin/users' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/users">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create User</h1>
          <p className="text-muted-foreground mt-1">Add a new user to the system</p>
        </div>
      </header>

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
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div>
                            <span className="font-medium">{r.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {r.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-destructive text-sm">{errors.role.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !watch('email') || !watch('role')}>
            <SaveIcon className="size-4" />
            {isPending ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  )
}
