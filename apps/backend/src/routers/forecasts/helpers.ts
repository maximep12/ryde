import { forecasts } from '@repo/db'
import { and, asc, count, desc, eq, gt, ilike, lt, or, type SQL } from 'drizzle-orm'
import { db } from '../../db'
import type { ForecastsQuery } from './schemas'

// Map column names to forecast table columns
const sortableColumns = {
  region: forecasts.region,
  country: forecasts.country,
  client: forecasts.client,
  brand: forecasts.brand,
  productDescription: forecasts.productDescription,
  plant: forecasts.plant,
  quantity: forecasts.quantity,
  volume: forecasts.volume,
  sales: forecasts.sales,
  seller: forecasts.seller,
  year: forecasts.year,
  month: forecasts.month,
} as const

export async function getForecasts(query: ForecastsQuery) {
  const {
    page,
    pageSize,
    search,
    regions,
    countries,
    brands,
    plants,
    years,
    months,
    negativeSalesOnly,
    positiveSalesOnly,
    clientStatus,
    sortBy,
    sortOrder,
  } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (regions) {
    const regionList = regions.split(',').filter(Boolean)
    if (regionList.length === 1) {
      conditions.push(eq(forecasts.region, regionList[0]!))
    } else if (regionList.length > 1) {
      conditions.push(or(...regionList.map((r) => eq(forecasts.region, r))))
    }
  }

  if (countries) {
    const countryList = countries.split(',').filter(Boolean)
    if (countryList.length === 1) {
      conditions.push(eq(forecasts.country, countryList[0]!))
    } else if (countryList.length > 1) {
      conditions.push(or(...countryList.map((c) => eq(forecasts.country, c))))
    }
  }

  if (brands) {
    const brandList = brands.split(',').filter(Boolean)
    if (brandList.length === 1) {
      conditions.push(eq(forecasts.brand, brandList[0]!))
    } else if (brandList.length > 1) {
      conditions.push(or(...brandList.map((b) => eq(forecasts.brand, b))))
    }
  }

  if (plants) {
    const plantList = plants.split(',').filter(Boolean)
    if (plantList.length === 1) {
      conditions.push(eq(forecasts.plant, plantList[0]!))
    } else if (plantList.length > 1) {
      conditions.push(or(...plantList.map((p) => eq(forecasts.plant, p))))
    }
  }

  if (years) {
    const yearList = years
      .split(',')
      .filter(Boolean)
      .map((y) => parseInt(y, 10))
    if (yearList.length === 1) {
      conditions.push(eq(forecasts.year, yearList[0]!))
    } else if (yearList.length > 1) {
      conditions.push(or(...yearList.map((y) => eq(forecasts.year, y))))
    }
  }

  if (months) {
    const monthList = months
      .split(',')
      .filter(Boolean)
      .map((m) => parseInt(m, 10))
    if (monthList.length === 1) {
      conditions.push(eq(forecasts.month, monthList[0]!))
    } else if (monthList.length > 1) {
      conditions.push(or(...monthList.map((m) => eq(forecasts.month, m))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(forecasts.client, searchPattern),
        ilike(forecasts.brand, searchPattern),
        ilike(forecasts.productDescription, searchPattern),
        ilike(forecasts.productCode, searchPattern),
        ilike(forecasts.seller, searchPattern),
      ),
    )
  }

  if (negativeSalesOnly) {
    conditions.push(lt(forecasts.sales, '0'))
  }

  if (positiveSalesOnly) {
    conditions.push(gt(forecasts.sales, '0'))
  }

  if (clientStatus === 'active') {
    conditions.push(eq(forecasts.clientActive, 'Y'))
  } else if (clientStatus === 'inactive') {
    conditions.push(eq(forecasts.clientActive, 'N'))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Build order by clause
  let orderByClause: SQL | undefined
  if (sortBy && sortBy in sortableColumns) {
    const column = sortableColumns[sortBy as keyof typeof sortableColumns]
    orderByClause = sortOrder === 'desc' ? desc(column) : asc(column)
  } else {
    orderByClause = asc(forecasts.client)
  }

  // Get items
  const items = await db
    .select()
    .from(forecasts)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db.select({ count: count() }).from(forecasts).where(whereClause)

  const total = countResult?.count ?? 0

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getForecastsFilterOptions() {
  // Get distinct regions with counts
  const regions = await db
    .select({
      value: forecasts.region,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.region)
    .orderBy(forecasts.region)

  // Get distinct countries with counts
  const countries = await db
    .select({
      value: forecasts.country,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.country)
    .orderBy(forecasts.country)

  // Get distinct brands with counts
  const brands = await db
    .select({
      value: forecasts.brand,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.brand)
    .orderBy(forecasts.brand)

  // Get distinct plants with counts
  const plants = await db
    .select({
      value: forecasts.plant,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.plant)
    .orderBy(forecasts.plant)

  // Get distinct years with counts
  const years = await db
    .select({
      value: forecasts.year,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.year)
    .orderBy(forecasts.year)

  // Get distinct months with counts
  const months = await db
    .select({
      value: forecasts.month,
      count: count(),
    })
    .from(forecasts)
    .groupBy(forecasts.month)
    .orderBy(forecasts.month)

  return {
    regions: regions.filter((r) => r.value),
    countries: countries.filter((c) => c.value),
    brands: brands.filter((b) => b.value),
    plants: plants.filter((p) => p.value),
    years: years.filter((y) => y.value !== null),
    months: months.filter((m) => m.value !== null),
  }
}
