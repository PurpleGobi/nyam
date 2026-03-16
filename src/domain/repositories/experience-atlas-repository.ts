import type {
  ExperienceAtlasRegion,
  ExperienceAtlasGenre,
  ExperienceAtlasScene,
} from '../entities/experience-atlas'

export interface ExperienceAtlasRepository {
  getRegionsByUserId(userId: string): Promise<ExperienceAtlasRegion[]>
  getGenresByUserId(userId: string): Promise<ExperienceAtlasGenre[]>
  getScenesByUserId(userId: string): Promise<ExperienceAtlasScene[]>
  calculateComplementarity(userIdA: string, userIdB: string): Promise<number>
}
