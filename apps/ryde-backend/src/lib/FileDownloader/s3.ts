import { CopyObjectCommand, GetObjectCommand, ListObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { createWriteStream } from 'node:fs'

export type S3BucketConfig = {
  name: string
  region: string
}

export type S3ClientConfig = {
  region: string
  credentials: { accessKeyId: string; secretAccessKey: string }
  endpoint?: string
}

export type S3FileInfo = {
  name: string
  date: Date
}

export class AmazonS3Client {
  private client: S3Client

  constructor({ clientInfos }: { clientInfos: S3ClientConfig }) {
    this.client = new S3Client({
      ...clientInfos,
      ...(clientInfos.endpoint ? { endpoint: clientInfos.endpoint, forcePathStyle: true } : {}),
    })
  }

  async getAllFilesInContainer({ bucket, prefix }: { bucket: string; prefix?: string }): Promise<S3FileInfo[]> {
    const response = await this.client.send(new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }))
    const contents = response.Contents
    if (!contents || contents.length === 0) throw new Error(`No file in the selected bucket ${bucket}${prefix ? `/${prefix}` : ''}`)
    return contents.map((file) => ({ name: file.Key ?? '', date: file.LastModified ?? new Date() }))
  }

  async getLatestFileKey({ bucket, prefix }: { bucket: string; prefix?: string }): Promise<string> {
    const response = await this.client.send(new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }))
    const contents = response.Contents
    if (!contents || contents.length === 0) throw new Error(`No file in the selected bucket ${bucket}${prefix ? `/${prefix}` : ''}`)
    const sorted = [...contents].sort(
      (a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
    )
    return sorted[0]?.Key ?? ''
  }

  async getS3Content({ bucket, key }: { bucket: string; key: string }): Promise<Readable> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const body = response.Body
    if (!body) throw new Error('Empty S3 response body')
    return body as unknown as Readable
  }

  async uploadFile({ key, body, bucket }: { key: string; body: Buffer | Readable; bucket: string }): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
  }

  async copyFile({ sourceBucket, sourceKey, destBucket, destKey }: { sourceBucket: string; sourceKey: string; destBucket: string; destKey: string }): Promise<void> {
    await this.client.send(new CopyObjectCommand({ Bucket: destBucket, Key: destKey, CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}` }))
  }

  async downloadFile({ stream, fileName, path }: { stream: Readable; fileName: string; path: string }): Promise<string> {
    const name = `${path}/${fileName.replace(/\s/g, '').replace(/\//g, '_')}`
    await new Promise<void>((resolve, reject) => {
      const writer = createWriteStream(name)
      stream.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
    return name
  }
}

export async function downloadLatestS3File({
  bucket,
  prefix,
  path,
  accessKeyId,
  secretAccessKey,
  endpoint,
}: {
  bucket: S3BucketConfig
  prefix?: string
  path: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
}): Promise<string> {
  const s3 = new AmazonS3Client({
    clientInfos: { region: bucket.region, credentials: { accessKeyId, secretAccessKey }, endpoint },
  })
  const latestKey = await s3.getLatestFileKey({ bucket: bucket.name, prefix })
  const content = await s3.getS3Content({ key: latestKey, bucket: bucket.name })
  return s3.downloadFile({ stream: content, fileName: latestKey, path })
}
