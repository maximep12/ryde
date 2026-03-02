import Excel from 'exceljs'
import { tsvStringToJson } from 'helpers'
import { isDate, isObject } from 'lodash'

import { ERRORS } from 'utils/constants'
import FileLevelError from 'utils/FileLevelError'

export async function readExcelFile({ stream, expected, optional = [] }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  return expected.map((e) => {
    const sheet = workbook.getWorksheet(e.sheetName)

    if (!sheet) throw new FileLevelError(`Missing expected data. Please provide sheet with the name: ${e.sheetName}`)
    const optionalColumns = optional.find((o) => o.sheetName === e.sheetName)

    return getSheetContentToJson({ sheet, expectation: e, optionalColumns })
  })
}

function getSheetContentToJson({ sheet, expectation, optionalColumns }) {
  const csvValues = []
  let foundTheHeader = false
  sheet.eachRow(function (row, rowNumber) {
    const values = row.values.map((v) => {
      if (isDate(v)) return v.toISOString()
      if (isObject(v)) {
        if (v.result?.error) return ''
        if (v.result !== undefined) return v.result
        if (v.richText) return v.richText.map((rt) => rt.text).join('')
        if (v.text !== undefined) return v.text
        if (v.value !== undefined) return v.value
        return ''
      }
      return v
    })

    values.shift()
    if (!foundTheHeader) {
      const rowValues = ['row', ...values]
      if (expectation.rename) {
        const allExpectedFound = expectation.columns.every((value) => rowValues.find((rv) => rv === value))
        if (allExpectedFound) {
          // Need to validate that we do not receive new columns
          const expectedColumns = [...expectation.columns]
          const additionalColumns = []
          for (const column of rowValues) {
            if (column === 'row') continue
            const index = expectedColumns.findIndex((ec) => ec === column)
            const columnIsFound = index >= 0
            if (columnIsFound) {
              expectedColumns.splice(index, 1)
            } else {
              if (!optionalColumns.includes(column)) additionalColumns.push(column)
            }
          }

          if (expectedColumns.length !== 0 || additionalColumns.length !== 0) {
            throw new FileLevelError(ERRORS.invalidHeader(expectation.columns, [...values]))
          }

          foundTheHeader = true
        }
      } else {
        foundTheHeader = expectation.columns.every((value) => rowValues.find((rv) => rv === value))
      }
    }

    let content = [rowNumber, ...values]

    if (foundTheHeader) {
      if (csvValues.length === 0) {
        content[0] = 'Row'

        if (expectation.rename) content = expectation.rename
      }

      csvValues.push(content.join('\t'))
    }
  })

  if (!foundTheHeader) {
    throw new FileLevelError(ERRORS.excelMissingColumn(sheet.name, expectation.columns))
  }

  const jsonValues = tsvStringToJson({ fileContent: csvValues.join('\n') })

  return { sheetName: expectation.sheetName, values: jsonValues }
}
