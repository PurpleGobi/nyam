import type { TasteDna, TasteDnaWine, TasteDnaHomecook } from '../entities/taste-dna'

export interface TasteDnaRepository {
  getByUserId(userId: string): Promise<TasteDna | null>
  getWineByUserId(userId: string): Promise<TasteDnaWine | null>
  getHomecookByUserId(userId: string): Promise<TasteDnaHomecook | null>
  calculateSimilarity(userIdA: string, userIdB: string): Promise<number>
}
