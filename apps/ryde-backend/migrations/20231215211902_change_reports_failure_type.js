exports.up = async (knex) => {
  await knex.raw(`
  ALTER TABLE reports ALTER COLUMN failure TYPE text;
`)
}

exports.down = async (knex) => {
  await knex.raw(`
  ALTER TABLE reports ALTER COLUMN failure TYPE VARCHAR(255);
`)
}
