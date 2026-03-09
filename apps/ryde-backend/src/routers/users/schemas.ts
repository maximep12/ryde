import { ROLES } from '@repo/db'
import { z } from 'zod'

const BATCH_KEYS = [...ROLES, 'Deleted'] as const

// { "admin": ["uuid1", "uuid2"], "trade_rep": ["uuid3"], "Deleted": ["uuid4"] }
export const batchUpdateSchema = z.record(z.enum(BATCH_KEYS), z.array(z.string()))
