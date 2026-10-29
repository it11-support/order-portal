import { sapApi } from '@/utils/sap-api'

export const getSapPrice = async (
  cardcode: string,
  itemcode: string,
) => {
  const { data } = await sapApi.get('/api/price', {
    params: { cardcode, itemcode },
  })

  return data
}

export const getSapStock = async (itemcode: string) => {
  const { data } = await sapApi.get('/api/stock', {
    params: { itemcode },
  })

  return data
}