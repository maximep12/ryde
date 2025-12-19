import { inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import {
  clientAssortments,
  clientComments,
  clientExchanges,
  clientOrderIssues,
  clientOrderItems,
  clientOrders,
  clients,
  users,
} from '../schema'
import { SEED_PRODUCTS } from './products'

const SEED_USER_EMAILS = [
  'admin@example.com',
  'anne.sergerie@intersand.com',
  'isabelle.picard@intersand.com',
  'nathalie.laforest@intersand.com',
  'nicolas.tremblay@intersand.com',
  'julien.chenard@intersand.com',
  'dominic.mercier@intersand.com',
  'miguel.turcotte@intersand.com',
  'johanne.belanger@intersand.com',
]

// Seeded random number generator for deterministic results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const SEED_CLIENTS = [
  {
    clientCode: 'CLI-001',
    storeName: 'Paws & Claws Pet Emporium',
    storeType: 'pet_store',
    contactName: 'Sarah Johnson',
    email: 'orders@pawsclaws.com',
    phone: '+1-555-123-4567',
    billingAddress: '123 Pet Avenue, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-002',
    storeName: 'PetSmart Plus',
    storeType: 'pet_store',
    contactName: 'Michael Chen',
    email: 'purchasing@petsmartplus.com',
    phone: '+1-555-234-5678',
    billingAddress: '456 Commerce Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-003',
    storeName: 'Happy Tails Veterinary Clinic',
    storeType: 'veterinary_clinic',
    contactName: 'Dr. Emily Williams',
    email: 'supplies@happytailsvet.com',
    phone: '+1-555-345-6789',
    billingAddress: '789 Animal Care Lane',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-004',
    storeName: 'MegaMart Superstore',
    storeType: 'supermarket',
    contactName: 'James Martinez',
    email: 'petaisle@megamart.com',
    phone: '+1-555-456-7890',
    billingAddress: '321 Retail Boulevard',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'USA',
    status: 'inactive',
  },
  {
    clientCode: 'CLI-005',
    storeName: 'Whiskers & Waggers',
    storeType: 'pet_store',
    contactName: 'Amanda Thompson',
    email: 'orders@whiskersandwaggers.com',
    phone: '+1-555-567-8901',
    billingAddress: '555 Furry Friends Blvd',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60601',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-006',
    storeName: 'PetSupplies Direct',
    storeType: 'online_retailer',
    contactName: 'David Kim',
    email: 'wholesale@petsuppliesdirect.com',
    phone: '+1-555-678-9012',
    billingAddress: '888 E-Commerce Way, Suite 12',
    city: 'New York',
    state: 'NY',
    postalCode: '10005',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-007',
    storeName: 'Feline Friends Animal Hospital',
    storeType: 'veterinary_clinic',
    contactName: 'Dr. Lisa Anderson',
    email: 'clinic@felinefriends.vet',
    phone: '+1-555-789-0123',
    billingAddress: '100 Veterinary Way',
    city: 'Boston',
    state: 'MA',
    postalCode: '02101',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-008',
    storeName: 'Rocky Mountain Pet Distributors',
    storeType: 'distributor',
    contactName: 'Robert Brown',
    email: 'orders@rockymountainpet.com',
    phone: '+1-555-890-1234',
    billingAddress: '200 Distribution Center Road',
    city: 'Denver',
    state: 'CO',
    postalCode: '80201',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-009',
    storeName: 'Capital City Pet Supply',
    storeType: 'pet_store',
    contactName: 'Jennifer Davis',
    email: 'orders@capitalcitypet.com',
    phone: '+1-555-901-2345',
    billingAddress: '300 Pennsylvania Avenue, Suite 500',
    city: 'Washington',
    state: 'DC',
    postalCode: '20001',
    country: 'USA',
    status: 'inactive',
  },
  {
    clientCode: 'CLI-010',
    storeName: 'Desert Paws Pet Center',
    storeType: 'pet_store',
    contactName: 'Christopher Wilson',
    email: 'purchasing@desertpaws.com',
    phone: '+1-555-012-3456',
    billingAddress: '400 Cactus Drive',
    city: 'Phoenix',
    state: 'AZ',
    postalCode: '85001',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-011',
    storeName: 'Chewy Northwest',
    storeType: 'online_retailer',
    contactName: 'Michelle Taylor',
    email: 'wholesale@chewynw.com',
    phone: '+1-555-111-2222',
    billingAddress: '500 Fulfillment Way',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'USA',
    status: 'active',
  },
  {
    clientCode: 'CLI-012',
    storeName: 'Great Lakes Pet Wholesale',
    storeType: 'distributor',
    contactName: 'Daniel Garcia',
    email: 'orders@greatlakespet.com',
    phone: '+1-555-222-3333',
    billingAddress: '600 Warehouse Lane',
    city: 'Detroit',
    state: 'MI',
    postalCode: '48201',
    country: 'USA',
    status: 'active',
  },
]

