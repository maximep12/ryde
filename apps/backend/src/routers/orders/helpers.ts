import { clientOrderIssues, clientOrderItems, clientOrders, clients, users } from '@repo/db'
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNotNull,
  lt,
  ne,
  or,
} from 'drizzle-orm'
import { PDFParse } from 'pdf-parse'
import { db } from '../../db'
import { parseOrderFormText } from './parsers/orderFormParser'
import type { CreateOrderInput, OrdersQuery, ParsedOrderForm } from './schemas'

export async function getOrders(query: OrdersQuery) {
  const {
    page,
    pageSize,
    statuses,
    sources,
    search,
    date,
    hasIssues,
    hasResolvedIssues,
    requiresApproval,
    wasApproved,
  } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (statuses) {
    const statusList = statuses.split(',').filter(Boolean)
    if (statusList.length === 1) {
      conditions.push(eq(clientOrders.status, statusList[0]!))
    } else if (statusList.length > 1) {
      conditions.push(or(...statusList.map((s) => eq(clientOrders.status, s))))
    }
  }

  if (sources) {
    const sourceList = sources.split(',').filter(Boolean)
    if (sourceList.length === 1) {
      conditions.push(eq(clientOrders.source, sourceList[0]!))
    } else if (sourceList.length > 1) {
      conditions.push(or(...sourceList.map((s) => eq(clientOrders.source, s))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(clientOrders.orderNumber, searchPattern),
        ilike(clients.storeName, searchPattern),
        ilike(clients.clientCode, searchPattern),
      ),
    )
  }

  if (date) {
    const startOfDay = new Date(date)
    const endOfDay = new Date(date)
    endOfDay.setDate(endOfDay.getDate() + 1)
    conditions.push(gte(clientOrders.orderDate, startOfDay))
    conditions.push(lt(clientOrders.orderDate, endOfDay))
  }

  // Filter for orders with open/in_progress issues
  if (hasIssues) {
    conditions.push(
      exists(
        db
          .select({ id: clientOrderIssues.id })
          .from(clientOrderIssues)
          .where(
            and(
              eq(clientOrderIssues.orderId, clientOrders.id),
              or(eq(clientOrderIssues.status, 'open'), eq(clientOrderIssues.status, 'in_progress')),
            ),
          ),
      ),
    )
  }

  // Filter for orders with resolved/dismissed issues
  if (hasResolvedIssues) {
    conditions.push(
      exists(
        db
          .select({ id: clientOrderIssues.id })
          .from(clientOrderIssues)
          .where(
            and(
              eq(clientOrderIssues.orderId, clientOrders.id),
              or(
                eq(clientOrderIssues.status, 'resolved'),
                eq(clientOrderIssues.status, 'dismissed'),
              ),
            ),
          ),
      ),
    )
  }

  // Filter for orders that require approval
  if (requiresApproval) {
    conditions.push(eq(clientOrders.requiresApproval, true))
  }

  // Filter for orders that were manually approved by users
  if (wasApproved) {
    conditions.push(isNotNull(clientOrders.approvedBy))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult, ordersWithIssuesCount, ordersRequiringApprovalCount] =
    await Promise.all([
      db
        .select({
          id: clientOrders.id,
          orderNumber: clientOrders.orderNumber,
          clientId: clientOrders.clientId,
          orderDate: clientOrders.orderDate,
          totalAmount: clientOrders.totalAmount,
          status: clientOrders.status,
          source: clientOrders.source,
          requiresApproval: clientOrders.requiresApproval,
          shippingAddress: clientOrders.shippingAddress,
          notes: clientOrders.notes,
          createdAt: clientOrders.createdAt,
          client: {
            id: clients.id,
            clientCode: clients.clientCode,
            storeName: clients.storeName,
            storeType: clients.storeType,
          },
        })
        .from(clientOrders)
        .innerJoin(clients, eq(clientOrders.clientId, clients.id))
        .where(whereClause)
        .orderBy(desc(clientOrders.orderDate))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(clientOrders)
        .innerJoin(clients, eq(clientOrders.clientId, clients.id))
        .where(whereClause),
      // Count orders with open/in_progress issues (regardless of filters)
      db
        .select({ count: countDistinct(clientOrderIssues.orderId) })
        .from(clientOrderIssues)
        .where(
          or(eq(clientOrderIssues.status, 'open'), eq(clientOrderIssues.status, 'in_progress')),
        ),
      // Count orders requiring approval (regardless of filters)
      db
        .select({ count: count() })
        .from(clientOrders)
        .where(eq(clientOrders.requiresApproval, true)),
    ])

  const total = countResult[0]?.total ?? 0
  const issuesCount = ordersWithIssuesCount[0]?.count ?? 0
  const approvalCount = ordersRequiringApprovalCount[0]?.count ?? 0

  // Get order IDs that have open issues from the current page items
  const orderIds = items.map((item) => item.id)
  const ordersWithOpenIssues =
    orderIds.length > 0
      ? await db
          .selectDistinct({ orderId: clientOrderIssues.orderId })
          .from(clientOrderIssues)
          .where(
            and(
              or(...orderIds.map((id) => eq(clientOrderIssues.orderId, id))),
              or(eq(clientOrderIssues.status, 'open'), eq(clientOrderIssues.status, 'in_progress')),
            ),
          )
      : []

  const orderIdsWithIssues = new Set(ordersWithOpenIssues.map((o) => o.orderId))

  // Add hasOpenIssues to each item
  const itemsWithIssueFlag = items.map((item) => ({
    ...item,
    hasOpenIssues: orderIdsWithIssues.has(item.id),
  }))

  return {
    items: itemsWithIssueFlag,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    ordersWithIssuesCount: issuesCount,
    ordersRequiringApprovalCount: approvalCount,
  }
}

export async function getOrderById(orderId: number) {
  const order = await db
    .select({
      id: clientOrders.id,
      orderNumber: clientOrders.orderNumber,
      clientId: clientOrders.clientId,
      orderDate: clientOrders.orderDate,
      totalAmount: clientOrders.totalAmount,
      status: clientOrders.status,
      source: clientOrders.source,
      requiresApproval: clientOrders.requiresApproval,
      approvedAt: clientOrders.approvedAt,
      approvedBy: {
        id: users.id,
        givenName: users.givenName,
        familyName: users.familyName,
      },
      shippingAddress: clientOrders.shippingAddress,
      notes: clientOrders.notes,
      createdAt: clientOrders.createdAt,
      updatedAt: clientOrders.updatedAt,
      client: {
        id: clients.id,
        clientCode: clients.clientCode,
        storeName: clients.storeName,
        storeType: clients.storeType,
        contactName: clients.contactName,
        email: clients.email,
        phone: clients.phone,
        billingAddress: clients.billingAddress,
        city: clients.city,
        state: clients.state,
        postalCode: clients.postalCode,
        country: clients.country,
        status: clients.status,
      },
    })
    .from(clientOrders)
    .innerJoin(clients, eq(clientOrders.clientId, clients.id))
    .leftJoin(users, eq(clientOrders.approvedBy, users.id))
    .where(eq(clientOrders.id, orderId))
    .limit(1)

  if (!order[0]) return null

  const [items, issues] = await Promise.all([
    db
      .select({
        id: clientOrderItems.id,
        productName: clientOrderItems.productName,
        productSku: clientOrderItems.productSku,
        packageType: clientOrderItems.packageType,
        quantity: clientOrderItems.quantity,
        unitPrice: clientOrderItems.unitPrice,
      })
      .from(clientOrderItems)
      .where(eq(clientOrderItems.orderId, orderId)),
    db
      .select({
        id: clientOrderIssues.id,
        issueType: clientOrderIssues.issueType,
        severity: clientOrderIssues.severity,
        title: clientOrderIssues.title,
        description: clientOrderIssues.description,
        status: clientOrderIssues.status,
        resolvedAt: clientOrderIssues.resolvedAt,
        resolution: clientOrderIssues.resolution,
        createdAt: clientOrderIssues.createdAt,
      })
      .from(clientOrderIssues)
      .where(eq(clientOrderIssues.orderId, orderId)),
  ])

  return {
    ...order[0],
    items,
    issues,
  }
}

// ============================================================================
// PDF PARSING HELPERS
// ============================================================================

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function parsePdfOrderForm(file: File): Promise<ParsedOrderForm> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('PDF_FILE_TOO_LARGE')
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('PDF_INVALID_FILE_TYPE')
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  // Extract text from PDF using PDFParse class
  const parser = new PDFParse({ data })
  const textResult = await parser.getText()
  await parser.destroy()

  const text = textResult.text
  if (!text || text.trim().length === 0) {
    throw new Error('PDF_NO_TEXT_CONTENT')
  }

  // Parse the extracted text
  const parsedForm = parseOrderFormText(text)

  return parsedForm
}

