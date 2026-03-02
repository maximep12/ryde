import fs from 'fs'

import camelCase from 'lodash/camelCase'
import sum from 'lodash/sum'
import tail from 'lodash/tail'
import toLower from 'lodash/toLower'
import upperCase from 'lodash/upperCase'
import zipObject from 'lodash/zipObject'
import { ERRORS, US_SHIPSTATES } from './utils/constants'
import FileLevelError from './utils/FileLevelError'
import zipState from 'zip-state'

import AmazonOrder from 'models/amazonOrder'

export function returnsTheSumOfArray(array) {
  return sum(array)
}

export function getJsonFromFile({ filePath, delimiter = ',' }) {
  if (!filePath) return {}

  const fileContent = fs.readFileSync(filePath, 'utf-8').replace(/\r/g, '')

  const content = fileContent.split('\n')
  const header = content[0].split(delimiter).map((h) => camelCase(h))

  return tail(content).map((row) => {
    return zipObject(header, row.split(delimiter))
  })
}

export function getBottleQuantityFromFormat({ formats, unit, quantity, basedOnThTs = false }) {
  const linkedUnit = formats.find((format) => format.unit === unit)
  if (unit && !linkedUnit) {
    return null
  }

  if (linkedUnit) {
    const quantityOrdered = basedOnThTs
      ? (quantity / (linkedUnit.numerator / linkedUnit.denominator)) * linkedUnit.numerator
      : quantity * linkedUnit.numerator

    return ['TS', 'TH'].includes(unit) ? quantityOrdered * 1000 : quantityOrdered
  }

  return quantity * 1000
}

const getUSShipState = ({ zipCode, province }) => {
  const americanShipstate = zipState(zipCode)
  if (americanShipstate) return { shipState: americanShipstate, country: 'US' }

  const usShipstateByName = US_SHIPSTATES[province]
  if (usShipstateByName) return { shipState: usShipstateByName, country: 'US' }

  return null
}

const getCAShipState = ({ zipCode, province }) => {
  const associatedProvince = getCAShipstate({ zipCode, province })
  if (!associatedProvince) return null

  return { country: 'CA', shipState: associatedProvince }
}

const getDefaultShipState = ({ province, country }) => {
  if (province) {
    return { shipState: upperCase(province), country }
  }
  return null
}

const COUNTRY_SHIP_STATE_MAPPING = {
  US: getUSShipState,
  CA: getCAShipState,
}

const getShipStateMapping = (country) => {
  return COUNTRY_SHIP_STATE_MAPPING[country] || getDefaultShipState
}

export async function getProvinceByZipCode({ amazonOrderId, zipCode, province, country }) {
  const zipCodeEmpty = zipCode === ''
  const provinceEmpty = province === ''
  const countryEmpty = country === ''
  const noLocationAvailable = zipCodeEmpty && provinceEmpty && countryEmpty

  if (noLocationAvailable) {
    if (amazonOrderId) {
      const location = await AmazonOrder.query()
        .select(['ship_state', 'country'])
        .where('order_id', amazonOrderId)
        .first()

      return location ? { shipState: location.shipState, country: location.country } : null
    }
    return null
  }

  if (!provinceEmpty && countryEmpty) {
    const location = await AmazonOrder.query()
      .select(['ship_state', 'country'])
      .where('ship_state', upperCase(province))
      .first()

    return location ? { shipState: location.shipState, country: location.country } : null
  }

  const shipStateMapper = getShipStateMapping(country)
  return shipStateMapper({ zipCode, province, country })
}

function getCAShipstate({ zipCode, province }) {
  const zipCodeFirstChar = zipCode?.charAt(0)

  switch (toLower(zipCodeFirstChar)) {
    case 'a':
      return 'NL' // Newfoundland and Labrador
    case 'b':
      return 'NS' // Nova Scotia
    case 'c':
      return 'PE' // Prince Edward Island
    case 'e':
      return 'NB' // New Brunswick
    case 'g':
    case 'h':
    case 'j':
      return 'QC' // Quebec
    case 'k':
    case 'l':
    case 'm':
    case 'n':
    case 'p':
      return 'ON' // Ontario
    case 'r':
      return 'MB' // Manitoba
    case 's':
      return 'SK' // Saskatchewan
    case 't':
      return 'AB' // Alberta
    case 'v':
      return 'BC' // British Columbia
    case 'x':
      if (toLower(province) === 'nunavut') return 'NU' // Nunavut
      return 'NT' // Northwest territories
    case 'y':
      return 'YT' // Yukon
    default:
      return null
  }
}

export function csvToJson({ content, separator = '\n', expectedColumns }) {
  // Split rows by newline, and filter out any empty lines
  const rows = content.split(separator).filter((row) => row.trim() !== '')

  // Extract headers from the first row
  const headers = rows[0].split(',').map((header) => header.trim())

  if (expectedColumns.length) {
    const missingHeaders = expectedColumns.filter((att) => !headers.find((h) => h.includes(att)))
    if (missingHeaders.length) {
      throw new FileLevelError(ERRORS.missingColumn(missingHeaders.map((mh) => `"${mh}"`).join(', ')))
    }
  }

  // Map each row (excluding the header) to an object
  return rows.slice(1).map((row) => {
    const fields = []
    let currentField = ''
    let insideQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      const nextChar = row[i + 1]

      if (char === '"' && !insideQuotes) {
        // Start of quoted field
        insideQuotes = true
      } else if (char === '"' && insideQuotes && nextChar === ',') {
        // End of quoted field followed by a comma
        insideQuotes = false
        fields.push(currentField)
        currentField = ''
        i++ // Skip the comma
      } else if (char === '"' && insideQuotes && nextChar === '"') {
        // Double quote inside quoted field (escaped quote)
        currentField += '"'
        i++ // Skip the second quote
      } else if (char === '"' && insideQuotes) {
        // End of quoted field not followed by a comma (end of row)
        insideQuotes = false
      } else if (char === ',' && !insideQuotes) {
        // Field separator outside quotes
        fields.push(currentField)
        currentField = ''
      } else {
        // Regular character (part of field)
        currentField += char
      }
    }
    // Push the last field after the loop
    fields.push(currentField)

    // Map fields to headers to create an object
    return headers.reduce((obj, header, index) => {
      obj[camelCase(header)] = fields[index] || ''
      return obj
    }, {})
  })
}

export function tsvStringToJson({ fileContent, delimiter = '\t', expected = [] }) {
  if (!fileContent) throw new FileLevelError(ERRORS.emptyFile())

  const content = fileContent.split('\n')
  const headers = content[0].split(delimiter)

  if (expected.length) {
    const missingHeaders = expected.filter((att) => !headers.find((h) => h.includes(att)))
    if (missingHeaders.length) {
      throw new FileLevelError(ERRORS.missingColumn(missingHeaders.map((mh) => `"${mh}"`).join(', ')))
    }
  }

  const header = headers.map((h) => camelCase(h))

  return tail(content).map((row, index) => {
    return { rowNumber: index + 2, ...zipObject(header, row.split(delimiter)) }
  })
}
