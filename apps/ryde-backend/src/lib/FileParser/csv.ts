import { parse } from 'csv-parse'

export async function parseCsvStream(
  stream: NodeJS.ReadableStream,
  options?: { delimiter?: string },
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
    parser.on('end', () => resolve(rows))

    stream.pipe(parser)
  })
}
