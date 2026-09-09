import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import requestRoutes from '../src/routes/requests/index'

test('request endpoints enforce authentication and sales-admin permissions over HTTP', async () => {
  const app = express()
  app.use(express.json())
  app.use('/requests', requestRoutes)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const port = (server.address() as { port: number }).port
  const url = `http://127.0.0.1:${port}/requests`
  try {
    assert.equal((await fetch(url)).status, 401)
    const token = (role: string) =>
      jwt.sign({ id: 1, role: { name: role } }, process.env.JWT_SECRET!)
    for (const role of ['customer', 'admin', 'sales_admin']) {
      const headers = { Authorization: `Bearer ${token(role)}`, 'Content-Type': 'application/json' }
      if (role === 'customer') {
        assert.equal(
          (await fetch(`${url}/unknown`, { method: 'PATCH', headers, body: '{}' })).status,
          403,
        )
      } else {
        assert.equal((await fetch(url, { method: 'POST', headers, body: '{}' })).status, 403)
        assert.equal(
          (await fetch(`${url}/unknown`, { method: 'PATCH', headers, body: '{}' })).status,
          404,
        )
      }
    }
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