const SEED_CLIENT_CODES = SEED_CLIENTS.map((c) => c.clientCode)

// Fixed reference date for deterministic date calculations
const REFERENCE_DATE = new Date('2025-12-15T12:00:00Z')

export async function seedClients(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding clients...')

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
    source: string
    requiresApproval: boolean
    shippingAddress: string | null
  }> = []

  const orderItems: Array<{
    orderNumber: string
    productName: string
    productSku: string
    packageType: string
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
      // Most orders (5 out of 7) are in December, rest spread over past months
      const seed = clientIdx * 100 + orderIdx
      let daysAgo: number
      if (orderIdx < 5) {
        // December orders: 0-14 days ago (Dec 1-15)
        daysAgo = Math.floor(seededRandom(seed) * 15)
      } else {
        // Older orders: 30-180 days ago
        daysAgo = Math.floor(seededRandom(seed) * 150) + 30
      }
      const orderDate = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      // Deterministic status
      const statusIdx = (clientIdx + orderIdx) % orderStatuses.length
      const status = orderStatuses[statusIdx]!

      // Deterministic source - about 70% EDI, 30% Manual
      const source = (clientIdx + orderIdx) % 10 < 7 ? 'edi' : 'manual'

      // Deterministic products: 1-3 items per order
      const numItems = (orderIdx % 3) + 1
      let totalAmount = 0

      for (let itemIdx = 0; itemIdx < numItems; itemIdx++) {
        const productIdx = (clientIdx + orderIdx + itemIdx) % SEED_PRODUCTS.length
        const product = SEED_PRODUCTS[productIdx]!
        const quantity = (itemIdx % 2) + 1

        totalAmount += product.price * quantity

        orderItems.push({
          orderNumber: orderNum,
          productName: product.name,
          productSku: product.sku,
          packageType: product.packageType,
          quantity,
          unitPrice: product.price,
        })
      }

      // Deterministic requiresApproval - about 25% of orders require approval
      // Higher chance for large orders (totalAmount > 50000 cents = $500)
      const requiresApproval =
        totalAmount > 50000 ? (clientIdx + orderIdx) % 2 === 0 : (clientIdx + orderIdx) % 4 === 0

      orders.push({
        orderNumber: orderNum,
        clientId: client.id,
        orderDate,
        totalAmount,
        // Orders requiring approval must be pending (not yet processed)
        status: requiresApproval ? 'pending' : status,
        source,
        requiresApproval,
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
      packageType: item.packageType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))

  await db.insert(clientOrderItems).values(itemsToInsert)
  console.log(`Created ${itemsToInsert.length} sample order items`)
}