// Lookup client by code (for validation/enrichment)
export async function findClientByCode(clientCode: string) {
  const client = await db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      storeName: clients.storeName,
    })
    .from(clients)
    .where(eq(clients.clientCode, clientCode))
    .limit(1)

  return client[0] || null
}

// ============================================================================
// ORDER CREATION
// ============================================================================

function generateOrderNumber(clientCode: string, orderId: number): string {
  // Format: ORD-{CLIENT_CODE}-{PADDED_ORDER_ID}
  const paddedId = orderId.toString().padStart(3, '0')
  return `ORD-${clientCode}-${paddedId}`
}

export async function createOrder(input: CreateOrderInput) {
  // Get client code for order number generation
  const client = await db
    .select({ clientCode: clients.clientCode, storeName: clients.storeName })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1)

  if (!client[0]) {
    throw new Error('CLIENT_NOT_FOUND')
  }

  const orderDate = input.orderDate ? new Date(input.orderDate) : new Date()
  const totalAmount = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  // Insert order
  const insertResult = await db
    .insert(clientOrders)
    .values({
      orderNumber: 'TEMP', // Will be updated after we get the ID
      clientId: input.clientId,
      orderDate,
      totalAmount,
      status: 'pending',
      shippingAddress: input.shippingAddress,
      notes: input.notes,
    })
    .returning({ id: clientOrders.id })

  const newOrder = insertResult[0]
  if (!newOrder) {
    throw new Error('ORDER_CREATION_FAILED')
  }

  // Update order number with generated value
  const orderNumber = generateOrderNumber(client[0].clientCode, newOrder.id)
  await db.update(clientOrders).set({ orderNumber }).where(eq(clientOrders.id, newOrder.id))

  // Insert order items
  if (input.items.length > 0) {
    await db.insert(clientOrderItems).values(
      input.items.map((item) => ({
        orderId: newOrder.id,
        productName: item.productName,
        productSku: item.productSku,
        packageType: item.packageType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )
  }

  return {
    id: newOrder.id,
    orderNumber,
    clientId: input.clientId,
    storeName: client[0].storeName,
    totalAmount,
    itemCount: input.items.length,
  }
}

// ============================================================================
// ORDER APPROVAL
// ============================================================================

export async function approveOrder(orderId: number, userId: string) {
  // Check if order exists and requires approval
  const order = await db
    .select({
      id: clientOrders.id,
      requiresApproval: clientOrders.requiresApproval,
      approvedBy: clientOrders.approvedBy,
    })
    .from(clientOrders)
    .where(eq(clientOrders.id, orderId))
    .limit(1)

  if (!order[0]) {
    throw new Error('ORDER_NOT_FOUND')
  }

  if (!order[0].requiresApproval) {
    throw new Error('ORDER_DOES_NOT_REQUIRE_APPROVAL')
  }

  if (order[0].approvedBy) {
    throw new Error('ORDER_ALREADY_APPROVED')
  }

  // Approve the order
  const now = new Date()
  await db
    .update(clientOrders)
    .set({
      approvedBy: userId,
      approvedAt: now,
      requiresApproval: false,
    })
    .where(eq(clientOrders.id, orderId))

  return { approvedAt: now }
}
