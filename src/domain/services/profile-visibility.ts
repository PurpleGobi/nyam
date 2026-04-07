// src/domain/services/profile-visibility.ts
// R1: 외부 의존 0

export interface PublicProfileFields {
  id: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  isPublic: boolean
}

interface ProfileLike {
  id: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  isPublic: boolean
}

/**
 * 비공개 유저의 프로필 조회 시 노출할 수 있는 최소 필드만 반환.
 * 공개 유저 또는 본인/팔로워는 전체 필드 반환.
 */
export function filterProfileForViewer<T extends ProfileLike>(
  profile: T,
  viewerId: string | null,
  isFollowing: boolean,
): T | PublicProfileFields {
  // 본인 프로필
  if (viewerId && profile.id === viewerId) return profile
  // 공개 프로필
  if (profile.isPublic) return profile
  // 팔로워
  if (isFollowing) return profile
  // 비공개 + 비팔로워 → 최소 필드만
  return {
    id: profile.id,
    nickname: profile.nickname,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl,
    avatarColor: profile.avatarColor,
    isPublic: false,
  }
}
