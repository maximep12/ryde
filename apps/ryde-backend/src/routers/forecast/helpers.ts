import { forecasts, productSkus } from '@repo/db'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

export async function getValidSkus(): Promise<string[]> {
  const rows = await db.select({ sku: productSkus.sku }).from(productSkus)
  return rows.map((r) => r.sku ?? '').filter(Boolean)
}

export async function getExistingForecasts() {
  return db.select().from(forecasts)
}

export async function deleteForecastsByYearMonth(tx: typeof db, year: number, month: number) {
  return tx.delete(forecasts).where(and(eq(forecasts.year, year), eq(forecasts.month, month)))
}
