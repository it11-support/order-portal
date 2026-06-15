import { Request, Response, NextFunction } from 'express'
import type { User } from '@repo/shared'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined')
}

const JWT_SECRET = process.env.JWT_SECRET

export interface AuthenticatedRequest extends Request {
  user?: User
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Akses ditolak. Token tidak valid.' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User
    req.user = decoded

    next()
  } catch (error) {
    res.status(401).json({ message: 'Token kedaluwarsa atau tidak valid.' })
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Tidak terautentikasi.' })
    return
  }

  // Pengecekan role menggunakan properti dari @repo/shared
  if (req.user.role.name !== 'admin') {
    res.status(403).json({ message: 'Akses ditolak. Khusus untuk Admin.' })
    return
  }

  next()
}
