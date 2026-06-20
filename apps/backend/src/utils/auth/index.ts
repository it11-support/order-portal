import jwt, { SignOptions } from 'jsonwebtoken'

import dotenv from 'dotenv'
import { RoleType, User } from '@repo/shared'

dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined')
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

export const generateToken = (payload: User) => {
  return jwt.sign({ ...payload }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export const verifyToken = (token: string): { id: string } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    throw new Error("Invalid or expired token")
  }
}