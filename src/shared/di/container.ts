// shared/di/container.ts — 조합 루트
// 유일하게 infrastructure를 import하는 곳
import { createClient } from '@/infrastructure/supabase/client'
import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { SupabaseWineRepository } from '@/infrastructure/repositories/supabase-wine-repository'
import { SupabaseWishlistRepository } from '@/infrastructure/repositories/supabase-wishlist-repository'
import { SupabasePhotoRepository } from '@/infrastructure/repositories/supabase-photo-repository'
import { SupabaseXpRepository } from '@/infrastructure/repositories/supabase-xp-repository'
import { SupabaseNotificationRepository } from '@/infrastructure/repositories/supabase-notification-repository'
import { SupabaseBubbleRepository } from '@/infrastructure/repositories/supabase-bubble-repository'
import { SupabaseFollowRepository } from '@/infrastructure/repositories/supabase-follow-repository'
import { resizeImage, uploadImage, deleteImage } from '@/infrastructure/storage/image-upload'
import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { WineRepository } from '@/domain/repositories/wine-repository'
import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'
import type { PhotoRepository } from '@/domain/repositories/photo-repository'
import type { ImageService } from '@/domain/services/image-service'
import type { XpRepository } from '@/domain/repositories/xp-repository'
import type { NotificationRepository } from '@/domain/repositories/notification-repository'
import type { BubbleRepository } from '@/domain/repositories/bubble-repository'
import type { FollowRepository } from '@/domain/repositories/follow-repository'

export function getSupabaseClient() {
  return createClient()
}

export { signInWithProvider, signOutUser } from '@/infrastructure/supabase/auth-service'

// Repositories
export const recordRepo: RecordRepository = new SupabaseRecordRepository()
export const restaurantRepo: RestaurantRepository = new SupabaseRestaurantRepository()
export const wineRepo: WineRepository = new SupabaseWineRepository()
export const wishlistRepo: WishlistRepository = new SupabaseWishlistRepository()
export const photoRepo: PhotoRepository = new SupabasePhotoRepository()
export const imageService: ImageService = { resizeImage, uploadImage, deleteImage }
export const xpRepo: XpRepository = new SupabaseXpRepository()
export const notificationRepo: NotificationRepository = new SupabaseNotificationRepository()
export const bubbleRepo: BubbleRepository = new SupabaseBubbleRepository()
export const followRepo: FollowRepository = new SupabaseFollowRepository()
