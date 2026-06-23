import { AxiosRequestConfig } from "axios"
import { api } from "./api"

export const swrFetcher = async <T = any>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  if (typeof args === 'string') {
    const res = await api.get<T>(args)
    return res.data
  }

  const [url, config] = args
  const res = await api.get<T>(url, config)
  return res.data
}