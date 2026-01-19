import { useCurrentItem } from '@/contexts/CurrentItemContext'
import { useCreateComment } from '@/hooks/mutations/clients/useCreateComment'
import { useDeleteComment } from '@/hooks/mutations/clients/useDeleteComment'
import { useUpdateComment } from '@/hooks/mutations/clients/useUpdateComment'
import { useMe } from '@/hooks/queries/auth/useMe'
import { useClient } from '@/hooks/queries/clients/useClient'
import { useRecentlyViewedClients } from '@/hooks/useRecentlyViewedClients'
import { useClientAssortments } from '@/hooks/queries/clients/useClientAssortments'
import { useClientComments } from '@/hooks/queries/clients/useClientComments'
import { useClientExchanges } from '@/hooks/queries/clients/useClientExchanges'
import { useClientOrder } from '@/hooks/queries/clients/useClientOrder'
import { useClientOrders } from '@/hooks/queries/clients/useClientOrders'
import {
  Badge,
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
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CreditCardIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  SendIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth/example/clients/$clientId')({
  component: ClientProfilePage,
  staticData: {
    title: 'route.clientProfile',
    crumb: 'route.clientProfile',
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

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    pending_renewal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

type TabType = 'orders' | 'exchanges' | 'assortments' | 'notes'

function ClientProfilePage() {
  const { clientId } = Route.useParams()
  const { data: currentUser } = useMe()
  const { data: client, isLoading, error } = useClient(Number(clientId))
  const { addRecentClient } = useRecentlyViewedClients()
  const { setCurrentItem } = useCurrentItem()

  // Register client code for sidebar display
  useEffect(() => {
    if (client?.clientCode) {
      setCurrentItem('/example/clients', client.clientCode)
    }
  }, [client?.clientCode, setCurrentItem])

  // Track client view in recently viewed
  useEffect(() => {
    if (client) {
      addRecentClient({
        id: client.id,
        storeName: client.storeName,
        clientCode: client.clientCode,
        storeType: client.storeType,
        status: client.status,
      })
    }
  }, [client, addRecentClient])
  const { data: orders, isLoading: isLoadingOrders } = useClientOrders(Number(clientId))
  const { data: exchanges, isLoading: isLoadingExchanges } = useClientExchanges(Number(clientId))
  const { data: assortments, isLoading: isLoadingAssortments } = useClientAssortments(
    Number(clientId),
  )
  const { data: comments, isLoading: isLoadingComments } = useClientComments(Number(clientId))
  const createComment = useCreateComment()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()

  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    createComment.mutate(
      { clientId: Number(clientId), content: newComment.trim() },
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
      { clientId: Number(clientId), commentId: editingCommentId, content: editingContent.trim() },
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
      { clientId: Number(clientId), commentId: deletingCommentId },
      {
        onSuccess: () => setDeletingCommentId(null),
      },
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/example/clients">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Search
          </Link>
        </Button>
        <div className="text-destructive">Failed to load client: {error.message}</div>
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

  if (!client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/example/clients">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Search
          </Link>
        </Button>
        <div className="text-muted-foreground">Client not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/example/clients">
          <ArrowLeftIcon className="mr-2 size-4" />
          Back to Search
        </Link>
      </Button>

      {/* Basic Information Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-semibold">
                {client.storeName[0]}
              </div>
              <div>
                <CardTitle className="text-2xl">{client.storeName}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2">
                  <span className="font-mono">{client.clientCode}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {client.storeType.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(client.status)}`}
                  >
                    {client.status}
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              <div className="space-y-2 text-sm">
                {client.contactName && (
                  <div className="flex items-center gap-2">
                    <BuildingIcon className="text-muted-foreground size-4" />
                    <span>{client.contactName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MailIcon className="text-muted-foreground size-4" />
                  <a href={`mailto:${client.email}`} className="hover:underline">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="text-muted-foreground size-4" />
                    <a href={`tel:${client.phone}`} className="hover:underline">
                      {client.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Billing Address</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="text-muted-foreground mt-0.5 size-4" />
                  <div>
                    {client.billingAddress && <p>{client.billingAddress}</p>}
                    <p>
                      {[client.city, client.state, client.postalCode].filter(Boolean).join(', ')}
                    </p>
                    {client.country && <p>{client.country}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="text-muted-foreground size-4" />
                  <span>Registered: {formatDate(client.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="bg-muted flex gap-1 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === 'orders'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground cursor-pointer'
          }`}
        >
          <ShoppingCartIcon className="size-4" />
          Orders ({orders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('exchanges')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === 'exchanges'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground cursor-pointer'
          }`}
        >
          <RefreshCwIcon className="size-4" />
          Exchanges ({exchanges?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('assortments')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === 'assortments'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground cursor-pointer'
          }`}
        >
          <PackageIcon className="size-4" />
          Products ({assortments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === 'notes'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground cursor-pointer'
          }`}
        >
          <MessageSquareIcon className="size-4" />
          Notes ({comments?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>
              Last {orders?.length || 0} orders, sorted by most recent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : orders?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <TableCell className="py-2 font-mono text-sm">{order.orderNumber}</TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p>{formatDate(order.orderDate)}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(order.orderDate).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'exchanges' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCwIcon className="size-5" />
              Exchange History
            </CardTitle>
            <CardDescription>Returns and exchanges with resolution status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExchanges ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : exchanges?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No exchanges found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exchange #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges?.map((exchange) => (
                    <TableRow key={exchange.id}>
                      <TableCell className="py-2 font-mono text-sm">
                        {exchange.exchangeNumber}
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p>{formatDate(exchange.exchangeDate)}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(exchange.exchangeDate).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p className="font-medium">{exchange.productName}</p>
                          {exchange.productSku && (
                            <p className="text-muted-foreground text-xs">{exchange.productSku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 capitalize">
                        {exchange.reason.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusColor(exchange.status)}`}
                        >
                          {exchange.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {formatCurrency(exchange.exchangeAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'assortments' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="size-5" />
              Product Assortments
            </CardTitle>
            <CardDescription>Products and services with subscription status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAssortments ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : assortments?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No products found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assortments?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-2">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.productSku && (
                            <p className="text-muted-foreground text-xs">{item.productSku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {item.productCategory && <Badge>{item.productCategory}</Badge>}
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusColor(item.subscriptionStatus)}`}
                        >
                          {item.subscriptionStatus.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p>{formatDate(item.purchaseDate)}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(item.purchaseDate).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {item.expirationDate ? formatDate(item.expirationDate) : 'N/A'}
                      </TableCell>
                      <TableCell className="py-2">
                        {item.autoRenew ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="transparent">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareIcon className="size-5" />
              Notes
            </CardTitle>
            <CardDescription>Internal notes and comments from customer service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Comment */}
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a note about this client..."
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
      )}

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

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        clientId={Number(clientId)}
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}

function OrderDetailsDialog({
  clientId,
  orderId,
  open,
  onClose,
}: {
  clientId: number
  orderId: number | null
  open: boolean
  onClose: () => void
}) {
  const { data: order, isLoading } = useClientOrder(clientId, orderId || 0)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="size-5" />
            Order Details
          </DialogTitle>
          <DialogDescription>
            {order?.orderNumber} - {order?.orderDate && formatDate(order.orderDate)}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-sm ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className="text-2xl font-bold">{formatCurrency(order.totalAmount)}</span>
            </div>

            {order.shippingAddress && (
              <div>
                <h4 className="mb-2 font-semibold">Shipping Address</h4>
                <p className="text-muted-foreground text-sm">{order.shippingAddress}</p>
              </div>
            )}

            {order.notes && (
              <div>
                <h4 className="mb-2 font-semibold">Notes</h4>
                <p className="text-muted-foreground text-sm">{order.notes}</p>
              </div>
            )}

            <div>
              <h4 className="mb-2 font-semibold">Order Items</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.productSku && (
                            <p className="text-muted-foreground text-xs">{item.productSku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Order not found</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
