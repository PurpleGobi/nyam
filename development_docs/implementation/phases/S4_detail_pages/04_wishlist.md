# S4-T04: 찜(Wishlist) CRUD

> 상세 페이지 히어로(L1) 하트 버튼으로 찜 추가/해제
> SSOT: `systems/DATA_MODEL.md` wishlists 테이블

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/DATA_MODEL.md` | wishlists 테이블 | 스키마, UNIQUE 제약, source 필드, is_visited |
| `pages/02_RESTAURANT_DETAIL.md` | Layer 1 좋아요 버튼 | 하트 토글 UX |
| `pages/03_WINE_DETAIL.md` | Layer 1 좋아요 버튼 | 하트 토글 UX |

---

## 선행 조건

- S1 완료 (wishlists 마이그레이션)
- S4-T01 완료 (HeroCarousel에 isWishlisted + onWishlistToggle props 존재)

---

## 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/wishlist.ts` | domain | Wishlist 인터페이스 |
| `src/domain/repositories/wishlist-repository.ts` | domain | WishlistRepository 인터페이스 |
| `src/infrastructure/repositories/supabase-wishlist-repository.ts` | infrastructure | Supabase 구현체 |
| `src/application/hooks/use-wishlist.ts` | application | 찜 상태 조회 + 토글 |
| `src/presentation/components/detail/wishlist-button.tsx` | presentation | 하트 버튼 (독립 사용 가능) |

---

## Domain: Wishlist 엔티티

```typescript
// src/domain/entities/wishlist.ts
// R1: 외부 의존 0

/** wishlists.source */
export type WishlistSource = 'direct' | 'bubble' | 'ai' | 'web'

/**
 * wishlists 테이블 1:1 매핑
 * DATA_MODEL.md §2 wishlists 테이블
 *
 * UNIQUE(user_id, target_id, target_type) — 동일 대상 중복 찜 불가
 */
export interface Wishlist {
  id: string
  userId: string
  targetId: string
  targetType: 'restaurant' | 'wine'

  /**
   * 찜 출처
   * - direct: 사용자가 직접 찜 (상세 페이지 하트)
   * - bubble: 버블 멤버 기록 보고 찜
   * - ai: AI 추천에서 찜
   * - web: 외부 평점/정보 보고 찜
   */
  source: WishlistSource

  /**
   * source='bubble'일 때 원본 기록 ID
   * source='ai'일 때 ai_recommendations.id 참조 가능
   * → 찜 카드에서 "김영수 93 · 을지로 최고 바베큐" 표시용
   */
  sourceRecordId: string | null

  /**
   * 방문 여부.
   * 기록 생성 시 동일 target의 wishlist.is_visited = true 자동 업데이트
   * (트리거 또는 application layer)
   */
  isVisited: boolean

  createdAt: string
}
```

---

## Domain: WishlistRepository 인터페이스

```typescript
// src/domain/repositories/wishlist-repository.ts
// R1: 외부 의존 0

import type { Wishlist, WishlistSource } from '@/domain/entities/wishlist'

export interface WishlistRepository {
  /**
   * 특정 대상의 찜 여부 확인
   * → SELECT 1 FROM wishlists WHERE user_id AND target_id AND target_type LIMIT 1
   */
  isWishlisted(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<boolean>

  /**
   * 찜 추가
   * → INSERT INTO wishlists (user_id, target_id, target_type, source)
   * → UNIQUE 제약: 이미 존재하면 무시 (ON CONFLICT DO NOTHING)
   */
  add(params: {
    userId: string
    targetId: string
    targetType: 'restaurant' | 'wine'
    source: WishlistSource
    sourceRecordId?: string
  }): Promise<Wishlist>

  /**
   * 찜 해제
   * → DELETE FROM wishlists WHERE user_id AND target_id AND target_type
   */
  remove(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<void>

  /**
   * 내 찜 목록 조회 (target_type별)
   * → SELECT * FROM wishlists WHERE user_id AND target_type ORDER BY created_at DESC
   */
  findByUser(
    userId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<Wishlist[]>

  /**
   * is_visited 업데이트
   * → 기록 생성/삭제 시 호출
   * → UPDATE wishlists SET is_visited = ? WHERE user_id AND target_id AND target_type
   */
  updateVisitStatus(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
    isVisited: boolean,
  ): Promise<void>
}
```

---

## Application: use-wishlist Hook

```typescript
// src/application/hooks/use-wishlist.ts

import { useState, useEffect, useCallback } from 'react'
import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'

export interface UseWishlistReturn {
  isWishlisted: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 찜 상태 조회 + 토글
 *
 * 사용처:
 * - 식당 상세 HeroCarousel (isWishlisted, onWishlistToggle)
 * - 와인 상세 HeroCarousel (isWishlisted, onWishlistToggle)
 * - 검색 결과 카드 (홈 카드에서도 재사용 가능)
 */
export function useWishlist(
  userId: string,
  targetId: string,
  targetType: 'restaurant' | 'wine',
  repo: WishlistRepository,
): UseWishlistReturn {
  // 1. 초기 로드: repo.isWishlisted(userId, targetId, targetType)
  // 2. toggle:
  //    isWishlisted === true
  //      → repo.remove(userId, targetId, targetType)
  //      → setIsWishlisted(false)
  //    isWishlisted === false
  //      → repo.add({ userId, targetId, targetType, source: 'direct' })
  //      → setIsWishlisted(true)
  // 3. 낙관적 업데이트 (UI 즉시 반영, 실패 시 롤백)
}
```

