import { MESSAGE } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { ContextVariables } from '../../../index'
import { zValidatorThrow } from '../../../lib/errors/zValidatorThrow'
import {
  createBook,
  createReview,
  deleteBook,
  deleteReview,
  getBookAverageRating,
  getBookById,
  getBookByIsbn,
  getBookReviews,
  getBooks,
  getUserReviewForBook,
  updateBook,
  updateReview,
} from './helpers'
import {
  bookQuerySchema,
  createBookSchema,
  createReviewSchema,
  updateBookSchema,
  updateReviewSchema,
} from './schemas'

const booksRouter = new Hono<{ Variables: ContextVariables }>()

export const booksRouterDefinition = booksRouter

  // ============================================================================
  // BOOKS ENDPOINTS
  // ============================================================================

  /**
   * GET /books
   * List all books with pagination and filtering
   */
  .get('/', zValidatorThrow('query', bookQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getBooks(query)
    return c.json(result)
  })

  /**
   * GET /books/:id
   * Get a single book by ID with its average rating
   */
  .get(
    '/:id',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')
      const book = await getBookById(id)

      if (!book) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      const { averageRating, totalReviews } = await getBookAverageRating(id)

      return c.json({ ...book, averageRating, totalReviews })
    },
  )

  /**
   * POST /books
   * Create a new book
   */
  .post('/', zValidatorThrow('json', createBookSchema), async (c) => {
    const data = c.req.valid('json')

    // Check if ISBN already exists
    if (data.isbn) {
      const existingBook = await getBookByIsbn(data.isbn)
      if (existingBook) {
        throw new HTTPException(409, { message: MESSAGE.BOOK_ISBN_EXISTS })
      }
    }

    const book = await createBook(data)
    return c.json({ message: MESSAGE.BOOK_CREATED, book }, 201)
  })

  /**
   * PATCH /books/:id
   * Update an existing book
   */
  .patch(
    '/:id',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidatorThrow('json', updateBookSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')

      // Check if book exists
      const existingBook = await getBookById(id)
      if (!existingBook) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      // Check if new ISBN conflicts with another book
      if (data.isbn && data.isbn !== existingBook.isbn) {
        const bookWithIsbn = await getBookByIsbn(data.isbn)
        if (bookWithIsbn) {
          throw new HTTPException(409, { message: MESSAGE.BOOK_ISBN_EXISTS })
        }
      }

      const book = await updateBook(id, data)
      return c.json({ message: MESSAGE.BOOK_UPDATED, book })
    },
  )

  /**
   * DELETE /books/:id
   * Delete a book
   */
  .delete(
    '/:id',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')

      const deleted = await deleteBook(id)
      if (!deleted) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      return c.json({ message: MESSAGE.BOOK_DELETED })
    },
  )

  // ============================================================================
  // REVIEWS ENDPOINTS
  // ============================================================================

  /**
   * GET /books/:id/reviews
   * Get all reviews for a book
   */
  .get(
    '/:id/reviews',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param')

      const book = await getBookById(id)
      if (!book) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      const reviews = await getBookReviews(id)
      const { averageRating, totalReviews } = await getBookAverageRating(id)

      return c.json({ reviews, averageRating, totalReviews })
    },
  )

  /**
   * POST /books/:id/reviews
   * Create a review for a book (one review per user per book)
   */
  .post(
    '/:id/reviews',
    zValidatorThrow('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidatorThrow('json', createReviewSchema),
    async (c) => {
      const { id: bookId } = c.req.valid('param')
      const data = c.req.valid('json')
      const { id: userId } = c.get('user')

      // Check if book exists
      const book = await getBookById(bookId)
      if (!book) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      // Check if user already reviewed this book
      const existingReview = await getUserReviewForBook(bookId, userId)
      if (existingReview) {
        throw new HTTPException(409, { message: MESSAGE.REVIEW_ALREADY_EXISTS })
      }

      const review = await createReview(bookId, userId, data)
      return c.json({ message: MESSAGE.REVIEW_CREATED, review }, 201)
    },
  )

  /**
   * PATCH /books/:id/reviews/:reviewId
   * Update a review (only the author can update)
   */
  .patch(
    '/:id/reviews/:reviewId',
    zValidatorThrow(
      'param',
      z.object({
        id: z.coerce.number().int().positive(),
        reviewId: z.coerce.number().int().positive(),
      }),
    ),
    zValidatorThrow('json', updateReviewSchema),
    async (c) => {
      const { id: bookId, reviewId } = c.req.valid('param')
      const data = c.req.valid('json')
      const { id: userId } = c.get('user')

      // Check if book exists
      const book = await getBookById(bookId)
      if (!book) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      const review = await updateReview(reviewId, userId, data)
      if (!review) {
        throw new HTTPException(404, { message: MESSAGE.REVIEW_NOT_FOUND })
      }

      return c.json({ message: MESSAGE.REVIEW_UPDATED, review })
    },
  )

  /**
   * DELETE /books/:id/reviews/:reviewId
   * Delete a review (only the author can delete)
   */
  .delete(
    '/:id/reviews/:reviewId',
    zValidatorThrow(
      'param',
      z.object({
        id: z.coerce.number().int().positive(),
        reviewId: z.coerce.number().int().positive(),
      }),
    ),
    async (c) => {
      const { id: bookId, reviewId } = c.req.valid('param')
      const { id: userId } = c.get('user')

      // Check if book exists
      const book = await getBookById(bookId)
      if (!book) {
        throw new HTTPException(404, { message: MESSAGE.BOOK_NOT_FOUND })
      }

      const deleted = await deleteReview(reviewId, userId)
      if (!deleted) {
        throw new HTTPException(404, { message: MESSAGE.REVIEW_NOT_FOUND })
      }

      return c.json({ message: MESSAGE.REVIEW_DELETED })
    },
  )
