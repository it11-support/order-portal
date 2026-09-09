import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Keep this secret stable to retain access to displayed customer passwords.
// A dedicated CUSTOMER_PASSWORD_SECRET can be configured independently of JWT rotation.
function key() {
  const secret = process.env.CUSTOMER_PASSWORD_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('Customer password encryption secret is missing')
  return createHash('sha256').update(`customer-password:v1:${secret}`).digest()
}

export function encryptCustomerPassword(password: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64url')).join('.')
}

export function decryptCustomerPassword(value: string | null): string | null {
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
