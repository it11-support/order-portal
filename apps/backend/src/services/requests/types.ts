import { PortalRequest, Product } from "@/generated/prisma/client"
import { PortalRequestGetPayload } from "@/generated/prisma/models"

export type DraftItemInput = {
  productId: string
  qty: number
}

export type DraftItemSnapshot = {
  product: Product
  qty: number
  price?: number
  currency?: string | null
  priceSource?: string | null
  lineTotal?: number
}

export type PreviousDraftItem = {
  product?: { id?: string | number | bigint }
  productId?: string | number | bigint
  price?: number | null
  acceptedPrice?: number | null
  currency?: string | null
  priceSource?: string | null
}

export type NormalizedItem = {
  productId: string
  qty: number
  price: number | null
}

export type DraftItemsResult = { ok: true; items: DraftItemSnapshot[] | null } | { ok: false }

export type RequestKind = 'order' | 'quote'

export type RequestStatusRow = Pick<PortalRequest, 'id' | 'customerId' | 'status' | 'kind'> & {
  customer: {
    SlpCode: number | null
  }
}


export type RequestRow = PortalRequestGetPayload<{
  include: {
    customer: {
      select: {
        CntctPrsn: true
        CardName: true
        CardCode: true
        Cellular: true
        Phone1: true
        SalesName: true
      }
    }
    createdBy: {
      select: {
        name: true
      }
    }
  }
}>

export type SapDocumentStatus = 'open' | 'closed' | 'unknown'

export type SapViewData = {
  companyId: string | null
  docEntry: number | null
  docNum: number | null
  docStatus: SapDocumentStatus
  canceled: boolean
  syncedAt: string | null
  portalStatus?: string
}

export type SapView = SapViewData & {
  status: 'open' | 'closed' | 'canceled' | 'unknown'
}

export type RequestViews = Map<string, SapViewData>


export type RequestItem = {
  productId: string
  qty?: number
}

export type LinePrice = {
  price: number
  currency: string | null
  source: string
}

export type RequestSnapshotItem = {
  product: Product
  qty: number
  price?: number
  currency?: string | null
  priceSource?: string | null
  lineTotal?: number | null
}

export type SnapshotOptions = {
  products: Product[]
  items: RequestItem[]
  prices: Map<string, LinePrice>
  kind: 'order' | 'quote'
}