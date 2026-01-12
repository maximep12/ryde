import { useApproveOrder } from '@/hooks/mutations/orders/useApproveOrder'
import { useOrder } from '@/hooks/queries/orders/useOrder'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
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
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClipboardListIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  ReceiptIcon,
  TruckIcon,
  XCircleIcon,
} from 'lucide-react'
import * as React from 'react'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: OrderDetailsPage,
  staticData: {
    title: 'route.orderDetails',
    crumb: 'route.orderDetails',
  },
})

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB')
}

function formatDateTime(date: string | Date) {
  const d = new Date(date)
  return `${d.toLocaleDateString('en-GB')} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function getSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[severity] || colors.medium
}

function getIssueStatusColor(status: string) {
  const colors: Record<string, string> = {
    open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[status] || colors.open
}

function formatIssueType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered'] as const

function getStatusIndex(status: string): number {
  if (status === 'cancelled') return -1
  return ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number])
}

function OrderProgressLastUpdated({
  currentStatus,
  orderDate,
}: {
  currentStatus: string
  orderDate: string
}) {
  const timestamp = React.useMemo(() => {
    const baseDate = new Date(orderDate)
    const seed = baseDate.getTime()
    const pseudoRandom = (n: number) => ((seed * (n + 1)) % 100) / 100

    if (currentStatus === 'cancelled') {
      // Cancelled shortly after order
      const cancelledDate = new Date(baseDate)
      cancelledDate.setHours(cancelledDate.getHours() + 2 + Math.floor(pseudoRandom(6) * 4))
      return cancelledDate
    }

    if (currentStatus === 'pending') {
      return baseDate
    }

    if (currentStatus === 'processing') {
      const processingDate = new Date(baseDate)
      processingDate.setHours(processingDate.getHours() + 1 + Math.floor(pseudoRandom(1) * 3))
      return processingDate
    }

    if (currentStatus === 'shipped') {
      const processingDate = new Date(baseDate)
      processingDate.setHours(processingDate.getHours() + 1 + Math.floor(pseudoRandom(1) * 3))
      const shippedDate = new Date(processingDate)
      shippedDate.setDate(shippedDate.getDate() + 1 + Math.floor(pseudoRandom(2) * 2))
      shippedDate.setHours(8 + Math.floor(pseudoRandom(3) * 10))
      return shippedDate
    }

    if (currentStatus === 'delivered') {
      const processingDate = new Date(baseDate)
      processingDate.setHours(processingDate.getHours() + 1 + Math.floor(pseudoRandom(1) * 3))
      const shippedDate = new Date(processingDate)
      shippedDate.setDate(shippedDate.getDate() + 1 + Math.floor(pseudoRandom(2) * 2))
      shippedDate.setHours(8 + Math.floor(pseudoRandom(3) * 10))
      const deliveredDate = new Date(shippedDate)
      deliveredDate.setDate(deliveredDate.getDate() + 2 + Math.floor(pseudoRandom(4) * 3))
      deliveredDate.setHours(9 + Math.floor(pseudoRandom(5) * 8))
      return deliveredDate
    }

    return baseDate
  }, [currentStatus, orderDate])

  return (
    <span className="text-xs text-gray-400 dark:text-gray-500">
      Last updated at {timestamp.toLocaleDateString('en-GB')},{' '}
      {timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

function OrderStatusTimeline({
  currentStatus,
  orderDate,
}: {
  currentStatus: string
  orderDate: string
}) {
  const isCancelled = currentStatus === 'cancelled'
  const currentIndex = getStatusIndex(currentStatus)

  // Use a seeded approach based on orderDate to keep timestamps stable
  const mockTimestamps = React.useMemo(() => {
    const baseDate = new Date(orderDate)
    const timestamps: Record<string, Date> = {}

    // Use orderDate as a simple seed for consistent pseudo-random offsets
    const seed = baseDate.getTime()
    const pseudoRandom = (n: number) => ((seed * (n + 1)) % 100) / 100

    // Pending is when the order was placed
    timestamps.pending = baseDate

    // Processing: 1-4 hours after order
    const processingDate = new Date(baseDate)
    processingDate.setHours(processingDate.getHours() + 1 + Math.floor(pseudoRandom(1) * 3))
    timestamps.processing = processingDate

    // Shipped: 1-3 days after processing
    const shippedDate = new Date(processingDate)
    shippedDate.setDate(shippedDate.getDate() + 1 + Math.floor(pseudoRandom(2) * 2))
    shippedDate.setHours(8 + Math.floor(pseudoRandom(3) * 10))
    timestamps.shipped = shippedDate

    // Delivered: 2-5 days after shipped
    const deliveredDate = new Date(shippedDate)
    deliveredDate.setDate(deliveredDate.getDate() + 2 + Math.floor(pseudoRandom(4) * 3))
    deliveredDate.setHours(9 + Math.floor(pseudoRandom(5) * 8))
    timestamps.delivered = deliveredDate

    return timestamps
  }, [orderDate])

  const statusConfig = [
    { key: 'pending', label: 'Pending', icon: ClockIcon },
    { key: 'processing', label: 'Processing', icon: PackageIcon },
    { key: 'shipped', label: 'Shipped', icon: TruckIcon },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle2Icon },
  ]

  // Calculate cancelled timestamp
  const cancelledTimestamp = React.useMemo(() => {
    if (!isCancelled) return null
    const baseDate = new Date(orderDate)
    const seed = baseDate.getTime()
    const pseudoRandom = (n: number) => ((seed * (n + 1)) % 100) / 100
    // Cancelled shortly after order (2-6 hours)
    const cancelledDate = new Date(baseDate)
    cancelledDate.setHours(cancelledDate.getHours() + 2 + Math.floor(pseudoRandom(6) * 4))
    return cancelledDate
  }, [isCancelled, orderDate])

  if (isCancelled) {
    return (
      <div className="w-full">
        <div className="flex w-full items-start">
          {/* Cancelled indicator at the beginning */}
          <div className="mr-4 flex items-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer flex-col items-center">
                  <div className="flex size-10 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white transition-transform hover:scale-110">
                    <XCircleIcon className="size-5" />
                  </div>
                  <span className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    Cancelled
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Cancelled</p>
                <p className="text-xs opacity-80">
                  {cancelledTimestamp?.toLocaleDateString('en-GB')} at{' '}
                  {cancelledTimestamp?.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Grayed out remaining statuses */}
          {statusConfig.map((status, index) => {
            const Icon = status.icon
            const isLast = index === statusConfig.length - 1

            return (
              <div key={status.key} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
                <div className="flex flex-col items-center">
                  <div className="flex size-10 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-muted-foreground mt-2 text-xs font-medium">
                    {status.label}
                  </span>
                </div>

                {!isLast && <div className="mt-5 h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex w-full items-start">
        {statusConfig.map((status, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const Icon = status.icon
          const isLast = index === statusConfig.length - 1
          const timestamp = mockTimestamps[status.key]

          const statusNode = (
            <div className="flex flex-col items-center">
              <div
                className={`flex size-10 items-center justify-center rounded-full border-2 transition-transform ${
                  isCompleted
                    ? 'cursor-pointer border-green-500 bg-green-500 text-white hover:scale-110'
                    : isCurrent
                      ? 'border-primary bg-primary text-primary-foreground cursor-pointer hover:scale-110'
                      : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                }`}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : isCurrent
                      ? 'text-primary'
                      : 'text-muted-foreground'
                }`}
              >
                {status.label}
              </span>
            </div>
          )

          return (
            <div key={status.key} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              {/* Status Node with Tooltip for completed and current statuses */}
              {isCompleted || isCurrent ? (
                <Tooltip>
                  <TooltipTrigger asChild>{statusNode}</TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{status.label}</p>
                    <p className="text-xs opacity-80">
                      {timestamp.toLocaleDateString('en-GB')} at{' '}
                      {timestamp.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                statusNode
              )}

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`mt-5 h-0.5 flex-1 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OrderDetailsPage() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading, error } = useOrder(Number(orderId))
  const approveOrder = useApproveOrder()
  const [approvalConfirmed, setApprovalConfirmed] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleApprove = () => {
    approveOrder.mutate(Number(orderId), {
      onSuccess: () => {
        setDialogOpen(false)
        setApprovalConfirmed(false)
      },
    })
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Orders
          </Link>
        </Button>
        <div className="text-destructive">Failed to load order: {error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Orders
          </Link>
        </Button>
        <div className="text-muted-foreground">Order not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders" search={{}}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Orders
          </Link>
        </Button>
        {order.approvedAt && order.approvedBy?.id && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4 text-green-600" />
            <span>
              Approved by{' '}
              <span className="text-foreground font-medium">
                {order.approvedBy.givenName} {order.approvedBy.familyName}
              </span>{' '}
              at {formatDateTime(order.approvedAt)}
            </span>
          </div>
        )}
        {order.requiresApproval && !order.approvedAt && (
          <AlertDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setApprovalConfirmed(false)
            }}
          >
            <AlertDialogTrigger asChild>
              <Button>
                <CheckIcon className="size-4" />
                Approve Order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Order {order.orderNumber}</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    You are about to approve this order for{' '}
                    <span className="text-foreground font-medium">{order.client.storeName}</span>{' '}
                    with a total of{' '}
                    <span className="text-foreground font-medium">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    .
                  </p>
                  <p>
                    This action will be recorded and signed under your account. Please ensure you
                    have thoroughly reviewed all order details before proceeding.
                  </p>
                  <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-3">
                    <Checkbox
                      id="approval-confirmation"
                      checked={approvalConfirmed}
                      onCheckedChange={(checked) => setApprovalConfirmed(checked === true)}
                    />
                    <label
                      htmlFor="approval-confirmation"
                      className="text-foreground cursor-pointer text-sm leading-tight"
                    >
                      I confirm that I have reviewed this order and I authorize its approval under
                      my responsibility.
                    </label>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={approveOrder.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!approvalConfirmed || approveOrder.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    handleApprove()
                  }}
                >
                  {approveOrder.isPending ? (
                    'Approving...'
                  ) : (
                    <>
                      <CheckIcon className="size-4" />
                      Confirm Approval
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Order Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
                <ReceiptIcon className="size-8" />
              </div>
              <div>
                <CardTitle className="font-mono text-2xl">{order.orderNumber}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {order.source.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{formatDateTime(order.orderDate)}</span>
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">Total Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(order.totalAmount)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Shipping Address */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <TruckIcon className="size-4" />
                Shipping Address
              </h3>
              <div className="text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="text-muted-foreground mt-0.5 size-4" />
                  <div>
                    {order.client.billingAddress && <p>{order.client.billingAddress}</p>}
                    <p>
                      {[order.client.city, order.client.state, order.client.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {order.client.country && <p>{order.client.country}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Dates */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <CalendarIcon className="size-4" />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Ordered:</span>
                  <span>{formatDateTime(order.orderDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Created:</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                {order.updatedAt !== order.createdAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Updated:</span>
                    <span>{formatDateTime(order.updatedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-6 space-y-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <ClipboardListIcon className="size-4" />
                Notes
              </h3>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Order Progress */}
          <div className="mt-6 space-y-6 border-t pt-6 pb-0">
            <div className="flex items-center gap-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <ClockIcon className="size-4" />
                Order Progress
              </h3>
              <OrderProgressLastUpdated currentStatus={order.status} orderDate={order.orderDate} />
            </div>
            <OrderStatusTimeline currentStatus={order.status} orderDate={order.orderDate} />
          </div>
        </CardContent>
      </Card>

      {/* Order Issues Card - only show if there are issues */}
      {order.issues && order.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangleIcon className="size-5" />
              Order Issues
            </CardTitle>
            <CardDescription>
              {order.issues.length} issue{order.issues.length !== 1 ? 's' : ''} reported for this
              order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.issues
                .slice()
                .sort((a, b) => {
                  // Unresolved issues first (open, in_progress)
                  const aResolved = a.status === 'resolved' || a.status === 'dismissed'
                  const bResolved = b.status === 'resolved' || b.status === 'dismissed'
                  if (aResolved !== bResolved) return aResolved ? 1 : -1
                  // Within each group, sort by createdAt descending (most recent first)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                })
                .map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-lg border shadow-sm ${
                      issue.status === 'resolved' || issue.status === 'dismissed'
                        ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex">
                      {/* Main content */}
                      <div className="flex-1 space-y-2 p-4">
                        <h4 className="font-semibold">{issue.title}</h4>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span className="font-medium">{formatIssueType(issue.issueType)}</span>
                          <span>•</span>
                          <span>Reported {formatDate(issue.createdAt)}</span>
                          {issue.resolvedAt && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CheckIcon className="size-3" />
                                Resolved {formatDate(issue.resolvedAt)}
                              </span>
                            </>
                          )}
                        </div>
                        {issue.description && (
                          <p className="text-muted-foreground text-sm">{issue.description}</p>
                        )}
                        {issue.resolution && (
                          <div className="mt-2 rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            <span className="font-medium">Resolution:</span> {issue.resolution}
                          </div>
                        )}
                      </div>

                      {/* Vertical divider */}
                      <div className="bg-border my-4 w-px self-stretch" />

                      {/* Severity and Status section */}
                      <div className="flex min-w-[140px] flex-col items-center justify-center gap-4 p-4">
                        <div className="flex flex-col items-center space-y-1">
                          <p className="text-muted-foreground text-xs">Severity</p>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${getSeverityColor(issue.severity)}`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <p className="text-muted-foreground text-xs">Status</p>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${getIssueStatusColor(issue.status)}`}
                          >
                            {issue.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BuildingIcon className="size-5" />
            Client Information
          </CardTitle>
          <CardDescription>
            <Link
              to="/clients/$clientId"
              params={{ clientId: order.client.id.toString() }}
              className="hover:underline"
            >
              View full client profile →
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold">{order.client.storeName}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm">{order.client.clientCode}</span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize dark:bg-gray-700 dark:text-gray-300">
                    {order.client.storeType.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(order.client.status)}`}
                  >
                    {order.client.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {order.client.contactName && (
                  <div className="flex items-center gap-2">
                    <BuildingIcon className="text-muted-foreground size-4" />
                    <span>{order.client.contactName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MailIcon className="text-muted-foreground size-4" />
                  <a href={`mailto:${order.client.email}`} className="hover:underline">
                    {order.client.email}
                  </a>
                </div>
                {order.client.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="text-muted-foreground size-4" />
                    <a href={`tel:${order.client.phone}`} className="hover:underline">
                      {order.client.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Billing Address</h4>
              <div className="text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="text-muted-foreground mt-0.5 size-4" />
                  <div>
                    {order.client.billingAddress && <p>{order.client.billingAddress}</p>}
                    <p>
                      {[order.client.city, order.client.state, order.client.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {order.client.country && <p>{order.client.country}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="size-5" />
            Order Items
          </CardTitle>
          <CardDescription>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Package Type</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="py-2">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-muted-foreground font-mono text-xs">{item.productSku}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="default">{item.packageType.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="py-2 text-center">{item.quantity}</TableCell>
                  <TableCell className="py-2 text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="py-2 text-right font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  Order Total
                </TableCell>
                <TableCell className="text-right text-lg">
                  {formatCurrency(order.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
