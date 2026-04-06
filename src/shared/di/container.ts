// shared/di/container.ts — 조합 루트
// 유일하게 infrastructure를 import하는 곳
import { createClient } from '@/infrastructure/supabase/client'
import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { SupabaseWineRepository } from '@/infrastructure/repositories/supabase-wine-repository'
import { SupabasePhotoRepository } from '@/infrastructure/repositories/supabase-photo-repository'
import { SupabaseXpRepository } from '@/infrastructure/repositories/supabase-xp-repository'
import { SupabaseNotificationRepository } from '@/infrastructure/repositories/supabase-notification-repository'
import { SupabaseBubbleRepository } from '@/infrastructure/repositories/supabase-bubble-repository'
import { SupabaseFollowRepository } from '@/infrastructure/repositories/supabase-follow-repository'
import { SupabaseSavedFilterRepository } from '@/infrastructure/repositories/supabase-saved-filter-repository'
import { SupabaseDiscoverRepository } from '@/infrastructure/repositories/supabase-discover-repository'
import { SupabaseProfileRepository } from '@/infrastructure/repositories/supabase-profile-repository'
import { SupabaseSettingsRepository } from '@/infrastructure/repositories/supabase-settings-repository'
import { SupabaseCommentRepository } from '@/infrastructure/repositories/supabase-comment-repository'
import { SupabaseReactionRepository } from '@/infrastructure/repositories/supabase-reaction-repository'
import { SupabaseOnboardingRepository } from '@/infrastructure/repositories/supabase-onboarding-repository'
import { SupabaseFilterStateRepository } from '@/infrastructure/repositories/supabase-filter-state-repository'
import { resizeImage, uploadImage, deleteImage } from '@/infrastructure/storage/image-upload'
import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { WineRepository } from '@/domain/repositories/wine-repository'
import type { PhotoRepository } from '@/domain/repositories/photo-repository'
import type { ImageService } from '@/domain/services/image-service'
import type { XpRepository } from '@/domain/repositories/xp-repository'
import type { NotificationRepository } from '@/domain/repositories/notification-repository'
import type { BubbleRepository } from '@/domain/repositories/bubble-repository'
import type { FollowRepository } from '@/domain/repositories/follow-repository'
import type { SavedFilterRepository } from '@/domain/repositories/saved-filter-repository'
import type { DiscoverRepository } from '@/domain/repositories/discover-repository'
import type { ProfileRepository } from '@/domain/repositories/profile-repository'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import type { CommentRepository } from '@/domain/repositories/comment-repository'
import type { ReactionRepository } from '@/domain/repositories/reaction-repository'
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository'
import type { FilterStateRepository } from '@/domain/repositories/filter-state-repository'

export function getSupabaseClient() {
  return createClient()
}

export { signInWithProvider, signOutUser } from '@/infrastructure/supabase/auth-service'

// Repositories
export const recordRepo: RecordRepository = new SupabaseRecordRepository()
export const restaurantRepo: RestaurantRepository = new SupabaseRestaurantRepository()
export const wineRepo: WineRepository = new SupabaseWineRepository()
export const photoRepo: PhotoRepository = new SupabasePhotoRepository()
export const imageService: ImageService = { resizeImage, uploadImage, deleteImage }
export const xpRepo: XpRepository = new SupabaseXpRepository()
export const notificationRepo: NotificationRepository = new SupabaseNotificationRepository()
export const bubbleRepo: BubbleRepository = new SupabaseBubbleRepository()
export const followRepo: FollowRepository = new SupabaseFollowRepository()
export const savedFilterRepo: SavedFilterRepository = new SupabaseSavedFilterRepository()
export const discoverRepo: DiscoverRepository = new SupabaseDiscoverRepository()
export const profileRepo: ProfileRepository = new SupabaseProfileRepository()
export const settingsRepo: SettingsRepository = new SupabaseSettingsRepository()
export const commentRepo: CommentRepository = new SupabaseCommentRepository()
export const reactionRepo: ReactionRepository = new SupabaseReactionRepository()
export const onboardingRepo: OnboardingRepository = new SupabaseOnboardingRepository()
export const filterStateRepo: FilterStateRepository = new SupabaseFilterStateRepository()

/** Upload a bubble icon image: resize to 256x256 WebP, store in avatars bucket */
export async function uploadBubbleIcon(file: File, userId: string): Promise<string> {
  const blob = await resizeBubbleIconBlob(file)
  const supabase = createClient()
  const path = `bubble-icons/${userId}_${Date.now()}.webp`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/webp', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

function resizeBubbleIconBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context not available')); return }
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      canvas.toBlob(
        (b) => { if (b) resolve(b); else reject(new Error('Blob failed')) },
        'image/webp',
        0.85,
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}
