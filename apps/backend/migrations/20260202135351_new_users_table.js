exports.up = async (knex) => {
  await knex.schema.createTable('user_roles', (t) => {
    t.increments('id').primary().notNullable()
    t.string('role').notNullable()

    t.unique('role')
    t.timestamps(false, true)
  })

  await knex('user_roles').insert([{ role: 'Admin' }, { role: 'Data manager' }, { role: 'Trade' }, { role: 'Pending' }])
  const pendingRole = await knex('user_roles').where('role', 'Pending').first()

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary().notNullable()
    t.string('email').notNullable().unique()
    t.string('password_hash').unique()
    t.string('token')

    t.integer('role_id').references('user_roles.id').notNullable().defaultTo(pendingRole.id)
    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('users')
  await knex.schema.dropTable('user_roles')
}
