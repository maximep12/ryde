import * as crypto from 'crypto'
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

export async function seedUsers(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding users...')

  const existingUsers = await db.select().from(users).limit(1)
  if (existingUsers.length > 0) {
    console.log('Users already exist, skipping seed')
    return
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
