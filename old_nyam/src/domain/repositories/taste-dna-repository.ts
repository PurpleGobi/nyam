import type { TasteDna, TasteDnaWine, TasteDnaCooking } from '../entities/taste-dna'

export interface TasteDnaRepository {
  getByUserId(userId: string): Promise<TasteDna | null>
  getWineByUserId(userId: string): Promise<TasteDnaWine | null>
  getCookingByUserId(userId: string): Promise<TasteDnaCooking | null>
  calculateSimilarity(userIdA: string, userIdB: string): Promise<number>
}
