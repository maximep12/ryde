import type { ParsedOrderForm, ParsedOrderItem } from '../schemas'

// Field extraction patterns
const FIELD_PATTERNS = {
  // Section A
  orderRequestDate: /Order request date[:\s]+([^\n]+)/i,
  requestedBy: /Requested by[^:]*[:\s]+([^\n]+)/i,
  customerPoNumber: /Customer PO number[^:]*[:\s]+([^\n]+)/i,
  salesDocumentType: /Sales Document Type[^:]*[:\s]+([^\n]+)/i,
  orderReason: /(?:Reason for order|Order reason)[:\s]+([^\n]+)/i,

  // Section B
  soldToParty: /Sold-to party[^:]*[:\s]+([^\n]+)/i,
  shipToParty: /Ship-to party[^:]*[:\s]+([^\n]+)/i,
  billToParty: /Bill-to party[:\s]+([^\n]+)/i,
  payer: /Payer[:\s]+([^\n]+)/i,
  customerPhone: /Customer contact phone[:\s]+([^\n]+)/i,

  // Section C
  currency: /Currency[^:]*[:\s]+([^\n]+)/i,
  paymentTerms: /Payment terms[^:]*[:\s]+([^\n]+)/i,
  incoterms: /Incoterms[^:]*[:\s]+([^\n]+)/i,
  priceAgreement: /Price (?:agreement|reference)[^:]*[:\s]+([^\n]+)/i,
  taxStatus: /Tax status[:\s]+([^\n]+)/i,

  // Section D
  deliveryDate: /Requested delivery date[^:]*[:\s]+([^\n]+)/i,
  partialDeliveries: /Partial deliveries allowed[:\s]+([^\n]+)/i,
  substitutions: /Substitutions allowed[:\s]+([^\n]+)/i,
  carrier: /Carrier[^:]*[:\s]+([^\n]+)/i,
  deliveryInstructions: /Delivery instructions[:\s]+([^\n]+)/i,
  receivingHours: /Receiving hours[:\s]+([^\n]+)/i,
  specialPackaging: /Special packaging[^:]*[:\s]+([^\n]+)/i,
}

// Helper to extract and clean field values
function extractField(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)
  const value = match?.[1]?.trim()
  // Filter out empty placeholders (underscores, dashes only)
  if (!value || /^[_\-–—\s]+$/.test(value)) return undefined
  return value
}

// Parse sold-to party (format: "GRO-001 – Fresh Market Grocers" or "CLI-001 – Store Name")
function parseSoldToParty(value: string | undefined): {
  code: string | undefined
  name: string | undefined
} {
  if (!value) return { code: undefined, name: undefined }
  // Match client codes like GRO-001, PHR-001, CRN-001, CNV-001, SPM-001, CLI-001, etc.
  const match = value.match(/^([A-Z]{2,3}-\d+)\s*[–-]\s*(.+)$/i)
  if (match && match[1] && match[2]) {
    return { code: match[1].toUpperCase(), name: match[2].trim() }
  }
  // Try SAP number format
  const sapMatch = value.match(/^(\d+)\s*[–/-]\s*(.+)$/i)
  if (sapMatch && sapMatch[1] && sapMatch[2]) {
    return { code: sapMatch[1], name: sapMatch[2].trim() }
  }
  return { code: undefined, name: value }
}

// Parse ship-to location (format: "San Francisco, CA" or "Location Name – City, State")
function parseShipTo(value: string | undefined): {
  location: string | undefined
  city: string | undefined
  state: string | undefined
} {
  if (!value) return { location: undefined, city: undefined, state: undefined }
  // Format: "City, State"
  const cityStateMatch = value.match(/^([^,]+),\s*([A-Z]{2})$/i)
  if (cityStateMatch && cityStateMatch[1] && cityStateMatch[2]) {
    return { location: undefined, city: cityStateMatch[1].trim(), state: cityStateMatch[2].trim() }
  }
  // Format: "Location – City, State"
  const fullMatch = value.match(/^(.+?)\s*[–-]\s*([^,]+),\s*([A-Z]{2})$/i)
  if (fullMatch && fullMatch[1] && fullMatch[2] && fullMatch[3]) {
    return { location: fullMatch[1].trim(), city: fullMatch[2].trim(), state: fullMatch[3].trim() }
  }
  return { location: value, city: undefined, state: undefined }
}

