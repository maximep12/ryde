exports.up = async (knex) => {
  await knex.raw(`
  ALTER TABLE report_status ALTER COLUMN report_start TYPE timestamp;
  ALTER TABLE report_status ALTER COLUMN report_end TYPE timestamp;
  ALTER TABLE report_status RENAME TO reports;
`)
}

exports.down = async (knex) => {
  await knex.raw(`
  ALTER TABLE reports ALTER COLUMN report_start TYPE date;
  ALTER TABLE reports ALTER COLUMN report_end TYPE date;
  ALTER TABLE reports RENAME TO report_status;
`)
}
