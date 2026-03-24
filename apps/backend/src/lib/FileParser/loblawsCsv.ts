import camelCase from 'lodash/camelCase.js'
import { ERRORS } from '../../utils/constants.js'

class FileLevelError extends Error {
  code = 406
  constructor(message: string) {
    super(message)
    this.name = 'FileLevelError'
  }
}

const EXPECTED_COLUMNS = ['Week End Date', 'UPC', 'Site Number', 'Sales', 'Units']

/**
 * Parses a Loblaws CSV file (comma-delimited) into JSON rows with camelCase keys.
 * Port of `tsvStringToJson` from helpers.js, specialised for the Loblaws column set.
 */
export function parseLoblawsCsv(fileContent: string): Record<string, unknown>[] {
  if (!fileContent) throw new FileLevelError(ERRORS.emptyFile())

  const lines = fileContent.split('\n')
  const headers = (lines[0] ?? '').split(',')

  const missingHeaders = EXPECTED_COLUMNS.filter((col) => !headers.find((h) => h.includes(col)))
  if (missingHeaders.length) {
    throw new FileLevelError(ERRORS.missingColumn(missingHeaders.map((mh) => `"${mh}"`).join(', ')))
  }

  const camelHeaders = headers.map((h) => camelCase(h.trim()))

  return lines.slice(1).map((row, index) => {
    const values = row.split(',')
    const obj: Record<string, unknown> = { rowNumber: index + 2 }
    for (let i = 0; i < camelHeaders.length; i++) {
      obj[camelHeaders[i]!] = values[i]?.trim() ?? ''
    }
    return obj
  })
}
