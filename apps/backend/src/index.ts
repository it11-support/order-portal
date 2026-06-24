import cors from 'cors'
import express from 'express'
import { prisma } from '@utils'
import helmet from 'helmet'
import routes from '@routes'

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

const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

app.use('/api/v1', routes)

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
