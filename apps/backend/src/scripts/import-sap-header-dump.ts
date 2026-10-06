import { prisma } from '@/utils'

/**
 * Seeds sales_orders from a DWH header dump.
 *
 * The sync job that normally fills sales_orders reads the same ORDR header in
 * SAP, so this script takes a header row from that feed and stores the columns
 * the portal actually uses, plus the RDR1 line rows that go with it.
 *
 * The dumped header row is a few hundred columns wide. The ones this script
 * reads, in the order they appear at the start of the row:
 *
 *   1  DocEntry    2  DocNum      3  DocType4-6  flags (all 'N' here)
 *   7  DocStatus   8  DataStatus  9  Canceled 10  SlpCode
 *  11  DocDate    12  DocDueDate  13  CardCode 14  CardName
 *
 * Positions 7 and 8 both read 'O' in every row this was built from, so which one
 * is DocStatus does not change the outcome: the document is open and not
 * canceled. DocTotal is taken from the figure that follows DocCurrency and
 * DocRate; the other money column in the row is left out rather than guessed.
 *
 * A dumped RDR1 line reads: DocNum, CardCode, CardName, LineNum, ItemCode,
 * ItemName, Quantity, Price, OpenQty, LineTotal.
 */

interface HeaderRow {
  docEntry: number
  docNum: number
  docStatus: string
  canceled: string
  slpCode: number | null
  docDate: string
  docDueDate: string | null
  cardCode: string
  cardName: string | null
  docTotal: number | null
  currency: string | null
  remarks: string | null
}

interface LineRow {
  lineNum: number
  itemCode: string | null
  description: string
  quantity: number
  openQty: number
  price: number | null
  lineTotal: number | null
  lineStatus: string
}

