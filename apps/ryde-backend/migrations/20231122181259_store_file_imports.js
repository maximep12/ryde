exports.up = async (knex) => {
  await knex.schema.createTable('data_imports', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.date('period_start')
    t.date('period_end')
    t.integer('weeks_included')
    t.integer('ryde_week')
    t.string('file_origin')

    t.timestamps(false, true)
  })

  const competitorSales = await knex('competitor_sales').distinct('period_start', 'period_end')

  const firstImportStart = new Date('2023-10-31')
  const firstImportEnd = new Date('2023-11-05')
  const secondImportStart = new Date('2023-11-06')
  const secondImportEnd = new Date('2023-11-12')
  const thirdImportStart = new Date('2023-11-13')
  const thirdImportEnd = new Date('2023-11-19')
  const files = competitorSales.filter((cs) => {
    return (
      (new Date(cs.period_start).getUTCDate() === firstImportStart.getUTCDate() &&
        new Date(cs.period_end).getUTCDate() === firstImportEnd.getUTCDate()) ||
      (new Date(cs.period_start).getUTCDate() === secondImportStart.getUTCDate() &&
        new Date(cs.period_end).getUTCDate() === secondImportEnd.getUTCDate()) ||
      (new Date(cs.period_start).getUTCDate() === thirdImportStart.getUTCDate() &&
        new Date(cs.period_end).getUTCDate() === thirdImportEnd.getUTCDate())
    )
  })

  const dataImports = await Promise.all(
    files.map(async (cs) => {
      const { period_start: periodStart, period_end: periodEnd } = cs

      const file = {
        period_start: periodStart,
        period_end: periodEnd,
        file_origin: 'CIRCLE K ON',
      }

      if (new Date(periodStart).getUTCDate() === new Date('2023-10-31').getUTCDate()) {
        file.name = 'RydeSalesReportFW27v3.xlsx'
        file.ryde_week = 0
      }
      if (new Date(periodStart).getUTCDate() === new Date('2023-11-06').getUTCDate()) {
        file.name = 'RydeSalesReportFW28.xlsx'
        file.ryde_week = 1
      }
      if (new Date(periodStart).getUTCDate() === new Date('2023-11-13').getUTCDate()) {
        file.name = 'RydeSalesReportFW29.xlsx'
        file.ryde_week = 2
      }

      file.weeks_included = Math.round((new Date(periodEnd) - new Date(periodStart)) / (7 * 24 * 60 * 60 * 1000))
      const newImport = await knex('data_imports').insert(file).returning('*')
      return newImport[0]
    }),
  )

  await knex.schema.alterTable('competitor_sales', (t) => {
    t.integer('file_import').references('data_imports.id')
  })

  const erpStats = await knex('competitor_sales').select('*')
  await Promise.all(
    erpStats.map(async (cs) => {
      const linkedFile = dataImports.find((di) => {
        return di.period_start.getUTCDate() === cs.period_start.getUTCDate()
      })

      return await knex('competitor_sales').update({ file_import: linkedFile.id }).where({ id: cs.id }).returning('*')
    }),
  )

  await knex.schema.alterTable('competitor_sales', (t) => {
    t.dropColumn('period_start')
    t.dropColumn('period_end')
    t.dropColumn('file_origin')
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('data_imports')

  await knex.schema.alterTable('competitor_sales', (t) => {
    t.date('period_start')
    t.date('period_end')
    t.string('file_origin')

    t.dropColumn('file_import')
  })
}
