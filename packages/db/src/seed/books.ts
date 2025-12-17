import { inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { books } from '../schema'

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
    description:
      'The big ideas behind reliable, scalable, and maintainable systems.',
    publishedYear: 2017,
    genre: 'Technology',
    pageCount: 616,
  },
  {
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    isbn: '9780465050659',
    description: 'A powerful primer on how and why some products satisfy customers while others frustrate them.',
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
