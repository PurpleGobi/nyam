import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { TasteDnaRepository } from '@/domain/repositories/taste-dna-repository'
import type { StyleDnaRepository } from '@/domain/repositories/style-dna-repository'
import type { GroupRepository } from '@/domain/repositories/group-repository'

import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { SupabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository'
import { SupabaseTasteDnaRepository } from '@/infrastructure/repositories/supabase-taste-dna-repository'
import { SupabaseStyleDnaRepository } from '@/infrastructure/repositories/supabase-style-dna-repository'
import { SupabaseGroupRepository } from '@/infrastructure/repositories/supabase-group-repository'

let recordRepo: RecordRepository | null = null
let restaurantRepo: RestaurantRepository | null = null
let userRepo: UserRepository | null = null
let tasteDnaRepo: TasteDnaRepository | null = null
let styleDnaRepo: StyleDnaRepository | null = null
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

export function getStyleDnaRepository(): StyleDnaRepository {
  if (!styleDnaRepo) styleDnaRepo = new SupabaseStyleDnaRepository()
  return styleDnaRepo
}

export function getGroupRepository(): GroupRepository {
  if (!groupRepo) groupRepo = new SupabaseGroupRepository()
  return groupRepo
}
