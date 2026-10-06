import type { Customer } from '../customer'
export type RoleType = 'customer' | 'admin' | 'sales_admin'

export interface User {
  id: number | bigint | null
  username: string
  email?: string
  name: string
  roleId: number | bigint | null
  isActive: boolean
  createdAt: Date | string | null
  updatedAt: Date | string | null
  role: Role
  customerId?: number | bigint | null
  customer?: Customer | null
  slpCode?: number | null
  password?: string | null
  encryptedPassword?: string | null
}

export interface Role {
  id: number
  name: RoleType
  createdAt: Date | string | null
}
