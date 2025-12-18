import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { bookReviews, books, users } from '../schema'

const SEED_BOOKS = [
  {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    isbn: '9780135957059',
    description:
      'A guide to becoming a better programmer through practical advice and timeless wisdom.',
    publishedYear: 2019,
    genre: 'Technology',
    pageCount: 352,
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    description: 'A handbook of agile software craftsmanship.',
    publishedYear: 2008,
    genre: 'Technology',
    pageCount: 464,
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    isbn: '9781449373320',
    description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    publishedYear: 2017,
    genre: 'Technology',
    pageCount: 616,
  },
  {
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    isbn: '9780465050659',
    description:
      'A powerful primer on how and why some products satisfy customers while others frustrate them.',
    publishedYear: 2013,
    genre: 'Design',
    pageCount: 368,
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    description: 'An easy and proven way to build good habits and break bad ones.',
    publishedYear: 2018,
    genre: 'Self-Help',
    pageCount: 320,
  },
]

const SEED_BOOK_ISBNS = SEED_BOOKS.map((book) => book.isbn)

export async function seedBooks(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding books...')

  // Delete existing seed books (idempotent)
  const deleted = await db.delete(books).where(inArray(books.isbn, SEED_BOOK_ISBNS)).returning()
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} existing seed book(s)`)
  }

  await db.insert(books).values(SEED_BOOKS)

  console.log(`Created ${SEED_BOOKS.length} sample books`)
}

export async function seedBookReviews(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding book reviews...')

  // Get user IDs for John Denver and Samantha Charron
  const johnDenver = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'john.denver@example.com'))
    .then((rows) => rows[0])

  const samanthaCharron = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'samantha.charron@example.com'))
    .then((rows) => rows[0])

  if (!johnDenver || !samanthaCharron) {
    console.log('Skipping reviews seed: required users not found')
    return
  }

  // Get book IDs for two different books
  const pragmaticProgrammer = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.isbn, '9780135957059'))
    .then((rows) => rows[0])

  const cleanCode = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.isbn, '9780132350884'))
    .then((rows) => rows[0])

  if (!pragmaticProgrammer || !cleanCode) {
    console.log('Skipping reviews seed: required books not found')
    return
  }

  // Delete only the specific seed reviews (idempotent)
  const deleted1 = await db
    .delete(bookReviews)
    .where(and(eq(bookReviews.userId, johnDenver.id), eq(bookReviews.bookId, pragmaticProgrammer.id)))
    .returning()
  const deleted2 = await db
    .delete(bookReviews)
    .where(and(eq(bookReviews.userId, samanthaCharron.id), eq(bookReviews.bookId, cleanCode.id)))
    .returning()

  const deletedCount = deleted1.length + deleted2.length
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} existing seed review(s)`)
  }

  await db.insert(bookReviews).values([
    {
      bookId: pragmaticProgrammer.id,
      userId: johnDenver.id,
      rating: 5,
      title: 'A must-read for every developer',
      content:
        'This book completely changed how I approach software development. The tips are practical and timeless. I find myself referring back to it regularly.',
    },
    {
      bookId: cleanCode.id,
      userId: samanthaCharron.id,
      rating: 4,
      title: 'Solid fundamentals with some dated examples',
      content:
        'Great principles for writing maintainable code. Some examples feel a bit dated now, but the core concepts are still very relevant. Highly recommend for junior developers.',
    },
  ])

  console.log('Created 2 sample book reviews')
}
