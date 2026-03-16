import type { FoodRecord } from '../entities/record'

export interface PaginationParams {
  offset: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  hasMore: boolean
}

export interface RecordRepository {
  getById(id: string): Promise<FoodRecord | null>
  getByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<FoodRecord>>
  create(record: Omit<FoodRecord, 'id' | 'createdAt'>): Promise<FoodRecord>
  update(id: string, record: Partial<FoodRecord>): Promise<FoodRecord>
  delete(id: string): Promise<void>
  search(query: string): Promise<FoodRecord[]>
}
