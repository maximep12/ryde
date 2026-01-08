import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { date, decimal, index, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// OPEN PURCHASE ORDERS (Open PO data)
// ============================================================================

export const openPurchaseOrders = app.table(
  'open_purchase_orders',
  {
    id: serial('id').primaryKey(),
    createdOn: date('created_on'),
    nextScheduleLineDate: date('next_schedule_line_date'),
    createdBy: varchar('created_by', { length: 100 }),
    purchasingGroupName: varchar('purchasing_group_name', { length: 100 }),
    purchaseOrder: varchar('purchase_order', { length: 50 }).notNull(),
    material: varchar('material', { length: 255 }),
    materialNumber: varchar('material_number', { length: 50 }),
    plantName: varchar('plant_name', { length: 100 }),
    supplier: varchar('supplier', { length: 255 }),
    quantityToBeDelivered: decimal('quantity_to_be_delivered', { precision: 12, scale: 2 }),
    orderQuantity: decimal('order_quantity', { precision: 12, scale: 2 }),
    orderType: varchar('order_type', { length: 50 }),
    ...timestamps,
  },
  (table) => [
    index('open_purchase_orders_purchase_order_idx').on(table.purchaseOrder),
    index('open_purchase_orders_plant_name_idx').on(table.plantName),
    index('open_purchase_orders_supplier_idx').on(table.supplier),
    index('open_purchase_orders_order_type_idx').on(table.orderType),
    index('open_purchase_orders_next_schedule_line_date_idx').on(table.nextScheduleLineDate),
  ],
)

export type OpenPurchaseOrder = InferSelectModel<typeof openPurchaseOrders>
export type NewOpenPurchaseOrder = InferInsertModel<typeof openPurchaseOrders>
