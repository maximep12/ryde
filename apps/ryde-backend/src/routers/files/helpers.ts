// ─── Excel XML helpers ────────────────────────────────────────────────────────

const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
const MS_PER_DAY = 86400000

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function dateToExcelSerial(date: Date): number {
  return (date.getTime() - EXCEL_EPOCH) / MS_PER_DAY
}

export function columnNumberToLetter(colNum: number): string {
  let letter = ''
  let n = colNum
  while (n > 0) {
    const remainder = (n - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    n = Math.floor((n - 1) / 26)
  }
  return letter
}

export type StringManager = ReturnType<typeof createStringManager>

export function createStringManager(sharedStringsXml: string) {
  const siMatches = Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g))
  const stringMap = new Map<string, number>()
  const indexToString = new Map<number, string>()

  for (let i = 0; i < siMatches.length; i++) {
    const tMatch = siMatches[i]?.[1]?.match(/<t[^>]*>([^<]*)<\/t>/)
    if (tMatch?.[1] !== undefined) {
      const text = tMatch[1]
      stringMap.set(text, i)
      indexToString.set(i, text)
    }
  }

  const newStrings: string[] = []

  return {
    getStringIndex(str: string): number {
      const strValue = String(str)
      if (stringMap.has(strValue)) return stringMap.get(strValue)!
      const newIndex = siMatches.length + newStrings.length
      newStrings.push(`<si><t>${escapeXml(strValue)}</t></si>`)
      stringMap.set(strValue, newIndex)
      return newIndex
    },
    getString(index: number): string | undefined {
      return indexToString.get(index)
    },
    getUpdatedXml(): string {
      if (newStrings.length === 0) return sharedStringsXml
      const countMatch = sharedStringsXml.match(/count="(\d+)"/)
      const uniqueCountMatch = sharedStringsXml.match(/uniqueCount="(\d+)"/)
      const currentCount = countMatch ? parseInt(countMatch[1] ?? '0') : 0
      const currentUniqueCount = uniqueCountMatch ? parseInt(uniqueCountMatch[1] ?? '0') : 0
      const sstOpenTag = sharedStringsXml.match(/<sst[^>]*>/)?.[0] ?? '<sst>'
      const existingStrings = sharedStringsXml.match(/<sst[^>]*>([\s\S]*)<\/sst>/)?.[1] ?? ''
      return (
        sstOpenTag
          .replace(/count="[^"]*"/, `count="${currentCount + newStrings.length}"`)
          .replace(/uniqueCount="[^"]*"/, `uniqueCount="${currentUniqueCount + newStrings.length}"`) +
        existingStrings +
        newStrings.join('') +
        '</sst>'
      )
    },
    hasNewStrings(): boolean {
      return newStrings.length > 0
    },
  }
}
