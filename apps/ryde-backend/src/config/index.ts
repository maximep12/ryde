import { env } from '../lib/utils/env'

export const config = {
  databaseUrl: env.DATABASE_URL,
  s3: {
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    bucket: env.S3_BUCKET_NAME,
    region: env.S3_REGION,
    env: env.S3_ENV,
    endpoint: env.S3_ENDPOINT,
    /** S3 key prefix for banner files: {env}/banners/{slug}/ */
    bannerPrefix: (slug: string) => `${env.S3_ENV}/banners/${slug}/`,
    /** S3 key prefix for typed files: {env}/{type}/ */
    typePrefix: (type: string) => `${env.S3_ENV}/${type}/`,
  },
  azure: {
    connectionString: env.SFTP_CONNECTION_STRING,
    rabbaContainer: env.RABBA_SFTP_CONTAINER,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  tokens: {
    admin: env.ADMIN_TOKEN,
    trade: env.TRADE_TOKEN,
    rabba: env.RABBA_TOKEN,
    circleK: env.CIRCLE_K_TOKEN,
    slack: env.SLACK_TOKEN,
  },
  metabaseSecretKey: env.METABASE_SECRET_KEY,
  frontendUrl: env.FRONTEND_URL,
  redisUrl: env.REDIS_URL,
}
