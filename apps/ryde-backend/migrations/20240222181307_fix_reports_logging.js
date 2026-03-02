exports.up = async (knex) => {
  await knex.schema.alterTable('reports', (t) => {
    t.string('file_name')
    t.integer('data_import_id').references('data_imports.id')
    t.boolean('notif_sent')
  })

  await knex.raw(`
    UPDATE reports 
    SET file_name = extra->>'s3FileName' 
    Where extra->>'s3FileName' is not null;
  `)

  await knex.schema.alterTable('data_imports', (t) => {
    t.dropColumn('name')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('reports', (t) => {
    t.dropColumn('file_name')
    t.dropColumn('data_import_id')
    t.dropColumn('notif_sent')
  })

  await knex.schema.alterTable('data_imports', (t) => {
    t.string('name')
  })
}