/** RDR1 rows, keyed by the DocEntry of the header they belong to. */
const LINES: Record<number, LineRow[]> = {
  1176099: [
    {
      lineNum: 0,
      itemCode: '03000001',
      description: 'GULA IMPORT 1 X 1 KG',
      quantity: 500,
      openQty: 500,
      price: 18919,
      lineTotal: 9459500,
      lineStatus: 'O',
    },
  ],
  1178087: [
    {
      lineNum: 0,
      itemCode: '73000178',
      description: "LIVI EVO SMART DUO 205'S LITHO PAPPER(KERTAS) 1 X 100 ROLL",
      quantity: 100,
      openQty: 100,
      price: 1818,
      lineTotal: 181800,
      lineStatus: 'O',
    },
  ],
  1178073: [
    {
      lineNum: 0,
      itemCode: '73000123',
      description: 'LIVI EVO SENSASION PREMIUM COCKTAIL NAPKIN 1 X 60 PACK',
      quantity: 60,
      openQty: 60,
      price: 4530,
      lineTotal: 271800,
      lineStatus: 'O',
    },
  ],
  1178074: [
    {
      lineNum: 0,
      itemCode: '730001016',
      description: "LIVI EVO MULTIFOLD 150 'S 1 X24 PACK",
      quantity: 72,
      openQty: 72,
      price: 7652,
      lineTotal: 550944,
      lineStatus: 'O',
    },
  ],
  1178086: [
    {
      lineNum: 0,
      itemCode: '17000168',
      description: 'SOLAREC BLOCK UNSALTED BUTTER 25 KG',
      quantity: 2,
      openQty: 2,
      price: 3693873.63,
      lineTotal: 7387387.39,
      lineStatus: 'O',
    },
  ],
  1178089: [
    {
      lineNum: 0,
      itemCode: '73000167',
      description: 'LIVI ECO FACIAL REFILL 554 G 1 X 24 PACK',
      quantity: 24,
      openQty: 24,
      price: 16970,
      lineTotal: 407280,
      lineStatus: 'O',
    },
    {
      lineNum: 1,
      itemCode: '73000156',
      description: "LIVI EVO SMART TOILET CORE SINGLE 205'S 1 X 100 ROLL",
      quantity: 1500,
      openQty: 1500,
      price: 1664,
      lineTotal: 2496000,
      lineStatus: 'O',
    },
    {
      lineNum: 2,
      itemCode: '730001012',
      description: "LIVI EVO KICHEN ROLL TOWEL MAXI 200'S 1 X 12 ROLL",
      quantity: 48,
      openQty: 48,
      price: 16743,
      lineTotal: 803664,
      lineStatus: 'O',
    },
  ],
  1178090: [
    {
      lineNum: 0,
      itemCode: '03000024',
      description: 'TROPICANA SLIM SACHET 1 X 8 X 160 X 2.5 GR',
      quantity: 1,
      openQty: 1,
      price: 103604,
      lineTotal: 103604,
      lineStatus: 'O',
    },
    {
      lineNum: 1,
      itemCode: '14000027',
      description: 'GARAM PORSI 1 X 250 X 0.8 GR',
      quantity: 1,
      openQty: 1,
      price: 22400,
      lineTotal: 22400,
      lineStatus: 'O',
    },
    {
      lineNum: 2,
      itemCode: '73000102',
      description: "LIVI EVO PREMIUM FACIAL TISSUE REFIL770'S 1 X12 PACK",
      quantity: 1,
      openQty: 1,
      price: 25379,
      lineTotal: 25379,
      lineStatus: 'O',
    },
    {
      lineNum: 3,
      itemCode: '79000013',
      description: 'PLASTIK SAMPAH HITAM BESAR (90X100) 1 X 100 LBR',
      quantity: 1,
      openQty: 1,
      price: 153153,
      lineTotal: 153153,
      lineStatus: 'O',
    },
    {
      lineNum: 4,
      itemCode: '730001013',
      description: "LIVI EVO PREMIUM POP-UP 200'S 1 X 72 PCS",
      quantity: 1,
      openQty: 1,
      price: 3750,
      lineTotal: 3750,
      lineStatus: 'O',
    },
  ],
  1178091: [
    {
      lineNum: 0,
      itemCode: '73000102',
      description: "LIVI EVO PREMIUM FACIAL TISSUE REFIL770'S 1 X12 PACK",
      quantity: 12,
      openQty: 12,
      price: 25379,
      lineTotal: 304548,
      lineStatus: 'O',
    },
    {
      lineNum: 1,
      itemCode: '69000004',
      description: 'SUNLIGHT REFILL  1 X 12 X 610 ML',
      quantity: 2,
      openQty: 2,
      price: 10360,
      lineTotal: 20720,
      lineStatus: 'O',
    },
    {
      lineNum: 2,
      itemCode: '79000013',
      description: 'PLASTIK SAMPAH HITAM BESAR (90X100) 1 X 100 LBR',
      quantity: 2,
      openQty: 2,
      price: 153153,
      lineTotal: 306306,
      lineStatus: 'O',
    },
  ],
  1178092: [
    {
      lineNum: 0,
      itemCode: '73000102',
      description: "LIVI EVO PREMIUM FACIAL TISSUE REFIL770'S 1 X12 PACK",
      quantity: 12,
      openQty: 12,
      price: 25379,
      lineTotal: 304548,
      lineStatus: 'O',
    },
  ],
  1178114: [
    {
      lineNum: 0,
      itemCode: '03000001',
      description: 'GULA IMPORT 1 X 1 KG',
      quantity: 20,
      openQty: 20,
      price: 18919,
      lineTotal: 378380,
      lineStatus: 'O',
    },
  ],
  1178123: [
    {
      lineNum: 0,
      itemCode: '27000055',
      description: 'MONIN PINK GRAPE FRUIT 6 X 700 ML',
      quantity: 1,
      openQty: 1,
      price: 144685,
      lineTotal: 144685,
      lineStatus: 'O',
    },
    {
      lineNum: 1,
      itemCode: '79000036',
      description: 'PLASTIK SAMPAH HITAM KSC (100X120) 1 X 50 LBR',
      quantity: 2,
      openQty: 2,
      price: 121622,
      lineTotal: 243244,
      lineStatus: 'O',
    },
  ],
  1178130: [
    {
      lineNum: 0,
      itemCode: '73000178',
      description: "LIVI EVO SMART DUO 205'S LITHO PAPPER(KERTAS) 1 X 100 ROLL",
      quantity: 200,
      openQty: 200,
      price: 1818,
      lineTotal: 363600,
      lineStatus: 'O',
    },
    {
      lineNum: 1,
      itemCode: '77000025',
      description: 'PLASTIK SAMPAH HITAM (50X60) 1 X 100 LBR',
      quantity: 1,
      openQty: 1,
      price: 52252,
      lineTotal: 52252,
      lineStatus: 'O',
    },
    {
      lineNum: 2,
      itemCode: '78000002',
      description: 'POLYTEK SPON CUCI DOUBLE 1 X 12 PCS',
      quantity: 1,
      openQty: 1,
      price: 34234,
      lineTotal: 34234,
      lineStatus: 'O',
    },
  ],
}

const companyId = '82TS'

