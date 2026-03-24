import { parse } from 'csv-parse'
import camelCase from 'lodash/camelCase.js'
import mapKeys from 'lodash/mapKeys.js'
import { Readable } from 'node:stream'
import { ERRORS } from '../../utils/constants'
import { FileLevelError } from './excel'

export function validateColumns(rows: Record<string, unknown>[], expectedColumns: string[]): void {
  if (!rows.length) throw new FileLevelError(ERRORS.emptyFile())
  const headers = Object.keys(rows[0] ?? {})
  const missing = expectedColumns.filter((col) => !headers.find((h) => h.includes(col)))
  if (missing.length) throw new FileLevelError(ERRORS.missingColumn(missing.map((m) => `"${m}"`).join(', ')))
}

export async function parseCsvStream(
  stream: NodeJS.ReadableStream | ReadableStream<Uint8Array>,
  options?: { delimiter?: string; columns?: string[] },
): Promise<Record<string, string | number | null>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string | number | null>[] = []

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: options?.delimiter ?? ',',
      cast: (value) => {
        if (!value || !value.trim()) return null
        if (!isNaN(Number(value))) return Number(value)
        return value
      },
    })

    let rowNumber = 1
    parser.on('readable', () => {
      let record
      while ((record = parser.read()) !== null) {
        rows.push({ ...(record as Record<string, string | number | null>), rowNumber: rowNumber++ })
      }
    })

    parser.on('error', reject)
    parser.on('end', () => {
      if (options?.columns) validateColumns(rows, options.columns)
      resolve(rows.map((row) => mapKeys(row, (_, key) => camelCase(key))))
    })

    if ('getReader' in stream) {
      Readable.fromWeb(stream as unknown as import('node:stream/web').ReadableStream).pipe(parser)
    } else {
      stream.pipe(parser)
    }
  })
}
