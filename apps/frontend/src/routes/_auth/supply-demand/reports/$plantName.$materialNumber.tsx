import { useMe } from '@/hooks/queries/auth/useMe'
import { useCreateReportComment } from '@/hooks/mutations/reports/useCreateReportComment'
import { useDeleteReportComment } from '@/hooks/mutations/reports/useDeleteReportComment'
import { useUpdateReportComment } from '@/hooks/mutations/reports/useUpdateReportComment'
import { useReportComments } from '@/hooks/queries/reports/useReportComments'
import { ProductStatus, useReportDetail } from '@/hooks/queries/reports/useReports'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  PencilIcon,
  SendIcon,
  ShoppingCartIcon,
  Trash2Icon,
  TrendingDownIcon,
  UserIcon,
  WarehouseIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const Route = createFileRoute('/_auth/supply-demand/reports/$plantName/$materialNumber')({
  component: ReportDetailPage,
  staticData: {
    title: 'route.supplyDemandReportDetail',
    crumb: 'route.supplyDemandReportDetail',
  },
})

const MONTH_NAMES = [
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

function getRiskIcon(risk: string) {
  switch (risk) {
    case 'high':
      return <AlertTriangleIcon className="size-5 text-red-600 dark:text-red-400" />
    case 'medium':
      return <TrendingDownIcon className="size-5 text-yellow-600 dark:text-yellow-400" />
    case 'low':
      return <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400" />
    default:
      return null
  }
}

// Product status styling (for material lifecycle: 03=In-Use, 04=Phase Out, 05=Obsolete)
function getProductStatusColor(status: ProductStatus) {
  const colors: Record<string, string> = {
    '03': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    '04': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    '05': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return status ? colors[status] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
}

function getProductStatusLabel(status: ProductStatus) {
  const labels: Record<string, string> = {
    '03': 'In-Use',
    '04': 'Phase Out',
    '05': 'Obsolete',
  }
  return status ? labels[status] || 'Unknown' : 'Unknown'
}

function getPlantAcronym(plantName: string) {
  const parts = plantName.split(' - ')
  return parts[0] ?? plantName
}

// Calculate relative timeline message from a date
function getTimelineMessage(dateString: string | null): string {
  if (!dateString) return ''

  const problemDate = new Date(dateString)
  const now = new Date()

  // Get the first day of current month and problem month for comparison
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const problemMonth = new Date(problemDate.getFullYear(), problemDate.getMonth(), 1)

  // Calculate difference in months
  const monthsDiff =
    (problemMonth.getFullYear() - currentMonth.getFullYear()) * 12 +
    (problemMonth.getMonth() - currentMonth.getMonth())

  if (monthsDiff <= 0) {
    return 'this month'
  } else if (monthsDiff === 1) {
    return 'next month'
  } else if (monthsDiff < 12) {
    return `in ${monthsDiff} months`
  } else if (monthsDiff === 12) {
    return 'in 1 year'
  } else {
    const years = Math.floor(monthsDiff / 12)
    const remainingMonths = monthsDiff % 12
    if (remainingMonths === 0) {
      return `in ${years} year${years > 1 ? 's' : ''}`
    }
    return `in ${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReportDetailPage() {
  const { plantName, materialNumber } = Route.useParams()
  const decodedPlantName = decodeURIComponent(plantName)

  const { data: report, isLoading, error } = useReportDetail(decodedPlantName, materialNumber)
  const { data: currentUser } = useMe()
  const { data: comments, isLoading: isLoadingComments } = useReportComments(
    decodedPlantName,
    materialNumber,
  )

  const createComment = useCreateReportComment()
  const updateComment = useUpdateReportComment()
  const deleteComment = useDeleteReportComment()

  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    createComment.mutate(
      { plantName: decodedPlantName, materialNumber, content: newComment.trim() },
      {
        onSuccess: () => setNewComment(''),
      },
    )
  }

  const handleEditComment = (commentId: number, content: string) => {
    setEditingCommentId(commentId)
    setEditingContent(content)
  }

  const handleSaveEdit = () => {
    if (!editingCommentId || !editingContent.trim()) return
    updateComment.mutate(
      {
        plantName: decodedPlantName,
        materialNumber,
        commentId: editingCommentId,
        content: editingContent.trim(),
      },
      {
        onSuccess: () => {
          setEditingCommentId(null)
          setEditingContent('')
        },
      },
    )
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingContent('')
  }

  const handleDeleteComment = () => {
    if (!deletingCommentId) return
    deleteComment.mutate(
      { plantName: decodedPlantName, materialNumber, commentId: deletingCommentId },
      {
        onSuccess: () => setDeletingCommentId(null),
      },
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/supply-demand/reports">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Reports
          </Link>
        </Button>
        <div className="text-destructive">Failed to load report: {error.message}</div>
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
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/supply-demand/reports">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Reports
          </Link>
        </Button>
        <div className="text-muted-foreground">Report not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/supply-demand/reports">
          <ArrowLeftIcon className="mr-2 size-4" />
          Back to Reports
        </Link>
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-semibold">
                <FileTextIcon className="size-8" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {report.materialNumber}
                  <span className={`rounded-full px-3 py-1 text-sm ${getRiskColor(report.risk)}`}>
                    Risk: {getRiskLabel(report.risk)}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1">
                  {report.materialDescription ?? 'No description available'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">{getRiskIcon(report.risk)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-5">
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <WarehouseIcon className="size-4" />
                Plant
              </div>
              <div>
                <p className="font-semibold">{getPlantAcronym(report.plantName)}</p>
                <p className="text-muted-foreground text-xs">{report.plantName}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CircleIcon className="size-4" />
                Product Status
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getProductStatusColor(report.productStatus)}`}
              >
                {getProductStatusLabel(report.productStatus)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <PackageIcon className="size-4" />
                Current Stock
              </div>
              <p className="text-2xl font-bold">{report.currentStock.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Safety Stock</div>
              <p className="text-2xl font-bold">{report.safetyStock.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Next Problem</div>
              <p className="text-2xl font-bold">
                {report.firstProblemDate
                  ? new Date(report.firstProblemDate).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'None'}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-border my-6 border-t" />

          {/* Additional Info Section */}
          <div className="grid gap-6 md:grid-cols-5">
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <UserIcon className="size-4" />
                Purchaser
              </div>
              <p className="font-semibold">
                {report.purchaserName || (
                  <span className="text-muted-foreground font-normal">N/A</span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <ClockIcon className="size-4" />
                Lead Time
              </div>
              <p className="font-semibold">
                {report.leadTime !== null ? (
                  `${report.leadTime} days`
                ) : (
                  <span className="text-muted-foreground font-normal">N/A</span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPinIcon className="size-4" />
                Stock Location{report.storageLocations.length > 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {report.storageLocations.length > 0 ? (
                  report.storageLocations.map((loc) => (
                    <span
                      key={loc.code}
                      className="bg-muted inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold"
                      title={loc.description || undefined}
                    >
                      {loc.code}
                    </span>
                  ))
                ) : (
                  <p className="text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <ShoppingCartIcon className="size-4" />
                Total Open POs
              </div>
              <p className="text-2xl font-bold">{report.openPoCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Alert */}
      {report.risk === 'high' && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertTriangleIcon className="size-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              High Risk - Critical Stock Alert
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Stock is projected to go negative {getTimelineMessage(report.firstProblemDate)}.
              Immediate action required.
            </p>
          </div>
        </div>
      )}

      {report.risk === 'medium' && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
          <TrendingDownIcon className="size-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Medium Risk - Stock Warning
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Stock is projected to drop below safety stock level{' '}
              {getTimelineMessage(report.firstProblemDate)}.
            </p>
          </div>
        </div>
      )}

      {/* Monthly Projection Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Forecast</CardTitle>
          <CardDescription>
            Stock projections from current month through December {new Date().getFullYear() + 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-background sticky left-0 z-10 min-w-[150px] pl-2">
                    Metric
                  </TableHead>
                  {report.projections.map((proj) => (
                    <TableHead
                      key={`${proj.year}-${proj.month}`}
                      className={`min-w-[80px] text-center ${
                        proj.isActual ? 'bg-green-50 dark:bg-green-950/30' : 'bg-background'
                      }`}
                    >
                      <div className="text-xs">
                        {MONTH_NAMES[proj.month - 1]} {proj.year}
                      </div>
                      {proj.isActual && (
                        <div className="text-muted-foreground mt-0.5 text-[10px] uppercase">
                          Actual
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Demand Row */}
                <TableRow>
                  <TableCell className="bg-background sticky left-0 z-10 py-2 pl-2 font-medium">
                    Demand
                  </TableCell>
                  {report.projections.map((proj) => (
                    <TableCell
                      key={`demand-${proj.year}-${proj.month}`}
                      className={`py-2 text-center font-mono text-sm ${
                        proj.isActual ? 'bg-green-50 dark:bg-green-950/30' : 'bg-background'
                      }`}
                    >
                      {proj.demand > 0 ? proj.demand.toLocaleString() : '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Supply Row */}
                <TableRow>
                  <TableCell className="bg-background sticky left-0 z-10 py-2 pl-2 font-medium">
                    Supply
                  </TableCell>
                  {report.projections.map((proj) => (
                    <TableCell
                      key={`supply-${proj.year}-${proj.month}`}
                      className={`py-2 text-center font-mono text-sm ${
                        proj.isActual ? 'bg-green-50 dark:bg-green-950/30' : 'bg-background'
                      } ${proj.supply > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}
                    >
                      {proj.supply > 0 ? proj.supply.toLocaleString() : '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Month End Stock Row */}
                <TableRow>
                  <TableCell className="bg-background sticky left-0 z-10 py-2 pl-2 font-medium">
                    Month End Stock
                  </TableCell>
                  {report.projections.map((proj) => (
                    <TableCell
                      key={`stock-${proj.year}-${proj.month}`}
                      className={`py-2 text-center font-mono text-sm font-semibold ${
                        proj.isActual ? 'bg-green-50 dark:bg-green-950/30' : 'bg-background'
                      } ${
                        proj.risk === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                          : proj.risk === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                            : ''
                      }`}
                    >
                      {proj.monthEndStock.toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Safety Stock Row */}
                <TableRow>
                  <TableCell className="bg-background sticky left-0 z-10 py-2 pl-2 font-medium">
                    Safety Stock
                  </TableCell>
                  {report.projections.map((proj) => (
                    <TableCell
                      key={`safety-${proj.year}-${proj.month}`}
                      className={`text-muted-foreground py-2 text-center font-mono text-sm ${
                        proj.isActual ? 'bg-green-50 dark:bg-green-950/30' : 'bg-background'
                      }`}
                    >
                      {report.safetyStock.toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Stock Forecast Chart */}
          <div className="mt-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={report.projections.map((proj) => ({
                  name: `${MONTH_NAMES[proj.month - 1]} ${proj.year}`,
                  stock: proj.monthEndStock,
                  safetyStock: report.safetyStock,
                  isActual: proj.isActual,
                  risk: proj.risk,
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : String(value),
                    name === 'stock' ? 'Month End Stock' : 'Safety Stock',
                  ]}
                />
                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{ value: 'Zero', position: 'right', fontSize: 10, fill: '#ef4444' }}
                />
                <ReferenceLine
                  y={report.safetyStock}
                  stroke="#eab308"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{ value: 'Safety', position: 'right', fontSize: 10, fill: '#eab308' }}
                />
                <Area
                  type="monotone"
                  dataKey="stock"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#stockGradient)"
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (payload.risk === 'high') {
                      return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#ef4444" />
                    }
                    if (payload.risk === 'medium') {
                      return <circle cx={cx} cy={cy} r={4} fill="#eab308" stroke="#eab308" />
                    }
                    return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#3b82f6" />
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"></div>
          <span className="text-muted-foreground">Actual (Past months)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/50"></div>
          <span className="text-muted-foreground">High Risk (Negative stock)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-yellow-200 bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/50"></div>
          <span className="text-muted-foreground">Medium Risk (Below safety stock)</span>
        </div>
      </div>

      {/* Notes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-5" />
            Notes
          </CardTitle>
          <CardDescription>Internal notes and comments about this report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Comment */}
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note about this report..."
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || createComment.isPending}
                size="sm"
              >
                <SendIcon className="mr-2 size-4" />
                {createComment.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : comments?.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              No notes yet. Add the first note above.
            </p>
          ) : (
            <div className="space-y-4">
              {comments?.map((comment) => {
                const isOwnComment = currentUser?.id === comment.userId
                const isEditing = editingCommentId === comment.id
                const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt

                return (
                  <div
                    key={comment.id}
                    className={`border-border rounded-lg border p-4 ${isOwnComment ? 'bg-muted/50' : ''}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${isOwnComment ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' : 'bg-primary/10 text-primary'}`}
                        >
                          {comment.author.givenName?.[0] || '?'}
                          {comment.author.familyName?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {comment.author.givenName} {comment.author.familyName}
                          </p>
                          <p className="text-muted-foreground text-xs">{comment.author.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwnComment && !isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              onClick={() => handleEditComment(comment.id, comment.content)}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive size-7 p-0"
                              onClick={() => setDeletingCommentId(comment.id)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {formatDate(comment.createdAt)}
                          {isEdited && ' (edited)'}
                        </span>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updateComment.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editingContent.trim() || updateComment.isPending}
                          >
                            {updateComment.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="pt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Comment Confirmation Dialog */}
      <Dialog
        open={!!deletingCommentId}
        onOpenChange={(open) => !open && setDeletingCommentId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingCommentId(null)}
              disabled={deleteComment.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteComment}
              disabled={deleteComment.isPending}
            >
              {deleteComment.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
