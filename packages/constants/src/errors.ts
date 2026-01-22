export const appErrorCodes = new Set([400, 401, 403, 404])

export const UPLOADS_ERROR_CODES = {
  GENERIC_ERROR: 'GENERIC_ERROR',
  ZOD_SCHEMA_ERROR: 'ZOD_SCHEMA_ERROR',
}

export type AppUploadsErrorCode = keyof typeof UPLOADS_ERROR_CODES
