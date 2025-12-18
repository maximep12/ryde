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

const SEED_USER_EMAILS = [
  'admin@example.com',
  'john.denver@example.com',
  'samantha.charron@example.com',
  'michael.chen@example.com',
  'emily.rodriguez@example.com',
]

export async function seedUsers(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding users...')

  // Delete existing seed users (idempotent)
  const deleted = await db.delete(users).where(inArray(users.email, SEED_USER_EMAILS)).returning()
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} existing seed user(s)`)
  }

  const defaultPassword = await hashPassword('admin123')

  await db.insert(users).values([
    {
      id: generateId(),
      email: 'admin@example.com',
      passwordHash: defaultPassword,
      givenName: 'Admin',
      familyName: 'User',
      isActive: true,
    },
    {
      id: generateId(),
      email: 'john.denver@example.com',
      passwordHash: defaultPassword,
      givenName: 'John',
      familyName: 'Denver',
      isActive: true,
    },
    {
      id: generateId(),
      email: 'samantha.charron@example.com',
      passwordHash: defaultPassword,
      givenName: 'Samantha',
      familyName: 'Charron',
      isActive: true,
    },
    {
      id: generateId(),
      email: 'michael.chen@example.com',
      passwordHash: defaultPassword,
      givenName: 'Michael',
      familyName: 'Chen',
      isActive: true,
    },
    {
      id: generateId(),
      email: 'emily.rodriguez@example.com',
      passwordHash: defaultPassword,
      givenName: 'Emily',
      familyName: 'Rodriguez',
      isActive: true,
    },
  ])

  console.log('Created seed users:')
  console.log('  - admin@example.com (Admin User)')
  console.log('  - john.denver@example.com (John Denver)')
  console.log('  - samantha.charron@example.com (Samantha Charron)')
  console.log('  - michael.chen@example.com (Michael Chen)')
  console.log('  - emily.rodriguez@example.com (Emily Rodriguez)')
  console.log('All users have password: admin123')
}
