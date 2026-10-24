import { createServer } from 'http'
import cors from 'cors'
import express from 'express'
import { prisma } from '@utils'
import helmet from 'helmet'
import routes from '@routes'
import { ws } from '@/services/websocket'
import { startSapStatusPoller } from '@/services/sap-poller'
import { defaultLimiter } from './utils/limiter'

const app = express()
app.set('trust proxy', 2)
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    crossOriginEmbedderPolicy: false,
  }),
)

app.use(defaultLimiter)


const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

app.use('/api/v1', routes)

const httpServer = createServer(app)

ws.initialize(httpServer)

httpServer.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
  console.log(`WebSocket server ready`)
})

// Reading a page already reconciles with SAP. This is the other half: telling
// somebody when a delivery completes, without waiting for them to look.
startSapStatusPoller()

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
