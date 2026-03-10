import { customerTargets, customers, periods, reports } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm'
import pg from 'pg'
import { db } from '../../db'
import { env } from '../../lib/utils/env'

const logger = createBaseLogger().child({ module: 'customers' })

// ─── Report helpers ─────────────────────────────────────────────────────────

export async function createReport(type: string, fileName: string) {
  const [report] = await db
    .insert(reports)
    .values({ type, reportStart: new Date().toISOString(), fileName, notifSent: true })
    .returning()
  if (!report) throw new Error('Failed to create report')
  return report
}

export async function updateReportSuccess(
  id: number,
  data: { created: number; updated: number; rejected: string[]; identical: number },
) {
  const { rejected, identical, ...rest } = data
  await db
    .update(reports)
    .set({ reportEnd: new Date().toISOString(), ...rest, notifSent: true, extra: { rejected, identical } })
    .where(eq(reports.id, id))
}

export async function updateReportFailure(id: number, failure: string) {
  await db
    .update(reports)
    .set({ failure, reportEnd: new Date().toISOString(), notifSent: true })
    .where(eq(reports.id, id))
}

// ─── Customer upsert ─────────────────────────────────────────────────────────

type CustomerRow = {
  id: number
  name: string
  country: string
  state: string
  area: string
  channel: string
  subChannel: string
  banner: string
  bannerInternalId: string | null
  isActive: boolean
  phase: string
  territory: string
  cluster: string | null
  distributionCenter: number | null
  batId: number | null
}

export async function getAllCustomers() {
  return db.select().from(customers)
}

const CHUNK_SIZE = 500

export async function bulkUpsertCustomers(rows: CustomerRow[]) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const batch = rows.slice(i, i + CHUNK_SIZE)
    await db
      .insert(customers)
      .values(batch)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          name: sql`excluded.name`,
          country: sql`excluded.country`,
          state: sql`excluded.state`,
          area: sql`excluded.area`,
          channel: sql`excluded.channel`,
          subChannel: sql`excluded.sub_channel`,
          banner: sql`excluded.banner`,
          bannerInternalId: sql`excluded.banner_internal_id`,
          isActive: sql`excluded.is_active`,
          phase: sql`excluded.phase`,
          territory: sql`excluded.territory`,
          cluster: sql`excluded.cluster`,
          distributionCenter: sql`excluded.distribution_center`,
          batId: sql`excluded.bat_id`,
        },
      })
  }
}

// ─── Advance DB sync ─────────────────────────────────────────────────────────

