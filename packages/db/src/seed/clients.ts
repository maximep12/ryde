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

const SEED_USER_EMAILS = ['admin@example.com', 'demo@example.com']

// Seeded random number generator for deterministic results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const SEED_CLIENTS = [
  // Grocery store
  {
    clientCode: 'GRO-001',
    storeName: 'Fresh Market Grocers',
    storeType: 'grocery',
    contactName: 'Sarah Johnson',
    email: 'orders@freshmarketgrocers.com',
    phone: '+1-555-123-4567',
    billingAddress: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'USA',
    status: 'active',
  },
  // Corner store
  {
    clientCode: 'CRN-001',
    storeName: "Joe's Corner Store",
    storeType: 'corner_store',
    contactName: 'Joe Martinez',
    email: 'joe@joescorner.com',
    phone: '+1-555-456-7890',
    billingAddress: '321 Oak Street',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'USA',
    status: 'active',
  },
  // Pharmacy
  {
    clientCode: 'PHR-001',
    storeName: 'Wellness Pharmacy',
    storeType: 'pharmacy',
    contactName: 'Dr. Lisa Park',
    email: 'orders@wellnesspharmacy.com',
    phone: '+1-555-789-0123',
    billingAddress: '100 Health Plaza',
    city: 'Boston',
    state: 'MA',
    postalCode: '02101',
    country: 'USA',
    status: 'active',
  },
  // Convenience store
  {
    clientCode: 'CNV-001',
    storeName: 'QuickStop Express',
    storeType: 'convenience_store',
    contactName: 'David Kim',
    email: 'orders@quickstopexpress.com',
    phone: '+1-555-901-2345',
    billingAddress: '777 Highway 101',
    city: 'Portland',
    state: 'OR',
    postalCode: '97201',
    country: 'USA',
    status: 'active',
  },
  // Supermarket
  {
    clientCode: 'SPM-001',
    storeName: 'MegaMart Superstore',
    storeType: 'supermarket',
    contactName: 'James Williams',
    email: 'candy-aisle@megamart.com',
    phone: '+1-555-111-2222',
    billingAddress: '500 Retail Boulevard',
    city: 'Denver',
    state: 'CO',
    postalCode: '80201',
    country: 'USA',
    status: 'active',
  },
  // Second grocery (inactive)
  {
    clientCode: 'GRO-002',
    storeName: 'Village Foods',
    storeType: 'grocery',
    contactName: 'Michael Chen',
    email: 'purchasing@villagefoods.com',
    phone: '+1-555-234-5678',
    billingAddress: '456 Commerce Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    status: 'inactive',
  },
]

// Package types for candy
const PACKAGE_TYPES = ['bag', 'box', 'display_box', 'case', 'single']

// Order statuses
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered']

export async function seedClients(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding clients (retailers)...')

  await db.insert(clients).values(SEED_CLIENTS)

  console.log(`Created ${SEED_CLIENTS.length} client retailers`)
}

export async function seedClientOrders(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client orders...')

  const allClients = await db.select().from(clients)
  let orderCount = 0
  let itemCount = 0

  for (const client of allClients) {
    // Each client gets 5-8 orders (increased for better product report data)
    const numOrders = 5 + Math.floor(seededRandom(client.id * 7) * 4)

    for (let i = 0; i < numOrders; i++) {
      const orderSeed = client.id * 100 + i
      const daysAgo = Math.floor(seededRandom(orderSeed) * 60) // Orders within last 60 days
      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - daysAgo)

      // Generate order number
      const orderNumber = `ORD-${client.clientCode}-${String(i + 1).padStart(4, '0')}`

      // Determine order source and approval status
      const isEdi = seededRandom(orderSeed + 1) > 0.6
      const requiresApproval = seededRandom(orderSeed + 2) > 0.8

      // Order status based on age
      let status: string
      if (daysAgo > 14) {
        status = 'delivered'
      } else if (daysAgo > 7) {
        status = seededRandom(orderSeed + 3) > 0.3 ? 'shipped' : 'delivered'
      } else {
        status = ORDER_STATUSES[Math.floor(seededRandom(orderSeed + 4) * 4)]!
      }

      // Calculate total from items (will be updated below)
      let totalAmount = 0

      // Create order
      const [order] = await db
        .insert(clientOrders)
        .values({
          orderNumber,
          clientId: client.id,
          orderDate,
          totalAmount: 0, // Will update after items
          status,
          source: isEdi ? 'edi' : 'manual',
          requiresApproval,
          shippingAddress: client.billingAddress,
        })
        .returning()

      // Add 3-5 items per order (increased for better product report data)
      const numItems = 3 + Math.floor(seededRandom(orderSeed + 10) * 3)

      for (let j = 0; j < numItems; j++) {
        const itemSeed = orderSeed * 100 + j
        // Tiered product selection to create high/medium/low performers:
        // - 45% chance: products 0-2 (high performers)
        // - 50% chance: products 3-9 (medium performers)
        // - 5% chance: products 10+ (low performers - niche items)
        let productIndex: number
        const tierRandom = seededRandom(itemSeed + 50)
        if (tierRandom < 0.45) {
          // High performer tier (first 3 products)
          productIndex = Math.floor(seededRandom(itemSeed) * 3)
        } else if (tierRandom < 0.95) {
          // Medium performer tier (products 3-9)
          productIndex = 3 + Math.floor(seededRandom(itemSeed) * 7)
        } else {
          // Low performer tier (products 10+, the niche items)
          productIndex = 10 + Math.floor(seededRandom(itemSeed) * (SEED_PRODUCTS.length - 10))
        }
        const product = SEED_PRODUCTS[productIndex]!
        const packageType = PACKAGE_TYPES[Math.floor(seededRandom(itemSeed + 1) * PACKAGE_TYPES.length)]!
        const quantity = 5 + Math.floor(seededRandom(itemSeed + 2) * 15) // 5-20 units
        const unitPrice = 499 + Math.floor(seededRandom(itemSeed + 3) * 1500) // $4.99 - $19.99

        totalAmount += quantity * unitPrice

        await db.insert(clientOrderItems).values({
          orderId: order!.id,
          productName: product.description,
          productSku: product.productCode,
          packageType,
          quantity,
          unitPrice,
        })
        itemCount++
      }

      // Update order total
      await db
        .update(clientOrders)
        .set({ totalAmount })
        .where(inArray(clientOrders.id, [order!.id]))

      orderCount++
    }
  }

  console.log(`Created ${orderCount} orders with ${itemCount} items`)
}

