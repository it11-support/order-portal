import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/utils/prisma/index'
import { customerItemCodes } from '../src/services/customer-catalog'
import { getProductsByCategory, getCategories } from '../src/controllers/categories/index'
import { createRequest, listRequests, updateRequest } from '../src/controllers/requests/index'

const response = () => ({
  code: 200,
  body: null as any,
  status(code: number) {
    this.code = code
    return this
  },
  json(body: any) {
    this.body = body
    return this
  },
  setHeader() {},
})

test('all-time catalog, subgroup suggestions and persisted order/quote workflow', async () => {
  const tag = `T${randomUUID().replaceAll('-', '').slice(0, 9)}`
  const subgroup = -Math.floor(Math.random() * 1000000000) - 1
  const customerIds: bigint[] = []
  const productCodes = ['own', 'suggested', 'inactive', 'cancelled', 'other'].map(
    (s) => `${tag}-${s}`,
  )
  try {
    await prisma.subgroups.create({
      data: { IndCode: subgroup, IndName: tag, IndDesc: 'Isolated integration fixture' },
    })
    await prisma.category.create({ data: { code: tag, name: tag } })
    const customers = []
    for (let i = 0; i < 3; i++) {
      const customer = await prisma.customers.create({
        data: {
          CardCode: `${tag}${i}`,
          CardName: tag,
          IndustryC: i === 2 ? null : subgroup,
          NonActive: 'N',
        },
      })
      customers.push(customer)
      customerIds.push(BigInt(String(customer.id)))
    }
    const products = []
    for (const code of productCodes)
      products.push(
        await prisma.product.create({
          data: {
            itemCode: code,
            itemName: code,
            productCategory: tag,
            isActive: !code.endsWith('inactive'),
          },
        }),
      )
    let line = 0
    const purchase = async (customerIndex: number, productIndex: number, canceled = 'N') => {
      await prisma.salesInvoice.create({
        data: {
          companyId: tag,
          docEntry: 1,
          docNum: 1,
          lineNum: line++,
          docDate: new Date('1998-01-01'),
          cardCode: customers[customerIndex].CardCode!,
          itemCode: productCodes[productIndex],
          description: tag,
          quantity: 1,
          inventoryQuantity: 1,
          canceled,
        },
      })
    }
    await purchase(0, 0)
    await purchase(0, 2)
    await purchase(0, 3, 'Y')
    await purchase(1, 0)
    await purchase(1, 1)
    await purchase(2, 4)
    await prisma.returInvoice.create({
      data: {
        companyId: tag,
        docEntry: 1,
        docNum: 1,
        lineNum: 0,
        docDate: new Date(),
        cardCode: customers[0].CardCode!,
        itemCode: productCodes[0],
        description: tag,
        quantity: 1,
        inventoryQuantity: 1,
      },
    })
    const user = {
      id: String(customers[0].id),
      customerId: String(customers[0].id),
      role: { name: 'customer' },
    }
    const req = { user, query: {} }
    const catalog = response()
    await getProductsByCategory(req as any, catalog as any)
    assert.deepEqual(
      catalog.body.data.map((p: any) => p.itemCode),
      [productCodes[0]],
    )
    const categories = response()
    await getCategories(req as any, categories as any)
    assert.deepEqual(
      categories.body.data.map((c: any) => c.code),
      [tag],
    )
    const suggested = response()
    await getProductsByCategory({ ...req, query: { suggested: 'true' } } as any, suggested as any)
    assert.deepEqual(
      suggested.body.data.map((p: any) => p.itemCode),
      [productCodes[1]],
    )
    assert.deepEqual(await customerItemCodes(customers[2].CardCode!, null, true), [])

    const send = async (kind: string, product: any, requestId = randomUUID()) => {
      const res = response()
      await createRequest(
        {
          ...req,
          body: { kind, requestId, items: [{ productId: String(product.id), qty: 2 }], notes: tag },
        } as any,
        res as any,
      )
      return res
    }
    assert.equal((await send('order', products[1])).code, 400)
    assert.equal((await send('quote', products[0])).code, 400)
    assert.equal((await send('order', products[2])).code, 400)
    const orderKey = randomUUID()
    const order = await send('order', products[0], orderKey)
    assert.equal(order.code, 201)
    assert.equal(order.body.data.items[0].qty, 2)
    assert.equal((await send('order', products[0], orderKey)).body.data.id, order.body.data.id)
    const quote = await send('quote', products[1])
    assert.equal(quote.code, 201)
    assert.equal(quote.body.data.items[0].qty, undefined)
    const quoteZero = response()
    await createRequest(
      {
        ...req,
        body: {
          kind: 'quote',
          requestId: randomUUID(),
          items: [{ productId: String(products[1].id), qty: 0 }],
          notes: tag,
        },
      } as any,
      quoteZero as any,
    )
    assert.equal(quoteZero.code, 201)
    const list = response()
    await listRequests(req as any, list as any)
    assert.equal(list.body.data.length, 3)
    const other = response()
    await listRequests(
      { user: { ...user, customerId: String(customers[1].id) } } as any,
      other as any,
    )
    assert.equal(other.body.data.length, 0)
    const followup = response()
    await updateRequest(
      {
        params: { id: quote.body.data.id },
        body: { status: 'processing', salesNotes: 'Harga sedang dikonfirmasi' },
      } as any,
      followup as any,
    )
    assert.equal(followup.code, 200)
    const after = response()
    await listRequests(req as any, after as any)
    assert.equal(
      after.body.data.find((o: any) => o.id === quote.body.data.id)?.salesNotes,
      'Harga sedang dikonfirmasi',
    )
    const invalid = response()
    await updateRequest(
      { params: { id: quote.body.data.id }, body: { status: 'delivered', salesNotes: '' } } as any,
      invalid as any,
    )
    assert.equal(invalid.code, 400)
    const adminOrder = response()
    await createRequest({ user: { role: { name: 'admin' } }, body: {} } as any, adminOrder as any)
    assert.equal(adminOrder.code, 403)
  } finally {
    await prisma.portalRequest.deleteMany({ where: { customerId: { in: customerIds } } })
    await prisma.salesInvoice.deleteMany({ where: { companyId: tag } })
    await prisma.returInvoice.deleteMany({ where: { companyId: tag } })
    await prisma.customers.deleteMany({ where: { id: { in: customerIds } } })
    await prisma.product.deleteMany({ where: { itemCode: { in: productCodes } } })
    await prisma.category.deleteMany({ where: { code: tag } })
    await prisma.subgroups.deleteMany({ where: { IndCode: subgroup } })
    await prisma.$disconnect()
  }
})
