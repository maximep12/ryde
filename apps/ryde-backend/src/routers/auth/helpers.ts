import { dataImports, type Role, replenOrders, replenOrdersConfirmed, reports, users } from '@repo/db'
import { desc, eq, InferSelectModel } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import jwt from 'jsonwebtoken'
import { db } from '../../db'
import { env } from '../../lib/utils/env'

export const METABASE_DASHBOARDS = {
  commercial: { dashboardNumber: 113 },
  sellout: { dashboardNumber: 116 },
  inventory: { dashboardNumber: 117 },
  reports: { dashboardNumber: 118 },
  amazon: { dashboardNumber: 119 },
} as const

export const BANNERS = {
  CIRCLE_K_GLOBAL: 'CIRCLE K ON',
  RABBA: 'Rabba',
} as const

export const REPORTS_AMAZON = 'AMAZON_ORDERS'

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user
}

export async function countUsers() {
  const result = await db.select().from(users)
  return result.length
}

export async function createUser(data: {
  id: string
  email: string
  passwordHash?: string
  role?: Role
}) {
  const [user] = await db.insert(users).values(data).returning()
  if (!user) throw new HTTPException(500, { message: 'Failed to create user.' })
  return user
}

export async function updateUser(
  id: string,
  data: Partial<InferSelectModel<typeof users>>,
) {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return user
}

export function generateJWT(payload: { id: string; email: string; role: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
}

export function resolveStaticToken(token: string): string | null {
  const staticTokens: Record<string, string> = {
    admin: env.ADMIN_TOKEN,
    trade: env.TRADE_TOKEN,
    rabba: env.RABBA_TOKEN,
    'circle k': env.CIRCLE_K_TOKEN,
  }

  const role = Object.entries(staticTokens).find(([, t]) => t && t === token)?.[0]
  return role ?? null
}

export async function getMetabaseUpdates() {
  try {
    const [latestSellIn] = await db
      .select()
      .from(replenOrders)
      .orderBy(desc(replenOrders.billingDate))
      .limit(1)

    const [latestConfirmed] = await db
      .select()
      .from(replenOrdersConfirmed)
      .orderBy(desc(replenOrdersConfirmed.documentDate))
      .limit(1)

    const [latestCircleK] = await db
      .select()
      .from(dataImports)
      .where(eq(dataImports.fileOrigin, BANNERS.CIRCLE_K_GLOBAL))
      .orderBy(desc(dataImports.periodEnd))
      .limit(1)

    const [latestRabba] = await db
      .select()
      .from(dataImports)
      .where(eq(dataImports.fileOrigin, BANNERS.RABBA))
      .orderBy(desc(dataImports.periodEnd))
      .limit(1)

    const [latestAmazon] = await db
      .select()
      .from(reports)
      .where(eq(reports.type, REPORTS_AMAZON))
      .orderBy(desc(reports.createdAt))
      .limit(1)

    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return null
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    }

    return {
      sellIn: latestSellIn?.billingDate ? formatDate(latestSellIn.billingDate) : null,
      confirmed: latestConfirmed?.documentDate ? formatDate(latestConfirmed.documentDate) : null,
      sellOut: {
        [BANNERS.CIRCLE_K_GLOBAL]: latestCircleK?.periodEnd ? formatDate(latestCircleK.periodEnd) : null,
        [BANNERS.RABBA.toUpperCase()]: latestRabba?.periodEnd ? formatDate(latestRabba.periodEnd) : null,
      },
      amazon: latestAmazon?.createdAt ? formatDate(latestAmazon.createdAt) : null,
    }
  } catch {
    return null
  }
}

export function generateMetabaseDashboardLinks() {
  if (!env.METABASE_SECRET_KEY) return {}

  const metabaseUrl = 'https://ryde-metabase.v7apps.com'

  return Object.entries(METABASE_DASHBOARDS).reduce<Record<string, string>>(
    (acc, [dashboard, infos]) => {
      const payload = {
        resource: { dashboard: infos.dashboardNumber },
        params: {},
      }
      const token = jwt.sign(payload, env.METABASE_SECRET_KEY, { expiresIn: '8h' })
      const url = `${metabaseUrl}/embed/dashboard/${token}#bordered=true&titled=true`
      return { ...acc, [dashboard]: url }
    },
    {},
  )
}
