import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto'
import * as bcrypt from 'bcrypt'

const key = () => {
  const secret = process.env.CUSTOMER_PASSWORD_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('Customer password encryption secret is missing')
  return createHash('sha256').update(`customer-password:v1:${secret}`).digest()
}

export const generateCustomerPassword = (): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password: string
  do {
    password = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')
  } while (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
  return password
}

export const hashCustomerPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const encryptCustomerPassword = (password: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64url')).join('.')
}

export const decryptCustomerPassword = (value: string | null): string | null => {
  if (!value) return null
  try {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'))
    const decipher = createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
