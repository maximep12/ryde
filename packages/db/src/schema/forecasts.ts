import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { decimal, index, integer, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// FORECASTS (Sales forecasts by country, client, and product)
// ============================================================================

export const forecasts = app.table(
  'forecasts',
  {
    id: serial('id').primaryKey(),
    country: varchar('country', { length: 10 }).notNull(), // CAN or US
    region: varchar('region', { length: 100 }),
    client: varchar('client', { length: 255 }),
    brandType: varchar('brand_type', { length: 100 }),
    brand: varchar('brand', { length: 100 }),
    productDescription: varchar('product_description', { length: 255 }),
    format: varchar('format', { length: 50 }),
    year: integer('year'),
    productCode: varchar('product_code', { length: 50 }),
    month: integer('month'),
    quantity: integer('quantity').default(0),
    volume: decimal('volume', { precision: 12, scale: 3 }),
    sales: decimal('sales', { precision: 12, scale: 2 }),
    seller: varchar('seller', { length: 100 }),
    clientActive: varchar('client_active', { length: 20 }),
    plant: varchar('plant', { length: 100 }),
    ...timestamps,
  },
  (table) => [
    index('forecasts_country_idx').on(table.country),
    index('forecasts_client_idx').on(table.client),
    index('forecasts_brand_idx').on(table.brand),
    index('forecasts_product_code_idx').on(table.productCode),
    index('forecasts_year_idx').on(table.year),
    index('forecasts_month_idx').on(table.month),
    index('forecasts_plant_idx').on(table.plant),
  ],
)

export type Forecast = InferSelectModel<typeof forecasts>
export type NewForecast = InferInsertModel<typeof forecasts>