export async function seedClientOrderIssues(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding order issues...')

  const allOrders = await db.select().from(clientOrders)
  let issueCount = 0

  // Add issues to ~2 orders
  for (const order of allOrders.slice(0, 2)) {
    const issueSeed = order.id * 23
    const issueTypes = ['pricing_error', 'shipping_delay']
    const issueType = issueTypes[Math.floor(seededRandom(issueSeed) * issueTypes.length)]!

    const titles: Record<string, string> = {
      pricing_error: 'Incorrect pricing on invoice',
      shipping_delay: 'Delivery delayed',
    }

    await db.insert(clientOrderIssues).values({
      orderId: order.id,
      issueType,
      severity: 'medium',
      title: titles[issueType] || 'Order issue',
      description: `Issue reported for order ${order.orderNumber}`,
      status: seededRandom(issueSeed + 2) > 0.5 ? 'resolved' : 'open',
    })
    issueCount++
  }

  console.log(`Created ${issueCount} order issues`)
}

export async function seedClientExchanges(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client exchanges...')

  const allClients = await db.select().from(clients)
  let exchangeCount = 0

  // Add 1 exchange for the first client only
  const client = allClients[0]
  if (client) {
    const exchangeDate = new Date()
    exchangeDate.setDate(exchangeDate.getDate() - 10)

    const product = SEED_PRODUCTS[0]!

    await db.insert(clientExchanges).values({
      exchangeNumber: `EXC-${client.clientCode}-001`,
      clientId: client.id,
      exchangeDate,
      reason: 'damaged_in_transit',
      reasonDetails: 'Customer requested exchange due to damaged packaging',
      status: 'completed',
      exchangeAmount: 1500,
      productName: product.description,
      productSku: product.productCode,
      quantity: 2,
    })
    exchangeCount++
  }

  console.log(`Created ${exchangeCount} exchanges`)
}

export async function seedClientAssortments(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client assortments...')

  const allClients = await db.select().from(clients)
  let assortmentCount = 0

  for (const client of allClients) {
    // Each client carries 3-5 products (but not more than available)
    const numProducts = Math.min(3 + (client.id % 3), SEED_PRODUCTS.length)

    // Simple deterministic selection: pick products based on client id
    for (let i = 0; i < numProducts; i++) {
      const productIndex = (client.id + i) % SEED_PRODUCTS.length
      const product = SEED_PRODUCTS[productIndex]!
      const purchaseDate = new Date()
      purchaseDate.setDate(purchaseDate.getDate() - (client.id * 10 + i * 5) % 90)

      await db.insert(clientAssortments).values({
        clientId: client.id,
        productName: product.description,
        productSku: product.productCode,
        productCategory: product.productType,
        subscriptionStatus: 'active',
        purchaseDate,
        autoRenew: 1,
      })
      assortmentCount++
    }
  }

  console.log(`Created ${assortmentCount} product assortments`)
}

export async function seedClientComments(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding client comments...')

  const allClients = await db.select().from(clients)
  const allUsers = await db
    .select()
    .from(users)
    .where(inArray(users.email, SEED_USER_EMAILS))
  let commentCount = 0

  if (allUsers.length === 0) {
    console.log('No users found, skipping comments')
    return
  }

  const sampleComments = [
    'Great customer, always pays on time.',
    'Prefers deliveries on Tuesdays.',
    'VIP customer - provide priority support.',
  ]

  // Add comments to first 3 clients only
  for (const client of allClients.slice(0, 3)) {
    const commentSeed = client.id * 100
    const user = allUsers[Math.floor(seededRandom(commentSeed) * allUsers.length)]!
    const comment = sampleComments[commentCount % sampleComments.length]!

    await db.insert(clientComments).values({
      clientId: client.id,
      userId: user.id,
      content: comment,
    })
    commentCount++
  }

  console.log(`Created ${commentCount} client comments`)
}
