import { InferSelectModel, InferInsertModel, sql } from 'drizzle-orm'
import {
  integer,
  serial,
  text,
  varchar,
  index,
  check,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'
import { users } from './users'

// ============================================================================
// BOOKS
// ============================================================================

export const books = app.table(
  'books',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    author: varchar('author', { length: 255 }).notNull(),
    isbn: varchar('isbn', { length: 13 }).unique(),
    description: text('description'),
    publishedYear: integer('published_year'),
    genre: varchar('genre', { length: 100 }),
    pageCount: integer('page_count'),
    coverImageUrl: text('cover_image_url'),
    ...timestamps,
  },
  (table) => [
    index('books_title_idx').on(table.title),
    index('books_author_idx').on(table.author),
    index('books_genre_idx').on(table.genre),
  ],
)

export type Book = InferSelectModel<typeof books>
export type NewBook = InferInsertModel<typeof books>

// ============================================================================
// BOOK REVIEWS
// ============================================================================

export const bookReviews = app.table(
  'book_reviews',
  {
    id: serial('id').primaryKey(),
    bookId: integer('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content'),
    ...timestamps,
  },
  (table) => [
    index('book_reviews_book_id_idx').on(table.bookId),
    index('book_reviews_user_id_idx').on(table.userId),
    check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ],
)

export type BookReview = InferSelectModel<typeof bookReviews>
export type NewBookReview = InferInsertModel<typeof bookReviews>

// ============================================================================
// MATERIALIZED VIEWS
// ============================================================================

export const booksStatsMview = app.materializedView('books_stats_mview').as((qb) =>
  qb
    .select({
      bookId: bookReviews.bookId,
      bookTitle: books.title,
      author: books.author,
      genre: books.genre,
      totalReviews: sql<number>`COUNT(${bookReviews.id})`.as('total_reviews'),
      averageRating: sql<number>`ROUND(AVG(${bookReviews.rating})::numeric, 2)`.as(
        'average_rating',
      ),
    })
    .from(bookReviews)
    .innerJoin(books, sql`${bookReviews.bookId} = ${books.id}`)
    .groupBy(bookReviews.bookId, books.title, books.author, books.genre),
)

export type BookStats = typeof booksStatsMview.$inferSelect
