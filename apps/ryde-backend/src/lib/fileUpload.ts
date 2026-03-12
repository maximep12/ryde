import { uploadedFiles } from '@repo/db'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { db } from '../db'
import { config } from '../config'
import { AmazonS3Client } from './FileDownloader/s3'
import { createReport, linkReportToUploadedFile } from './reports'

/**
 * Uploads a file buffer to S3 and records it in the uploaded_files table.
 * The S3 key includes a UUID suffix to prevent overwrites (e.g. report.xlsx → report-<uuid>.xlsx).
 * The original fileName is preserved in the DB record for display purposes.
 * Returns the saved record.
 */
export async function saveUploadedFile({
  buffer,
  fileName,
  type,
  banner,
  by = 'admin',
  uploadedBy,
}: {
  buffer: Buffer
  fileName: string
  type: string
  banner?: string
  by?: string
  uploadedBy?: string
}) {
  const ext = extname(fileName)
  const base = fileName.slice(0, fileName.length - ext.length)
  const uniqueFileName = `${base}-${randomUUID()}${ext}`
  const s3Key = `${config.s3.typePrefix(type)}${uniqueFileName}`

  const s3 = new AmazonS3Client({
    clientInfos: { region: config.s3.region, credentials: config.s3.credentials, endpoint: config.s3.endpoint },
  })
  await s3.uploadFile({ key: s3Key, body: buffer, bucket: config.s3.bucket })

  const [uploadedFile] = await db
    .insert(uploadedFiles)
    .values({
      type,
      banner: banner ?? null,
      name: fileName,
      downloadPath: `/download/${type}/${uniqueFileName}`,
      by,
      uploadedBy: uploadedBy ?? null,
      storedAt: new Date(),
    })
    .returning()

  if (!uploadedFile) throw new Error('Failed to save uploaded file record')
  return uploadedFile
}

/**
 * Creates the report, buffers the request body, uploads to S3, records in uploaded_files, and links to the report.
 * Returns { buffer, report } so the caller can process the file and update the report.
 */
export async function receiveFileUpload({
  request,
  fileName,
  reportType,
  type,
  banner,
  uploadedBy,
}: {
  request: Request
  fileName: string
  reportType: string
  type: string
  banner?: string
  uploadedBy?: string
}) {
  const report = await createReport(reportType, fileName)

  const arrayBuffer = await request.arrayBuffer()
  if (!arrayBuffer.byteLength) throw new Error('Missing file body')
  const buffer = Buffer.from(arrayBuffer)

  const uploadedFile = await saveUploadedFile({ buffer, fileName, type, banner, uploadedBy })
  await linkReportToUploadedFile(report.id, uploadedFile.id)

  return { buffer, report }
}

/**
 * Converts a buffer to a NodeJS.ReadableStream for use with file parsers.
 */
export function bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
  return Readable.from(buffer) as unknown as NodeJS.ReadableStream
}
