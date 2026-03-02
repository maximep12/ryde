import { relations } from 'drizzle-orm/relations'
import { amazonBundles, amazonBundlesOrders, amazonOrders, amazonOrdersContent } from './amazon'
import { competitorOrders, competitorSales } from './competitors'
import {
  customerProductStatus,
  customerTargets,
  customerTerritories,
  customersUpc,
  periods,
} from './customer-data'
import { customers } from './customers'
import { dataImports, reports } from './data-imports'
import { districtRegions, districts, regions, territories, territoryDistricts } from './geography'
import { orders, ordersContent } from './orders'
import { forecasts, productFormats, products, productSkus } from './products'
import { replenOrders, replenOrdersConfirmed, replenOrdersContent } from './replen'

export const amazonBundlesOrdersRelations = relations(amazonBundlesOrders, ({ one }) => ({
  amazonBundle: one(amazonBundles, {
    fields: [amazonBundlesOrders.asin],
    references: [amazonBundles.asin],
  }),
}))

export const amazonBundlesRelations = relations(amazonBundles, ({ many }) => ({
  amazonBundlesOrders: many(amazonBundlesOrders),
}))

export const amazonOrdersContentRelations = relations(amazonOrdersContent, ({ one }) => ({
  amazonOrder: one(amazonOrders, {
    fields: [amazonOrdersContent.orderId],
    references: [amazonOrders.orderId],
  }),
  productSkus: one(productSkus, {
    fields: [amazonOrdersContent.sku],
    references: [productSkus.sku],
  }),
}))

export const amazonOrdersRelations = relations(amazonOrders, ({ many }) => ({
  amazonOrdersContents: many(amazonOrdersContent),
}))

export const productSkusRelations = relations(productSkus, ({ one, many }) => ({
  amazonOrdersContents: many(amazonOrdersContent),
  productFormat: one(productFormats, {
    fields: [productSkus.formatId],
    references: [productFormats.id],
  }),
  product: one(products, {
    fields: [productSkus.productId],
    references: [products.id],
  }),
  ordersContents: many(ordersContent),
  forecasts: many(forecasts),
  replenOrdersConfirmeds: many(replenOrdersConfirmed),
  replenOrdersContents: many(replenOrdersContent),
}))

export const productFormatsRelations = relations(productFormats, ({ one, many }) => ({
  productSkuses: many(productSkus),
  product: one(products, {
    fields: [productFormats.productId],
    references: [products.id],
  }),
  customersUpcs: many(customersUpc),
}))

export const productsRelations = relations(products, ({ many }) => ({
  productSkuses: many(productSkus),
  productFormats: many(productFormats),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  ordersContents: many(ordersContent),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  orders: many(orders),
  customer: one(customers, {
    fields: [customers.distributionCenter],
    references: [customers.id],
    relationName: 'customers_distributionCenter_customers_id',
  }),
  customers: many(customers, {
    relationName: 'customers_distributionCenter_customers_id',
  }),
  competitorOrders: many(competitorOrders),
  competitorSales: many(competitorSales),
  customerProductStatuses: many(customerProductStatus),
  customerTargets: many(customerTargets),
  customerTerritories: many(customerTerritories),
  replenOrdersConfirmeds: many(replenOrdersConfirmed),
  replenOrders: many(replenOrders),
}))

export const ordersContentRelations = relations(ordersContent, ({ one }) => ({
  order: one(orders, {
    fields: [ordersContent.billingDocumentId],
    references: [orders.id],
  }),
  productSkus: one(productSkus, {
    fields: [ordersContent.sku],
    references: [productSkus.sku],
  }),
}))

export const competitorOrdersRelations = relations(competitorOrders, ({ one }) => ({
  customer: one(customers, {
    fields: [competitorOrders.customerId],
    references: [customers.id],
  }),
}))

export const competitorSalesRelations = relations(competitorSales, ({ one }) => ({
  customer: one(customers, {
    fields: [competitorSales.customerId],
    references: [customers.id],
  }),
  dataImport: one(dataImports, {
    fields: [competitorSales.fileImport],
    references: [dataImports.id],
  }),
}))

export const dataImportsRelations = relations(dataImports, ({ many }) => ({
  competitorSales: many(competitorSales),
  reports: many(reports),
}))

export const customerProductStatusRelations = relations(customerProductStatus, ({ one }) => ({
  customer: one(customers, {
    fields: [customerProductStatus.customerId],
    references: [customers.id],
  }),
}))

export const customerTargetsRelations = relations(customerTargets, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTargets.customerId],
    references: [customers.id],
  }),
  period: one(periods, {
    fields: [customerTargets.periodId],
    references: [periods.id],
  }),
}))

export const periodsRelations = relations(periods, ({ many }) => ({
  customerTargets: many(customerTargets),
}))

export const customerTerritoriesRelations = relations(customerTerritories, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTerritories.customerId],
    references: [customers.id],
  }),
  territory: one(territories, {
    fields: [customerTerritories.territoryId],
    references: [territories.id],
  }),
}))

export const territoriesRelations = relations(territories, ({ many }) => ({
  customerTerritories: many(customerTerritories),
  territoryDistricts: many(territoryDistricts),
}))

export const customersUpcRelations = relations(customersUpc, ({ one }) => ({
  productFormat: one(productFormats, {
    fields: [customersUpc.formatId],
    references: [productFormats.id],
  }),
}))

export const districtRegionsRelations = relations(districtRegions, ({ one }) => ({
  district: one(districts, {
    fields: [districtRegions.districtId],
    references: [districts.id],
  }),
  region: one(regions, {
    fields: [districtRegions.regionId],
    references: [regions.id],
  }),
}))

export const districtsRelations = relations(districts, ({ many }) => ({
  districtRegions: many(districtRegions),
  territoryDistricts: many(territoryDistricts),
}))

export const regionsRelations = relations(regions, ({ many }) => ({
  districtRegions: many(districtRegions),
}))

export const forecastsRelations = relations(forecasts, ({ one }) => ({
  productSkus: one(productSkus, {
    fields: [forecasts.sku],
    references: [productSkus.sku],
  }),
}))

export const replenOrdersConfirmedRelations = relations(replenOrdersConfirmed, ({ one }) => ({
  customer: one(customers, {
    fields: [replenOrdersConfirmed.customerId],
    references: [customers.id],
  }),
  productSkus: one(productSkus, {
    fields: [replenOrdersConfirmed.sku],
    references: [productSkus.sku],
  }),
}))

export const replenOrdersRelations = relations(replenOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [replenOrders.customerId],
    references: [customers.id],
  }),
  replenOrdersContents: many(replenOrdersContent),
}))

export const replenOrdersContentRelations = relations(replenOrdersContent, ({ one }) => ({
  replenOrder: one(replenOrders, {
    fields: [replenOrdersContent.billingDocumentId],
    references: [replenOrders.billingDocumentId],
  }),
  productSkus: one(productSkus, {
    fields: [replenOrdersContent.sku],
    references: [productSkus.sku],
  }),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
  dataImport: one(dataImports, {
    fields: [reports.dataImportId],
    references: [dataImports.id],
  }),
}))

export const territoryDistrictsRelations = relations(territoryDistricts, ({ one }) => ({
  district: one(districts, {
    fields: [territoryDistricts.districtId],
    references: [districts.id],
  }),
  territory: one(territories, {
    fields: [territoryDistricts.territoryId],
    references: [territories.id],
  }),
}))
