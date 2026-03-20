import type { UserRepository } from "@/domain/repositories/user-repository"
import type { RecordRepository } from "@/domain/repositories/record-repository"
import type { RestaurantRepository } from "@/domain/repositories/restaurant-repository"
import { SupabaseUserRepository } from "@/infrastructure/repositories/supabase-user-repository"
import { SupabaseRecordRepository } from "@/infrastructure/repositories/supabase-record-repository"
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/supabase-restaurant-repository"

export function getUserRepository(): UserRepository {
  return new SupabaseUserRepository()
}

export function getRecordRepository(): RecordRepository {
  return new SupabaseRecordRepository()
}

export function getRestaurantRepository(): RestaurantRepository {
  return new SupabaseRestaurantRepository()
}
