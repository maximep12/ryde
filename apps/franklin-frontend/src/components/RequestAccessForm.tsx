import { getApi } from '@/stores/api'
import { Button, Input, Label } from '@repo/ui/components'
import { cn } from '@repo/ui/lib'
import { CheckCircleIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'

type FormValues = {
  givenName: string
  familyName: string
  email: string
}

interface RequestAccessFormProps extends React.ComponentProps<'div'> {
  onBack: () => void
}

export function RequestAccessForm({ className, onBack, ...props }: RequestAccessFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    try {
      const api = getApi()
      const res = await api.auth['request-access'].$post({
        json: {
          email: data.email,
          givenName: data.givenName || undefined,
          familyName: data.familyName || undefined,
        },
      })

      if (!res.ok) {
        const body = await res.json()
        const message = 'message' in body ? String(body.message) : 'Something went wrong'
        if (message === 'emailAlreadyExists') {
          setError('email', { message: 'An account with this email already exists' })
        } else {
          setError('root', { message })
        }
      }
    } catch {
      setError('root', { message: 'An error occurred. Please try again.' })
    }
  }

  if (isSubmitSuccessful) {
    return (
      <div className={cn('flex flex-col items-center gap-4 text-center', className)} {...props}>
        <CheckCircleIcon className="text-primary size-12" />
        <div>
          <h2 className="text-xl font-bold">Request sent!</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            An admin will review your request and activate your account.
          </p>
        </div>
        <button onClick={onBack} className="text-muted-foreground text-sm underline">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Request access</h1>
        <p className="text-muted-foreground text-sm">
          Fill in your details and an admin will activate your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        {errors.root && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="givenName">First name</Label>
            <Input id="givenName" placeholder="John" {...register('givenName')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="familyName">Last name</Label>
            <Input id="familyName" placeholder="Doe" {...register('familyName')} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Request access'}
        </Button>
      </form>

      <button onClick={onBack} className="text-muted-foreground text-center text-sm underline">
        Back to sign in
      </button>
    </div>
  )
}
