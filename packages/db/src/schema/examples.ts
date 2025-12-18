import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm'
import { check, index, integer, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'
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
// CLIENTS
// ============================================================================

export const clients = app.table(
  'clients',
  {
    id: serial('id').primaryKey(),
    clientCode: varchar('client_code', { length: 20 }).unique().notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }),
    companyName: varchar('company_name', { length: 255 }),
    billingAddress: text('billing_address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    index('clients_client_code_idx').on(table.clientCode),
    index('clients_email_idx').on(table.email),
    index('clients_name_idx').on(table.firstName, table.lastName),
    index('clients_company_idx').on(table.companyName),
    index('clients_phone_idx').on(table.phone),
  ],
)

export type Client = InferSelectModel<typeof clients>
export type NewClient = InferInsertModel<typeof clients>

// ============================================================================
// CLIENT ORDERS
// ============================================================================

export const clientOrders = app.table(
  'client_orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: varchar('order_number', { length: 30 }).unique().notNull(),
    clientId: integer('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    orderDate: timestamp('order_date').notNull(),
    totalAmount: integer('total_amount').notNull(), // stored in cents
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    shippingAddress: text('shipping_address'),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    index('client_orders_client_id_idx').on(table.clientId),
    index('client_orders_order_date_idx').on(table.orderDate),
    index('client_orders_status_idx').on(table.status),
  ],
)

export type ClientOrder = InferSelectModel<typeof clientOrders>
export type NewClientOrder = InferInsertModel<typeof clientOrders>

// ============================================================================
// CLIENT ORDER ITEMS
// ============================================================================

export const clientOrderItems = app.table(
  'client_order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => clientOrders.id, { onDelete: 'cascade' })
      .notNull(),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSku: varchar('product_sku', { length: 50 }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull(), // stored in cents
    ...timestamps,
  },
  (table) => [index('client_order_items_order_id_idx').on(table.orderId)],
)

export type ClientOrderItem = InferSelectModel<typeof clientOrderItems>
export type NewClientOrderItem = InferInsertModel<typeof clientOrderItems>

// ============================================================================
// CLIENT EXCHANGES (Returns/Exchanges)
// ============================================================================

export const clientExchanges = app.table(
  'client_exchanges',
  {
    id: serial('id').primaryKey(),
    exchangeNumber: varchar('exchange_number', { length: 30 }).unique().notNull(),
    clientId: integer('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id').references(() => clientOrders.id, { onDelete: 'set null' }),
    exchangeDate: timestamp('exchange_date').notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    reasonDetails: text('reason_details'),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    exchangeAmount: integer('exchange_amount').notNull(), // stored in cents
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSku: varchar('product_sku', { length: 50 }),
    quantity: integer('quantity').notNull().default(1),
    resolution: text('resolution'),
    ...timestamps,
  },
  (table) => [
    index('client_exchanges_client_id_idx').on(table.clientId),
    index('client_exchanges_order_id_idx').on(table.orderId),
    index('client_exchanges_status_idx').on(table.status),
  ],
)

export type ClientExchange = InferSelectModel<typeof clientExchanges>
export type NewClientExchange = InferInsertModel<typeof clientExchanges>

// ============================================================================
// CLIENT PRODUCT ASSORTMENTS (Subscriptions/Purchased Products)
// ============================================================================

export const clientAssortments = app.table(
  'client_assortments',
  {
    id: serial('id').primaryKey(),
    clientId: integer('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productCategory: varchar('product_category', { length: 100 }),
    subscriptionStatus: varchar('subscription_status', { length: 30 }).notNull().default('active'),
    purchaseDate: timestamp('purchase_date').notNull(),
    expirationDate: timestamp('expiration_date'),
    autoRenew: integer('auto_renew').default(0), // 0 = false, 1 = true
    ...timestamps,
  },
  (table) => [
    index('client_assortments_client_id_idx').on(table.clientId),
    index('client_assortments_status_idx').on(table.subscriptionStatus),
    index('client_assortments_category_idx').on(table.productCategory),
  ],
)

export type ClientAssortment = InferSelectModel<typeof clientAssortments>
export type NewClientAssortment = InferInsertModel<typeof clientAssortments>

// ============================================================================
// CLIENT COMMENTS (Customer Service Notes)
// ============================================================================

export const clientComments = app.table(
  'client_comments',
  {
    id: serial('id').primaryKey(),
    clientId: integer('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    ...timestamps,
  },
  (table) => [
    index('client_comments_client_id_idx').on(table.clientId),
    index('client_comments_user_id_idx').on(table.userId),
    index('client_comments_created_at_idx').on(table.createdAt),
  ],
)

export type ClientComment = InferSelectModel<typeof clientComments>
export type NewClientComment = InferInsertModel<typeof clientComments>
