import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined')
}

export const generateToken = (payload: { id: string }) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1d',
  })
}

export const verifyAccessToken = (token: string): { userId: number } | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (typeof payload === 'string') return null
    const userId = Number(payload.id)
    if (!Number.isSafeInteger(userId) || userId <= 0) return null
    return { userId }
  } catch {
    return null
  }
}

export const createSapToken = (user: {
  id: number
  role: string
}) => {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      algorithm: 'HS256',
      expiresIn: '5m',
      issuer: 'order-portal',
      audience: 'sap-worker',
    },
  )
}