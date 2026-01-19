import { FormSectionsCard } from '@/components/FormSectionsCard'
import { useCreateOrder } from '@/hooks/mutations/orders/useCreateOrder'
import { useParsePdf, ParsedOrderFormResponse } from '@/hooks/mutations/orders/useParsePdf'
import { useSearchClients } from '@/hooks/queries/clients/useSearchClients'
import { z } from 'zod'
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@repo/ui/components'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BuildingIcon,
  ClipboardListIcon,
  DollarSignIcon,
  FileTextIcon,
  MailIcon,
  PackageIcon,
  PaperclipIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TrashIcon,
  TruckIcon,
  UploadIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/example/orders/new')({
  component: OrderCreationPage,
  staticData: {
    title: 'route.orderCreation',
    crumb: 'route.orderCreation',
  },
})

// Constants for select options
const SALES_DOCUMENT_TYPES = [
  { value: 'OR', label: 'OR - Standard Sales Order' },
  { value: 'ZOR', label: 'ZOR - Rush Order' },
  { value: 'RE', label: 'RE - Returns Order' },
  { value: 'CR', label: 'CR - Credit Memo Request' },
] as const

const ORDER_REASONS = [
  { value: 'store_replenishment', label: 'Store Replenishment' },
  { value: 'new_product_launch', label: 'New Product Launch' },
  { value: 'seasonal_order', label: 'Seasonal Order' },
  { value: 'promotional_order', label: 'Promotional Order' },
  { value: 'customer_request', label: 'Customer Request' },
] as const

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
] as const

const PAYMENT_TERMS = [
  { value: 'NET15', label: 'NET 15' },
  { value: 'NET30', label: 'NET 30' },
  { value: 'NET45', label: 'NET 45' },
  { value: 'NET60', label: 'NET 60' },
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'PREPAID', label: 'Prepaid' },
] as const

