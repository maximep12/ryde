import config from '@/config'
import { getSessionToken } from '@/stores/session'
import { AUTHORIZATION_HEADER_PREFIX } from '@repo/constants'
import { useMutation } from '@tanstack/react-query'

export type ParsedOrderItem = {
  itemNumber?: number
  sku?: string
  description?: string
  quantity?: number
  uom?: string
  packageType?: string
}

export type ParsedOrderFormResponse = {
  // Section A: Order Identification
  orderRequestDate?: string
  requestedByName?: string
  requestedByEmail?: string
  customerPoNumber?: string
  salesDocumentType?: 'OR' | 'ZOR' | 'RE' | 'CR'
  orderReason?: string

  // Section B: Customer and Partner Data
  soldToPartyCode?: string
  soldToPartyName?: string
  shipToLocation?: string
  shipToCity?: string
  shipToState?: string
  billToParty?: string
  payer?: string
  customerContactPhone?: string

  // Section C: Commercial Terms
  currency?: 'USD' | 'CAD' | 'EUR'
  paymentTerms?: string
  incoterms?: string
  incotermLocation?: string
  priceAgreement?: string
  taxStatus?: string

  // Section D: Delivery and Logistics
  requestedDeliveryDate?: string
  partialDeliveriesAllowed?: boolean
  substitutionsAllowed?: boolean
  carrier?: string
  deliveryInstructions?: string
  receivingHours?: string
  specialPackaging?: string

  // Section E: Order Line Items
  orderItems?: ParsedOrderItem[]

  // Metadata
  _meta?: {
    confidence: number
    warnings: string[]
    rawTextLength: number
    clientVerified?: boolean
    clientId?: number
  }
}

export function useParsePdf() {
  return useMutation({
    mutationFn: async (file: File): Promise<ParsedOrderFormResponse> => {
      const formData = new FormData()
      formData.append('file', file)

      const sessionToken = getSessionToken()
      const headers: HeadersInit = {}

      if (sessionToken) {
        headers.Authorization = `${AUTHORIZATION_HEADER_PREFIX}${sessionToken}`
      }

      const res = await fetch(`${config.backendURL}/example/orders/parse-pdf`, {
        method: 'POST',
        body: formData,
        headers,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to parse PDF')
      }

      return res.json()
    },
  })
}
