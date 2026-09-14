import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as bcrypt from 'bcrypt'
import { prisma } from '../src/utils/prisma/index'
import {
  enableCustomerLogin,
  disableCustomerLogin,
  getCustomers,
} from '../src/controllers/customers/index'
import { login } from '../src/controllers/auth/index'
import { requireAdmin } from '../src/auth/middleware'

function response() {
  return {
    code: 200,
    body: undefined as any,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.code = code
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
  }
}

test('customer login credentials are stored only on User', async (t) => {
  const mockMethod = (target: any, key: string, implementation: (...args: any[]) => any) => {
    const original = target[key]
    const mocked = t.mock.fn(implementation)
    target[key] = mocked
    t.after(() => {
      target[key] = original
    })
    return mocked
  }

  const customer = {
    id: '123',
    CardCode: 'TEST123',
    CardName: 'Test Customer',
    NonActive: 'N',
    createdAt: null,
    updatedAt: null,
  }
  let findCustomerImpl: (...args: any[]) => any = async () => customer
  let findUserImpl: (...args: any[]) => any = async () => null
  let findLinkedUserImpl: (...args: any[]) => any = async () => null
  let createdUser: any

  mockMethod(prisma.customers, 'findUnique', (args: any) => findCustomerImpl(args))
  mockMethod(prisma.user, 'findUnique', (args: any) => findUserImpl(args))
  mockMethod(prisma.user, 'findFirst', (args: any) => findLinkedUserImpl(args))
  mockMethod(prisma.role, 'findUnique', async () => ({
    id: 3,
    name: 'customer',
    createdAt: null,
  }))
  const createUser = mockMethod(prisma.user, 'create', async (args: any) => {
    createdUser = args.data
    return { ...args.data, id: 99, createdAt: null, updatedAt: null }
  })

  const provision = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, provision as any)
  assert.equal(provision.code, 200)
  const credentials = provision.body.data
  assert.equal(credentials.username, customer.CardCode)
  assert.match(credentials.password, /^[A-Za-z0-9]{6}$/)
  assert.match(credentials.password, /[A-Za-z]/)
  assert.match(credentials.password, /[0-9]/)
  assert.equal('password' in customer, false)
  assert.equal('loginPasswordEncrypted' in customer, false)
  assert.notEqual(createdUser.password, credentials.password)
  assert.ok(await bcrypt.compare(credentials.password, createdUser.password))
  assert.equal(createdUser.customerId, 123n)
  assert.equal(provision.headers['Cache-Control'], 'no-store')
  assert.equal(createUser.mock.callCount(), 1)

  findUserImpl = async () => ({
    ...createdUser,
    id: 99,
    role: { id: 3, name: 'customer', createdAt: null },
    customer,
  })
  mockMethod(prisma.user, 'findUnique', (args: any) => findUserImpl(args))
  const authenticated = response()
  await login({ body: credentials } as any, authenticated as any)
  assert.equal(authenticated.code, 200)
  assert.equal(authenticated.body.user.username, customer.CardCode)
  assert.equal(authenticated.body.user.role.name, 'customer')
  assert.equal('password' in authenticated.body.user, false)
  const claims = JSON.parse(
    Buffer.from(authenticated.body.token.split('.')[1], 'base64url').toString(),
  )
  assert.equal('password' in claims, false)

  mockMethod(prisma.customers, 'count', async () => 1)
  mockMethod(prisma.customers, 'findMany', async () => [
    { ...customer, user: { isActive: true } },
  ])
  const listed = response()
  await getCustomers({ query: {}, user: { role: { name: 'customer' } } } as any, listed as any)
  const row = listed.body.data[0]
  assert.equal(row.hasLogin, true)
  assert.equal('loginPassword' in row, false)
  assert.equal('password' in row, false)
  assert.equal(listed.headers['Cache-Control'], 'no-store')

  const updateMany = mockMethod(prisma.user, 'updateMany', async () => ({ count: 1 }))
  const disabled = response()
  await disableCustomerLogin({ params: { id: '123' } } as any, disabled as any)
  assert.equal(disabled.code, 200)
  assert.equal(disabled.body.data.hasLogin, false)
  assert.equal(updateMany.mock.callCount(), 1)
})

test('only admin can provision login', () => {
  for (const role of ['customer', 'sales_admin', 'admin']) {
    const res = response()
    let allowed = false
    requireAdmin({ user: { role: { name: role } } } as any, res as any, () => {
      allowed = true
    })
    assert.equal(allowed, role === 'admin')
    if (!allowed) assert.equal(res.code, 403)
  }
})