export async function syncCustomersLocation() {
  logger.info('Advance sync start')

  if (!env.ADVANCE_DATABASE_URL) {
    logger.info('Advance sync skipped (no ADVANCE_DATABASE_URL)')
    return
  }

  const advancePool = new pg.Pool({ connectionString: env.ADVANCE_DATABASE_URL })

  try {
    const allCustomers = await db
      .select({
        batId: customers.batId,
        advanceRegionId: customers.advanceRegionId,
        advanceRegionName: customers.advanceRegionName,
        advanceDistrictId: customers.advanceDistrictId,
        advanceDistrictName: customers.advanceDistrictName,
        advanceTerritoryId: customers.advanceTerritoryId,
        advanceTerritoryName: customers.advanceTerritoryName,
      })
      .from(customers)
      .where(isNotNull(customers.batId))

    if (allCustomers.length === 0) {
      logger.info('Advance sync skipped (no customers with batId)')
      return
    }

    const client = await advancePool.connect()
    try {
      const batIds = allCustomers.map((c) => c.batId as number)
      const { rows: advanceCustomers } = await client.query<{
        customerId: number
        regionName: string
        regionId: string
        districtName: string
        districtId: string
        territoryName: string
        territoryId: string
      }>(
        `SELECT
          customer_id as "customerId",
          region_name as "regionName",
          region_id as "regionId",
          district_name as "districtName",
          district_id as "districtId",
          territory_name as "territoryName",
          territory_id as "territoryId"
        FROM customer_primary_assignments
        WHERE customer_id = ANY($1)`,
        [batIds],
      )

      const rydeByBatId = new Map(allCustomers.map((c) => [c.batId as number, c]))

      const updates = advanceCustomers.filter(
        ({ customerId, regionName, regionId, districtName, districtId, territoryName, territoryId }) => {
          const linked = rydeByBatId.get(customerId)
          return (
            linked &&
            (regionName !== linked.advanceRegionName ||
              regionId !== linked.advanceRegionId ||
              districtName !== linked.advanceDistrictName ||
              districtId !== linked.advanceDistrictId ||
              territoryName !== linked.advanceTerritoryName ||
              territoryId !== linked.advanceTerritoryId)
          )
        },
      )

      if (updates.length === 0) {
        logger.info('Advance sync: no updates needed')
        return
      }

      const CHUNK_SIZE = 1000
      let updatedCount = 0
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const batch = updates.slice(i, i + CHUNK_SIZE)
        const values = sql.join(
          batch.map(
            (u) =>
              sql`(${u.customerId}, ${u.regionName}, ${u.regionId}, ${u.districtName}, ${u.districtId}, ${u.territoryName}, ${u.territoryId})`,
          ),
          sql`, `,
        )
        await db.execute(sql`
          UPDATE customers
          SET
            advance_region_name     = v.region_name,
            advance_region_id       = v.region_id,
            advance_district_name   = v.district_name,
            advance_district_id     = v.district_id,
            advance_territory_name  = v.territory_name,
            advance_territory_id    = v.territory_id
          FROM (VALUES ${values}) AS v(customer_id, region_name, region_id, district_name, district_id, territory_name, territory_id)
          WHERE customers.bat_id = v.customer_id::integer
        `)
        updatedCount += batch.length
      }

      logger.info({ updatedCount }, 'Advance sync complete')
    } finally {
      client.release()
    }
  } catch (error) {
    logger.error({ err: error }, 'Advance sync error')
    throw error
  } finally {
    await advancePool.end()
  }
}

// ─── Periods & targets ───────────────────────────────────────────────────────

export async function getAllPeriods() {
  return db.select().from(periods)
}

export async function findOrCreatePeriod(name: string, startDate: string, endDate: string) {
  const existing = await db
    .select()
    .from(periods)
    .where(and(eq(periods.name, name), eq(periods.startDate, startDate), eq(periods.endDate, endDate)))
    .limit(1)

  if (existing[0]) return existing[0]

  const [created] = await db.insert(periods).values({ name, startDate, endDate }).returning()
  if (!created) throw new Error('Failed to create period')
  return created
}

export async function getTargetsForPeriod(periodId: number) {
  return db.select().from(customerTargets).where(eq(customerTargets.periodId, periodId))
}

export async function createCustomerTarget(customerId: number, periodId: number, target: number) {
  await db.insert(customerTargets).values({ customerId, periodId, target })
}

export async function updateCustomerTarget(customerId: number, periodId: number, target: number) {
  await db
    .update(customerTargets)
    .set({ target })
    .where(and(eq(customerTargets.customerId, customerId), eq(customerTargets.periodId, periodId)))
}

export async function bulkUpsertCustomerTargets(
  rows: { customerId: number; periodId: number; target: number }[],
) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await db
      .insert(customerTargets)
      .values(rows.slice(i, i + CHUNK_SIZE))
      .onConflictDoUpdate({
        target: [customerTargets.customerId, customerTargets.periodId],
        set: { target: sql`excluded.target` },
      })
  }
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function getReportsByType(type: string, page: number, pageSize: number) {
  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(eq(reports.type, type))
      .orderBy(desc(reports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(reports).where(eq(reports.type, type)),
  ])
  return { rows, total: Number(countRow?.total ?? 0) }
}
