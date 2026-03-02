import pg from 'db/pg'
import { parse } from 'csv-parse'
import { from as copyFrom } from 'pg-copy-streams'
import snakeCase from 'lodash/snakeCase'

export async function saveDataUsingTempTable({
  csvStream,
  validateRow,
  tempTable,
  insertionTable,
  tempTableAttrList,
  validateAndInsert,
  fileDelimiter,
  additionalColumns = [],
}) {
  await new Promise((resolve, reject) => {
    pg.connect(async function (err, client, releaseClient) {
      if (err) {
        console.log(JSON.stringify(err))
        throw err
      }

      await client.query(`CREATE TEMP TABLE ${tempTable} AS (SELECT * FROM ${insertionTable} LIMIT 0)`)
      await client.query(`ALTER TABLE ${tempTable} ADD COLUMN row INTEGER`)
      await client.query(additionalColumns.map((extra) => `ALTER TABLE ${tempTable} ADD COLUMN ${extra};`).join(' '))

      const pgStream = client.query(
        copyFrom(
          `COPY ${tempTable} (${tempTableAttrList}) FROM STDIN WITH CSV DELIMITER E'\t' QUOTE E'\"' NULL ''`, // eslint-disable-line no-useless-escape
        ),
      )

      const parserOptions = {
        skip_empty_lines: true,
        relax: true,
        trim: true,
        delimiter: fileDelimiter,
        columns: (headers) => {
          return headers.map((col) => col && snakeCase(col.split('(')[0]))
        },
        on_record: validateRow,
        cast: (value, { column }) => {
          if (Number.isInteger(column)) return value // headers will have column as their index
          if (!value || !value.trim()) return null

          if (!isNaN(Number(value))) return Number(value)
          return value
        },
      }

      function handleError(err) {
        csvStream.destroy()
        releaseClient(err)
        reject(err)
      }

      const parser = parse(parserOptions)

      parser.on('error', handleError)

      pgStream.on('error', handleError)

      pgStream.on('finish', async () => {
        csvStream.destroy()

        try {
          // You NEED to reuse the same client
          await validateAndInsert({ client, tempTable })
          resolve()
        } catch (err) {
          csvStream.destroy()
          releaseClient(err)
          reject(err)
        }
        releaseClient()
      })
      csvStream.on('error', handleError)
      csvStream.pipe(parser).pipe(pgStream)
    })
  })
}
