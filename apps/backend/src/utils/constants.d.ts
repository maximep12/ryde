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
  missingColumn: (missingColumns: string) => string
  invalidAmazonDate: (rowNumbers: unknown, purchaseDate: unknown) => string
  invalidAmazonBundleDate: (row: unknown, purchaseDate: unknown) => string
  invalidAmazonBundleAsin: (row: unknown, bundleAsin: unknown) => string
  amazonBundleTitleChanged: (row: unknown, receivedTitle: unknown, expectedTitle: unknown) => string
  invalidAmazonOrigin: (rowNumbers: unknown, expected: unknown[], received: unknown) => string
  invalidDates: (expected: unknown, received: { row: unknown; date: unknown }) => string
  invalidHeader: (expected: unknown[], received: unknown[]) => string
  invalidUnit: (row: unknown, unit: unknown) => string
}

export declare const UPLOAD_RESULT_STATES: {
  success: string
  withError: string
  failure: string
}

export declare const US_SHIPSTATES: Record<string, string>
