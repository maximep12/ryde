import * as crypto from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(crypto.scrypt)

const SALT_LENGTH = 16
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey)
}
