/**
 * Migration script:
 *   STEP 1 — Sync Rabba files from Azure Blob (SFTP) → S3
 *   STEP 1b — Copy Circle K files from real AWS S3 → local S3 (when S3_ENDPOINT is set)
 *             OR copy from S3 root → qa/banners/circlek/ (same bucket, no endpoint)
 *   STEP 2 — Import all S3 banner files into the uploaded_files table
 *
 * Key structure: {S3_ENV}/banners/{banner}/{filename}
 * Original storage dates are preserved.
 *
 * Run with: pnpm exec tsx src/scripts/migrate-files-to-db.ts
 *
 * Circle K AWS source (set these env vars to pull from real AWS into LocalStack):
 *   AWS_CK_ACCESS_KEY_ID, AWS_CK_SECRET_ACCESS_KEY, AWS_CK_BUCKET (default: ryde-circlek)
 */

import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import * as schema from '@repo/db'
import { uploadedFiles } from '@repo/db'
import { config as loadEnv } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { config } from '../config'
import { AzureBlobClient } from '../lib/FileDownloader/azure'
import { AmazonS3Client } from '../lib/FileDownloader/s3'

loadEnv({ path: '../../../.env' })

const db = drizzle(config.databaseUrl, { schema })

const S3_BUCKET = { name: config.s3.bucket, region: config.s3.region }

const s3 = new AmazonS3Client({
  clientInfos: { region: S3_BUCKET.region, credentials: config.s3.credentials, endpoint: config.s3.endpoint },
})

// Real AWS S3 client for pulling Circle K files when running against LocalStack
const AWS_CK_ACCESS_KEY_ID = process.env.AWS_CK_ACCESS_KEY_ID
const AWS_CK_SECRET_ACCESS_KEY = process.env.AWS_CK_SECRET_ACCESS_KEY
const AWS_CK_BUCKET = process.env.AWS_CK_BUCKET ?? 'ryde-circlek'
const awsS3 =
  AWS_CK_ACCESS_KEY_ID && AWS_CK_SECRET_ACCESS_KEY
    ? new AmazonS3Client({
        clientInfos: {
          region: S3_BUCKET.region,
          credentials: { accessKeyId: AWS_CK_ACCESS_KEY_ID, secretAccessKey: AWS_CK_SECRET_ACCESS_KEY },
        },
      })
    : null

const BANNERS: { banner: string; slug: string }[] = [
  { banner: 'circle_k', slug: 'circlek' },
  { banner: 'rabba', slug: 'rabba' },
]

// ─── STEP 1: Sync Azure Blob (Rabba SFTP) → S3 ───────────────────────────────

async function syncAzureToS3(): Promise<Map<string, Date>> {
  const azureDates = new Map<string, Date>()

  if (!config.azure.connectionString || !config.azure.rabbaContainer) {
    console.log('Skipping Azure → S3 sync: not configured\n')
    return azureDates
  }

  console.log(`Syncing Rabba files from Azure Blob (${config.azure.rabbaContainer}) → S3...\n`)

  const azure = new AzureBlobClient(config.azure.connectionString)
  const prefix = config.s3.bannerPrefix('rabba')

  let existingS3Keys = new Set<string>()
  try {
    const existing = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name, prefix })
    existingS3Keys = new Set(existing.map((f) => f.name))
  } catch {
    // Bucket empty — that's fine
  }

  const blobs = await azure.getAllBlobs({ containerName: config.azure.rabbaContainer })
  let synced = 0
  let skipped = 0

  for (const blob of blobs) {
    const s3Key = `${prefix}${blob.name}`
    azureDates.set(s3Key, blob.date)
    if (existingS3Keys.has(s3Key)) {
      skipped++
      continue
    }
    const content = await azure.getBlobContent({ containerName: config.azure.rabbaContainer, blobName: blob.name })
    await s3.uploadFile({ key: s3Key, body: Buffer.from(content), bucket: S3_BUCKET.name })
    console.log(`  [Azure → S3] ${s3Key}`)
    synced++
  }

  console.log(`  → ${synced} files synced, ${skipped} already in S3\n`)
  return azureDates
}

// ─── STEP 1b: Copy Circle K files → local S3 banner prefix ──────────────────
// If awsS3 is configured, pulls from real AWS bucket into the local S3.
// Otherwise, copies from the root of the same bucket (same-bucket mode).