---

## Presentation: 하트 버튼 (`wishlist-button.tsx`)

```typescript
// src/presentation/components/detail/wishlist-button.tsx

interface WishlistButtonProps {
  isWishlisted: boolean
  onToggle: () => void
  /** 히어로 위치에서는 흰색 아이콘, 카드에서는 기본 색상 */
  variant: 'hero' | 'card'
  size?: number    // 기본 20
}
```

**히어로 variant (상세 페이지 L1):**

| 상태 | 아이콘 | 색상 |
|------|--------|------|
| 미찜 | `heart` (outline) | `rgba(255,255,255,0.85)` |
| 찜됨 | `heart` (filled) | `#FF6038` |

**카드 variant:**

| 상태 | 아이콘 | 색상 |
|------|--------|------|
| 미찜 | `heart` (outline) | `var(--text-hint)` |
| 찜됨 | `heart` (filled) | `#FF6038` |

**애니메이션:**
- 찜 추가 시: scale 0 → 1.2 → 1.0 (0.3s ease-out)
- 찜 해제 시: scale 1.0 → 0.8 → 1.0 (0.2s ease)

---

## Infrastructure: Supabase 구현체

```typescript
// src/infrastructure/repositories/supabase-wishlist-repository.ts

import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'
import type { Wishlist, WishlistSource } from '@/domain/entities/wishlist'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseWishlistRepository implements WishlistRepository {

  async isWishlisted(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<boolean> {
    // SELECT id FROM wishlists
    // WHERE user_id = userId AND target_id = targetId AND target_type = targetType
    // LIMIT 1
    // → 결과 있으면 true
  }

  async add(params: {
    userId: string
    targetId: string
    targetType: 'restaurant' | 'wine'
    source: WishlistSource
    sourceRecordId?: string
  }): Promise<Wishlist> {
    // INSERT INTO wishlists (user_id, target_id, target_type, source, source_record_id)
    // ON CONFLICT (user_id, target_id, target_type) DO NOTHING
    // RETURNING *
    //
    // DB 컬럼 → 엔티티 매핑:
    // user_id → userId, target_id → targetId, target_type → targetType,
    // source_record_id → sourceRecordId, is_visited → isVisited,
    // created_at → createdAt
  }

  async remove(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<void> {
    // DELETE FROM wishlists
    // WHERE user_id = userId AND target_id = targetId AND target_type = targetType
  }

  async findByUser(
    userId: string,
    targetType: 'restaurant' | 'wine',
  ): Promise<Wishlist[]> {
    // SELECT * FROM wishlists
    // WHERE user_id = userId AND target_type = targetType
    // ORDER BY created_at DESC
  }

  async updateVisitStatus(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
    isVisited: boolean,
  ): Promise<void> {
    // UPDATE wishlists
    // SET is_visited = isVisited
    // WHERE user_id = userId AND target_id = targetId AND target_type = targetType
  }
}
```

---

## DI 등록

```typescript
// src/shared/di/container.ts

import { SupabaseWishlistRepository } from '@/infrastructure/repositories/supabase-wishlist-repository'
import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'

export const wishlistRepo: WishlistRepository = new SupabaseWishlistRepository()
```

---

## is_visited 자동 업데이트

기록 생성/삭제 시 동일 target의 wishlist.is_visited를 자동 업데이트해야 한다.

### 기록 생성 시

```typescript
// application/hooks/use-create-record.ts 내부 (S2에서 구현, 여기서 확장)

// 기록 저장 성공 후:
await wishlistRepo.updateVisitStatus(userId, targetId, targetType, true)
```

### 기록 삭제 시

```typescript
// application/hooks/use-record-detail.ts → deleteRecord 내부 (S4-T03)

// 기록 삭제 후:
// 같은 target의 다른 기록이 있는지 확인
const remainingRecords = await recordRepo.findByUserAndTarget(userId, targetId, targetType)
if (remainingRecords.length === 0) {
  await wishlistRepo.updateVisitStatus(userId, targetId, targetType, false)
}
```

---

## 통합 포인트

| 사용처 | 컴포넌트 | Props |
|--------|----------|-------|
| 식당 상세 L1 | HeroCarousel | `isWishlisted`, `onWishlistToggle` |
| 와인 상세 L1 | HeroCarousel | `isWishlisted`, `onWishlistToggle` |
| 홈 카드 (S5) | RecordCard | WishlistButton variant='card' |
| 프로필 찜 목록 (S6) | WishlistList | findByUser 기반 목록 |
| 검색 결과 (S3) | SearchResultCard | WishlistButton variant='card' |

---

## RLS 정책

```sql
-- wishlists는 본인만 CRUD
CREATE POLICY "wishlists_select_own" ON wishlists
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wishlists_insert_own" ON wishlists
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "wishlists_delete_own" ON wishlists
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "wishlists_update_own" ON wishlists
  FOR UPDATE USING (user_id = auth.uid());
```

> RLS는 S1 마이그레이션에서 이미 설정. 여기서는 확인용.
