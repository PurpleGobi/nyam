import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { TasteDnaRepository } from '@/domain/repositories/taste-dna-repository'
import type { ExperienceAtlasRepository } from '@/domain/repositories/experience-atlas-repository'
import type { GroupRepository } from '@/domain/repositories/group-repository'

import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { SupabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository'
import { SupabaseTasteDnaRepository } from '@/infrastructure/repositories/supabase-taste-dna-repository'
import { SupabaseExperienceAtlasRepository } from '@/infrastructure/repositories/supabase-experience-atlas-repository'
import { SupabaseGroupRepository } from '@/infrastructure/repositories/supabase-group-repository'

let recordRepo: RecordRepository | null = null
let restaurantRepo: RestaurantRepository | null = null
let userRepo: UserRepository | null = null
let tasteDnaRepo: TasteDnaRepository | null = null
let experienceAtlasRepo: ExperienceAtlasRepository | null = null
let groupRepo: GroupRepository | null = null

export function getRecordRepository(): RecordRepository {
  if (!recordRepo) recordRepo = new SupabaseRecordRepository()
  return recordRepo
}

export function getRestaurantRepository(): RestaurantRepository {
  if (!restaurantRepo) restaurantRepo = new SupabaseRestaurantRepository()
  return restaurantRepo
}

export function getUserRepository(): UserRepository {
  if (!userRepo) userRepo = new SupabaseUserRepository()
  return userRepo
}

export function getTasteDnaRepository(): TasteDnaRepository {
  if (!tasteDnaRepo) tasteDnaRepo = new SupabaseTasteDnaRepository()
  return tasteDnaRepo
}

export function getExperienceAtlasRepository(): ExperienceAtlasRepository {
  if (!experienceAtlasRepo) experienceAtlasRepo = new SupabaseExperienceAtlasRepository()
  return experienceAtlasRepo
}

export function getGroupRepository(): GroupRepository {
  if (!groupRepo) groupRepo = new SupabaseGroupRepository()
  return groupRepo
}
