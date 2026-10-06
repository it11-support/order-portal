import type { User } from '../user'

export interface Subgroup {
  indCode: number
  indName: string
  indDesc: string
}

export interface Customer {
  id: number | bigint | null
  CardCode: string | null
  CardName: string | null
  GroupName: string | null
  CntctPrsn: string | null
  Phone1: string | null
  Cellular: string | null
  SlpCode: number | null
  SalesName: string | null
  Address: string | null
  Block: string | null
  City: string | null
  ZipCode: string | null
  Country: string | null
  PaymentTerm: string | null
  PriceList: string | null
  JoinDate: Date | string | null
  IndustryC: number | null
  NonActive: string | null

  // Credit exposure. Prisma Decimal arrives as a string over the API.
  creditLimit: string | number | null
  balance: string | number | null

  // frozenFor is the SAP-style 'Y' / 'N' flag; Char(1) values are blank padded
  // by Postgres, so compare on the trimmed letter.
  frozenFor: string | null
  frozenFrom: Date | string | null
  frozenTo: Date | string | null

  hasLogin?: boolean
  loginUsername?: string | null
  loginPassword?: string | null
  createdAt: Date | string | null
  updatedAt: Date | string | null

  Subgroup?: Subgroup
  user?: User
}

export interface Subgroup {
  IndCode: number
  IndName: string
  IndDesc: string
}
