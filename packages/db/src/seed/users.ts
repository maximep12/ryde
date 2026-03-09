import * as crypto from 'crypto'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { promisify } from 'util'
import type * as schema from '../schema'
import { type Role, type Status, users } from '../schema'

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

export async function seedUsers(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding users...')

  const defaultPassword = await hashPassword('admin123')

  await db.insert(users).values([
    {
      id: generateId(),
      email: 'admin@example.com',
      passwordHash: defaultPassword,
      givenName: 'Admin',
      familyName: 'User',
      role: 'admin' satisfies Role,
      status: 'active' satisfies Status,
    },
    {
      id: generateId(),
      email: 'demo@example.com',
      givenName: 'Demo',
      familyName: 'User',
      role: 'trade_rep' satisfies Role,
      status: 'pending' satisfies Status,
    },
  ])

  console.log('Created seed users:')
  console.log('  - admin@example.com (Admin User)')
  console.log('  - demo@example.com (Demo User)')
  console.log('All users have password: admin123')
}
