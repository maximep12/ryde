import { z } from 'zod'

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  statuses: z.string().optional(), // Comma-separated list of statuses
  sources: z.string().optional(), // Comma-separated list of sources
  search: z.string().optional(),
  date: z.string().optional(), // ISO date string YYYY-MM-DD
  hasIssues: z.coerce.boolean().optional(), // Filter orders that have open issues
  hasResolvedIssues: z.coerce.boolean().optional(), // Filter orders that have resolved issues
  requiresApproval: z.coerce.boolean().optional(), // Filter orders that require approval
  wasApproved: z.coerce.boolean().optional(), // Filter orders that were manually approved by users
  sortBy: z.string().optional(), // Column to sort by
  sortOrder: z.enum(['asc', 'desc']).optional(), // Sort direction
})

export type OrdersQuery = z.infer<typeof ordersQuerySchema>

// ============================================================================
// PDF PARSING SCHEMAS
// ============================================================================

// Order line item from PDF
export const parsedOrderItemSchema = z.object({
  itemNumber: z.number().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  uom: z.string().optional(),
  packageType: z.string().optional(),
})

// Complete parsed order form response
export const parsedOrderFormSchema = z.object({
  // Section A: Order Identification
  orderRequestDate: z.string().optional(),
  requestedByName: z.string().optional(),
  requestedByEmail: z.string().optional(),
  customerPoNumber: z.string().optional(),
  salesDocumentType: z.enum(['OR', 'ZOR', 'RE', 'CR']).optional(),
  orderReason: z.string().optional(),

  // Section B: Customer and Partner Data
  soldToPartyCode: z.string().optional(),
  soldToPartyName: z.string().optional(),
  shipToLocation: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  billToParty: z.string().optional(),
  payer: z.string().optional(),
  customerContactPhone: z.string().optional(),

  // Section C: Commercial Terms
  currency: z.enum(['USD', 'CAD', 'EUR']).optional(),
  paymentTerms: z.string().optional(),
  incoterms: z.string().optional(),
  incotermLocation: z.string().optional(),
  priceAgreement: z.string().optional(),
  taxStatus: z.string().optional(),

  // Section D: Delivery and Logistics
  requestedDeliveryDate: z.string().optional(),
  partialDeliveriesAllowed: z.boolean().optional(),
  substitutionsAllowed: z.boolean().optional(),
  carrier: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  receivingHours: z.string().optional(),
  specialPackaging: z.string().optional(),

  // Section E: Order Line Items
  orderItems: z.array(parsedOrderItemSchema).optional(),

  // Parsing metadata
  _meta: z
    .object({
      confidence: z.number().min(0).max(1),
      warnings: z.array(z.string()),
      rawTextLength: z.number(),
      clientVerified: z.boolean().optional(),
      clientId: z.number().optional(),
    })
    .optional(),
})

export type ParsedOrderItem = z.infer<typeof parsedOrderItemSchema>
export type ParsedOrderForm = z.infer<typeof parsedOrderFormSchema>

// ============================================================================
// ORDER CREATION SCHEMAS
// ============================================================================

export const createOrderItemSchema = z.object({
  productName: z.string().min(1),
  productSku: z.string().optional(),
  packageType: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0), // in cents
})

export const createOrderSchema = z.object({
  clientId: z.number().int().positive(),
  orderDate: z.string().optional(), // ISO date string, defaults to now
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>
