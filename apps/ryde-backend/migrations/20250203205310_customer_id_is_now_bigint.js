/* eslint-disable no-tabs */
const customersVpoQuery = `
with known_sales as (
	select
		competitor_sales.customer_id,
		data_imports.ryde_week,
		competitor_sales.ryde_units as velocity
	from competitor_sales
	left join data_imports on competitor_sales.file_import = data_imports.id
	order by competitor_sales.customer_id, data_imports.ryde_week
),
no_sell_out_customers as (
	select
		customers.id as customer_id
	from customers
	where id not in (select customer_id from known_sales)
),
unknown_velocity_customers_sell_in_week as (
	select
		customer_id,
		min(replen_orders.billing_date) as first_sell_in
	from replen_orders
	where customer_id in (select customer_id from no_sell_out_customers)
	group by customer_id
	order by customer_id
),
ryde_week_first_sell_in as (
	select
		unknown_velocity_customers_sell_in_week.*,
		ryde_week
	from unknown_velocity_customers_sell_in_week
	left join data_imports on data_imports.period_start <= unknown_velocity_customers_sell_in_week.first_sell_in and data_imports.period_end >= unknown_velocity_customers_sell_in_week.first_sell_in
),
customer_fake_sales as (
	select 
		customer_id,
		GENERATE_SERIES(ryde_week_first_sell_in.ryde_week, (SELECT max(ryde_week) from data_imports))as ryde_week,
		8 as velocity
	from ryde_week_first_sell_in
)
select * from known_sales
union
select * from customer_fake_sales
order by customer_id, ryde_week
`

exports.up = async function (knex) {
  await knex.schema.dropMaterializedViewIfExists('customers_velocity')

  await knex.schema.raw(`
    ALTER TABLE replen_orders ALTER COLUMN customer_id TYPE BIGINT;
    ALTER TABLE replen_orders_confirmed ALTER COLUMN customer_id TYPE BIGINT;
    ALTER TABLE orders ALTER COLUMN customer_id TYPE BIGINT;
    ALTER TABLE competitor_sales ALTER COLUMN customer_id TYPE BIGINT;
    ALTER TABLE customer_product_status ALTER COLUMN customer_id TYPE BIGINT;
  `)

  // Alter the primary key column
  await knex.schema.raw(`ALTER TABLE customers ALTER COLUMN id TYPE BIGINT`)

  // Apply other modifications
  await knex.schema.alterTable('customers', (t) => {
    t.string('cluster')
    t.biginteger('distribution_center').references('customers.id')
  })

  await knex.schema.createMaterializedView('customers_velocity', function (view) {
    view.columns(['customer_id', 'ryde_week', 'velocity'])
    view.as(knex.raw(customersVpoQuery))
  })
}

exports.down = async function (knex) {
  // Can't take it down since it would remove existing customers
}
