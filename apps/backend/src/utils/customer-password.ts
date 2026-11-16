
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomInt,
} from 'node:crypto'
import * as bcrypt from 'bcrypt'

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v2'

const getSecret = (): string => {
  const secret =
    process.env.CUSTOMER_PASSWORD_SECRET ||
    process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      'Customer password encryption secret is missing',
    )
  }

  return secret
}

// Key baru: HKDF-SHA256.
// Gunakan secret acak berkekuatan tinggi.
const key = (): Buffer => {
  const secret = getSecret()

  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(secret, 'utf8'),
      Buffer.from('customer-password:hkdf:v2'),
      Buffer.from('aes-256-gcm:key'),
      32,
    ),
  )
}


export const generateCustomerPassword = (): string => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let password: string

  do {
    password = Array.from(
      { length: 6 },
      () => alphabet[randomInt(alphabet.length)],
    ).join('')
  } while (
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  )

  return password
}

export const hashCustomerPassword = async (
  password: string,
): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const encryptCustomerPassword = (
  password: string,
): string => {
  const iv = randomBytes(12)

  const cipher = createCipheriv(
    ALGORITHM,
    key(),
    iv,
  )

  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final(),
  ])

  return [
    VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export const decryptCustomerPassword = (
  value: string | null,
): string | null => {
  if (!value) return null

  try {
    const [version, ivPart, tagPart, encryptedPart] =
      value.split('.')

    if (version !== 'v2') return null

    const iv = Buffer.from(ivPart, 'base64url')
    const tag = Buffer.from(tagPart, 'base64url')
    const encrypted = Buffer.from(encryptedPart, 'base64url')

    if (iv.length !== 12 || tag.length !== 16) {
      return null
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key(),
      iv,
    )

    decipher.setAuthTag(tag)

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}