export const MISSING_ORDERS_KEY = 'missing'
export const FLAGGED_ORDERS_KEY = 'flagged'
export const ALL_ORDERS_KEY = 'all'

export const ORDER_TYPES = [MISSING_ORDERS_KEY, FLAGGED_ORDERS_KEY, ALL_ORDERS_KEY] as const

export const FLAGGED_PAGE_SIZE = 50

export const ORDER_STATUS_VALUES = [
  'CARRIER',
  'CONFIRMED',
  'DELIVERED',
  'FAILED',
  'FLAGGED',
  'HOLD',
  'INVOICED',
  'MISSING',
  'RECEIVED',
  'RELEASE',
  'SENT',
  'SUBMITTED',
] as const

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CARRIER: 'orderStatus.carrier',
  CONFIRMED: 'orderStatus.confirmed',
  DELIVERED: 'orderStatus.delivered',
  FAILED: 'orderStatus.failed',
  FLAGGED: 'orderStatus.flagged',
  HOLD: 'orderStatus.hold',
  INVOICED: 'orderStatus.invoiced',
  MISSING: 'orderStatus.missing',
  RECEIVED: 'orderStatus.received',
  RELEASE: 'orderStatus.release',
  SENT: 'orderStatus.sent',
  SUBMITTED: 'orderStatus.submitted',
}

/**
 * SOURCES
 */
export const SOURCE_RMA = 'RMA'

export const SOURCES_WO_RMA = ['EDI', 'INJ', 'NOD', 'SF'] as const

export const SOURCE_VALUES = [...SOURCES_WO_RMA, SOURCE_RMA] as const

export type Source = (typeof SOURCE_VALUES)[number]

export type SourceWoRma = (typeof SOURCES_WO_RMA)[number]

export const SOURCE_KEYS_WO_RMA = ['EDI', 'INJ', 'NOD', 'SF'] as const

export const SOURCE_KEYS = [...SOURCE_KEYS_WO_RMA, SOURCE_RMA] as const

export type SourceKey = (typeof SOURCE_KEYS)[number]

export type SourceKeyWoRma = (typeof SOURCE_KEYS_WO_RMA)[number]

export type LowercaseSourceKeyWoRma = Lowercase<SourceKeyWoRma>

export const SOURCE_LABELS: Record<Source, SourceKey> = {
  EDI: 'EDI',
  INJ: 'INJ',
  NOD: 'NOD',
  SF: 'SF',
  RMA: 'RMA',
}

/**
 * OFF ROUTE
 */
export const OFF_ROUTE_VALUES = ['offRoute'] as const

export type OffRouteOption = (typeof OFF_ROUTE_VALUES)[number]

/**
 * ITEMS
 */
export const MATERIAL_GROUPS = {
  fmc: ['ZFG100000'],
  vuse: ['ZFG431000', 'ZFG439003', 'ZFG439006'],
}

export const MATERIAL_LABELS = {
  fmc: 'FMC',
  vuse: 'Vuse',
  other: 'Other',
} as const

/**
 * JOURNEY
 */
export const JOURNEY_STEPS = [
  'RECEIVED',
  'SUBMITTED',
  'CONFIRMED',
  'CARRIER',
  'ONROUTE',
  'INVOICED',
] as const

export type JourneyStep = (typeof JOURNEY_STEPS)[number]

export const JOURNEY_STEPS_LABELS: Record<JourneyStep, string> = {
  RECEIVED: 'journeyStepLabel.received',
  SUBMITTED: 'journeyStepLabel.submitted',
  CONFIRMED: 'journeyStepLabel.confirmed',
  CARRIER: 'journeyStepLabel.carrier',
  ONROUTE: 'journeyStepLabel.onroute',
  INVOICED: 'journeyStepLabel.invoiced',
}

export const getJourneyStepLabel = (step: JourneyStep) => JOURNEY_STEPS_LABELS[step]

export type JourneyStepWithDocument = Exclude<JourneyStep, 'RECEIVED' | 'SUBMITTED'>

const DOCUMENT_NUMBER_LABELS: Record<JourneyStepWithDocument, string> = {
  CONFIRMED: 'documentNumberLabel.sapOrderNumber',
  CARRIER: 'documentNumberLabel.sapDeliveryNumber',
  ONROUTE: 'documentNumberLabel.sapDeliveryNumber',
  INVOICED: 'documentNumberLabel.sapInvoiceNumber',
}

export const getDocumentNumberLabel = (step: JourneyStepWithDocument) =>
  DOCUMENT_NUMBER_LABELS[step] ?? 'documentNumberLabel.generic'
