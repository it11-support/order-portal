import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as bcrypt from 'bcrypt'
import { prisma } from '../src/utils/prisma/index'
import {
  enableCustomerLogin,
  disableCustomerLogin,
  getCustomers,
} from '../src/controllers/customers/index'
import { decryptCustomerPassword, encryptCustomerPassword } from '../src/utils/customer-password'
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

test('customer login provisioning and authentication', async (t) => {
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
    password: null as string | null,
    loginPasswordEncrypted: null as string | null,
    createdAt: null,
    updatedAt: null,
  }
  mockMethod(prisma.customers, 'findUnique', async () => customer)
  mockMethod(prisma.user, 'findUnique', async () => null)
  mockMethod(prisma.role, 'findUnique', async () => ({ id: 3, name: 'customer', createdAt: null }))
  const update = mockMethod(prisma.customers, 'updateMany', async (args: any) => {
    if (args.data.password)
      assert.deepEqual(args.where.AND[0], { OR: [{ password: null }, { password: '' }] })
    customer.password = args.data.password
    customer.loginPasswordEncrypted = args.data.loginPasswordEncrypted
    return { count: 1 }
  })

  const provision = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, provision as any)
  assert.equal(provision.code, 200)
  const credentials = provision.body.data
  assert.equal(credentials.username, customer.CardCode)
  assert.match(credentials.password, /^[A-Za-z0-9]{6}$/)
  assert.match(credentials.password, /[A-Za-z]/)
  assert.match(credentials.password, /[0-9]/)
  assert.notEqual(customer.password, credentials.password)
  assert.ok(await bcrypt.compare(credentials.password, customer.password!))
  assert.equal(decryptCustomerPassword(customer.loginPasswordEncrypted), credentials.password)
  assert.notEqual(customer.loginPasswordEncrypted, credentials.password)
  assert.equal(provision.headers['Cache-Control'], 'no-store')

  const authenticated = response()
  await login({ body: credentials } as any, authenticated as any)
  assert.equal(authenticated.code, 200)
  assert.equal(authenticated.body.user.username, customer.CardCode)
  assert.equal(authenticated.body.user.role.name, 'customer')
  assert.ok(!('password' in authenticated.body.user.customer))
  const claims = JSON.parse(
    Buffer.from(authenticated.body.token.split('.')[1], 'base64url').toString(),
  )
  assert.ok(!('password' in claims.customer))
  assert.ok(!('loginPasswordEncrypted' in claims.customer))

  mockMethod(prisma.customers, 'count', async () => 1)
  mockMethod(prisma.customers, 'findMany', async () => [customer])
  mockMethod(prisma, '$transaction', async (queries: any[]) => Promise.all(queries))
  for (const role of ['admin', 'customer', 'sales_admin']) {
    const listed = response()
    await getCustomers({ query: {}, user: { role: { name: role } } } as any, listed as any)
    const row = listed.body.data[0]
    assert.equal(row.hasLogin, true)
    assert.equal(row.loginPassword, role === 'admin' ? credentials.password : undefined)
    assert.ok(!('password' in row))
    assert.ok(!('loginPasswordEncrypted' in row))
    assert.equal(listed.headers['Cache-Control'], 'no-store')
  }

  const duplicate = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, duplicate as any)
  assert.equal(duplicate.code, 409)
  assert.equal(update.mock.callCount(), 1)

  customer.password = null
  customer.NonActive = 'Y'
  const inactive = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, inactive as any)
  assert.equal(inactive.code, 400)
  customer.NonActive = 'N'
  mockMethod(prisma.user, 'findUnique', async () => ({ id: 1 }))
  const collision = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, collision as any)
  assert.equal(collision.code, 409)
  assert.equal(update.mock.callCount(), 1)

  const invalid = response()
  await enableCustomerLogin({ params: { id: 'invalid' } } as any, invalid as any)
  assert.equal(invalid.code, 400)

  mockMethod(prisma.user, 'findUnique', async () => null)
  const disabled = response()
  await disableCustomerLogin({ params: { id: '123' } } as any, disabled as any)
  assert.equal(disabled.code, 200)
  assert.equal(customer.password, null)
  assert.equal(customer.loginPasswordEncrypted, null)
  const denied = response()
  await login({ body: credentials } as any, denied as any)
  assert.equal(denied.code, 403)
  const reenabled = response()
  await enableCustomerLogin({ params: { id: '123' } } as any, reenabled as any)
  assert.equal(reenabled.code, 200)
  assert.equal(
    decryptCustomerPassword(customer.loginPasswordEncrypted),
    reenabled.body.data.password,
  )
})

test('encrypted passwords reject tampering and support legacy missing values', () => {
  assert.equal(decryptCustomerPassword(null), null)
  assert.equal(decryptCustomerPassword('invalid'), null)
  const encrypted = encryptCustomerPassword('Abc123')
  const [iv, tag, data] = encrypted.split('.')
  const altered = Buffer.from(data, 'base64url')
  altered[0] ^= 1
  assert.equal(decryptCustomerPassword(`${iv}.${tag}.${altered.toString('base64url')}`), null)
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
