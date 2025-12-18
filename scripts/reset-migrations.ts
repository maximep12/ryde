import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRIZZLE_LOCAL = path.resolve(__dirname, '../packages/db/drizzle-local')
const META_DIR = path.join(DRIZZLE_LOCAL, 'meta')
const JOURNAL_PATH = path.join(META_DIR, '_journal.json')

function resetMigrations() {
  // Check if drizzle-local exists
  if (!fs.existsSync(DRIZZLE_LOCAL)) {
    console.log('No migrations to reset')
    return
  }

  // Remove all .sql files in drizzle-local
  const sqlFiles = fs.readdirSync(DRIZZLE_LOCAL).filter((f) => f.endsWith('.sql'))
  for (const file of sqlFiles) {
    fs.unlinkSync(path.join(DRIZZLE_LOCAL, file))
  }
  if (sqlFiles.length > 0) {
    console.log(`Removed ${sqlFiles.length} migration file(s)`)
  }

  // Remove all .json files in meta except _journal.json
  if (fs.existsSync(META_DIR)) {
    const metaFiles = fs
      .readdirSync(META_DIR)
      .filter((f) => f.endsWith('.json') && f !== '_journal.json')
    for (const file of metaFiles) {
      fs.unlinkSync(path.join(META_DIR, file))
    }
    if (metaFiles.length > 0) {
      console.log(`Removed ${metaFiles.length} snapshot file(s)`)
    }

    // Reset _journal.json
    if (fs.existsSync(JOURNAL_PATH)) {
      const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8'))
      journal.entries = []
      fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n')
      console.log('Reset _journal.json')
    }
  }

  console.log('Migrations reset complete')
}

resetMigrations()