// Parse incoterms (format: "DAP – San Francisco, CA")
function parseIncoterms(value: string | undefined): {
  code: string | undefined
  location: string | undefined
} {
  if (!value) return { code: undefined, location: undefined }
  const match = value.match(/^([A-Z]{3})\s*[–-]\s*(.+)$/i)
  if (match && match[1] && match[2]) {
    return { code: match[1].toUpperCase(), location: match[2].trim() }
  }
  return { code: value.substring(0, 3).toUpperCase(), location: undefined }
}

// Parse boolean fields
function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  if (/^(yes|true|1|allowed|y)$/i.test(lower)) return true
  if (/^(no|false|0|not allowed|n)$/i.test(lower)) return false
  return undefined
}

// Normalize payment terms
function normalizePaymentTerms(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/NET\s*(\d+)/i)
  if (match && match[1]) return `NET${match[1]}`
  if (/COD|cash on delivery/i.test(value)) return 'COD'
  if (/prepaid/i.test(value)) return 'PREPAID'
  return value
}

// Normalize currency
function normalizeCurrency(value: string | undefined): 'USD' | 'CAD' | 'EUR' | undefined {
  if (!value) return undefined
  const upper = value.toUpperCase()
  if (upper.includes('USD') || upper.includes('US DOLLAR')) return 'USD'
  if (upper.includes('CAD') || upper.includes('CANADIAN')) return 'CAD'
  if (upper.includes('EUR') || upper.includes('EURO')) return 'EUR'
  return undefined
}

// Normalize sales document type
function normalizeSalesDocumentType(
  value: string | undefined,
): 'OR' | 'ZOR' | 'RE' | 'CR' | undefined {
  if (!value) return undefined
  const upper = value.toUpperCase().trim()
  if (upper.startsWith('OR')) return 'OR'
  if (upper.startsWith('ZOR')) return 'ZOR'
  if (upper.startsWith('RE')) return 'RE'
  if (upper.startsWith('CR')) return 'CR'
  return undefined
}

// Parse line items table
function parseLineItems(text: string): ParsedOrderItem[] {
  const items: ParsedOrderItem[] = []

  // Find the line items section
  const lineItemsSection = text.match(/E\.\s*Order Line Items([\s\S]*?)(?:F\.|$)/i)
  if (!lineItemsSection || !lineItemsSection[1]) return items

  const section = lineItemsSection[1]

  // Match rows with various formats
  // Format 1: "10 | ODL-UNS-12 | OdourLock Unscented 12kg Jug | 120 | EA | $39.99"
  // Format 2: "10   ODL-UNS-12   OdourLock Unscented 12kg Jug   120   EA   $39.99"
  const lines = section.split('\n')

  for (const line of lines) {
    // Skip header lines and empty lines
    if (!line.trim() || /^Item\s*[|\t]/i.test(line) || /SKU\s+Description/i.test(line)) {
      continue
    }

    // Try to match a line item row
    // Pattern: item_number, SKU (alphanumeric with dashes), description, quantity, UoM
    const rowMatch = line.match(
      /^\s*(\d+)\s*[|\t\s]+([A-Z0-9]+-[A-Z0-9-]+)\s*[|\t\s]+([^|]+?)\s*[|\t\s]+(\d+)\s*[|\t\s]+([A-Z]+)/i,
    )

    if (rowMatch && rowMatch[1] && rowMatch[2] && rowMatch[3] && rowMatch[4] && rowMatch[5]) {
      items.push({
        itemNumber: parseInt(rowMatch[1], 10),
        sku: rowMatch[2].trim(),
        description: rowMatch[3].trim(),
        quantity: parseInt(rowMatch[4], 10),
        uom: rowMatch[5].trim(),
      })
    }
  }

  return items
}

