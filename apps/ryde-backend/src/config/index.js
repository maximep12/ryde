import { APP_ROLES } from 'utils/constants'

require('dotenv').config()
const parse = require('pg-connection-string').parse

export default {
  port: process.env.PORT ? +process.env.PORT : 5000,
  environment: process.env.NODE_ENV || 'production',
  // APP STORAGE
  pg: parse(process.env.DATABASE_URL),
  database: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
    },
    pool: { min: 0, max: 40 },
    idleTimeoutMillis: process.env.KNEX_TIMEOUT ? +process.env.KNEX_TIMEOUT : 60000,
    debug: false,
  },
  amazonS3: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    buckets: {
      circleK: { name: process.env.S3_CIRCLEK_BUCKET_NAME, region: process.env.S3_CIRCLEK_REGION },
      rabba: { name: process.env.S3_RABBA_BUCKET_NAME, region: process.env.S3_REGION },
      global: { name: process.env.S3_GLOBAL_NAME, region: process.env.S3_REGION },
    },
  },
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  tokens: {
    [APP_ROLES.admin]: process.env.ADMIN_TOKEN,
    [APP_ROLES.trade]: process.env.TRADE_TOKEN,
    [APP_ROLES.rabba]: process.env.RABBA_TOKEN,
    [APP_ROLES.circleK]: process.env.CIRCLE_K_TOKEN,
    slack: process.env.SLACK_TOKEN,
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  metabaseSecretKey: process.env.METABASE_SECRET_KEY,
  sftpConnectionString: process.env.SFTP_CONNECTION_STRING,
  rabbaContainer: process.env.RABBA_SFTP_CONTAINER,
}