const HEADERS: HeaderRow[] = [
  {
    docEntry: 1176099,
    docNum: 626093713,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 17,
    docDate: '2026-09-21T00:00:00.000Z',
    docDueDate: '2026-10-01T00:00:00.000Z',
    cardCode: 'C004902',
    cardName: 'MAMAKA HOTEL',
    docTotal: 6300027,
    currency: 'IDR',
    remarks: 'SISA SO:626092624 /GULA KILOAN (KIRIM PARTIAL)',
  },
  {
    docEntry: 1178084,
    docNum: 626100400,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 17,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-02T00:00:00.000Z',
    cardCode: 'C000437',
    cardName: 'PERSONAL*',
    docTotal: 0,
    currency: 'IDR',
    remarks: 'U /IVEN HK INTERNASIONAL DIAMBIL GOJEK( PINJAM )',
  },
  {
    docEntry: 1178087,
    docNum: 626100403,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 17,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C002503',
    cardName: 'BAMBOO RESTAURANT KUTA',
    docTotal: 201798,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178073,
    docNum: 626100389,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C005120',
    cardName: 'NIRVANA RESTAURANT CANGGU',
    docTotal: 301698,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178074,
    docNum: 626100390,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C005120',
    cardName: 'NIRVANA RESTAURANT CANGGU',
    docTotal: 611547.84,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178086,
    docNum: 626100402,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C006007',
    cardName: 'CV BALI CELEBRITI METAKSU (CELEBRITI BAKERY)',
    docTotal: 8200000,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178089,
    docNum: 626100405,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C001025',
    cardName: 'ATHA SUPPLIER',
    docTotal: 4032413.68,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178090,
    docNum: 626100406,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C002304',
    cardName: 'LA LASA VILLA I',
    docTotal: 342197.46,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178091,
    docNum: 626100407,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C002304',
    cardName: 'LA LASA VILLA I',
    docTotal: 701047.14,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178092,
    docNum: 626100408,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C005013',
    cardName: 'BALI KARMA SAJTRHA HOTEL',
    docTotal: 338048.28,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178114,
    docNum: 626100430,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C002948',
    cardName: 'BARBACOA REST',
    docTotal: 420001.8,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178123,
    docNum: 626100439,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C005204',
    cardName: 'LITTLE FRIENCHIE RESTAURANT',
    docTotal: 430601.19,
    currency: 'IDR',
    remarks: null,
  },
  {
    docEntry: 1178130,
    docNum: 626100446,
    docStatus: 'O',
    canceled: 'N',
    slpCode: 29,
    docDate: '2026-10-02T00:00:00.000Z',
    docDueDate: '2026-10-03T00:00:00.000Z',
    cardCode: 'C005765',
    cardName: 'THE ICON VILLA CANGGU',
    docTotal: 499595.46,
    currency: 'IDR',
    remarks: null,
  },
]

for (const header of HEADERS) {
  const customer = await prisma.customers.findUnique({
    where: { CardCode: header.cardCode },
    select: { id: true, CardCode: true, CardName: true, SlpCode: true },
  })

  // The unique key is the SAP document itself, so re-running refreshes the row
  // instead of duplicating it: the same ORDR may be dumped more than once.
  const row = await prisma.salesOrder.upsert({
    where: { companyId_docEntry: { companyId, docEntry: header.docEntry } },
    create: {
      companyId,
      docEntry: header.docEntry,
      docNum: header.docNum,
      docDate: new Date(header.docDate),
      docDueDate: header.docDueDate ? new Date(header.docDueDate) : null,
      cardCode: header.cardCode,
      cardName: header.cardName,
      docStatus: header.docStatus,
      canceled: header.canceled,
      docTotal: header.docTotal,
      currency: header.currency,
      slpCode: header.slpCode,
      remarks: header.remarks,
      sapUpdatedAt: new Date(),
    },
    update: {
      docNum: header.docNum,
      docDate: new Date(header.docDate),
      docDueDate: header.docDueDate ? new Date(header.docDueDate) : null,
      cardName: header.cardName,
      docStatus: header.docStatus,
      canceled: header.canceled,
      docTotal: header.docTotal,
      currency: header.currency,
      slpCode: header.slpCode,
      remarks: header.remarks,
      sapUpdatedAt: new Date(),
    },
  })
  // Lines are upserted on their own key, so a later dump of the same RDR1 rows
  // refreshes quantities and prices instead of stacking a second copy of a line.
  const dumpLines = LINES[header.docEntry] ?? []
  for (const line of dumpLines) {
    await prisma.salesOrderLine.upsert({
      where: { salesOrderId_lineNum: { salesOrderId: row.id, lineNum: line.lineNum } },
      create: {
        salesOrderId: row.id,
        lineNum: line.lineNum,
        itemCode: line.itemCode,
        description: line.description,
        quantity: line.quantity,
        openQty: line.openQty,
        price: line.price,
        lineTotal: line.lineTotal,
        lineStatus: line.lineStatus,
      },
      update: {
        itemCode: line.itemCode,
        description: line.description,
        quantity: line.quantity,
        openQty: line.openQty,
        price: line.price,
        lineTotal: line.lineTotal,
        lineStatus: line.lineStatus,
      },
    })
  }

  const lines = await prisma.salesOrderLine.count({ where: { salesOrderId: row.id } })

  console.log(`DocEntry ${row.docEntry} / docNum ${row.docNum}`)
console.log(
    `  customer    : ${customer?.CardName ?? 'TIDAK ADA DI MASTER'} (${header.cardCode}${customer ? ')' : ''}`,
  )
  console.log(`  status      : ${row.docStatus} · canceled ${row.canceled}`)
  console.log(
    `  tanggal     : ${row.docDate.toISOString().slice(0, 10)} · due ${row.docDueDate?.toISOString().slice(0, 10) ?? '-'}`,
  )
  console.log(`  total       : ${row.docTotal ?? '-'} ${row.currency ?? ''}`)
  console.log(`  remarks     : ${row.remarks ?? '-'}`)
  console.log(`  lines (RDR1): ${lines}`)
}

console.log(`\nsales_orders sekarang: ${await prisma.salesOrder.count()} baris`)
await prisma.$disconnect()