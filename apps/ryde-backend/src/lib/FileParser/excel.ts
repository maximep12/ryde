import Excel from 'exceljs'
import { camelCase, zipObject, tail } from 'lodash'

export class FileLevelError extends Error {
  code = 406
  constructor(message: string) {
    super(message)
    this.name = 'FileLevelError'
  }
}

type SheetExpectation = {
  sheetName: string
  columns: string[]
  rename?: string[]
}

type SheetResult = {
  sheetName: string
  values: Record<string, unknown>[]
}

export async function readExcelFile({
  stream,
  expected,
  optional = [],
}: {
  stream: NodeJS.ReadableStream
  expected: SheetExpectation[]
  optional?: { sheetName: string; columns: string[] }[]
}): Promise<SheetResult[]> {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  return expected.map((e) => {
    const sheet = workbook.getWorksheet(e.sheetName)

    if (!sheet) throw new FileLevelError(`Missing expected data. Please provide sheet with the name: ${e.sheetName}`)
    const optionalColumns = optional.find((o) => o.sheetName === e.sheetName)

    return getSheetContentToJson({ sheet, expectation: e, optionalColumns })
  })
}

function resolveCellValue(v: Excel.CellValue): unknown {
  if (v instanceof Date) return v.toISOString()
  if (v !== null && typeof v === 'object') {
    const obj = v as unknown as Record<string, unknown>
    if ('result' in obj) {
      const result = obj['result']
      if (result !== null && typeof result === 'object' && 'error' in (result as object)) return ''
      return result
    }
    if ('richText' in obj) return (obj['richText'] as { text: string }[]).map((rt) => rt.text).join('')
    if ('text' in obj) return obj['text']
    if ('value' in obj) return obj['value']
    return ''
  }
  return v
}

function getSheetContentToJson({
  sheet,
  expectation,
  optionalColumns,
}: {
  sheet: Excel.Worksheet
  expectation: SheetExpectation
  optionalColumns?: { sheetName: string; columns: string[] }
}): SheetResult {
  const csvValues: string[] = []
  let foundTheHeader = false

  sheet.eachRow(function (row, rowNumber) {
    const rawValues = row.values as Excel.CellValue[]
    const values = rawValues.map(resolveCellValue)

    values.shift()
    if (!foundTheHeader) {
      const rowValues = ['row', ...values]
      if (expectation.rename) {
        const allExpectedFound = expectation.columns.every((value) => rowValues.find((rv) => rv === value))
        if (allExpectedFound) {
          const expectedColumns = [...expectation.columns]
          const additionalColumns: unknown[] = []
          for (const column of rowValues) {
            if (column === 'row') continue
            const index = expectedColumns.findIndex((ec) => ec === column)
            const columnIsFound = index >= 0
            if (columnIsFound) {
              expectedColumns.splice(index, 1)
            } else {
              if (!optionalColumns?.columns.includes(column as string)) additionalColumns.push(column)
            }
          }

          if (expectedColumns.length !== 0 || additionalColumns.length !== 0) {
            throw new FileLevelError(
              `Invalid header. Expected: [${expectation.columns.join(', ')}], got: [${(values as string[]).join(', ')}]`,
            )
          }

          foundTheHeader = true
        }
      } else {
        foundTheHeader = expectation.columns.every((value) => rowValues.find((rv) => rv === value))
      }
    }

    let content: unknown[] = [rowNumber, ...values]

    if (foundTheHeader) {
      if (csvValues.length === 0) {
        content[0] = 'Row'
        if (expectation.rename) content = expectation.rename
      }

      csvValues.push((content as string[]).join('\t'))
    }
  })

  if (!foundTheHeader) {
    throw new FileLevelError(`Sheet "${sheet.name}" is missing required columns: [${expectation.columns.join(', ')}]`)
  }

  const jsonValues = tsvStringToJson({ fileContent: csvValues.join('\n') })

  return { sheetName: expectation.sheetName, values: jsonValues }
}

function tsvStringToJson({
  fileContent,
  delimiter = '\t',
}: {
  fileContent: string
  delimiter?: string
}): Record<string, unknown>[] {
  if (!fileContent) throw new FileLevelError('File is empty.')

  const content = fileContent.split('\n')
  const headers = (content[0] ?? '').split(delimiter)
  const header = headers.map((h) => camelCase(h))

  return tail(content).map((row: string, index: number) => {
    return { rowNumber: index + 2, ...zipObject(header, row.split(delimiter)) }
  })
}
