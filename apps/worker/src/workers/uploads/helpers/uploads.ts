import { UPLOADS_ERROR_CODES } from '@repo/constants'
import { uploadsResults, uploadsToS3 } from '@repo/db'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'

export function getUploadToS3Log(key: string) {
  return db.select().from(uploadsToS3).where(eq(uploadsToS3.fileKey, key)).limit(1)
}

export function insertUploadResultRecord(
  uploadId: string,
  data: Record<string, unknown>,
  rowIndex: number,
  isValid: boolean,
  validationDetails: unknown,
) {
  return db.insert(uploadsResults).values({
    uploadId,
    data,
    rowIndex,
    isValid,
    validationDetails,
  })
}

export async function markAppUploadResultAsProcessed(uploadId: string) {
  await db
    .update(uploadsResults)
    .set({
      isProcessed: true,
    })
    .where(eq(uploadsResults.uploadId, uploadId))
}

export async function setS3UploadError(uuid: string, error: unknown) {
  const errorMessage =
    error instanceof Error && error.message in UPLOADS_ERROR_CODES
      ? error.message
      : UPLOADS_ERROR_CODES.GENERIC_ERROR

  await db
    .update(uploadsToS3)
    .set({
      error: errorMessage
    })
    .where(eq(uploadsToS3.uuid, uuid))
}
