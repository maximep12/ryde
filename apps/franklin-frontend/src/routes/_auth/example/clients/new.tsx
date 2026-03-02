import { FormSectionsCard } from '@/components/FormSectionsCard'
import { getApi } from '@/stores/api'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BuildingIcon, MapPinIcon, SaveIcon, UserIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/example/clients/new')({
  component: AddClientPage,
  staticData: {
    title: 'route.addClient',
    crumb: 'route.addClient',
  },
})

const STORE_TYPES = [
  { value: 'grocery', label: 'Grocery Store' },
  { value: 'corner_store', label: 'Corner Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'convenience_store', label: 'Convenience Store' },
  { value: 'supermarket', label: 'Supermarket' },
] as const

type StoreType = (typeof STORE_TYPES)[number]['value']

const clientFormSchema = z.object({
  storeName: z.string().min(1, { error: 'Store name is required' }),
  storeType: z.enum(['grocery', 'corner_store', 'pharmacy', 'convenience_store', 'supermarket'], {
    error: 'Store type is required',
  }),
  contactName: z.string().optional(),
  email: z
    .string()
    .min(1, { error: 'Email is required' })
    .email({ error: 'Please enter a valid email address' }),
  phone: z.string().optional(),
  billingAddress: z.string().min(1, { error: 'Street address is required' }),
  city: z.string().min(1, { error: 'City is required' }),
  state: z.string().min(1, { error: 'State/Province is required' }),
  postalCode: z.string().min(1, { error: 'Postal code is required' }),
  country: z.string().min(1, { error: 'Country is required' }),
})

type Section = 'basic' | 'contact' | 'billing'

function FormSection({
  id,
  icon: Icon,
  title,
  isActive,
  onFocus,
  errors,
  children,
}: {
  id: Section | null
  icon: React.ComponentType<{ className?: string }>
  title: string
  isActive: boolean
  onFocus: () => void
  errors?: string[]
  children: React.ReactNode
}) {
  return (
    <div
      id={`section-${id}`}
      className={`bg-card [&_label]:text-muted-foreground space-y-5 rounded-xl border p-5 transition-[box-shadow,border-color] duration-200 ${isActive ? 'border-muted-foreground/30 shadow-lg' : 'shadow-sm'}`}
      onFocus={onFocus}
    >
      <button
        type="button"
        onClick={onFocus}
        className={`hover:text-primary border-muted-foreground/10 mb-6 flex w-full cursor-pointer items-center gap-2 border-b pb-4 text-left text-lg font-semibold transition-colors ${isActive ? 'text-primary' : ''}`}
      >
        <Icon className="size-5" />
        {title}
      </button>
      {errors && errors.length > 0 && (
        <ul className="bg-destructive/10 text-destructive -mt-2 mb-4 list-disc rounded-md py-2 pr-3 pl-7 text-sm">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}

function AddClientPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    storeName: '',
    storeType: '' as StoreType | '',
    contactName: '',
    email: '',
    phone: '',
    billingAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })

  const createClient = useMutation({
    mutationFn: async (data: typeof formData) => {
      const api = getApi()
      const res = await api.example.clients.$post({
        json: {
          storeName: data.storeName,
          storeType: data.storeType as StoreType,
          email: data.email,
          contactName: data.contactName || undefined,
          phone: data.phone || undefined,
          billingAddress: data.billingAddress || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          postalCode: data.postalCode || undefined,
          country: data.country || undefined,
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error('message' in errorData ? errorData.message : 'Failed to create client')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Client created successfully', {
        description: `${data.client.storeName} has been added to the system.`,
      })
      navigate({ to: '/example/clients/$clientId', params: { clientId: String(data.client.id) } })
    },
    onError: (err) => {
      toast.error('Failed to create client', {
        description: err.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate with Zod
    const result = clientFormSchema.safeParse(formData)

    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          const field = issue.path[0] as string
          // Only keep the first error for each field
          if (!errors[field]) {
            errors[field] = issue.message
          }
        }
      })
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    // Show confirmation dialog
    setIsConfirmDialogOpen(true)
  }

  const handleConfirmCreateClient = () => {
    setIsConfirmDialogOpen(false)
    createClient.mutate(formData)
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Re-validate on change if field already has an error (hybrid approach)
    if (fieldErrors[field]) {
      validateFieldOnBlur(field, value)
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSectionClick = (section: Section) => {
    setActiveSection(section)
    scrollToSection(`section-${section}`)
  }

  // Section completion status
  const sectionStatus = {
    basic: !!(formData.storeName && formData.storeType),
    contact: !!formData.email,
    billing: !!(
      formData.billingAddress &&
      formData.city &&
      formData.state &&
      formData.postalCode &&
      formData.country
    ),
  }

  // Section error status (which sections have invalid fields)
  const sectionErrors = {
    basic: !!(fieldErrors.storeName || fieldErrors.storeType),
    contact: !!fieldErrors.email,
    billing: !!(
      fieldErrors.billingAddress ||
      fieldErrors.city ||
      fieldErrors.state ||
      fieldErrors.postalCode ||
      fieldErrors.country
    ),
  }

  // Group errors by section for display
  const sectionErrorMessages: Record<Section, string[]> = {
    basic: [fieldErrors.storeName, fieldErrors.storeType].filter(Boolean) as string[],
    contact: [fieldErrors.email].filter(Boolean) as string[],
    billing: [
      fieldErrors.billingAddress,
      fieldErrors.city,
      fieldErrors.state,
      fieldErrors.postalCode,
      fieldErrors.country,
    ].filter(Boolean) as string[],
  }

  // Validate a single field on blur
  const validateFieldOnBlur = (fieldName: keyof typeof formData, value: string) => {
    const fieldSchema = clientFormSchema.shape[fieldName]
    if (!fieldSchema) return

    const result = fieldSchema.safeParse(value)
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message
      if (errorMessage) {
        setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }))
      }
    } else if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }

  const navigationSections = [
    { id: 'basic' as Section, label: 'Basic Information' },
    { id: 'contact' as Section, label: 'Contact Information' },
    { id: 'billing' as Section, label: 'Billing Address' },
  ]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Add Client</h1>
        <p className="text-muted-foreground mt-1">Register a new client in the SAP system</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form id="create-client-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Basic Information */}
            <FormSection
              id="basic"
              icon={BuildingIcon}
              title="Basic Information"
              isActive={activeSection === 'basic'}
              onFocus={() => setActiveSection('basic')}
              errors={sectionErrorMessages.basic}
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.storeName ? 'text-destructive' : ''}`}
                    htmlFor="storeName"
                  >
                    Store Name *
                  </Label>
                  <Input
                    id="storeName"
                    placeholder="e.g., Paws & Claws Pet Emporium"
                    value={formData.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('storeName', e.target.value)}
                    className={
                      fieldErrors.storeName
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.storeType ? 'text-destructive' : ''}`}
                    htmlFor="storeType"
                  >
                    Store Type *
                  </Label>
                  <Select
                    value={formData.storeType}
                    onValueChange={(value) => handleChange('storeType', value)}
                    onOpenChange={(open) => open && setActiveSection('basic')}
                  >
                    <SelectTrigger
                      id="storeType"
                      className={`w-full ${fieldErrors.storeType ? 'border-destructive focus:ring-destructive' : ''}`}
                    >
                      <SelectValue placeholder="Select store type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* Contact Information */}
            <FormSection
              id="contact"
              icon={UserIcon}
              title="Contact Information"
              isActive={activeSection === 'contact'}
              onFocus={() => setActiveSection('contact')}
              errors={sectionErrorMessages.contact}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="pl-0.5" htmlFor="contactName">
                    Contact Name
                  </Label>
                  <Input
                    id="contactName"
                    placeholder="e.g., John Smith"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.email ? 'text-destructive' : ''}`}
                    htmlFor="email"
                  >
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="e.g., orders@store.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('email', e.target.value)}
                    className={
                      fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="pl-0.5" htmlFor="phone">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., +1-555-123-4567"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
            </FormSection>

            {/* Billing Address */}
            <FormSection
              id="billing"
              icon={MapPinIcon}
              title="Billing Address"
              isActive={activeSection === 'billing'}
              onFocus={() => setActiveSection('billing')}
              errors={sectionErrorMessages.billing}
            >
              <div className="space-y-2">
                <Label
                  className={`pl-0.5 ${fieldErrors.billingAddress ? 'text-destructive' : ''}`}
                  htmlFor="billingAddress"
                >
                  Street Address *
                </Label>
                <Input
                  id="billingAddress"
                  placeholder="e.g., 123 Pet Avenue, Suite 400"
                  value={formData.billingAddress}
                  onChange={(e) => handleChange('billingAddress', e.target.value)}
                  onBlur={(e) => validateFieldOnBlur('billingAddress', e.target.value)}
                  className={
                    fieldErrors.billingAddress
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.city ? 'text-destructive' : ''}`}
                    htmlFor="city"
                  >
                    City *
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., San Francisco"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('city', e.target.value)}
                    className={
                      fieldErrors.city ? 'border-destructive focus-visible:ring-destructive' : ''
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.state ? 'text-destructive' : ''}`}
                    htmlFor="state"
                  >
                    State / Province *
                  </Label>
                  <Input
                    id="state"
                    placeholder="e.g., CA"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('state', e.target.value)}
                    className={
                      fieldErrors.state ? 'border-destructive focus-visible:ring-destructive' : ''
                    }
                  />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.postalCode ? 'text-destructive' : ''}`}
                    htmlFor="postalCode"
                  >
                    Postal Code *
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="e.g., 94102"
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('postalCode', e.target.value)}
                    className={
                      fieldErrors.postalCode
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`pl-0.5 ${fieldErrors.country ? 'text-destructive' : ''}`}
                    htmlFor="country"
                  >
                    Country *
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g., USA"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    onBlur={(e) => validateFieldOnBlur('country', e.target.value)}
                    className={
                      fieldErrors.country ? 'border-destructive focus-visible:ring-destructive' : ''
                    }
                  />
                </div>
              </div>
            </FormSection>
          </form>
        </div>

        {/* Sidebar */}
        <div className="sticky top-4 self-start">
          <FormSectionsCard
            sections={navigationSections}
            sectionStatus={sectionStatus}
            sectionErrors={sectionErrors}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            action={
              <Button
                type="submit"
                form="create-client-form"
                className="w-full"
                disabled={
                  !Object.values(sectionStatus).every(Boolean) ||
                  Object.keys(fieldErrors).length > 0 ||
                  createClient.isPending
                }
              >
                <SaveIcon className="size-4" />
                {createClient.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            }
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Client Creation</DialogTitle>
            <DialogDescription>
              You are about to create a new client:{' '}
              <span className="font-semibold">{formData.storeName}</span>
              {formData.storeType && (
                <> ({STORE_TYPES.find((t) => t.value === formData.storeType)?.label})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateClient} disabled={createClient.isPending}>
              <SaveIcon className="size-4" />
              {createClient.isPending ? 'Creating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
