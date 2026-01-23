import { clientsSchema } from '@repo/csv'
import { clients } from '@repo/db'
import { eq, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db'
import { BatchValidationResult, NodePgTransaction } from '../types'

type AddClientsRecord = z.infer<typeof clientsSchema>

export type AddClientsValidationDetails = {
  clientCode: string
  email: string
  isUpdate: boolean
  isEmailConflict: boolean // Email belongs to a different client
}

export async function validateAddClientsRecord(
  record: AddClientsRecord,
): Promise<{ isValid: boolean; details: AddClientsValidationDetails }> {
  const clientCode = String(record.client_code)
  const email = String(record.email)

  // Check if client already exists by code or email
  const existingClients = await db
    .select({ clientCode: clients.clientCode, email: clients.email })
    .from(clients)
    .where(or(eq(clients.clientCode, clientCode), eq(clients.email, email)))

  const existingByCode = existingClients.find((c) => c.clientCode === clientCode)
  const existingByEmail = existingClients.find((c) => c.email === email)

  // Email conflict: email exists but belongs to a different client code
  const isEmailConflict = !!existingByEmail && existingByEmail.clientCode !== clientCode

  const details: AddClientsValidationDetails = {
    clientCode,
    email,
    isUpdate: !!existingByCode,
    isEmailConflict,
  }

  // Valid unless email belongs to a different client
  const isValid = !isEmailConflict

  return {
    isValid,
    details,
  }
}

export async function processAddClientsRecord(record: AddClientsRecord): Promise<AddClientsRecord> {
  await db
    .insert(clients)
    .values({
      clientCode: String(record.client_code),
      storeName: String(record.store_name),
      storeType: String(record.store_type),
      email: String(record.email),
      city: String(record.city),
    })
    .onConflictDoUpdate({
      target: clients.clientCode,
      set: {
        storeName: String(record.store_name),
        storeType: String(record.store_type),
        email: String(record.email),
        city: String(record.city),
      },
    })

  return record
}

// Batch validation - single IN query for all records
export async function batchValidateClients(
  records: Array<{ record: AddClientsRecord; rowIndex: number }>,
): Promise<Array<BatchValidationResult<AddClientsValidationDetails>>> {
  if (records.length === 0) return []

  // Extract all codes and emails
  const codes = records.map((r) => String(r.record.client_code))
  const emails = records.map((r) => String(r.record.email))

  // Single query to find all existing clients by code or email
  const existingClients = await db
    .select({ clientCode: clients.clientCode, email: clients.email })
    .from(clients)
    .where(or(inArray(clients.clientCode, codes), inArray(clients.email, emails)))

  // Build maps for O(1) lookup
  const clientByCode = new Map(existingClients.map((c) => [c.clientCode, c]))
  const clientByEmail = new Map(existingClients.map((c) => [c.email, c]))

  // Track emails claimed by codes in this batch (for detecting conflicts within batch)
  const batchEmailOwner = new Map<string, string>() // email -> clientCode that claimed it

  const results: Array<BatchValidationResult<AddClientsValidationDetails>> = []

  for (const { record, rowIndex } of records) {
    const clientCode = String(record.client_code)
    const email = String(record.email)

    const existingByCode = clientByCode.get(clientCode)
    const existingByEmail = clientByEmail.get(email)

    // Email conflict cases:
    // 1. Email exists in DB but belongs to different client code
    // 2. Email was claimed by a different client code earlier in this batch
    const isEmailConflictInDb = !!existingByEmail && existingByEmail.clientCode !== clientCode
    const batchOwner = batchEmailOwner.get(email)
    const isEmailConflictInBatch = !!batchOwner && batchOwner !== clientCode

    const isEmailConflict = isEmailConflictInDb || isEmailConflictInBatch

    const details: AddClientsValidationDetails = {
      clientCode,
      email,
      isUpdate: !!existingByCode,
      isEmailConflict,
    }

    // Valid unless email belongs to a different client
    const isValid = !isEmailConflict

    results.push({
      rowIndex,
      record,
      isValid,
      details,
    })

    // Track this email as owned by this client code
    if (!batchEmailOwner.has(email)) {
      batchEmailOwner.set(email, clientCode)
    }
  }

  return results
}

// Batch upsert - transaction-aware
export async function batchInsertClients(
  tx: NodePgTransaction,
  records: AddClientsRecord[],
): Promise<void> {
  if (records.length === 0) return

  const values = records.map((record) => ({
    clientCode: String(record.client_code),
    storeName: String(record.store_name),
    storeType: String(record.store_type),
    email: String(record.email),
    city: String(record.city),
  }))

  await tx
    .insert(clients)
    .values(values)
    .onConflictDoUpdate({
      target: clients.clientCode,
      set: {
        storeName: sql`excluded.store_name`,
        storeType: sql`excluded.store_type`,
        email: sql`excluded.email`,
        city: sql`excluded.city`,
      },
    })
}