const INCOTERMS = [
  { value: 'DAP', label: 'DAP - Delivered at Place' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FOB', label: 'FOB - Free on Board' },
  { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
] as const

const TAX_STATUSES = [
  { value: 'taxable', label: 'Taxable' },
  { value: 'exempt', label: 'Tax Exempt' },
  { value: 'zero_rated', label: 'Zero Rated' },
] as const

const CARRIER_OPTIONS = [
  { value: 'vendor_arranged', label: 'Vendor Arranged' },
  { value: 'customer_pickup', label: 'Customer Pickup' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'ltl_freight', label: 'LTL Freight' },
] as const

const PRODUCTS = [
  { sku: 'CHO-001', name: 'Dark Chocolate Truffles - 12 Pack', price: 18.99, packageType: 'Box' },
  { sku: 'CHO-002', name: 'Milk Chocolate Bar - 100g', price: 4.99, packageType: 'Wrapper' },
  { sku: 'GUM-001', name: 'Gummy Bears - 500g Bag', price: 8.99, packageType: 'Bag' },
  { sku: 'GUM-002', name: 'Sour Gummy Worms - 300g Bag', price: 6.99, packageType: 'Bag' },
  { sku: 'HRD-001', name: 'Butterscotch Drops - 200g Tin', price: 7.49, packageType: 'Tin' },
  { sku: 'HRD-002', name: 'Fruit Drops Assorted - 300g Bag', price: 5.99, packageType: 'Bag' },
  { sku: 'LOL-001', name: 'Rainbow Swirl Lollipops - Box of 24', price: 12.99, packageType: 'Box' },
  { sku: 'LIC-001', name: 'Red Licorice Twists - 400g Bag', price: 6.49, packageType: 'Bag' },
  { sku: 'SFR-001', name: 'Sugar-Free Gummy Bears - 250g', price: 9.99, packageType: 'Bag' },
  { sku: 'SEA-001', name: 'Valentine Heart Chocolates - Gift Box', price: 24.99, packageType: 'Gift Box' },
  { sku: 'NIC-001', name: 'Wasabi Ginger Candy - 100g Tin', price: 11.99, packageType: 'Tin' },
  { sku: 'NIC-002', name: 'Lavender Honey Drops - 80g Bag', price: 8.49, packageType: 'Bag' },
  { sku: 'NIC-003', name: 'Activated Charcoal Mints - 50g', price: 6.99, packageType: 'Tin' },
]

const UOM_OPTIONS = [
  { value: 'EA', label: 'EA - Each' },
  { value: 'CS', label: 'CS - Case' },
  { value: 'PL', label: 'PL - Pallet' },
] as const

type OrderItem = {
  itemNumber: number
  sku: string
  name: string
  price: number
  quantity: number
  uom: string
  packageType: string
}

type SelectedClient = {
  id: number
  storeName: string
  clientCode: string
}

type Section =
  | 'identification'
  | 'customer'
  | 'commercial'
  | 'delivery'
  | 'lineItems'
  | 'attachments'
  | 'internal'

const orderFormSchema = z.object({
  orderRequestDate: z.string().min(1, { error: 'Order request date is required' }),
  customerPONumber: z.string().min(1, { error: 'Customer PO number is required' }),
  salesDocumentType: z.enum(['OR', 'ZOR', 'RE', 'CR'], {
    error: 'Sales document type is required',
  }),
  client: z
    .object({
      id: z.number(),
      storeName: z.string(),
      clientCode: z.string(),
    })
    .nullable()
    .refine((val) => val !== null, {
      error: 'Please select a client',
    }),
  currency: z.enum(['USD', 'CAD', 'EUR'], { error: 'Currency is required' }),
  paymentTerms: z.enum(['NET15', 'NET30', 'NET45', 'NET60', 'COD', 'PREPAID'], {
    error: 'Payment terms are required',
  }),
  taxStatus: z.enum(['taxable', 'exempt', 'zero_rated'], { error: 'Tax status is required' }),
  orderItems: z
    .array(
      z.object({
        itemNumber: z.number(),
        sku: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
        uom: z.string(),
        packageType: z.string(),
      }),
    )
    .min(1, { error: 'At least one line item is required' }),
  // Optional fields with format validation
  requestedByName: z
    .string()
    .min(3, { error: 'Name must be at least 3 characters' })
    .optional()
    .or(z.literal('')),
  requestedByEmail: z
    .string()
    .email({ error: 'Please enter a valid email address' })
    .optional()
    .or(z.literal('')),
})

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

function OrderCreationPage() {
  const navigate = useNavigate()
  const createOrderMutation = useCreateOrder()
  const [activeSection, setActiveSection] = useState<Section | null>(null)

  // Order Identification
  const [orderRequestDate, setOrderRequestDate] = useState(new Date().toISOString().split('T')[0])
  const [requestedByName, setRequestedByName] = useState('')
  const [requestedByEmail, setRequestedByEmail] = useState('')
  const [customerPONumber, setCustomerPONumber] = useState('')
  const [salesDocumentType, setSalesDocumentType] = useState('OR')
  const [orderReason, setOrderReason] = useState('')

  // Customer and Partner Data
  const [clientSearch, setClientSearch] = useState('')
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null)
  const [clientSelectedIndex, setClientSelectedIndex] = useState(-1)
  const [shipToLocation, setShipToLocation] = useState('')
  const [shipToCity, setShipToCity] = useState('')
  const [shipToState, setShipToState] = useState('')
  const [billToSameAsSoldTo, setBillToSameAsSoldTo] = useState(true)
  const [payerSameAsSoldTo, setPayerSameAsSoldTo] = useState(true)
  const [customerContactPhone, setCustomerContactPhone] = useState('')

  // Commercial Terms
  const [currency, setCurrency] = useState('USD')
  const [paymentTerms, setPaymentTerms] = useState('NET30')
  const [incoterm, setIncoterm] = useState('DAP')
  const [incotermLocation, setIncotermLocation] = useState('')
  const [priceAgreement, setPriceAgreement] = useState('')
  const [taxStatus, setTaxStatus] = useState('taxable')

  // Delivery and Logistics
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('')
  const [partialDeliveriesAllowed, setPartialDeliveriesAllowed] = useState(true)
  const [substitutionsAllowed, setSubstitutionsAllowed] = useState(false)
  const [carrier, setCarrier] = useState('vendor_arranged')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [receivingHours, setReceivingHours] = useState('')
  const [specialPackagingLabeling, setSpecialPackagingLabeling] = useState('')

  // Order Line Items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [lineNotes, setLineNotes] = useState('')

  // Internal Use
  const [orderEnteredBy, setOrderEnteredBy] = useState('')
  const [orderEntryDate, setOrderEntryDate] = useState(new Date().toISOString().split('T')[0])

  // PDF Upload
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseComplete, setParseComplete] = useState(false)

  // Confirmation Dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: clientResults, isLoading: isLoadingClients } = useSearchClients(clientSearch)
  const parsePdfMutation = useParsePdf()

  // Reset selected index when client results change
  useEffect(() => {
    setClientSelectedIndex(-1)
  }, [clientResults])

  const handleSelectClient = (client: SelectedClient) => {
    setSelectedClient(client)
    setClientSearch('')
    setIsClientPopoverOpen(false)
    setClientSelectedIndex(-1)
    if (fieldErrors.client) {
      validateFieldOnBlur('client', client)
    }
  }

  const handleClientSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!clientResults || clientResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setClientSelectedIndex((prev) => (prev < clientResults.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setClientSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (clientSelectedIndex >= 0 && clientSelectedIndex < clientResults.length) {
          const client = clientResults[clientSelectedIndex]
          handleSelectClient({
            id: client.id,
            storeName: client.storeName,
            clientCode: client.clientCode,
          })
        }
        break
      case 'Escape':
        setIsClientPopoverOpen(false)
        setClientSelectedIndex(-1)
        break
    }
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const product = PRODUCTS.find((p) => p.sku === selectedProduct)
    if (!product) return

    const existingItem = orderItems.find((item) => item.sku === selectedProduct)
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.sku === selectedProduct ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      )
    } else {
      const nextItemNumber =
        orderItems.length > 0 ? Math.max(...orderItems.map((i) => i.itemNumber)) + 10 : 10
      setOrderItems([
        ...orderItems,
        {
          itemNumber: nextItemNumber,
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
          uom: 'EA',
          packageType: product.packageType,
        },
      ])
    }
    setSelectedProduct('')
    if (fieldErrors.lineItems) {
      // Clear line items error since we just added a product
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.lineItems
        return next
      })
    }
  }

  const handleSetQuantity = (sku: string, value: string) => {
    const quantity = parseInt(value, 10)
    if (isNaN(quantity) || quantity < 0) return
    setOrderItems(orderItems.map((item) => (item.sku === sku ? { ...item, quantity } : item)))
  }

  const handleUpdateUom = (sku: string, uom: string) => {
    setOrderItems(orderItems.map((item) => (item.sku === sku ? { ...item, uom } : item)))
  }

  const handleRemoveItem = (sku: string) => {
    setOrderItems(orderItems.filter((item) => item.sku !== sku))
  }

  const applyParsedData = (data: ParsedOrderFormResponse) => {
    // Section A: Order Identification
    if (data.orderRequestDate) setOrderRequestDate(data.orderRequestDate)
    if (data.customerPoNumber) setCustomerPONumber(data.customerPoNumber)
    if (data.requestedByName) setRequestedByName(data.requestedByName)
    if (data.requestedByEmail) setRequestedByEmail(data.requestedByEmail)
    if (data.salesDocumentType) setSalesDocumentType(data.salesDocumentType)
    if (data.orderReason) {
      // Map order reason to select value
      const reasonMap: Record<string, string> = {
        'store replenishment': 'store_replenishment',
        'new product launch': 'new_product_launch',
        'seasonal order': 'seasonal_order',
        'promotional order': 'promotional_order',
        'customer request': 'customer_request',
        'warehouse stock build': 'store_replenishment', // Map to closest match
      }
      const normalized = data.orderReason.toLowerCase()
      const mappedReason = reasonMap[normalized]
      if (mappedReason) setOrderReason(mappedReason)
    }

    // Section B: Customer and Partner Data
    if (data.soldToPartyCode && data._meta?.clientId) {
      // If client was verified, set it directly
      setSelectedClient({
        id: data._meta.clientId,
        storeName: data.soldToPartyName || '',
        clientCode: data.soldToPartyCode,
      })
    }
    if (data.shipToCity) setShipToCity(data.shipToCity)
    if (data.shipToState) setShipToState(data.shipToState)
    if (data.shipToLocation) setShipToLocation(data.shipToLocation)
    if (data.customerContactPhone) setCustomerContactPhone(data.customerContactPhone)

    // Section C: Commercial Terms
    if (data.currency) setCurrency(data.currency)
    if (data.paymentTerms) setPaymentTerms(data.paymentTerms)
    if (data.incoterms) setIncoterm(data.incoterms)
    if (data.incotermLocation) setIncotermLocation(data.incotermLocation)
    if (data.priceAgreement) setPriceAgreement(data.priceAgreement)
    if (data.taxStatus) {
      const statusMap: Record<string, string> = {
        taxable: 'taxable',
        exempt: 'exempt',
        'tax exempt': 'exempt',
        'resale – tax exempt': 'exempt',
        'zero rated': 'zero_rated',
      }
      const normalized = data.taxStatus.toLowerCase()
      const mappedStatus = statusMap[normalized]
      if (mappedStatus) setTaxStatus(mappedStatus)
    }

    // Section D: Delivery and Logistics
    if (data.requestedDeliveryDate) setRequestedDeliveryDate(data.requestedDeliveryDate)
    if (data.partialDeliveriesAllowed !== undefined) {
      setPartialDeliveriesAllowed(data.partialDeliveriesAllowed)
    }
    if (data.substitutionsAllowed !== undefined) {
      setSubstitutionsAllowed(data.substitutionsAllowed)
    }
    if (data.carrier) {
      const carrierMap: Record<string, string> = {
        'vendor arranged': 'vendor_arranged',
        'customer pickup': 'customer_pickup',
        'customer preferred carrier': 'customer_pickup',
        fedex: 'fedex',
        ups: 'ups',
        'ltl freight': 'ltl_freight',
      }
      const normalized = data.carrier.toLowerCase()
      const mappedCarrier = carrierMap[normalized]
      if (mappedCarrier) setCarrier(mappedCarrier)
    }
    if (data.deliveryInstructions) setDeliveryInstructions(data.deliveryInstructions)
    if (data.receivingHours) setReceivingHours(data.receivingHours)
    if (data.specialPackaging) setSpecialPackagingLabeling(data.specialPackaging)

    // Section E: Order Line Items
    if (data.orderItems && data.orderItems.length > 0) {
      const items: OrderItem[] = data.orderItems
        .filter((item) => item.sku)
        .map((item, index) => {
          const product = PRODUCTS.find((p) => p.sku === item.sku)
          return {
            itemNumber: item.itemNumber || (index + 1) * 10,
            sku: item.sku!,
            name: product?.name || item.description || item.sku!,
            price: product?.price || 0,
            quantity: item.quantity || 1,
            uom: item.uom || 'EA',
            packageType: product?.packageType || item.packageType || '',
          }
        })
      setOrderItems(items)
    }
  }

  const validateParsedData = (parsed: ParsedOrderFormResponse) => {
    const errors: Record<string, string> = {}

    // Validate fields that have format requirements
    if (parsed.requestedByName) {
      const result = orderFormSchema.shape.requestedByName.safeParse(parsed.requestedByName)
      if (!result.success) {
        errors.requestedByName = result.error.issues[0]?.message || 'Invalid name'
      }
    }

    if (parsed.requestedByEmail) {
      const result = orderFormSchema.shape.requestedByEmail.safeParse(parsed.requestedByEmail)
      if (!result.success) {
        errors.requestedByEmail = result.error.issues[0]?.message || 'Invalid email'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }))
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') return

    setUploadedPdf(file)
    setIsParsing(true)
    setParseComplete(false)
    setFieldErrors({}) // Clear previous errors

    try {
      const parsed = await parsePdfMutation.mutateAsync(file)

      // Apply parsed data to form fields
      applyParsedData(parsed)

      // Validate the parsed data for format errors
      validateParsedData(parsed)

      setParseComplete(true)

      // Log warnings if any
      if (parsed._meta?.warnings && parsed._meta.warnings.length > 0) {
        console.warn('PDF parsing warnings:', parsed._meta.warnings)
      }
    } catch (err) {
      toast.error('Failed to parse PDF', {
        description: err instanceof Error ? err.message : 'An error occurred',
      })
      setUploadedPdf(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleRemovePdf = () => {
    setUploadedPdf(null)
    setParseComplete(false)
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  // Section completion status
  const sectionStatus = {
    identification: !!(orderRequestDate && customerPONumber && salesDocumentType),
    customer: !!selectedClient,
    commercial: !!(currency && paymentTerms && taxStatus),
    delivery: true, // No required fields
    lineItems: orderItems.length > 0,
    attachments: true, // No required fields
    internal: true, // No required fields
  }

  // Section error status (which sections have invalid fields)
  const sectionErrors = {
    identification: !!(
      fieldErrors.orderRequestDate ||
      fieldErrors.customerPONumber ||
      fieldErrors.salesDocumentType ||
      fieldErrors.requestedByName ||
      fieldErrors.requestedByEmail
    ),
    customer: !!fieldErrors.client,
    commercial: !!(fieldErrors.currency || fieldErrors.paymentTerms || fieldErrors.taxStatus),
    delivery: false,
    lineItems: !!fieldErrors.lineItems,
    attachments: false,
    internal: false,
  }

  // Group errors by section for display
  const sectionErrorMessages: Record<Section, string[]> = {
    identification: [
      fieldErrors.orderRequestDate,
      fieldErrors.customerPONumber,
      fieldErrors.salesDocumentType,
      fieldErrors.requestedByName,
      fieldErrors.requestedByEmail,
    ].filter(Boolean) as string[],
    customer: [fieldErrors.client].filter(Boolean) as string[],
    commercial: [fieldErrors.currency, fieldErrors.paymentTerms, fieldErrors.taxStatus].filter(
      Boolean,
    ) as string[],
    delivery: [],
    lineItems: [fieldErrors.lineItems].filter(Boolean) as string[],
    attachments: [],
    internal: [],
  }

  // Validate a single field on blur
  const validateFieldOnBlur = (fieldName: string, value: unknown) => {
    const fieldSchema = orderFormSchema.shape[fieldName as keyof typeof orderFormSchema.shape]
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
    { id: 'identification' as Section, label: 'A. Order Identification' },
    { id: 'customer' as Section, label: 'B. Customer & Partner' },
    { id: 'commercial' as Section, label: 'C. Commercial Terms' },
    { id: 'delivery' as Section, label: 'D. Delivery & Logistics' },
    { id: 'lineItems' as Section, label: 'E. Line Items' },
    { id: 'attachments' as Section, label: 'F. Attachments' },
    { id: 'internal' as Section, label: 'G. Internal Use' },
  ]

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate with Zod
    const formData = {
      orderRequestDate,
      customerPONumber,
      salesDocumentType,
      client: selectedClient,
      currency,
      paymentTerms,
      taxStatus,
      orderItems,
      requestedByName,
      requestedByEmail,
    }

    const result = orderFormSchema.safeParse(formData)

    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (field) {
          // Map 'orderItems' to 'lineItems' for section error tracking
          const mappedField = field === 'orderItems' ? 'lineItems' : field
          // Only keep the first error for each field
          if (!errors[mappedField]) {
            errors[mappedField] = issue.message
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

  const handleConfirmCreateOrder = () => {
    if (!selectedClient) return

    // Close the dialog
    setIsConfirmDialogOpen(false)

    // Build shipping address from ship-to fields or use client billing address
    const shippingAddress = shipToLocation
      ? [shipToLocation, shipToCity, shipToState].filter(Boolean).join(', ')
      : undefined

    // Create order via API
    createOrderMutation.mutate(
      {
        clientId: selectedClient.id,
        orderDate: orderRequestDate,
        shippingAddress,
        notes: lineNotes || deliveryInstructions || undefined,
        items: orderItems.map((item) => ({
          productName: item.name,
          productSku: item.sku,
          packageType: item.packageType,
          quantity: item.quantity,
          unitPrice: Math.round(item.price * 100), // Convert to cents
        })),
      },
      {
        onSuccess: (data) => {
          toast.success('Order created successfully', {
            description: `Order ${data.order.orderNumber} for ${data.order.storeName} has been created.`,
          })
          navigate({ to: '/orders/$orderId', params: { orderId: String(data.order.id) } })
        },
        onError: (err) => {
          toast.error('Failed to create order', {
            description: err.message,
          })
        },
      },
    )
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Manual Sales Order Request</h1>
        <p className="text-muted-foreground mt-1">
          Create a new sales order for orders received via email, PDF, or phone
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div>
            {/* PDF Upload Card */}
            <div className="border-primary/30 bg-primary/5 mb-6 rounded-xl border border-dashed p-5">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <SparklesIcon className="text-primary size-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Quick Fill with PDF</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Upload a filled order form PDF and we'll automatically extract the data to
                    prefill the form below.
                  </p>

                  {!uploadedPdf ? (
                    <label className="border-primary/20 bg-background hover:border-primary/40 hover:bg-primary/5 mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 transition-colors">
                      <UploadIcon className="text-primary size-4" />
                      <span className="text-primary text-sm font-medium">
                        Choose PDF file or drag and drop
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="bg-background mt-4 flex items-center gap-3 rounded-lg border px-4 py-3">
                      <FileTextIcon className="text-primary size-5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{uploadedPdf.name}</p>
                        {isParsing && (
                          <p className="text-muted-foreground text-xs">Parsing document...</p>
                        )}
                        {parseComplete && (
                          <p className="text-xs text-green-600">Fields prefilled successfully</p>
                        )}
                      </div>
                      {isParsing ? (
                        <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
                      ) : (
                        <button
                          type="button"
                          onClick={handleRemovePdf}
                          className="hover:bg-muted rounded-md p-1"
                        >
                          <XIcon className="text-muted-foreground size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form
              id="create-order-form"
              onSubmit={handleSubmitOrder}
              className="space-y-4"
              noValidate
            >
              {/* A. Order Identification */}
              <FormSection
                id="identification"
                icon={ClipboardListIcon}
                title="A. Order Identification"
                isActive={activeSection === 'identification'}
                onFocus={() => setActiveSection('identification')}
                errors={sectionErrorMessages.identification}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.orderRequestDate ? 'text-destructive' : ''}`}
                      htmlFor="orderRequestDate"
                    >
                      Order Request Date *
                    </Label>
                    <Input
                      id="orderRequestDate"
                      type="date"
                      value={orderRequestDate}
                      onChange={(e) => {
                        setOrderRequestDate(e.target.value)
                        if (fieldErrors.orderRequestDate) {
                          validateFieldOnBlur('orderRequestDate', e.target.value)
                        }
                      }}
                      onBlur={(e) => validateFieldOnBlur('orderRequestDate', e.target.value)}
                      className={
                        fieldErrors.orderRequestDate
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.customerPONumber ? 'text-destructive' : ''}`}
                      htmlFor="customerPONumber"
                    >
                      Customer PO Number (BSTKD) *
                    </Label>
                    <Input
                      id="customerPONumber"
                      placeholder="e.g., PCE-77421"
                      value={customerPONumber}
                      onChange={(e) => {
                        setCustomerPONumber(e.target.value)
                        if (fieldErrors.customerPONumber) {
                          validateFieldOnBlur('customerPONumber', e.target.value)
                        }
                      }}
                      onBlur={(e) => validateFieldOnBlur('customerPONumber', e.target.value)}
                      className={
                        fieldErrors.customerPONumber
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.requestedByName ? 'text-destructive' : ''}`}
                      htmlFor="requestedByName"
                    >
                      Requested By (Name)
                    </Label>
                    <Input
                      id="requestedByName"
                      placeholder="e.g., Sarah Johnson"
                      value={requestedByName}
                      onChange={(e) => {
                        setRequestedByName(e.target.value)
                        if (fieldErrors.requestedByName) {
                          validateFieldOnBlur('requestedByName', e.target.value)
                        }
                      }}
                      onBlur={(e) => validateFieldOnBlur('requestedByName', e.target.value)}
                      className={
                        fieldErrors.requestedByName
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.requestedByEmail ? 'text-destructive' : ''}`}
                      htmlFor="requestedByEmail"
                    >
                      Requested By (Email)
                    </Label>
                    <Input
                      id="requestedByEmail"
                      type="text"
                      placeholder="e.g., sarah.johnson@company.com"
                      value={requestedByEmail}
                      onChange={(e) => {
                        setRequestedByEmail(e.target.value)
                        if (fieldErrors.requestedByEmail) {
                          validateFieldOnBlur('requestedByEmail', e.target.value)
                        }
                      }}
                      onBlur={(e) => validateFieldOnBlur('requestedByEmail', e.target.value)}
                      className={
                        fieldErrors.requestedByEmail
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.salesDocumentType ? 'text-destructive' : ''}`}
                      htmlFor="salesDocumentType"
                    >
                      Sales Document Type (AUART) *
                    </Label>
                    <Select
                      value={salesDocumentType}
                      onValueChange={(value) => {
                        setSalesDocumentType(value)
                        if (fieldErrors.salesDocumentType) {
                          validateFieldOnBlur('salesDocumentType', value)
                        }
                      }}
                      onOpenChange={(open) => open && setActiveSection('identification')}
                    >
                      <SelectTrigger
                        id="salesDocumentType"
                        className={`w-full ${fieldErrors.salesDocumentType ? 'border-destructive focus:ring-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SALES_DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="orderReason">
                      Order Reason
                    </Label>
                    <Select
                      value={orderReason}
                      onValueChange={setOrderReason}
                      onOpenChange={(open) => open && setActiveSection('identification')}
                    >
                      <SelectTrigger id="orderReason" className="w-full">
                        <SelectValue placeholder="Select order reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>

              {/* B. Customer and Partner Data */}
              <FormSection
                id="customer"
                icon={BuildingIcon}
                title="B. Customer and Partner Data"
                isActive={activeSection === 'customer'}
                onFocus={() => setActiveSection('customer')}
                errors={sectionErrorMessages.customer}
              >
                {/* Sold-To Party */}
                <div className="space-y-2">
                  <Label className={`pl-0.5 ${fieldErrors.client ? 'text-destructive' : ''}`}>
                    Sold-To Party (Customer) *
                  </Label>
                  {selectedClient ? (
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{selectedClient.storeName}</p>
                        <p className="text-muted-foreground text-sm">{selectedClient.clientCode}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Popover
                      open={isClientPopoverOpen && clientSearch.length >= 3}
                      onOpenChange={setIsClientPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                          <Input
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value)
                              if (e.target.value.length >= 3) {
                                setIsClientPopoverOpen(true)
                              }
                            }}
                            onFocus={() => {
                              setActiveSection('customer')
                              if (clientSearch.length >= 3) {
                                setIsClientPopoverOpen(true)
                              }
                            }}
                            onKeyDown={handleClientSearchKeyDown}
                            placeholder="Search for a client..."
                            className={`pl-10 ${fieldErrors.client ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="max-h-[300px] overflow-y-auto">
                          {isLoadingClients ? (
                            <div className="space-y-2 p-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-2">
                                  <Skeleton className="size-10 rounded-full" />
                                  <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : clientResults?.length === 0 ? (
                            <div className="text-muted-foreground p-4 text-center text-sm">
                              No clients found
                            </div>
                          ) : (
                            <div className="py-1">
                              <div className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
                                Search Results
                              </div>
                              {clientResults?.map((client, index) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectClient({
                                      id: client.id,
                                      storeName: client.storeName,
                                      clientCode: client.clientCode,
                                    })
                                  }
                                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                                    index === clientSelectedIndex ? 'bg-accent' : 'hover:bg-accent'
                                  }`}
                                >
                                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                                    {client.storeName[0]}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate font-medium">
                                        {client.storeName}
                                      </span>
                                      <span className="text-muted-foreground shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                                        {client.clientCode}
                                      </span>
                                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        {client.storeType.replace(/_/g, ' ')}
                                      </span>
                                      <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                          client.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                      >
                                        {client.status}
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                      {client.contactName && (
                                        <span className="flex items-center gap-1 truncate">
                                          <BuildingIcon className="size-3 shrink-0" />
                                          <span className="truncate">{client.contactName}</span>
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1 truncate">
                                        <MailIcon className="size-3 shrink-0" />
                                        <span className="truncate">{client.email}</span>
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Ship-To Party */}
                <div className="space-y-2">
                  <Label className="pl-0.5" htmlFor="shipToLocation">
                    Ship-To Party (Location)
                  </Label>
                  <Input
                    id="shipToLocation"
                    placeholder="e.g., Main Store, Distribution Center"
                    value={shipToLocation}
                    onChange={(e) => setShipToLocation(e.target.value)}
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="shipToCity">
                      City
                    </Label>
                    <Input
                      id="shipToCity"
                      placeholder="e.g., San Francisco"
                      value={shipToCity}
                      onChange={(e) => setShipToCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="shipToState">
                      State / Province
                    </Label>
                    <Input
                      id="shipToState"
                      placeholder="e.g., CA"
                      value={shipToState}
                      onChange={(e) => setShipToState(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bill-To and Payer */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="billToSameAsSoldTo"
                      checked={billToSameAsSoldTo}
                      onCheckedChange={(checked) => setBillToSameAsSoldTo(checked === true)}
                    />
                    <Label htmlFor="billToSameAsSoldTo" className="cursor-pointer">
                      Bill-To same as Sold-To
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="payerSameAsSoldTo"
                      checked={payerSameAsSoldTo}
                      onCheckedChange={(checked) => setPayerSameAsSoldTo(checked === true)}
                    />
                    <Label htmlFor="payerSameAsSoldTo" className="cursor-pointer">
                      Payer same as Sold-To
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="pl-0.5" htmlFor="customerContactPhone">
                    Customer Contact Phone
                  </Label>
                  <Input
                    id="customerContactPhone"
                    type="tel"
                    placeholder="e.g., +1 (415) 555-0184"
                    value={customerContactPhone}
                    onChange={(e) => setCustomerContactPhone(e.target.value)}
                  />
                </div>
              </FormSection>

              {/* C. Commercial Terms */}
              <FormSection
                id="commercial"
                icon={DollarSignIcon}
                title="C. Commercial Terms"
                isActive={activeSection === 'commercial'}
                onFocus={() => setActiveSection('commercial')}
                errors={sectionErrorMessages.commercial}
              >
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.currency ? 'text-destructive' : ''}`}
                      htmlFor="currency"
                    >
                      Currency (WAERK) *
                    </Label>
                    <Select
                      value={currency}
                      onValueChange={(value) => {
                        setCurrency(value)
                        if (fieldErrors.currency) {
                          validateFieldOnBlur('currency', value)
                        }
                      }}
                      onOpenChange={(open) => open && setActiveSection('commercial')}
                    >
                      <SelectTrigger
                        id="currency"
                        className={`w-full ${fieldErrors.currency ? 'border-destructive focus:ring-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.paymentTerms ? 'text-destructive' : ''}`}
                      htmlFor="paymentTerms"
                    >
                      Pay. Terms (ZTERM) *
                    </Label>
                    <Select
                      value={paymentTerms}
                      onValueChange={(value) => {
                        setPaymentTerms(value)
                        if (fieldErrors.paymentTerms) {
                          validateFieldOnBlur('paymentTerms', value)
                        }
                      }}
                      onOpenChange={(open) => open && setActiveSection('commercial')}
                    >
                      <SelectTrigger
                        id="paymentTerms"
                        className={`w-full ${fieldErrors.paymentTerms ? 'border-destructive focus:ring-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      className={`pl-0.5 ${fieldErrors.taxStatus ? 'text-destructive' : ''}`}
                      htmlFor="taxStatus"
                    >
                      Tax Status *
                    </Label>
                    <Select
                      value={taxStatus}
                      onValueChange={(value) => {
                        setTaxStatus(value)
                        if (fieldErrors.taxStatus) {
                          validateFieldOnBlur('taxStatus', value)
                        }
                      }}
                      onOpenChange={(open) => open && setActiveSection('commercial')}
                    >
                      <SelectTrigger
                        id="taxStatus"
                        className={`w-full ${fieldErrors.taxStatus ? 'border-destructive focus:ring-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Select tax status" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="incoterm">
                      Incoterms (INCO1)
                    </Label>
                    <Select
                      value={incoterm}
                      onValueChange={setIncoterm}
                      onOpenChange={(open) => open && setActiveSection('commercial')}
                    >
                      <SelectTrigger id="incoterm" className="w-full">
                        <SelectValue placeholder="Select incoterm" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOTERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="incotermLocation">
                      Incoterm Location (INCO2)
                    </Label>
                    <Input
                      id="incotermLocation"
                      placeholder="e.g., San Francisco, CA"
                      value={incotermLocation}
                      onChange={(e) => setIncotermLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="pl-0.5" htmlFor="priceAgreement">
                    Price Agreement / Reference
                  </Label>
                  <Input
                    id="priceAgreement"
                    placeholder="e.g., FY25 Retail Price List – West Coast"
                    value={priceAgreement}
                    onChange={(e) => setPriceAgreement(e.target.value)}
                  />
                </div>
              </FormSection>

              {/* D. Delivery and Logistics */}
              <FormSection
                id="delivery"
                icon={TruckIcon}
                title="D. Delivery and Logistics"
                isActive={activeSection === 'delivery'}
                onFocus={() => setActiveSection('delivery')}
                errors={sectionErrorMessages.delivery}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="requestedDeliveryDate">
                      Requested Delivery Date (VDATU)
                    </Label>
                    <Input
                      id="requestedDeliveryDate"
                      type="date"
                      value={requestedDeliveryDate}
                      onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="carrier">
                      Carrier / Routing
                    </Label>
                    <Select
                      value={carrier}
                      onValueChange={setCarrier}
                      onOpenChange={(open) => open && setActiveSection('delivery')}
                    >
                      <SelectTrigger id="carrier" className="w-full">
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARRIER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="partialDeliveriesAllowed"
                      checked={partialDeliveriesAllowed}
                      onCheckedChange={(checked) => setPartialDeliveriesAllowed(checked === true)}
                    />
                    <Label htmlFor="partialDeliveriesAllowed" className="cursor-pointer">
                      Partial Deliveries Allowed
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="substitutionsAllowed"
                      checked={substitutionsAllowed}
                      onCheckedChange={(checked) => setSubstitutionsAllowed(checked === true)}
                    />
                    <Label htmlFor="substitutionsAllowed" className="cursor-pointer">
                      Substitutions Allowed
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="pl-0.5" htmlFor="deliveryInstructions">
                    Delivery Instructions
                  </Label>
                  <Textarea
                    id="deliveryInstructions"
                    placeholder="e.g., Appointment required. Deliver to rear loading dock. Pallets must be shrink-wrapped."
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="receivingHours">
                      Receiving Hours
                    </Label>
                    <Input
                      id="receivingHours"
                      placeholder="e.g., Monday to Friday, 08:00–16:00"
                      value={receivingHours}
                      onChange={(e) => setReceivingHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="specialPackagingLabeling">
                      Special Packaging / Labeling
                    </Label>
                    <Input
                      id="specialPackagingLabeling"
                      placeholder="e.g., Pallet labels required"
                      value={specialPackagingLabeling}
                      onChange={(e) => setSpecialPackagingLabeling(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* E. Order Line Items */}
              <FormSection
                id="lineItems"
                icon={PackageIcon}
                title="E. Order Line Items"
                isActive={activeSection === 'lineItems'}
                onFocus={() => setActiveSection('lineItems')}
                errors={sectionErrorMessages.lineItems}
              >
                <div className="flex gap-2">
                  <Select
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    onOpenChange={(open) => open && setActiveSection('lineItems')}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((product) => (
                        <SelectItem key={product.sku} value={product.sku}>
                          {product.sku} – {product.name} (${product.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddProduct} disabled={!selectedProduct}>
                    <PlusIcon className="mr-1 size-4" />
                    Add
                  </Button>
                </div>

                {orderItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty / UoM</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.sku}>
                          <TableCell className="py-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-muted-foreground text-xs">{item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleSetQuantity(item.sku, e.target.value)}
                                className="h-8 w-16 text-center"
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                    {item.uom}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {UOM_OPTIONS.map((uom) => (
                                    <DropdownMenuItem
                                      key={uom.value}
                                      onClick={() => handleUpdateUom(item.sku, uom.value)}
                                      className={
                                        item.uom === uom.value ? 'bg-primary/10 text-primary' : ''
                                      }
                                    >
                                      {uom.value} - {uom.label.split(' - ')[1]}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive size-7"
                              onClick={() => handleRemoveItem(item.sku)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {orderItems.length === 0 && (
                  <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                    <ShoppingCartIcon className="mx-auto mb-2 size-8 opacity-50" />
                    <p>No products added yet</p>
                  </div>
                )}

                <div className="mt-10 space-y-2">
                  <Label className="pl-0.5" htmlFor="lineNotes">
                    Line Notes
                  </Label>
                  <Textarea
                    id="lineNotes"
                    placeholder="e.g., No substitutions allowed on OdourLock products. Ensure correct scent variant is shipped."
                    value={lineNotes}
                    onChange={(e) => setLineNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </FormSection>

              {/* F. Attachments */}
              <FormSection
                id="attachments"
                icon={PaperclipIcon}
                title="F. Attachments"
                isActive={activeSection === 'attachments'}
                onFocus={() => setActiveSection('attachments')}
                errors={sectionErrorMessages.attachments}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5">Customer PO / Order Form</Label>
                    <div className="border-input hover:bg-accent/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-colors">
                      <FileTextIcon className="text-muted-foreground size-5" />
                      <span className="text-muted-foreground text-sm">
                        Click to upload or drag and drop
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5">Tax Exemption Certificate</Label>
                    <div className="border-input hover:bg-accent/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-colors">
                      <FileTextIcon className="text-muted-foreground size-5" />
                      <span className="text-muted-foreground text-sm">
                        Click to upload or drag and drop
                      </span>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* G. Internal Use Only */}
              <FormSection
                id="internal"
                icon={UserIcon}
                title="G. Internal Use Only (Order Entry)"
                isActive={activeSection === 'internal'}
                onFocus={() => setActiveSection('internal')}
                errors={sectionErrorMessages.internal}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="orderEnteredBy">
                      Order Entered By
                    </Label>
                    <Input
                      id="orderEnteredBy"
                      placeholder="e.g., J. Nguyen"
                      value={orderEnteredBy}
                      onChange={(e) => setOrderEnteredBy(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="pl-0.5" htmlFor="orderEntryDate">
                      Order Entry Date
                    </Label>
                    <Input
                      id="orderEntryDate"
                      type="date"
                      value={orderEntryDate}
                      onChange={(e) => setOrderEntryDate(e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sticky top-4 space-y-4 self-start">
          {/* Section Navigation */}
          <FormSectionsCard
            sections={navigationSections}
            sectionStatus={sectionStatus}
            sectionErrors={sectionErrors}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            action={
              <Button
                type="submit"
                form="create-order-form"
                className="w-full"
                disabled={
                  !Object.values(sectionStatus).every(Boolean) ||
                  Object.keys(fieldErrors).length > 0
                }
              >
                <SaveIcon className="size-4" />
                Create Order
              </Button>
            }
          />

          {/* Order Summary */}
          <Card>
            <CardContent className="space-y-4">
              <h3 className="font-semibold uppercase">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="text-right">{selectedClient?.storeName || '–'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PO Number</span>
                  <span>{customerPONumber || '–'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Document Type</span>
                  <span>{salesDocumentType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Terms</span>
                  <span>{paymentTerms.replace('NET', 'Net ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{currency}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Line Items</span>
                  <span>{orderItems.length}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Quantity</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">Items</p>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {orderItems.map((item) => (
                      <div key={item.sku} className="flex justify-between text-sm">
                        <span className="truncate pr-2">
                          {item.quantity}× {item.sku}
                        </span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Creation</DialogTitle>
            <DialogDescription>
              You are about to create an order for{' '}
              <span className="font-semibold">{selectedClient?.storeName}</span> with{' '}
              <span className="font-semibold">{orderItems.length}</span> line items totaling{' '}
              <span className="font-semibold">${totalAmount.toFixed(2)}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={createOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateOrder} disabled={createOrderMutation.isPending}>
              <SaveIcon className="size-4" />
              {createOrderMutation.isPending ? 'Creating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
