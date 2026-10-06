import { prisma } from '@/utils'
import {
  priceIncreaseCheck,
  pricesForCatalog,
  refreshCustomerPrices,
  resolvePriceListNet,
  priceableCustomer,
} from '@/services/pricing'
import { announcePriceChanges } from '@/services/price-alerts'

/**
 * Covers the refined pricing rule:
 *
 *   * an item the customer has bought is sold at the net price on their last
 *     invoice line ("harga aktual")
 *   * an item they have never bought falls back to the price list after the
 *     customer's overall discount
 *   * only the actual price is watched for movement, and a movement reaches the
 *     open inquiries that mention the item
 */

const assert = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const companyId = 'SMOKE_TEST_CO'
const listNum = 91
// Fixed docEntry so a failed run can still be cleaned up by hand.
const docEntry = 990001

const main = async () => {
  const withUser = await prisma.user.findFirst({
    where: { role: { name: 'customer' }, isActive: true, customerId: { not: null } },
    orderBy: { id: 'asc' },
    select: { customerId: true },
  })
  const customer = withUser?.customerId
    ? await prisma.customers.findUnique({ where: { id: BigInt(String(withUser.customerId)) } })
    : null
  if (!customer?.CardCode) throw new Error('No eligible customer found')
  const customerId = BigInt(String(customer.id))
  console.log(`customer ${customer.CardCode} id=${customerId} (has portal user)`)

  const original = {
    priceListNum: customer.priceListNum,
    discountLevel: customer.discountLevel,
  }

  const items = await prisma.product.findMany({ take: 2, orderBy: { id: 'asc' } })
  if (items.length < 2) throw new Error('Need at least 2 products')
  const [bought, neverBought] = items
  const inquiryId = `RFQ-SMOKE-PRICING`

  await prisma.customers.update({
    where: { id: customerId },
    data: { priceListNum: listNum, discountLevel: 10 },
  })
  await prisma.itemPrice.deleteMany({ where: { companyId } })
  await prisma.salesInvoice.deleteMany({ where: { companyId, docEntry } })
  await prisma.customerItemPrice.deleteMany({ where: { customerId } })
  await prisma.priceChangeLog.deleteMany({ where: { customerId } })
  await prisma.portalRequest.deleteMany({ where: { id: inquiryId } })

  // "bought" is priced at list 100 (net 90 after the 10% discount); "neverBought"
  // has no invoice line at all.
  await prisma.itemPrice.createMany({
    data: [
      { companyId, listNum, itemCode: bought.itemCode, price: '100', currency: 'IDR' },
      { companyId, listNum, itemCode: neverBought.itemCode, price: '200', currency: 'IDR' },
    ],
  })
  // LineTotal 450 over 3 units is the 150 the customer actually paid.
  await prisma.salesInvoice.create({
    data: {
      companyId,
      docEntry,
      docNum: docEntry,
      lineNum: 0,
      docDate: new Date('2026-01-15T00:00:00Z'),
      cardCode: customer.CardCode,
      itemCode: bought.itemCode,
      description: 'smoke fixture',
      quantity: '3',
      inventoryQuantity: '3',
      priceBefDisc: '160',
      discLine: '6.25',
      lineTotal: '450',
      totalSales: '450',
      currency: 'IDR',
    },
  })
  await prisma.portalRequest.create({
    data: {
      id: inquiryId,
      customerId,
      kind: 'quote',
      status: 'processing',
      notes: 'smoke pricing fixture',
      items: [
        { product: { id: String(bought.id), itemCode: bought.itemCode }, qty: 1 },
      ],
    },
  })

  const priceable = await priceableCustomer(customerId)
  if (!priceable) throw new Error('Customer is not priceable')

  console.log('\n--- price list net still applies the customer discount ---')
  const list = await resolvePriceListNet(priceable, [bought.itemCode, neverBought.itemCode])
  assert('list price 100 nets to 90 at 10% off', list.get(bought.itemCode)?.price, 90)
  assert('unknown item is absent', list.has('NO-SUCH-ITEM'), false)

  console.log('\n--- repeat items are sold at the actual invoice price ---')
  const firstCatalog = await pricesForCatalog(customerId, [bought.itemCode, neverBought.itemCode])
  assert('bought item uses the invoice unit price', firstCatalog.get(bought.itemCode)?.price, 150)
  assert('bought item is marked as actual', firstCatalog.get(bought.itemCode)?.source, 'actual')
  assert(
    'never bought item falls back to the price list',
    firstCatalog.get(neverBought.itemCode)?.price,
    180,
  )
  assert(
    'never bought item is marked as pricelist',
    firstCatalog.get(neverBought.itemCode)?.source,
    'pricelist',
  )
  assert('first observation is not a movement', await prisma.priceChangeLog.count({ where: { customerId } }), 0)

  console.log('\n--- order gate only blocks on increases ---')
  const unchanged = await priceIncreaseCheck(customerId, [
    { productId: String(bought.id), price: 150 },
    { productId: String(neverBought.id), price: 180 },
  ])
  assert('unchanged prices do not block', unchanged.length, 0)

  const dropped = await priceIncreaseCheck(customerId, [{ productId: String(bought.id), price: 200 }])
  assert('a lower quoted price does not block', dropped.length, 0)

  const risen = await priceIncreaseCheck(customerId, [{ productId: String(bought.id), price: 120 }])
  assert('an increase is reported', risen.length, 1)
  assert('increase names the item', risen[0].itemName, bought.itemName)
  assert('increase percentage', risen[0].changePct, 25)

  const noQuote = await priceIncreaseCheck(customerId, [{ productId: String(bought.id) }])
  assert('no quoted price does not block', noQuote.length, 0)

  console.log('\n--- a price movement reaches the open inquiry ---')
  await prisma.salesInvoice.update({
    where: { companyId_docEntry_lineNum: { companyId, docEntry, lineNum: 0 } },
    data: { quantity: '3', lineTotal: '480' },
  })
  const afterMove = await pricesForCatalog(customerId, [bought.itemCode])
  assert('catalog serves the new actual price', afterMove.get(bought.itemCode)?.price, 160)

  const logs = await prisma.priceChangeLog.findMany({
    where: { customerId },
    select: { itemCode: true, oldPrice: true, newPrice: true, direction: true, notifiedAt: true },
    orderBy: { createdAt: 'asc' },
  })
  assert('the movement is logged', logs.length, 1)
  assert('movement records old and new price', [String(logs[0].oldPrice), String(logs[0].newPrice)], ['150', '160'])
  assert('direction is not blank-padded', logs[0].direction, 'up')

  const systemNotes = await prisma.followUpNote.findMany({
    where: { requestId: inquiryId, source: 'system' },
    select: { message: true, authorRole: true, authorId: true },
  })
  assert('the inquiry carries a system note', systemNotes.length, 1)
  assert('the system note has no human author', systemNotes[0].authorId, null)
  assert('the system note names the item', systemNotes[0].message.includes(bought.itemName), true)

  const inquiryNotifications = await prisma.notification.findMany({
    where: { relatedId: inquiryId, type: 'price_increase' },
    select: { userId: true },
  })
  assert('the inquiry produced a notification', inquiryNotifications.length > 0, true)

  console.log('\n--- sub-threshold increases are logged but not announced ---')
  await prisma.customerItemPrice.deleteMany({ where: { customerId } })
  await prisma.priceChangeLog.deleteMany({ where: { customerId } })
  await prisma.followUpNote.deleteMany({ where: { requestId: inquiryId, source: 'system' } })
  await prisma.notification.deleteMany({ where: { relatedId: inquiryId } })
  await refreshCustomerPrices(priceable, [bought.itemCode])
  const quiet = await announcePriceChanges(customerId, [
    {
      itemCode: bought.itemCode,
      oldPrice: 150,
      newPrice: 150.75,
      changePct: 0.5,
      direction: 'up',
      currency: 'IDR',
      sourceDoc: null,
    },
  ])
  assert('0.5% increase is not announced as a notification', quiet.length, 1)
  const quietNotes = await prisma.followUpNote.count({
    where: { requestId: inquiryId, source: 'system' },
  })
  assert('but the inquiry still learns about it', quietNotes, 1)

  console.log('\n--- cleanup ---')
  await prisma.itemPrice.deleteMany({ where: { companyId } })
  await prisma.salesInvoice.deleteMany({ where: { companyId, docEntry } })
  await prisma.portalRequest.deleteMany({ where: { id: inquiryId } })
  await prisma.customerItemPrice.deleteMany({ where: { customerId } })
  await prisma.priceChangeLog.deleteMany({ where: { customerId } })
  await prisma.notification.deleteMany({
    where: { OR: [{ relatedId: inquiryId }, { type: 'price_increase' }] },
  })
  await prisma.customers.update({
    where: { id: customerId },
    data: {
      priceListNum: original.priceListNum,
      discountLevel: original.discountLevel,
    },
  })
  console.log(
    `test data removed (restored priceListNum=${String(original.priceListNum)}, discountLevel=${String(original.discountLevel)})`,
  )

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})