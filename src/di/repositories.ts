/**
 * Composition Root - Dependency Injection Container
 *
 * This is the ONLY place where application layer references infrastructure.
 * All application hooks must import repositories from here, never from
 * infrastructure/ directly.
 *
 * Dependency flow: application/hooks → di/repositories → infrastructure/
 *                  (typed as domain interfaces)
 */

import type { BadgeRepository } from '@/domain/repositories/badge-repository'
import type { CollectionRepository } from '@/domain/repositories/collection-repository'
import type { InteractionRepository } from '@/domain/repositories/interaction-repository'
import type { PromptRepository } from '@/domain/repositories/prompt-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { UserTasteRepository } from '@/domain/repositories/user-taste-repository'
import type { VerificationRepository } from '@/domain/repositories/verification-repository'
import type { ComparisonRepository } from '@/domain/repositories/comparison-repository'

import { supabaseBadgeRepository } from '@/infrastructure/repositories/supabase-badge-repository'
import { supabaseCollectionRepository } from '@/infrastructure/repositories/supabase-collection-repository'
import { supabaseInteractionRepository } from '@/infrastructure/repositories/supabase-interaction-repository'
import { supabasePromptRepository } from '@/infrastructure/repositories/supabase-prompt-repository'
import { supabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { supabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository'
import { supabaseUserTasteRepository } from '@/infrastructure/repositories/supabase-user-taste-repository'
import { supabaseVerificationRepository } from '@/infrastructure/repositories/supabase-verification-repository'
import { gatewayComparisonRepository } from '@/infrastructure/repositories/gateway-comparison-repository'
import { createClient } from '@/infrastructure/supabase/client'

// Repository instances typed as domain interfaces
export const badgeRepository: BadgeRepository = supabaseBadgeRepository
export const collectionRepository: CollectionRepository = supabaseCollectionRepository
export const interactionRepository: InteractionRepository = supabaseInteractionRepository
export const promptRepository: PromptRepository = supabasePromptRepository
export const restaurantRepository: RestaurantRepository = supabaseRestaurantRepository
export const userRepository: UserRepository = supabaseUserRepository
export const userTasteRepository: UserTasteRepository = supabaseUserTasteRepository
export const verificationRepository: VerificationRepository = supabaseVerificationRepository
export const comparisonRepository: ComparisonRepository = gatewayComparisonRepository

// Auth client factory (Supabase-specific, no domain abstraction needed)
export const createAuthClient = createClient
