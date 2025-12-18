import { useBook } from '@/hooks/queries/books/useBook'
import { useBookReviews } from '@/hooks/queries/books/useBookReviews'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, BookOpenIcon, CalendarIcon, StarIcon, UserIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/books/$bookId')({
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

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/books">
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
          <Link to="/books">
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
        <Link to="/books">
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
          <CardTitle className="text-xl">Reviews</CardTitle>
          {reviewsData && reviewsData.reviews.length > 0 && (
            <CardDescription>
              {reviewsData.totalReviews} review{reviewsData.totalReviews !== 1 ? 's' : ''}
            </CardDescription>
          )}
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
            <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this book!</p>
          ) : (
            <div className="space-y-6">
              {reviewsData?.reviews.map((review) => (
                <div key={review.id} className="flex gap-4">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
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
                      <span className="text-muted-foreground text-xs">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.title && <p className="text-sm font-medium">{review.title}</p>}
                    {review.content && (
                      <p className="text-muted-foreground text-sm">{review.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