// Calculate confidence score based on extracted fields
function calculateConfidence(result: Partial<ParsedOrderForm>, items: ParsedOrderItem[]): number {
  let score = 0
  let total = 0

  // Weight critical fields more heavily
  const fields = [
    { key: 'customerPoNumber', weight: 2 },
    { key: 'soldToPartyCode', weight: 2 },
    { key: 'currency', weight: 1 },
    { key: 'paymentTerms', weight: 1 },
    { key: 'requestedDeliveryDate', weight: 1 },
  ] as const

  for (const { key, weight } of fields) {
    total += weight
    if (result[key]) score += weight
  }

  // Bonus for line items
  if (items.length > 0) {
    score += 2
    total += 2
  }

  return Math.round((score / total) * 100) / 100
}

export function parseOrderFormText(text: string): ParsedOrderForm {
  const warnings: string[] = []

  // Extract all fields
  const soldTo = parseSoldToParty(extractField(text, FIELD_PATTERNS.soldToParty))
  const shipTo = parseShipTo(extractField(text, FIELD_PATTERNS.shipToParty))
  const incoterms = parseIncoterms(extractField(text, FIELD_PATTERNS.incoterms))
  const orderItems = parseLineItems(text)

  // Parse requestedBy into name and email
  const requestedBy = extractField(text, FIELD_PATTERNS.requestedBy)
  let requestedByName: string | undefined
  let requestedByEmail: string | undefined

  if (requestedBy) {
    const emailMatch = requestedBy.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch && emailMatch[1]) {
      requestedByEmail = emailMatch[1]
      requestedByName = requestedBy.replace(emailMatch[1], '').replace(/[()]/g, '').trim()
    } else {
      requestedByName = requestedBy
    }
  }

  // Build result
  const result: ParsedOrderForm = {
    // Section A
    orderRequestDate: extractField(text, FIELD_PATTERNS.orderRequestDate),
    customerPoNumber: extractField(text, FIELD_PATTERNS.customerPoNumber),
    salesDocumentType: normalizeSalesDocumentType(
      extractField(text, FIELD_PATTERNS.salesDocumentType),
    ),
    orderReason: extractField(text, FIELD_PATTERNS.orderReason),
    requestedByName,
    requestedByEmail,

    // Section B
    soldToPartyCode: soldTo.code,
    soldToPartyName: soldTo.name,
    shipToLocation: shipTo.location,
    shipToCity: shipTo.city,
    shipToState: shipTo.state,
    billToParty: extractField(text, FIELD_PATTERNS.billToParty),
    payer: extractField(text, FIELD_PATTERNS.payer),
    customerContactPhone: extractField(text, FIELD_PATTERNS.customerPhone),

    // Section C
    currency: normalizeCurrency(extractField(text, FIELD_PATTERNS.currency)),
    paymentTerms: normalizePaymentTerms(extractField(text, FIELD_PATTERNS.paymentTerms)),
    incoterms: incoterms.code,
    incotermLocation: incoterms.location,
    priceAgreement: extractField(text, FIELD_PATTERNS.priceAgreement),
    taxStatus: extractField(text, FIELD_PATTERNS.taxStatus),

    // Section D
    requestedDeliveryDate: extractField(text, FIELD_PATTERNS.deliveryDate),
    partialDeliveriesAllowed: parseBoolean(extractField(text, FIELD_PATTERNS.partialDeliveries)),
    substitutionsAllowed: parseBoolean(extractField(text, FIELD_PATTERNS.substitutions)),
    carrier: extractField(text, FIELD_PATTERNS.carrier),
    deliveryInstructions: extractField(text, FIELD_PATTERNS.deliveryInstructions),
    receivingHours: extractField(text, FIELD_PATTERNS.receivingHours),
    specialPackaging: extractField(text, FIELD_PATTERNS.specialPackaging),

    // Section E
    orderItems: orderItems.length > 0 ? orderItems : undefined,

    // Metadata
    _meta: {
      confidence: 0, // Will be calculated below
      warnings,
      rawTextLength: text.length,
    },
  }

  // Calculate confidence
  if (result._meta) {
    result._meta.confidence = calculateConfidence(result, orderItems)
  }

  return result
}
