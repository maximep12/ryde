import * as crypto from 'crypto'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { promisify } from 'util'
import type * as schema from '../schema'
import { type Department, users } from '../schema'

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
      email: 'anne.sergerie@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Anne',
      familyName: 'Sergerie',
      department: 'customer_service' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'isabelle.picard@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Isabelle',
      familyName: 'Picard',
      department: 'finance' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'nathalie.laforest@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Nathalie',
      familyName: 'Laforest',
      department: 'production_planning' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'nicolas.tremblay@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Nicolas',
      familyName: 'Tremblay',
      department: 'manufacturing' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'julien.chenard@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Julien',
      familyName: 'Chenard',
      department: 'procurement' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'dominic.mercier@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Dominic',
      familyName: 'Mercier',
      department: 'finance' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'miguel.turcotte@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Miguel',
      familyName: 'Turcotte',
      department: 'it' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'johanne.belanger@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Johanne',
      familyName: 'Bélanger',
      department: 'finance' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'frank@volume7.io',
      passwordHash: defaultPassword,
      givenName: 'Francis',
      familyName: 'Marineau',
      department: 'external' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'deric@volume7.io',
      passwordHash: defaultPassword,
      givenName: 'Déric',
      familyName: 'Marchand',
      department: 'external' satisfies Department,
      isActive: true,
    },
    {
      id: generateId(),
      email: 'pia.charron@intersand.com',
      passwordHash: defaultPassword,
      givenName: 'Pia',
      familyName: 'Charron',
      department: 'it' satisfies Department,
      isActive: true,
    },
  ])

  console.log('Created seed users:')
  console.log('  - anne.sergerie@intersand.com (Anne Sergerie - Customer Service)')
  console.log('  - isabelle.picard@intersand.com (Isabelle Picard - Finance)')
  console.log('  - nathalie.laforest@intersand.com (Nathalie Laforest - Production Planning)')
  console.log('  - nicolas.tremblay@intersand.com (Nicolas Tremblay - Manufacturing)')
  console.log('  - julien.chenard@intersand.com (Julien Chenard - Procurement)')
  console.log('  - dominic.mercier@intersand.com (Dominic Mercier - Finance)')
  console.log('  - miguel.turcotte@intersand.com (Miguel Turcotte - IT)')
  console.log('  - johanne.belanger@intersand.com (Johanne Bélanger - Finance)')
  console.log('  - frank@volume7.io (Francis Marineau - External)')
  console.log('  - deric@volume7.io (Déric Marchand - External)')
  console.log('  - pia.charron@intersand.com (Pia Charron - IT)')
  console.log('All users have password: admin123')
}
