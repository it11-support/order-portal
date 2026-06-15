import { User } from '../user'

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
  createdAt: Date | string | null
  updatedAt: Date | string | null

  Subgroup?: Subgroup
  user?: User
}

export interface Subgroup {
  ind_code: number
  ind_name: string
  ind_desc: string
}
