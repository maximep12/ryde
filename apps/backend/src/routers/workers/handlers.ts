import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../../index'
import { config } from '../../config'
import { AzureBlobClient } from '../../lib/FileDownloader/azure'
import { AmazonS3Client } from '../../lib/FileDownloader/s3'
import { requireRoles } from '../../middlewares/auth'

const logger = createBaseLogger().child({ module: 'workers' })

const tokenIsValid = requireRoles('admin')

const S3_BUCKET = { name: config.s3.bucket, region: config.s3.region }
const RABBA_S3_PREFIX = config.s3.bannerPrefix('rabba')

const workersRouter = new Hono<{ Variables: ContextVariables }>()

export const workersRouterDefinition = workersRouter

  /**
   * POST /workers/rabba/sync — Sync new Rabba files from Azure Blob (SFTP) to S3
   *
   * Azure Blob is the SFTP landing zone for Rabba (the client connects via SFTP
   * and cannot change their endpoint). This worker copies any files not yet in S3
   * into the ryde-{env}/rabba/ prefix.
   */
  .post('/rabba/sync', tokenIsValid, async (c) => {
    try {
      if (!config.azure.connectionString || !config.azure.rabbaContainer) {
        throw new Error('Azure Blob SFTP not configured')
      }

      const azure = new AzureBlobClient(config.azure.connectionString)
      const s3 = new AmazonS3Client({
        clientInfos: {
          region: S3_BUCKET.region,
          credentials: config.s3.credentials,
        },
      })

      // List what's already in S3 under rabba/
      let existingS3Keys = new Set<string>()
      try {
        const existing = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name, prefix: RABBA_S3_PREFIX })
        existingS3Keys = new Set(existing.map((f) => f.name))
      } catch {
        // Bucket may be empty — that's fine
      }

      // List all blobs in Azure
      const blobs = await azure.getAllBlobs({ containerName: config.azure.rabbaContainer })

      let synced = 0
      let skipped = 0

      for (const blob of blobs) {
        const s3Key = `${RABBA_S3_PREFIX}${blob.name}`

        if (existingS3Keys.has(s3Key)) {
          skipped++
          continue
        }

        // Stream blob content directly into S3
        const content = await azure.getBlobContent({ containerName: config.azure.rabbaContainer, blobName: blob.name })
        await s3.uploadFile({ key: s3Key, body: Buffer.from(content), bucket: S3_BUCKET.name })

        logger.info({ blob: blob.name, s3Key }, 'Synced Rabba file to S3')
        synced++
      }

      return c.json({ synced, skipped })
    } catch (error) {
      const err = error as { message?: string }
      logger.error({ err }, 'Rabba sync error')
      throw new HTTPException(400, { message: err.message ?? 'Sync failed' })
    }
  })
