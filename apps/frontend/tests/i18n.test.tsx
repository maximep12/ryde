import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const I18N_DIR = path.resolve(__dirname, '../i18n')
const EN_DIR = path.join(I18N_DIR, 'en')
const FR_DIR = path.join(I18N_DIR, 'fr')

describe('i18n tests', () => {
  it('should have matching translation files and keys between EN and FR', () => {
    const enFiles = readdirSync(EN_DIR).filter((file) => file.endsWith('.json'))
    const frFiles = readdirSync(FR_DIR).filter((file) => file.endsWith('.json'))

    expect(enFiles.sort()).toEqual(frFiles.sort())

    for (const filename of enFiles) {
      const enPath = path.join(EN_DIR, filename)
      const frPath = path.join(FR_DIR, filename)

      const enContent = JSON.parse(readFileSync(enPath, 'utf-8'))
      const frContent = JSON.parse(readFileSync(frPath, 'utf-8'))

      const enKeys = Object.keys(enContent).sort()
      const frKeys = Object.keys(frContent).sort()

      expect(enKeys, `Keys mismatch in ${filename}`).toEqual(frKeys)
    }
  })
})
