import { useBooks } from '@/hooks/queries/books/useBooks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MessageSquareIcon, StarIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/examples/books/')({
  component: BooksPage,
  staticData: {
    title: 'route.books',
    crumb: 'route.books',
  },
})

function BooksPage() {
  const { data, isLoading, error } = useBooks()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Books</h1>
        <p className="text-muted-foreground mt-1">Browse the book collection</p>
      </header>

      {error && <div className="text-destructive">Failed to load books: {error.message}</div>}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((book) => (
              <Link
                key={book.id}
                to="/examples/books/$bookId"
                params={{ bookId: book.id.toString() }}
                className="block"
              >
                <Card className="hover:bg-muted/50 flex h-full flex-col transition-colors">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{book.title}</CardTitle>
                    <CardDescription>{book.author}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {book.description || 'No description available'}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
                      {book.genre && (
                        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs">
                          {book.genre}
                        </span>
                      )}
                      {book.publishedYear && (
                        <span className="text-muted-foreground">{book.publishedYear}</span>
                      )}
                      <div className="ml-auto flex items-center gap-3">
                        {book.totalReviews > 0 ? (
                          <>
                            <span className="flex items-center gap-1 text-amber-500">
                              <StarIcon className="size-3.5 fill-current" />
                              <span className="font-medium">{Number(book.averageRating).toFixed(1)}</span>
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MessageSquareIcon className="size-3.5" />
                              <span>{book.totalReviews}</span>
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs italic">No reviews</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {data.items.length === 0 && (
            <div className="text-muted-foreground py-12 text-center">No books found</div>
          )}

          {data.pagination.totalPages > 1 && (
            <div className="text-muted-foreground text-center text-sm">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{' '}
              books)
            </div>
          )}
        </>
      )}
    </div>
  )
}
