import { clientsSchema } from '@repo/csv'
import { clients } from '@repo/db'
import { eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db'

type AddClientsRecord = z.infer<typeof clientsSchema>

export type AddClientsValidationDetails = {
  clientCode: string
  email: string
  isExistingByCode: boolean
  isExistingByEmail: boolean
}

export async function validateAddClientsRecord(
  record: AddClientsRecord,
): Promise<{ isValid: boolean; details: AddClientsValidationDetails }> {
  const clientCode = String(record.client_code)
  const email = String(record.email)

  // Check if client already exists by code or email
  const [existingClient] = await db
    .select()
    .from(clients)
    .where(or(eq(clients.clientCode, clientCode), eq(clients.email, email)))
    .limit(1)

  const isExistingByCode = existingClient?.clientCode === clientCode
  const isExistingByEmail = existingClient?.email === email

  const details: AddClientsValidationDetails = {
    clientCode,
    email,
    isExistingByCode,
    isExistingByEmail,
  }

  // Client is valid if neither code nor email already exists
  const isValid = !isExistingByCode && !isExistingByEmail

  return {
    isValid,
    details,
  }
}

export async function processAddClientsRecord(
  record: AddClientsRecord,
): Promise<AddClientsRecord> {
  await db.insert(clients).values({
    clientCode: String(record.client_code),
    storeName: String(record.store_name),
    storeType: String(record.store_type),
    email: String(record.email),
    city: String(record.city),
  })

  return record
}
