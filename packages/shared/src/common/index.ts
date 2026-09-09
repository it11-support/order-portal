import { MetaData } from '../pagination'

export interface ApiResponse<T> {
  data: T[]
  meta: MetaData
}
