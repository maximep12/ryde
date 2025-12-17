import * as crypto from 'crypto'
import { inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { promisify } from 'util'
import type * as schema from '../schema'
import { users } from '../schema'

const scryptAsync = promisify(crypto.scrypt)
const SALT_LENGTH = 16
const KEY_LENGTH = 64

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

function generateId(): string {
  return crypto.randomUUID()
}

const SEED_USER_EMAILS = ['admin@example.com']

export async function seedUsers(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding users...')

  // Delete existing seed users (idempotent)
  const deleted = await db.delete(users).where(inArray(users.email, SEED_USER_EMAILS)).returning()
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} existing seed user(s)`)
  }

  const adminPassword = await hashPassword('admin123')

  await db.insert(users).values([
    {
      id: generateId(),
      email: 'admin@example.com',
      passwordHash: adminPassword,
      givenName: 'Admin',
      familyName: 'User',
      isActive: true,
    },
  ])

  console.log('Created admin user: admin@example.com (password: admin123)')
}
