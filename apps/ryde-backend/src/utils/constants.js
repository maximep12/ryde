import moment from 'moment'

export const INIT_FILES = {
  basicData: 'MARA - Basic Data-Table 1.csv',
  products: 'MAKT - Description-Table 1.csv',
  plant: 'MARC - Plant Data-Table 1.csv',
  dimensions: 'MARM - Dimensions-Table 1.csv',
  sales: 'MVKE - Sales Data-Table 1.csv',
  sellin: 'sellin2.csv',
  erps: 'customers.csv',
  amazon: 'amazon.tsv',
  amazonGlobal: 'amazonGlobal.tsv',
  prod: {
    products: 'prod/MAKT - Description-Table 1.csv',
    sellin: 'prod/sellin-prod-dec4.tsv',
    dimensions: 'prod/MARM - Dimensions-Table 1.csv',
    sellinConfirmed: 'prod/sellinConfirmed-start-to-dec3.tsv',
    confirmedAdjustment: 'prod/confirmedAdjustment.tsv',
    customers: 'prod/customers.tsv',
    circlek: 'prod/CircleK',
  },
}

export const ERRORS = {
  invalidERP: (row, erp) => `Row ${row}: Invalid ERP - ${erp} does not exist.`,
  invalidUPC: (row, upc) => `Row ${row}: Invalid UPC - ${upc} does not exist.`,
  invalidSKU: (row, sku) => `Row ${row}: Invalid SKU - ${sku} does not exist.`,
  invalidSiteNumber: (row, siteNumber) =>
    `Row ${row}: Invalid Site Number - ${siteNumber} provided is not linked to any ERP.`,
  invalidQuantity: (row, salesVolumeQty) =>
    `Row ${row}: Invalid Quantity provided - ${salesVolumeQty} provided is not valid. Please add a number to the column.`,
  invalidFormat: (row, format) =>
    `Row ${row}: Invalid product format provided - ${format.sku} in ${format.unit} does not exist.`,
  custom: (row, errorMessage) => `Row ${row}: ${errorMessage}.`,
  invalidAmazonDate: (rowNumbers, purchaseDate) =>
    `Order on rows ${rowNumbers} was not made before monday - Purchase date: ${purchaseDate}`,
  invalidAmazonBundleDate: (row, purchaseDate) =>
    `Order on row ${row} was not made before monday - Purchase date: ${purchaseDate}`,
  invalidAmazonBundleAsin: (row, bundleAsin) =>
    `Order on row ${row} does not have a valid BUNDLE_ASIN - BUNDLE_ASIN: ${bundleAsin}`,
  amazonBundleTitleChanged: (row, receivedTitle, expectedTitle) =>
    `Order on row ${row} has a different title ('${receivedTitle}') than expected ('${expectedTitle}')`,
  invalidUnit: (row, unit) =>
    `Row ${row}: Invalid unit - ${unit} provided is not valid. 'Pack size'x'Unit size' expected.`,
  excelMissingColumn: (sheetName, expected) =>
    `Missing columns for sheet ${sheetName}. Please provide following columns: ${expected
      .map((column) => `"${column}"`)
      .join(', ')}`,
  missingColumn: (missingColumns) => `These columns are needed to use this file: ${missingColumns}`,
  invalidDates: (expected, received) =>
    `Invalid dates - All rows should have the same date. Row 1: "${expected}" is not equal to Row ${received.row}: "${received.date}"`,
  invalidHeader: (expected, received) =>
    `Invalid header - Header must be: [${expected.join(', ')}], but received [${received.join(', ')}]`,
  invalidAmazonOrigin: (rowNumbers, expected, received) =>
    `Order on rows ${rowNumbers} has invalid Sales Channel - Sales Channel must be in: [${expected.join(
      ', ',
    )}], but received '${received}'`,
  emptyFile: () => 'File is empty',
  missingValue: (row, columnName) => `Row ${row}: Missing value. Please provide a value to ${columnName}.`,
}

