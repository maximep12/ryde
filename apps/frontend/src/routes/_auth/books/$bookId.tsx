import { useBook } from '@/hooks/queries/books/useBook'
import {
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
            <p className="text-muted-foreground">{book.description || 'No description available'}</p>
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
    </div>
  )
}
