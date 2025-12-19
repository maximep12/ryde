import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { boolean, index, integer, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'
import { users } from './users'

// ============================================================================
// CLIENTS
// ============================================================================

export const clients = app.table(
  'clients',
  {
    id: serial('id').primaryKey(),
    clientCode: varchar('client_code', { length: 20 }).unique().notNull(),
    storeName: varchar('store_name', { length: 255 }).notNull(),
    storeType: varchar('store_type', { length: 50 }).notNull(), // pet_store, veterinary_clinic, supermarket, online_retailer, distributor
    contactName: varchar('contact_name', { length: 200 }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }),
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
    index('clients_store_name_idx').on(table.storeName),
    index('clients_store_type_idx').on(table.storeType),
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
    source: varchar('source', { length: 20 }).notNull().default('manual'), // 'edi' or 'manual'
    requiresApproval: boolean('requires_approval').notNull().default(false),
    approvedBy: varchar('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
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
    packageType: varchar('package_type', { length: 30 }).notNull(), // jug, bucket, box, plastic_bag
    quantity: integer('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull(), // stored in cents
    ...timestamps,
  },
  (table) => [
    index('client_order_items_order_id_idx').on(table.orderId),
    index('client_order_items_package_type_idx').on(table.packageType),
  ],
)

export type ClientOrderItem = InferSelectModel<typeof clientOrderItems>
export type NewClientOrderItem = InferInsertModel<typeof clientOrderItems>

// ============================================================================
// CLIENT ORDER ISSUES
// ============================================================================

export const clientOrderIssues = app.table(
  'client_order_issues',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => clientOrders.id, { onDelete: 'cascade' })
      .notNull(),
    issueType: varchar('issue_type', { length: 50 }).notNull(), // pricing_error, inventory_shortage, shipping_delay, damaged_product, wrong_item, payment_issue, address_issue, custom
    severity: varchar('severity', { length: 20 }).notNull().default('medium'), // low, medium, high, critical
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 30 }).notNull().default('open'), // open, in_progress, resolved, dismissed
    resolvedAt: timestamp('resolved_at'),
    resolution: text('resolution'),
    ...timestamps,
  },
  (table) => [
    index('client_order_issues_order_id_idx').on(table.orderId),
    index('client_order_issues_status_idx').on(table.status),
    index('client_order_issues_severity_idx').on(table.severity),
  ],
)

export type ClientOrderIssue = InferSelectModel<typeof clientOrderIssues>
export type NewClientOrderIssue = InferInsertModel<typeof clientOrderIssues>

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
    productSku: varchar('product_sku', { length: 50 }),
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
