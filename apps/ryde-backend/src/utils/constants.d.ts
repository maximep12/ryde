export declare const ERRORS: {
  invalidERP: (row: unknown, erp: unknown) => string
  invalidUPC: (row: unknown, upc: unknown) => string
  invalidSKU: (row: unknown, sku: unknown) => string
  invalidSiteNumber: (row: unknown, siteNumber: unknown) => string
  invalidQuantity: (row: unknown, salesVolumeQty: unknown) => string
  invalidFormat: (row: unknown, format: { sku: unknown; unit: unknown }) => string
  custom: (row: unknown, errorMessage: string) => string
  missingValue: (row: unknown, columnName: string) => string
  emptyFile: () => string
}

export declare const UPLOAD_RESULT_STATES: {
  success: string
  withError: string
  failure: string
}