export const DATES = {
  ryde_week_0: moment('2023-11-06'),
  currentRydeWeek: () => moment().diff(moment('2023-11-06'), 'week'),
  mondayOfPreviousWeek: () => moment.utc().subtract(1, 'week').startOf('isoWeek'),
  sundayOfPreviousWeek: () => moment.utc().subtract(1, 'week').endOf('isoWeek'),
}

export const REPORTS = {
  circleK: {
    competitors: 'CIRCLEK_COMPETITORS_REPORT',
    sellOutReport: 'CIRCLEK_SELL_OUT_REPORT',
    global: 'CIRCLE_K_GLOBAL',
    qcAtl: 'CIRCLE_K_QC_ATL',
  },
  confirmed: 'CONFIRMED_ORDERS',
  sellin: 'SELL_IN_ORDERS',
  amazon: 'AMAZON_ORDERS',
  amazonBundles: 'AMAZON_BUNDLES',
  rabba: 'RABBA',
  customers: 'CUSTOMERS',
  customersTargets: 'CUSTOMERS_TARGETS',
  centralMarket: 'CENTRAL_MARKET',
  loblaws: 'LOBLAWS',
  parkland: 'PARKLAND',
  petroCanada: 'PETRO_CANADA',
  customerProductStatus: 'CUSTOMER_PRODUCT_STATUS',
  sevenEleven: '7_ELEVEN',
  sevenElevenConfirmed: '7_ELEVEN_CONFIRMED',
  napOrange: 'NAP_ORANGE',
  sobeys: 'SOBEYS',
}

export const FORECASTS = {
  amazon: 'AMAZON_FORECAST',
}

export const BANNERS = {
  AISLE_24: 'Aisle 24',
  CIRCLE_K: {
    global: 'CIRCLE K ON',
    atl: 'Circle K - Atl',
    west: 'Circle K - West',
    on: 'Circle K - ON',
    qc: 'Circle K - QC (DC)',
    search: 'Circle K',
  },
  EXTRA: 'Independents',
  INS_MARKETS: 'INS Market',
  PARKLAND: 'Parkland',
  RABBA: 'Rabba',
  THE_BEVY: 'The Bevy',
  CENTRAL_MARKET: 'Central Market',
  LOBLAWS: 'LCL',
  PETRO_CANADA: 'Petro Canada',
  SEVEN_ELEVEN: '7-Eleven',
  NAP_ORANGE: 'NAP Orange',
  SOBEYS: 'Sobeys',
}

export const METABASE_DASHBOARDS = {
  commercial: { uuid: 'e2fabf9cae160681c38b6bc12fb2864e00c8031483cf7a2332ec367d283ab0e2', dashboardNumber: 113 },
  sellout: { uuid: 'e2fabf9cae160681c38b6bc12fb2864e00c8031483cf7a2332ec367d283ab0e2', dashboardNumber: 116 },
  inventory: { uuid: 'e2fabf9cae160681c38b6bc12fb2864e00c8031483cf7a2332ec367d283ab0e2', dashboardNumber: 117 },
  reports: { uuid: 'e2fabf9cae160681c38b6bc12fb2864e00c8031483cf7a2332ec367d283ab0e2', dashboardNumber: 118 },
  amazon: { uuid: 'e2fabf9cae160681c38b6bc12fb2864e00c8031483cf7a2332ec367d283ab0e2', dashboardNumber: 119 },
}

export const APP_ROLES = {
  admin: 'admin',
  trade: 'trade',
  rabba: 'rabba',
  circleK: 'circle k',
  centralMarket: 'central market',
  loblaws: 'loblaws',
  parkland: 'parkland',
  unauthorized: 'unauthorized',
}

export const UPLOAD_RESULT_STATES = {
  success: 'File was successfuly uploaded.',
  withError: 'File was successfuly uploaded, but some rows were rejected.',
  failure: 'ERROR',
}

export const US_SHIPSTATES = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
  'american samoa': 'AS',
  guam: 'GU',
  'northern mariana islands': 'MP',
  'puerto rico': 'PR',
  'united states minor outlying islands': 'UM',
  'virgin islands': 'VI',
}

export const USER_ROLES = {
  admin: 'Admin',
  dataManager: 'Data manager',
  trade: 'Trade',
}
