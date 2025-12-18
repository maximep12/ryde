import { inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import {
  clientAssortments,
  clientComments,
  clientExchanges,
  clientOrderItems,
  clientOrders,
  clients,
  users,
} from '../schema'

// Seeded random number generator for deterministic results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const SEED_CLIENTS = [
  {
    clientCode: 'CLI-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-123-4567',
    companyName: 'TechCorp Industries',
    billingAddress: '123 Innovation Drive, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-002',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'mchen@globalretail.com',
    phone: '+1-555-234-5678',
    companyName: 'Global Retail Co',
    billingAddress: '456 Commerce Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-003',
    firstName: 'Emily',
    lastName: 'Williams',
    email: 'emily.w@startupxyz.io',
    phone: '+1-555-345-6789',
    companyName: 'StartupXYZ',
    billingAddress: '789 Venture Lane',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-004',
    firstName: 'James',
    lastName: 'Martinez',
    email: 'jmartinez@mediahub.net',
    phone: '+1-555-456-7890',
    companyName: 'MediaHub Networks',
    billingAddress: '321 Broadcast Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'USA',
    status: 'inactive',
  },
  {
    clientCode: 'CLI-005',
    firstName: 'Amanda',
    lastName: 'Thompson',
    email: 'athompson@healthplus.org',
    phone: '+1-555-567-8901',
    companyName: 'HealthPlus Medical',
    billingAddress: '555 Wellness Blvd',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60601',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-006',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@financegroup.com',
    phone: '+1-555-678-9012',
    companyName: 'Finance Group LLC',
    billingAddress: '888 Wall Street, Floor 12',
    city: 'New York',
    state: 'NY',
    postalCode: '10005',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-007',
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.a@educatemore.edu',
    phone: '+1-555-789-0123',
    companyName: 'EducateMore Institute',
    billingAddress: '100 Learning Way',
    city: 'Boston',
    state: 'MA',
    postalCode: '02101',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-008',
    firstName: 'Robert',
    lastName: 'Brown',
    email: 'rbrown@constructall.com',
    phone: '+1-555-890-1234',
    companyName: 'ConstructAll Building',
    billingAddress: '200 Builder Road',
    city: 'Denver',
    state: 'CO',
    postalCode: '80201',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-009',
    firstName: 'Jennifer',
    lastName: 'Davis',
    email: 'jdavis@legalpartners.law',
    phone: '+1-555-901-2345',
    companyName: 'Legal Partners LLP',
    billingAddress: '300 Justice Avenue, Suite 500',
    city: 'Washington',
    state: 'DC',
    postalCode: '20001',
    country: 'USA',
    status: 'inactive',
  },
  {
    clientCode: 'CLI-010',
    firstName: 'Christopher',
    lastName: 'Wilson',
    email: 'cwilson@greenenergy.com',
    phone: '+1-555-012-3456',
    companyName: 'Green Energy Solutions',
    billingAddress: '400 Solar Drive',
    city: 'Phoenix',
    state: 'AZ',
    postalCode: '85001',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-011',
    firstName: 'Michelle',
    lastName: 'Taylor',
    email: 'mtaylor@fooddelivery.co',
    phone: '+1-555-111-2222',
    companyName: 'FoodDelivery Express',
    billingAddress: '500 Cuisine Court',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-012',
    firstName: 'Daniel',
    lastName: 'Garcia',
    email: 'dgarcia@autoparts.com',
    phone: '+1-555-222-3333',
    companyName: 'AutoParts Unlimited',
    billingAddress: '600 Motor Lane',
    city: 'Detroit',
    state: 'MI',
    postalCode: '48201',
    country: 'USA',
    status: 'active',
  },
]

const SEED_CLIENT_CODES = SEED_CLIENTS.map((c) => c.clientCode)

// Fixed reference date for deterministic date calculations
const REFERENCE_DATE = new Date('2024-06-15T12:00:00Z')

const PRODUCTS = [
  { name: 'Enterprise Software License', sku: 'SW-ENT-001', price: 149900 },
  { name: 'Cloud Storage Plan - 1TB', sku: 'CS-1TB-001', price: 9999 },
  { name: 'Premium Support Package', sku: 'SUP-PRM-001', price: 29999 },
  { name: 'Data Analytics Module', sku: 'DA-MOD-001', price: 49999 },
  { name: 'Security Suite Pro', sku: 'SEC-PRO-001', price: 79999 },
  { name: 'API Integration Kit', sku: 'API-KIT-001', price: 19999 },
  { name: 'Mobile App License', sku: 'MOB-LIC-001', price: 24999 },
  { name: 'Training Workshop (5 seats)', sku: 'TRN-WRK-005', price: 99999 },
  { name: 'Backup Service - Annual', sku: 'BKP-ANN-001', price: 59999 },
  { name: 'Custom Development Hours (10)', sku: 'DEV-HRS-010', price: 150000 },
]

