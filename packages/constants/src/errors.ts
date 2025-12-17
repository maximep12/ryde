export const appErrorCodes = new Set([400, 401, 403, 404])

export const APP_UPLOADS_ERROR_CODES = {
  GENERIC_ERROR: 'GENERIC_ERROR',
  ZOD_SCHEMA_ERROR: 'ZOD_SCHEMA_ERROR',
}

export type AppUploadsErrorCode = keyof typeof APP_UPLOADS_ERROR_CODES
