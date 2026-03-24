import { customerProductStatus, customers } from '@repo/db'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

export async function getCustomerIds(): Promise<number[]> {
  const rows = await db.select({ id: customers.id }).from(customers)
  return rows.map((r) => r.id)
}

export async function getExistingStatuses() {
  return db.select().from(customerProductStatus)
}

export async function createStatus({
  customerId,
  statusDate,
  facings,
  placements,
}: {
  customerId: number
  statusDate: string
  facings: number
  placements: number
}) {
  await db.insert(customerProductStatus).values({ customerId, statusDate, facings, placements })
}

export async function updateStatus({
  customerId,
  statusDate,
  facings,
  placements,
}: {
  customerId: number
  statusDate: string
  facings: number
  placements: number
}) {
  await db
    .update(customerProductStatus)
    .set({ facings, placements })
    .where(and(eq(customerProductStatus.customerId, customerId), eq(customerProductStatus.statusDate, statusDate)))
}
