import { getSapPrice, getSapStock } from '@/services/sap-api'
import type { RequestHandler } from 'express'

export const checkPrice: RequestHandler = async (req, res) => {
  const { cardcode, itemcode } = req.query

  if (typeof cardcode !== 'string' || typeof itemcode !== 'string') {
    res.status(400).json({
      message: 'cardcode dan itemcode wajib diisi',
    })
    return
  }

  const data = await getSapPrice(cardcode, itemcode)

  res.json(data)
}

export const checkStock: RequestHandler = async (req, res) => {
  const { itemcode } = req.query

  if (typeof itemcode !== 'string') {
    res.status(400).json({
      message: 'itemcode wajib diisi',
    })
    return
  }

  const data = await getSapStock(itemcode)

  res.json(data)
}