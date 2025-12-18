import { useCreateReview } from '@/hooks/mutations/books/useCreateReview'
import { useDeleteReview } from '@/hooks/mutations/books/useDeleteReview'
import { useUpdateReview } from '@/hooks/mutations/books/useUpdateReview'
import { useMe } from '@/hooks/queries/auth/useMe'
import { useBook } from '@/hooks/queries/books/useBook'
import { useBookReviews } from '@/hooks/queries/books/useBookReviews'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/examples/books/$bookId')({
  component: BookDetailPage,
  staticData: {
    title: 'route.bookDetails',
    crumb: 'route.bookDetails',
  },
})

function BookDetailPage() {
  const { bookId } = Route.useParams()
  const { data: book, isLoading, error } = useBook(Number(bookId))
  const { data: reviewsData, isLoading: isLoadingReviews } = useBookReviews(Number(bookId))
  const { data: currentUser } = useMe()
  const createReview = useCreateReview()
  const updateReview = useUpdateReview()
  const deleteReview = useDeleteReview()

  // Create review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewContent, setReviewContent] = useState('')

  // Edit review modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null)
  const [editRating, setEditRating] = useState(0)
  const [editHoverRating, setEditHoverRating] = useState(0)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)

  const resetForm = () => {
    setRating(0)
    setHoverRating(0)
    setReviewTitle('')
    setReviewContent('')
  }

  const resetEditForm = () => {
    setEditingReviewId(null)
    setEditRating(0)
    setEditHoverRating(0)
    setEditTitle('')
    setEditContent('')
  }

  const handleSubmitReview = async () => {
    if (rating === 0) return

    await createReview.mutateAsync({
      bookId: Number(bookId),
      rating,
      title: reviewTitle || undefined,
      content: reviewContent || undefined,
    })

    resetForm()
    setIsReviewModalOpen(false)
  }

  const handleEditReview = (review: {
    id: number
    rating: number
    title: string | null
    content: string | null
  }) => {
    setEditingReviewId(review.id)
    setEditRating(review.rating)
    setEditTitle(review.title || '')
    setEditContent(review.content || '')
    setIsEditModalOpen(true)
  }

  const handleUpdateReview = async () => {
    if (editRating === 0 || !editingReviewId) return

    await updateReview.mutateAsync({
      bookId: Number(bookId),
      reviewId: editingReviewId,
      rating: editRating,
      title: editTitle || undefined,
      content: editContent || undefined,
    })

    resetEditForm()
    setIsEditModalOpen(false)
  }

  const handleDeleteReview = async () => {
    if (!deletingReviewId) return

    await deleteReview.mutateAsync({
      bookId: Number(bookId),
      reviewId: deletingReviewId,
    })

    setDeletingReviewId(null)
    setIsDeleteDialogOpen(false)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/examples/books">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Books
          </Link>
        </Button>
        <div className="text-destructive">Failed to load book: {error.message}</div>
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
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/examples/books">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Books
          </Link>
        </Button>
        <div className="text-muted-foreground">Book not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/examples/books">
          <ArrowLeftIcon className="mr-2 size-4" />
          Back to Books
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 text-base">
                <UserIcon className="size-4" />
                {book.author}
              </CardDescription>
            </div>
            {book.averageRating !== null && (
              <div className="flex items-center gap-1 text-amber-500">
                <StarIcon className="size-5 fill-current" />
                <span className="font-semibold">{Number(book.averageRating).toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">({book.totalReviews} reviews)</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 font-semibold">Description</h3>
            <p className="text-muted-foreground">
              {book.description || 'No description available'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {book.genre && (
              <Badge variant="primary">
                <BookOpenIcon className="mr-1 size-3" />
                {book.genre}
              </Badge>
            )}
            {book.publishedYear && (
              <Badge variant="default">
                <CalendarIcon className="mr-1 size-3" />
                {book.publishedYear}
              </Badge>
            )}
          </div>

          {book.isbn && (
            <div>
              <h3 className="mb-1 font-semibold">ISBN</h3>
              <p className="text-muted-foreground font-mono text-sm">{book.isbn}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Reviews</CardTitle>
              {reviewsData && reviewsData.reviews.length > 0 && (
                <CardDescription>
                  {reviewsData.totalReviews} review{reviewsData.totalReviews !== 1 ? 's' : ''}
                </CardDescription>
              )}
            </div>
            {/* Only show Add Review button if user hasn't already reviewed */}
            {!reviewsData?.reviews.some((r) => r.user.id === currentUser?.id) && (
              <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusIcon className="mr-1 size-4" />
                    Add Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                    <DialogDescription>Share your thoughts about "{book?.title}"</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Rating</Label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <StarIcon
                              className={`size-7 ${
                                star <= (hoverRating || rating)
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                        {rating > 0 && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            {rating} star{rating !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-title">Title (optional)</Label>
                      <Input
                        id="review-title"
                        placeholder="Summarize your review"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-content">Review (optional)</Label>
                      <Textarea
                        id="review-content"
                        placeholder="What did you think about this book?"
                        value={reviewContent}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setReviewContent(e.target.value)
                        }
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        resetForm()
                        setIsReviewModalOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      disabled={rating === 0 || createReview.isPending}
                    >
                      {createReview.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReviews ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsData?.reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No reviews yet. Be the first to review this book!
            </p>
          ) : (
            <div className="space-y-6">
              {reviewsData?.reviews.map((review) => {
                const isOwnReview = currentUser?.id === review.user.id
                return (
                  <div
                    key={review.id}
                    className={`flex gap-4 ${isOwnReview ? 'bg-primary/5 border-primary/20 -mx-4 rounded-lg border p-4' : ''}`}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback
                        className={`text-sm font-medium ${isOwnReview ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}
                      >
                        {review.user.givenName?.[0]}
                        {review.user.familyName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {review.user.givenName} {review.user.familyName}
                          </span>
                          {isOwnReview && (
                            <Badge variant="primary" size="xs">
                              You
                            </Badge>
                          )}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon
                                key={star}
                                className={`size-3.5 ${
                                  star <= review.rating
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnReview && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0"
                                onClick={() => handleEditReview(review)}
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive-foreground hover:text-destructive-foreground size-7 p-0"
                                onClick={() => {
                                  setDeletingReviewId(review.id)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </div>
                          )}
                          {(() => {
                            const isEdited =
                              review.updatedAt && review.updatedAt !== review.createdAt
                            const displayDate = isEdited ? review.updatedAt! : review.createdAt
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-muted-foreground cursor-default text-xs">
                                      {new Date(displayDate).toLocaleDateString()}
                                      {isEdited && '*'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <p>Created: {new Date(review.createdAt).toLocaleString()}</p>
                                      {isEdited && (
                                        <p>
                                          Edited: {new Date(review.updatedAt!).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })()}
                        </div>
                      </div>
                      {review.title && <p className="text-sm font-medium">{review.title}</p>}
                      {review.content && (
                        <p className="text-muted-foreground text-sm">{review.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Review Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>Update your review for "{book?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    onMouseEnter={() => setEditHoverRating(star)}
                    onMouseLeave={() => setEditHoverRating(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <StarIcon
                      className={`size-7 ${
                        star <= (editHoverRating || editRating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
                {editRating > 0 && (
                  <span className="text-muted-foreground ml-2 text-sm">
                    {editRating} star{editRating !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-review-title">Title (optional)</Label>
              <Input
                id="edit-review-title"
                placeholder="Summarize your review"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-review-content">Review (optional)</Label>
              <Textarea
                id="edit-review-content"
                placeholder="What did you think about this book?"
                value={editContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditContent(e.target.value)
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                resetEditForm()
                setIsEditModalOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateReview}
              disabled={editRating === 0 || updateReview.isPending}
            >
              {updateReview.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingReviewId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteReview.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