async function syncCircleKRootToPath(): Promise<Map<string, Date>> {
  const originalDates = new Map<string, Date>()
  const prefix = config.s3.bannerPrefix('circlek')

  if (awsS3) {
    console.log(`Pulling Circle K files from real AWS s3://${AWS_CK_BUCKET}/ → local ${prefix}...\n`)

    let allFiles: { name: string; date: Date }[]
    try {
      allFiles = await awsS3.getAllFilesInContainer({ bucket: AWS_CK_BUCKET })
    } catch {
      console.log('  No files found in AWS bucket root\n')
      return originalDates
    }

    const sourceFiles = allFiles.filter((f) => !f.name.includes('/'))

    let existingKeys = new Set<string>()
    try {
      const existing = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name, prefix })
      existingKeys = new Set(existing.map((f) => f.name))
    } catch {
      // Prefix empty — that's fine
    }

    let copied = 0
    let skipped = 0

    for (const file of sourceFiles) {
      const destKey = `${prefix}${file.name}`
      originalDates.set(destKey, file.date)
      if (existingKeys.has(destKey)) {
        skipped++
        continue
      }
      const stream = await awsS3.getS3Content({ bucket: AWS_CK_BUCKET, key: file.name })
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      await s3.uploadFile({ key: destKey, body: Buffer.concat(chunks), bucket: S3_BUCKET.name })
      console.log(`  [AWS → LocalStack] ${destKey}`)
      copied++
    }

    console.log(`  → ${copied} files copied, ${skipped} already in place\n`)
    return originalDates
  }

  console.log(`Copying Circle K files from s3://${S3_BUCKET.name}/ root → ${prefix}...\n`)

  let allFiles: { name: string; date: Date }[]
  try {
    allFiles = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name })
  } catch {
    console.log('  No files found in bucket root\n')
    return originalDates
  }

  const rootFiles = allFiles.filter((f) => !f.name.includes('/'))

  let existingKeys = new Set<string>()
  try {
    const existing = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name, prefix })
    existingKeys = new Set(existing.map((f) => f.name))
  } catch {
    // Prefix empty — that's fine
  }

  let copied = 0
  let skipped = 0

  for (const file of rootFiles) {
    const destKey = `${prefix}${file.name}`
    originalDates.set(destKey, file.date)
    if (existingKeys.has(destKey)) {
      skipped++
      continue
    }
    await s3.copyFile({ sourceBucket: S3_BUCKET.name, sourceKey: file.name, destBucket: S3_BUCKET.name, destKey })
    console.log(`  [S3 root → S3] ${destKey}`)
    copied++
  }

  console.log(`  → ${copied} files copied, ${skipped} already in place\n`)
  return originalDates
}

// ─── STEP 2: Import S3 files into DB ─────────────────────────────────────────

async function migrateBannerFiles(banner: string, slug: string, azureDates: Map<string, Date>) {
  const prefix = config.s3.bannerPrefix(slug)

  let files: { name: string; date: Date }[]
  try {
    files = await s3.getAllFilesInContainer({ bucket: S3_BUCKET.name, prefix })
  } catch {
    console.log(`  No files found at s3://${S3_BUCKET.name}/${prefix}`)
    return 0
  }

  let count = 0
  for (const file of files) {
    const downloadPath = `/download/${banner}/${encodeURIComponent(file.name)}`
    const storedAt = azureDates.get(file.name) ?? file.date

    await db
      .insert(uploadedFiles)
      .values({ type: 'sell-out', banner, name: file.name, downloadPath, by: 'sftp', storedAt })
      .onConflictDoNothing()

    count++
    console.log(`  [DB] ${file.name} (${storedAt.toISOString()}) — by: sftp`)
  }
  return count
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function ensureBucketExists() {
  const client = new S3Client({
    region: S3_BUCKET.region,
    credentials: config.s3.credentials,
    ...(config.s3.endpoint ? { endpoint: config.s3.endpoint, forcePathStyle: true } : {}),
  })
  try {
    await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET.name }))
    console.log(`  Created bucket: ${S3_BUCKET.name}\n`)
  } catch (err) {
    const e = err as { Code?: string; name?: string }
    if (e.Code === 'BucketAlreadyOwnedByYou' || e.name === 'BucketAlreadyOwnedByYou' || e.Code === 'AccessDenied') {
      console.log(`  Bucket already exists: ${S3_BUCKET.name}\n`)
    } else {
      throw err
    }
  }
}

async function main() {
  console.log(`\n=== File Migration (bucket: ${S3_BUCKET.name}, env: ${config.s3.env}) ===\n`)

  console.log('Ensuring S3 bucket exists...')
  await ensureBucketExists()

  const azureDates = await syncAzureToS3()
  const circlekDates = await syncCircleKRootToPath()
  const originalDates = new Map([...azureDates, ...circlekDates])

  console.log('Importing S3 files into DB...\n')
  let total = 0
  for (const { banner, slug } of BANNERS) {
    console.log(`  ${banner} (${config.s3.bannerPrefix(slug)})`)
    const count = await migrateBannerFiles(banner, slug, originalDates)
    console.log(`  → ${count} records inserted\n`)
    total += count
  }

  console.log(`=== Done. ${total} total records inserted. ===`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
