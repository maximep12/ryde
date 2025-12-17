import { books, bookReviews, users } from '@repo/db'
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../../../db'
import { BookQuery, CreateBook, CreateReview, UpdateBook, UpdateReview } from './schemas'

// ============================================================================
// BOOKS HELPERS
// ============================================================================

export async function getBooks(query: BookQuery) {
  const { page, pageSize, search, genre, author } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (search) {
    conditions.push(or(ilike(books.title, `%${search}%`), ilike(books.author, `%${search}%`)))
  }

  if (genre) {
    conditions.push(eq(books.genre, genre))
  }

  if (author) {
    conditions.push(ilike(books.author, `%${author}%`))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(books)
      .where(whereClause)
      .orderBy(desc(books.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(books).where(whereClause),
  ])

  const total = countResult[0]?.total ?? 0

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getBookById(id: number) {
  const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1)
  return book ?? null
}

export async function getBookByIsbn(isbn: string) {
  const [book] = await db.select().from(books).where(eq(books.isbn, isbn)).limit(1)
  return book ?? null
}

export async function createBook(data: CreateBook) {
  const [book] = await db.insert(books).values(data).returning()
  return book
}

export async function updateBook(id: number, data: UpdateBook) {
  const [book] = await db
    .update(books)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(books.id, id))
    .returning()
  return book ?? null
}

export async function deleteBook(id: number) {
  const { rowCount } = await db.delete(books).where(eq(books.id, id))
  return (rowCount ?? 0) > 0
}

// ============================================================================
// REVIEWS HELPERS
// ============================================================================

export async function getBookReviews(bookId: number) {
  return db
    .select({
      id: bookReviews.id,
      bookId: bookReviews.bookId,
      rating: bookReviews.rating,
      title: bookReviews.title,
      content: bookReviews.content,
      createdAt: bookReviews.createdAt,
      updatedAt: bookReviews.updatedAt,
      user: {
        id: users.id,
        givenName: users.givenName,
        familyName: users.familyName,
      },
    })
    .from(bookReviews)
    .innerJoin(users, eq(bookReviews.userId, users.id))
    .where(eq(bookReviews.bookId, bookId))
    .orderBy(desc(bookReviews.createdAt))
}

export async function getBookAverageRating(bookId: number) {
  const [result] = await db
    .select({
      averageRating: sql<number>`ROUND(AVG(${bookReviews.rating})::numeric, 1)`,
      totalReviews: count(),
    })
    .from(bookReviews)
    .where(eq(bookReviews.bookId, bookId))

  return {
    averageRating: result?.averageRating ?? null,
    totalReviews: result?.totalReviews ?? 0,
  }
}

export async function getReviewById(id: number) {
  const [review] = await db.select().from(bookReviews).where(eq(bookReviews.id, id)).limit(1)
  return review ?? null
}

export async function getUserReviewForBook(bookId: number, userId: string) {
  const [review] = await db
    .select()
    .from(bookReviews)
    .where(and(eq(bookReviews.bookId, bookId), eq(bookReviews.userId, userId)))
    .limit(1)
  return review ?? null
}

export async function createReview(bookId: number, userId: string, data: CreateReview) {
  const [review] = await db
    .insert(bookReviews)
    .values({ bookId, userId, ...data })
    .returning()
  return review
}

export async function updateReview(id: number, userId: string, data: UpdateReview) {
  const [review] = await db
    .update(bookReviews)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(bookReviews.id, id), eq(bookReviews.userId, userId)))
    .returning()
  return review ?? null
}

export async function deleteReview(id: number, userId: string) {
  const { rowCount } = await db
    .delete(bookReviews)
    .where(and(eq(bookReviews.id, id), eq(bookReviews.userId, userId)))
  return (rowCount ?? 0) > 0
}
