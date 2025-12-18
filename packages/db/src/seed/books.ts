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

  // Get all seed users
  const seedUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      inArray(users.email, [
        'john.denver@example.com',
        'samantha.charron@example.com',
        'michael.chen@example.com',
        'emily.rodriguez@example.com',
      ]),
    )

  const userByEmail = Object.fromEntries(seedUsers.map((u) => [u.email, u]))

  const johnDenver = userByEmail['john.denver@example.com']
  const samanthaCharron = userByEmail['samantha.charron@example.com']
  const michaelChen = userByEmail['michael.chen@example.com']
  const emilyRodriguez = userByEmail['emily.rodriguez@example.com']

  if (!johnDenver || !samanthaCharron || !michaelChen || !emilyRodriguez) {
    console.log('Skipping reviews seed: required users not found')
    return
  }

  // Get book IDs
  const seedBooksList = await db
    .select({ id: books.id, isbn: books.isbn })
    .from(books)
    .where(inArray(books.isbn, SEED_BOOK_ISBNS))

  const bookByIsbn = Object.fromEntries(seedBooksList.map((b) => [b.isbn, b]))

  const pragmaticProgrammer = bookByIsbn['9780135957059']
  const cleanCode = bookByIsbn['9780132350884']
  const designingDataIntensive = bookByIsbn['9781449373320']
  const atomicHabits = bookByIsbn['9780735211292']

  if (!pragmaticProgrammer || !cleanCode || !designingDataIntensive || !atomicHabits) {
    console.log('Skipping reviews seed: required books not found')
    return
  }

  // Delete existing seed reviews for these user/book combinations (idempotent)
  const reviewPairs = [
    { userId: johnDenver.id, bookId: pragmaticProgrammer.id },
    { userId: samanthaCharron.id, bookId: pragmaticProgrammer.id },
    { userId: michaelChen.id, bookId: pragmaticProgrammer.id },
    { userId: emilyRodriguez.id, bookId: pragmaticProgrammer.id },
    { userId: samanthaCharron.id, bookId: cleanCode.id },
    { userId: michaelChen.id, bookId: cleanCode.id },
    { userId: johnDenver.id, bookId: designingDataIntensive.id },
    { userId: emilyRodriguez.id, bookId: designingDataIntensive.id },
    { userId: johnDenver.id, bookId: atomicHabits.id },
    { userId: michaelChen.id, bookId: atomicHabits.id },
  ]

  let deletedCount = 0
  for (const pair of reviewPairs) {
    const deleted = await db
      .delete(bookReviews)
      .where(and(eq(bookReviews.userId, pair.userId), eq(bookReviews.bookId, pair.bookId)))
      .returning()
    deletedCount += deleted.length
  }

  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} existing seed review(s)`)
  }

  await db.insert(bookReviews).values([
    // The Pragmatic Programmer - 4 reviews
    {
      bookId: pragmaticProgrammer.id,
      userId: johnDenver.id,
      rating: 5,
      title: 'A must-read for every developer',
      content:
        'This book completely changed how I approach software development. The tips are practical and timeless. I find myself referring back to it regularly.',
    },
    {
      bookId: pragmaticProgrammer.id,
      userId: samanthaCharron.id,
      rating: 5,
      title: 'Timeless wisdom for programmers',
      content:
        'Even years after first reading it, I still find new insights every time I pick it up. The second edition is even better with updated examples.',
    },
    {
      bookId: pragmaticProgrammer.id,
      userId: michaelChen.id,
      rating: 4,
      title: 'Great concepts, some obvious points',
      content:
        'Lots of valuable advice here. Some chapters felt like common sense to experienced developers, but overall a solid read that I would recommend.',
    },
    {
      bookId: pragmaticProgrammer.id,
      userId: emilyRodriguez.id,
      rating: 5,
      title: 'Changed my career trajectory',
      content:
        'Read this early in my career and it shaped how I think about code quality and professional growth. Essential reading for anyone serious about software.',
    },
    // Clean Code - 2 reviews
    {
      bookId: cleanCode.id,
      userId: samanthaCharron.id,
      rating: 4,
      title: 'Solid fundamentals with some dated examples',
      content:
        'Great principles for writing maintainable code. Some examples feel a bit dated now, but the core concepts are still very relevant. Highly recommend for junior developers.',
    },
    {
      bookId: cleanCode.id,
      userId: michaelChen.id,
      rating: 3,
      title: 'Good ideas, overly dogmatic at times',
      content:
        'The book has excellent points about naming and function size, but some rules feel too rigid. Take the advice with context in mind.',
    },
    // Designing Data-Intensive Applications - 2 reviews
    {
      bookId: designingDataIntensive.id,
      userId: johnDenver.id,
      rating: 5,
      title: 'The best systems design book out there',
      content:
        'Kleppmann does an incredible job explaining complex distributed systems concepts. A must-have reference for backend and infrastructure engineers.',
    },
    {
      bookId: designingDataIntensive.id,
      userId: emilyRodriguez.id,
      rating: 5,
      title: 'Dense but incredibly valuable',
      content:
        'This book is packed with information. It took me a while to get through, but the depth of knowledge here is unmatched. Essential for understanding modern data systems.',
    },
    // Atomic Habits - 2 reviews
    {
      bookId: atomicHabits.id,
      userId: johnDenver.id,
      rating: 4,
      title: 'Practical and actionable',
      content:
        'Clear framework for building better habits. Some concepts overlap with other self-help books, but the 1% improvement philosophy really resonated with me.',
    },
    {
      bookId: atomicHabits.id,
      userId: michaelChen.id,
      rating: 5,
      title: 'Actually changed my daily routine',
      content:
        'Unlike many self-help books, I actually implemented the strategies from this one. The habit stacking technique has been especially useful.',
    },
  ])

  console.log('Created 10 sample book reviews')
}