export async function seedClientOrderIssues(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client order issues...')

  // Get all orders to potentially add issues
  const allOrders = await db
    .select({
      id: clientOrders.id,
      orderNumber: clientOrders.orderNumber,
      status: clientOrders.status,
    })
    .from(clientOrders)

  if (allOrders.length === 0) {
    console.log('Skipping order issues seed: no orders found')
    return
  }

  const issueTypes = [
    'pricing_error',
    'inventory_shortage',
    'shipping_delay',
    'damaged_product',
    'wrong_item',
    'payment_issue',
    'address_issue',
  ]

  const severities = ['low', 'medium', 'high', 'critical']
  const statuses = ['open', 'in_progress', 'resolved', 'dismissed']

  const issueTemplates: Record<string, { title: string; description: string }[]> = {
    pricing_error: [
      {
        title: 'Price mismatch on invoice',
        description:
          'Customer invoice shows different price than quoted. Need to issue credit memo.',
      },
      {
        title: 'Discount not applied',
        description:
          'Volume discount was not applied to this order. Customer is expecting 10% off.',
      },
    ],
    inventory_shortage: [
      {
        title: 'Partial shipment required',
        description:
          'Only 60% of ordered quantity available in warehouse. Backorder created for remaining items.',
      },
      {
        title: 'Out of stock - substitute offered',
        description:
          'Product SKU out of stock. Customer offered alternative product at same price.',
      },
    ],
    shipping_delay: [
      {
        title: 'Carrier delay - weather related',
        description:
          'Shipment delayed due to severe weather conditions in delivery region. ETA pushed by 3 days.',
      },
      {
        title: 'Customs hold',
        description: 'International shipment held at customs. Additional documentation required.',
      },
    ],
    damaged_product: [
      {
        title: 'Damaged packaging reported',
        description:
          'Customer reported damaged packaging on 2 units. Photos received and replacement being processed.',
      },
      {
        title: 'Product contamination',
        description:
          'Customer reported unusual odor from product batch. QA investigation initiated.',
      },
    ],
    wrong_item: [
      {
        title: 'Wrong product variant shipped',
        description: 'Customer received lavender scent instead of unscented. Return label sent.',
      },
      {
        title: 'Incorrect quantity',
        description: 'Order shows 10 units but only 8 were shipped. Shortage to be resolved.',
      },
    ],
    payment_issue: [
      {
        title: 'Payment declined',
        description:
          'Customer payment method declined. Order on hold pending new payment information.',
      },
      {
        title: 'Duplicate charge',
        description: 'Customer charged twice for same order. Refund being processed.',
      },
    ],
    address_issue: [
      {
        title: 'Invalid delivery address',
        description:
          'Carrier unable to deliver - address incomplete. Awaiting customer confirmation.',
      },
      {
        title: 'Business closed at delivery',
        description: 'Multiple delivery attempts failed - business closed during delivery hours.',
      },
    ],
  }

  const resolutions = [
    'Issue resolved - credit memo issued',
    'Replacement shipment sent via express',
    'Customer accepted alternative solution',
    'Refund processed successfully',
    'Issue escalated and resolved by management',
    'Carrier confirmed successful redelivery',
  ]

  // Only add issues to some orders (about 20%)
  const ordersWithIssues = allOrders.filter((_, idx) => idx % 5 === 0 || idx % 7 === 0)

  const issues: Array<{
    orderId: number
    issueType: string
    severity: string
    title: string
    description: string
    status: string
    resolvedAt: Date | null
    resolution: string | null
    createdAt: Date
  }> = []

  for (let i = 0; i < ordersWithIssues.length; i++) {
    const order = ordersWithIssues[i]!

    // Deterministic issue type based on index
    const issueTypeIdx = i % issueTypes.length
    const issueType = issueTypes[issueTypeIdx]!

    // Get template for this issue type
    const templates = issueTemplates[issueType]!
    const template = templates[i % templates.length]!

    // Deterministic severity - cancelled orders get higher severity
    let severityIdx = i % severities.length
    if (order.status === 'cancelled') {
      severityIdx = Math.min(severityIdx + 2, severities.length - 1)
    }
    const severity = severities[severityIdx]!

    // Deterministic status - older issues more likely resolved
    const statusIdx = i % statuses.length
    const status = statuses[statusIdx]!

    // Created date - 1-10 days ago
    const daysAgo = (i % 10) + 1
    const createdAt = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Resolved date and resolution only for resolved/dismissed
    let resolvedAt: Date | null = null
    let resolution: string | null = null
    if (status === 'resolved' || status === 'dismissed') {
      resolvedAt = new Date(createdAt.getTime() + ((i % 3) + 1) * 24 * 60 * 60 * 1000)
      resolution = resolutions[i % resolutions.length]!
    }

    issues.push({
      orderId: order.id,
      issueType,
      severity,
      title: template.title,
      description: template.description,
      status,
      resolvedAt,
      resolution,
      createdAt,
    })

    // Some orders have multiple issues (about 30%)
    if (i % 3 === 0) {
      const secondIssueTypeIdx = (issueTypeIdx + 2) % issueTypes.length
      const secondIssueType = issueTypes[secondIssueTypeIdx]!
      const secondTemplates = issueTemplates[secondIssueType]!
      const secondTemplate = secondTemplates[(i + 1) % secondTemplates.length]!

      issues.push({
        orderId: order.id,
        issueType: secondIssueType,
        severity: severities[(severityIdx + 1) % severities.length]!,
        title: secondTemplate.title,
        description: secondTemplate.description,
        status: 'open',
        resolvedAt: null,
        resolution: null,
        createdAt: new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
      })
    }
  }

  await db.insert(clientOrderIssues).values(issues)
  console.log(`Created ${issues.length} sample order issues`)
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
    'damaged_packaging',
    'wrong_product_variant',
    'quality_issue',
    'contamination',
    'dust_excess',
    'duplicate_order',
  ]

  const exchangeStatuses = ['pending', 'approved', 'processing', 'completed', 'rejected']

  const resolutions = [
    'Full refund issued',
    'Replacement shipment sent',
    'Store credit applied',
    'Partial refund for damaged units',
    'Exchange for different product variant',
  ]

  const exchangeProducts = [
    { name: 'OdourLock Unscented 12kg', sku: 'ODL-UNS-12', packageType: 'jug' },
    { name: 'Odour Buster Original 14kg', sku: 'ODB-ORI-14', packageType: 'box' },
    { name: 'Classic Unscented 14kg', sku: 'CLS-UNS-14', packageType: 'plastic_bag' },
  ]

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
      const productIdx = (clientIdx + i) % exchangeProducts.length

      const reason = exchangeReasons[reasonIdx]!
      const status = exchangeStatuses[statusIdx]!
      const exchangeProduct = exchangeProducts[productIdx]!

      // Deterministic amount based on seed
      const exchangeAmount = 5000 + Math.floor(seededRandom(seed + 1000) * 95000)

      exchanges.push({
        exchangeNumber: exchangeNum,
        clientId: client.id,
        exchangeDate,
        reason,
        reasonDetails: `Store reported: ${reason.replace(/_/g, ' ')}. Ticket created for review.`,
        status,
        exchangeAmount,
        productName: exchangeProduct.name,
        productSku: exchangeProduct.sku,
        quantity: 1,
        resolution:
          status === 'completed' ? resolutions[(clientIdx + i) % resolutions.length]! : null,
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
      const selectedProductIdx = (clientIdx + productIdx) % SEED_PRODUCTS.length
      const product = SEED_PRODUCTS[selectedProductIdx]!

      // Deterministic purchase date
      const seed = clientIdx * 100 + productIdx
      const purchaseDaysAgo = Math.floor(seededRandom(seed) * 600) + 30
      const purchaseDate = new Date(
        REFERENCE_DATE.getTime() - purchaseDaysAgo * 24 * 60 * 60 * 1000,
      )

      // Deterministic status
      const status = (clientIdx + productIdx) % 10 === 0 ? 'cancelled' : 'active'

      // Deterministic auto-renew
      const autoRenew = (clientIdx + productIdx) % 4 !== 0 ? 1 : 0

      assortments.push({
        clientId: client.id,
        productName: product.name,
        productCategory: product.category,
        subscriptionStatus: status,
        purchaseDate,
        expirationDate: null,
        autoRenew,
      })
    }
  }

  await db.insert(clientAssortments).values(assortments)
  console.log(`Created ${assortments.length} sample assortments`)
}

const COMMENT_TEMPLATES = [
  'Spoke with store manager about inventory levels. They are satisfied with current delivery schedule.',
  'Store requested information about bulk pricing tiers. Sent follow-up email with wholesale options.',
  'Processed billing inquiry. Issue resolved - duplicate charge was refunded.',
  'Store mentioned they may need to increase order volume next quarter. Flagged for sales follow-up.',
  'Annual partnership review completed. Store is happy with product quality and plans to continue.',
  'Quality concern escalated. Production team is investigating batch consistency.',
  'Store asked about new product variants in development. Shared upcoming product catalog.',
  'Payment terms updated successfully. Net-30 approved.',
  'Store reported customer feedback on clumping performance. Shared with product team.',
  'New store onboarding completed. Initial order placed and scheduled for delivery.',
  'Contract renewal discussion. Store negotiating for volume discount on multi-pallet orders.',
  'Store reported damaged shipment. Replacement order processed and expedited.',
  'Scheduled quarterly business review for next month to discuss seasonal inventory needs.',
  'Store wants to add new locations to their account. Sent setup instructions.',
  'Shipping address updated per store request for new distribution center.',
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
