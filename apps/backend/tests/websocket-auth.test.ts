import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'websocket-auth-test-secret'
const { generateToken, verifyAccessToken } = await import('../src/utils/jwt/index.ts')

test('WebSocket authentication accepts the token issued by login', () => {
  assert.deepEqual(verifyAccessToken(generateToken({ id: '42' })), { userId: 42 })
})

test('WebSocket authentication rejects missing, invalid and expired identities', () => {
  for (const id of [undefined, 'abc', '0', '-1', '1.5']) {
    const token = jwt.sign({ id }, process.env.JWT_SECRET!)
    assert.equal(verifyAccessToken(token), null)
  }
  assert.equal(verifyAccessToken('invalid-token'), null)
  assert.equal(
    verifyAccessToken(jwt.sign({ id: '42' }, process.env.JWT_SECRET!, { expiresIn: -1 })),
    null,
  )
})
