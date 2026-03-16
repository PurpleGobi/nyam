import type {
  StyleDnaRegion,
  StyleDnaGenre,
  StyleDnaScene,
} from '../entities/style-dna'

export interface StyleDnaRepository {
  getRegionsByUserId(userId: string): Promise<StyleDnaRegion[]>
  getGenresByUserId(userId: string): Promise<StyleDnaGenre[]>
  getScenesByUserId(userId: string): Promise<StyleDnaScene[]>
  calculateComplementarity(userIdA: string, userIdB: string): Promise<number>
}