export async function seedClients(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding clients...')

  // Delete existing seed clients (cascade will delete related orders, exchanges, assortments)
  const deleted = await db
    .delete(clients)
    .where(inArray(clients.clientCode, SEED_CLIENT_CODES))
    .returning()
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} existing seed client(s) and related data`)
  }

  await db.insert(clients).values(SEED_CLIENTS)
  console.log(`Created ${SEED_CLIENTS.length} sample clients`)
}

export async function seedClientOrders(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client orders...')

  // Get all seed clients
  const seedClientsList = await db
    .select({ id: clients.id, clientCode: clients.clientCode })
    .from(clients)
    .where(inArray(clients.clientCode, SEED_CLIENT_CODES))

  if (seedClientsList.length === 0) {
    console.log('Skipping orders seed: no clients found')
    return
  }

  const clientByCode = Object.fromEntries(seedClientsList.map((c) => [c.clientCode, c]))

  // Fixed order data - deterministic
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

  const orders: Array<{
    orderNumber: string
    clientId: number
    orderDate: Date
    totalAmount: number
    status: string
    shippingAddress: string | null
  }> = []

  const orderItems: Array<{
    orderNumber: string
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }> = []

  // Deterministic order generation
  let orderCounter = 1

  for (let clientIdx = 0; clientIdx < SEED_CLIENTS.length; clientIdx++) {
    const seedClient = SEED_CLIENTS[clientIdx]!
    const client = clientByCode[seedClient.clientCode]
    if (!client) continue

    // Each client gets 7 orders (fixed count)
    const numOrders = 7

    for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
      const orderNum = `ORD-${seedClient.clientCode}-${String(orderIdx + 1).padStart(3, '0')}`

      // Deterministic days ago based on client and order index
      const seed = clientIdx * 100 + orderIdx
      const daysAgo = Math.floor(seededRandom(seed) * 300) + 10
      const orderDate = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      // Deterministic status
      const statusIdx = (clientIdx + orderIdx) % orderStatuses.length
      const status = orderStatuses[statusIdx]!

      // Deterministic products: 1-3 items per order
      const numItems = (orderIdx % 3) + 1
      let totalAmount = 0

      for (let itemIdx = 0; itemIdx < numItems; itemIdx++) {
        const productIdx = (clientIdx + orderIdx + itemIdx) % PRODUCTS.length
        const product = PRODUCTS[productIdx]!
        const quantity = (itemIdx % 2) + 1

        totalAmount += product.price * quantity

        orderItems.push({
          orderNumber: orderNum,
          productName: product.name,
          productSku: product.sku,
          quantity,
          unitPrice: product.price,
        })
      }

      orders.push({
        orderNumber: orderNum,
        clientId: client.id,
        orderDate,
        totalAmount,
        status,
        shippingAddress: seedClient.billingAddress ?? null,
      })

      orderCounter++
    }
  }

  // Insert orders
  await db.insert(clientOrders).values(orders)
  console.log(`Created ${orders.length} sample orders`)

  // Get inserted orders to link items
  const orderNumbers = orders.map((o) => o.orderNumber)
  const insertedOrders = await db
    .select({ id: clientOrders.id, orderNumber: clientOrders.orderNumber })
    .from(clientOrders)
    .where(inArray(clientOrders.orderNumber, orderNumbers))

  const orderByNumber = Object.fromEntries(insertedOrders.map((o) => [o.orderNumber, o]))

  // Insert order items
  const itemsToInsert = orderItems
    .filter((item) => orderByNumber[item.orderNumber])
    .map((item) => ({
      orderId: orderByNumber[item.orderNumber]!.id,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))

  await db.insert(clientOrderItems).values(itemsToInsert)
  console.log(`Created ${itemsToInsert.length} sample order items`)
}

export async function seedClientExchanges(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client exchanges...')

  // Get all seed clients
  const seedClientsList = await db
    .select({ id: clients.id, clientCode: clients.clientCode })
    .from(clients)
    .where(inArray(clients.clientCode, SEED_CLIENT_CODES))

  if (seedClientsList.length === 0) {
    console.log('Skipping exchanges seed: no clients found')
    return
  }

  const clientByCode = Object.fromEntries(seedClientsList.map((c) => [c.clientCode, c]))

  const exchangeReasons = [
    'defective_product',
    'wrong_item',
    'not_as_described',
    'changed_mind',
    'better_price_found',
    'duplicate_order',
  ]

  const exchangeStatuses = ['pending', 'approved', 'processing', 'completed', 'rejected']

  const resolutions = [
    'Full refund issued',
    'Replacement sent',
    'Store credit applied',
    'Partial refund issued',
    'Exchange processed',
  ]

  const productNames = ['Enterprise Software License', 'Premium Support Package', 'Security Suite Pro']
  const productSkus = ['SW-ENT-001', 'SUP-PRM-001', 'SEC-PRO-001']

  // Fixed list of clients with exchanges and their exchange counts
  const clientExchangeConfig: Record<string, number> = {
    'CLI-001': 2,
    'CLI-002': 1,
    'CLI-003': 3,
    'CLI-005': 1,
    'CLI-006': 2,
    'CLI-008': 1,
    'CLI-010': 2,
    'CLI-011': 1,
  }

  const exchanges: Array<{
    exchangeNumber: string
    clientId: number
    exchangeDate: Date
    reason: string
    reasonDetails: string
    status: string
    exchangeAmount: number
    productName: string
    productSku: string
    quantity: number
    resolution: string | null
  }> = []

  for (const [clientCode, numExchanges] of Object.entries(clientExchangeConfig)) {
    const client = clientByCode[clientCode]
    if (!client) continue

    for (let i = 0; i < numExchanges; i++) {
      const exchangeNum = `EXC-${clientCode}-${String(i + 1).padStart(3, '0')}`

      // Deterministic calculations
      const clientIdx = SEED_CLIENT_CODES.indexOf(clientCode)
      const seed = clientIdx * 10 + i
      const daysAgo = Math.floor(seededRandom(seed) * 150) + 5
      const exchangeDate = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      const reasonIdx = (clientIdx + i) % exchangeReasons.length
      const statusIdx = (clientIdx + i * 2) % exchangeStatuses.length
      const productIdx = (clientIdx + i) % productNames.length

      const reason = exchangeReasons[reasonIdx]!
      const status = exchangeStatuses[statusIdx]!
      const productName = productNames[productIdx]!
      const productSku = productSkus[productIdx]!

      // Deterministic amount based on seed
      const exchangeAmount = 5000 + Math.floor(seededRandom(seed + 1000) * 95000)

      exchanges.push({
        exchangeNumber: exchangeNum,
        clientId: client.id,
        exchangeDate,
        reason,
        reasonDetails: `Customer reported: ${reason.replace(/_/g, ' ')}. Ticket created for review.`,
        status,
        exchangeAmount,
        productName,
        productSku,
        quantity: 1,
        resolution: status === 'completed' ? resolutions[(clientIdx + i) % resolutions.length]! : null,
      })
    }
  }

  await db.insert(clientExchanges).values(exchanges)
  console.log(`Created ${exchanges.length} sample exchanges`)
}

export async function seedClientAssortments(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client assortments...')

  // Get all seed clients
  const seedClientsList = await db
    .select({ id: clients.id, clientCode: clients.clientCode })
    .from(clients)
    .where(inArray(clients.clientCode, SEED_CLIENT_CODES))

  if (seedClientsList.length === 0) {
    console.log('Skipping assortments seed: no clients found')
    return
  }

  const clientByCode = Object.fromEntries(seedClientsList.map((c) => [c.clientCode, c]))

  const productCategories = [
    { name: 'Enterprise Software License', category: 'Software', hasExpiration: true },
    { name: 'Cloud Storage Plan - 1TB', category: 'Cloud Services', hasExpiration: true },
    { name: 'Premium Support Package', category: 'Support', hasExpiration: true },
    { name: 'Data Analytics Module', category: 'Analytics', hasExpiration: true },
    { name: 'Security Suite Pro', category: 'Security', hasExpiration: true },
    { name: 'API Integration Kit', category: 'Development', hasExpiration: false },
    { name: 'Mobile App License', category: 'Software', hasExpiration: true },
    { name: 'Training Workshop Credits', category: 'Training', hasExpiration: true },
    { name: 'Backup Service - Annual', category: 'Cloud Services', hasExpiration: true },
    { name: 'Consulting Hours Package', category: 'Services', hasExpiration: true },
  ]

  const assortments: Array<{
    clientId: number
    productName: string
    productCategory: string
    subscriptionStatus: string
    purchaseDate: Date
    expirationDate: Date | null
    autoRenew: number
  }> = []

  for (let clientIdx = 0; clientIdx < SEED_CLIENTS.length; clientIdx++) {
    const seedClient = SEED_CLIENTS[clientIdx]!
    const client = clientByCode[seedClient.clientCode]
    if (!client) continue

    // Each client gets 3-5 products (deterministic based on client index)
    const numProducts = 3 + (clientIdx % 3)

    for (let productIdx = 0; productIdx < numProducts; productIdx++) {
      // Deterministic product selection
      const selectedProductIdx = (clientIdx + productIdx) % productCategories.length
      const product = productCategories[selectedProductIdx]!

      // Deterministic purchase date
      const seed = clientIdx * 100 + productIdx
      const purchaseDaysAgo = Math.floor(seededRandom(seed) * 600) + 30
      const purchaseDate = new Date(REFERENCE_DATE.getTime() - purchaseDaysAgo * 24 * 60 * 60 * 1000)

      let expirationDate: Date | null = null
      let status = 'active'

      if (product.hasExpiration) {
        // Expiration is 1 year from purchase
        expirationDate = new Date(purchaseDate.getTime() + 365 * 24 * 60 * 60 * 1000)

        // Deterministic status based on expiration and seed
        if (expirationDate < REFERENCE_DATE) {
          status = (clientIdx + productIdx) % 2 === 0 ? 'expired' : 'pending_renewal'
        } else {
          status = (clientIdx + productIdx) % 10 === 0 ? 'cancelled' : 'active'
        }
      }

      // Deterministic auto-renew
      const autoRenew = (clientIdx + productIdx) % 4 !== 0 ? 1 : 0

      assortments.push({
        clientId: client.id,
        productName: product.name,
        productCategory: product.category,
        subscriptionStatus: status,
        purchaseDate,
        expirationDate,
        autoRenew,
      })
    }
  }

  await db.insert(clientAssortments).values(assortments)
  console.log(`Created ${assortments.length} sample assortments`)
}

const SEED_USER_EMAILS = [
  'admin@example.com',
  'john.denver@example.com',
  'samantha.charron@example.com',
  'michael.chen@example.com',
  'emily.rodriguez@example.com',
]

const COMMENT_TEMPLATES = [
  'Spoke with client about their account. They are satisfied with the current service level.',
  'Client requested information about upgrading their plan. Sent follow-up email with details.',
  'Processed billing inquiry. Issue resolved - duplicate charge was refunded.',
  'Client mentioned they may need additional licenses next quarter. Flagged for sales follow-up.',
  'Annual review completed. Client is happy with the product and plans to renew.',
  'Technical support ticket escalated. Engineering team is investigating.',
  'Client asked about new features in the roadmap. Shared product update newsletter.',
  'Payment method updated successfully. New card ending in 4242.',
  'Client experiencing slow performance. Advised to clear cache and restart.',
  'Onboarding call completed. Client is ready to start using the platform.',
  'Contract renewal discussion. Client negotiating for multi-year discount.',
  'Client reported a bug. Ticket #12345 created and assigned to dev team.',
  'Scheduled quarterly business review for next month.',
  'Client wants to add new team members. Sent invitation instructions.',
  'Billing address updated per client request.',
]

export async function seedClientComments(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client comments...')

  // Get all seed clients
  const seedClientsList = await db
    .select({ id: clients.id, clientCode: clients.clientCode })
    .from(clients)
    .where(inArray(clients.clientCode, SEED_CLIENT_CODES))

  if (seedClientsList.length === 0) {
    console.log('Skipping comments seed: no clients found')
    return
  }

  // Get all seed users
  const seedUsersList = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, SEED_USER_EMAILS))

  if (seedUsersList.length === 0) {
    console.log('Skipping comments seed: no users found')
    return
  }

  const clientByCode = Object.fromEntries(seedClientsList.map((c) => [c.clientCode, c]))

  const comments: Array<{
    clientId: number
    userId: string
    content: string
    createdAt: Date
  }> = []

  for (let clientIdx = 0; clientIdx < SEED_CLIENTS.length; clientIdx++) {
    const seedClient = SEED_CLIENTS[clientIdx]!
    const client = clientByCode[seedClient.clientCode]
    if (!client) continue

    // Each client gets 2-4 comments (deterministic based on client index)
    const numComments = 2 + (clientIdx % 3)

    for (let commentIdx = 0; commentIdx < numComments; commentIdx++) {
      // Deterministic user selection
      const userIdx = (clientIdx + commentIdx) % seedUsersList.length
      const user = seedUsersList[userIdx]!

      // Deterministic comment content
      const templateIdx = (clientIdx * 3 + commentIdx) % COMMENT_TEMPLATES.length
      const content = COMMENT_TEMPLATES[templateIdx]!

      // Deterministic date (comments spread over last 90 days)
      const seed = clientIdx * 100 + commentIdx + 5000
      const daysAgo = Math.floor(seededRandom(seed) * 90) + 1
      const createdAt = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      comments.push({
        clientId: client.id,
        userId: user.id,
        content,
        createdAt,
      })
    }
  }

  await db.insert(clientComments).values(comments)
  console.log(`Created ${comments.length} sample comments`)
}
