# S4-T04: 찜(Wishlist) CRUD

> 상세 페이지 히어로(L1) 하트 버튼으로 찜 추가/해제
> **변경**: `wishlists` 테이블 대신 `lists` 테이블 사용 (status='wishlist')
> SSOT: `systems/DATA_MODEL.md` lists 테이블

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/DATA_MODEL.md` | lists 테이블 | 스키마, status 필드 (visited/wishlist/cellar/tasted) |
| `pages/02_RESTAURANT_DETAIL.md` | Layer 1 좋아요 버튼 | 하트 토글 UX |
| `pages/03_WINE_DETAIL.md` | Layer 1 좋아요 버튼 | 하트 토글 UX |

---

## 선행 조건

- S1 완료 (lists 마이그레이션)
- S4-T01 완료 (HeroCarousel에 isWishlisted + onWishlistToggle props 존재)

---

## 파일 목록 (구현 완료)

> **변경**: 별도 `wishlist` 도메인/레포지토리 없음. `lists` 테이블과 `RecordRepository` 사용.

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/record.ts` | domain | ListItem 인터페이스 + ListStatus 타입 (visited/wishlist/cellar/tasted) |
| `src/domain/repositories/record-repository.ts` | domain | findListByUserAndTarget, findOrCreateList, deleteList 메서드 |
| `src/infrastructure/repositories/supabase-record-repository.ts` | infrastructure | Supabase 구현체 |
| `src/application/hooks/use-wishlist.ts` | application | 찜 상태 조회 + 토글 |
| `src/presentation/components/detail/wishlist-button.tsx` | presentation | 하트 버튼 (독립 사용 가능) |

---

## Domain: ListItem 엔티티 (record.ts 내)

> **변경**: 별도 `wishlist.ts` 엔티티 없음. `record.ts` 내에 `ListItem` + `ListStatus` 정의.

```typescript
// src/domain/entities/record.ts (관련 부분 발췌)

/** lists.status */
export type ListStatus = 'visited' | 'wishlist' | 'cellar' | 'tasted'

export interface ListItem {
  id: string
  userId: string
  targetId: string
  targetType: RecordTargetType    // 'restaurant' | 'wine'
  status: ListStatus
  source: string
  sourceRecordId: string | null
  createdAt: string
  updatedAt: string
}
```

---

## Domain: RecordRepository 인터페이스 (찜 관련 메서드)

> **변경**: 별도 `WishlistRepository` 없음. `RecordRepository`에 lists 관련 메서드 포함.

```typescript
// src/domain/repositories/record-repository.ts (관련 부분 발췌)

export interface RecordRepository {
  // ... 기록 CRUD 메서드 ...

  /** lists 테이블에서 사용자×대상 관계 조회 */
  findListByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: RecordTargetType,
  ): Promise<ListItem | null>

  /** lists에 찜/방문 등록 (없으면 생성, 있으면 반환) */
  findOrCreateList(
    userId: string,
    targetId: string,
    targetType: RecordTargetType,
    status: ListStatus,
  ): Promise<ListItem>

  /** lists 삭제 (찜 해제) */
  deleteList(listId: string): Promise<void>
}
```

---

## Application: use-wishlist Hook

```typescript
// src/application/hooks/use-wishlist.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { ListStatus } from '@/domain/entities/record'

export interface UseWishlistReturn {
  isWishlisted: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 찜(wishlist) 토글 — lists 테이블 기반
 * status='wishlist' 항목의 존재 여부로 판단
 *
 * ※ WishlistRepository 대신 RecordRepository 사용
 */
export function useWishlist(
  userId: string | null,
  targetId: string | null,
  targetType: 'restaurant' | 'wine',
  repo: RecordRepository,          // ← WishlistRepository가 아닌 RecordRepository
): UseWishlistReturn {
  // 1. 초기 로드: repo.findListByUserAndTarget(userId, targetId, targetType)
  //    → list?.status === 'wishlist' 이면 isWishlisted = true
  // 2. toggle:
  //    isWishlisted === true (찜 해제)
  //      → repo.findListByUserAndTarget → list.status === 'wishlist' 확인
  //      → repo.deleteList(list.id)
  //    isWishlisted === false (찜 추가)
  //      → repo.findOrCreateList(userId, targetId, targetType, 'wishlist')
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
  variant?: 'hero' | 'card'  // 기본값 'card'
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

> **변경**: `supabase-wishlist-repository.ts` 파일 없음. 
> 찜 관련 로직은 `supabase-record-repository.ts` 내 lists 관련 메서드에 포함.

```typescript
// src/infrastructure/repositories/supabase-record-repository.ts (관련 부분)

// findListByUserAndTarget:
//   SELECT * FROM lists WHERE user_id AND target_id AND target_type LIMIT 1

// findOrCreateList:
//   SELECT or INSERT INTO lists (user_id, target_id, target_type, status, source)

// deleteList:
//   DELETE FROM lists WHERE id = listId
```

---

## DI 등록

> **변경**: 별도 `wishlistRepo` 없음. `recordRepo`를 통해 찜 기능 접근.

```typescript
// src/shared/di/container.ts
// recordRepo가 lists 관련 메서드도 포함
export const recordRepo: RecordRepository = new SupabaseRecordRepository()
```

---

## lists 테이블 상태 관리

기록 생성 시 `findOrCreateList`로 lists에 status='visited' 항목이 자동 생성됨.
찜은 별도로 status='wishlist' 항목을 관리.

### 사용 예시 (컨테이너)

```typescript
// restaurant-detail-container.tsx
const { isWishlisted, toggle: toggleWishlist } = useWishlist(
  user?.id ?? null,
  restaurantId,
  'restaurant',
  recordRepo,    // ← WishlistRepository가 아닌 RecordRepository 전달
)
```

---

## 통합 포인트

| 사용처 | hook/컴포넌트 | 방식 |
|--------|--------------|------|
| 식당 상세 | `useWishlist(userId, restaurantId, 'restaurant', recordRepo)` | HeroCarousel `isWishlisted` + `onWishlistToggle` |
| 와인 상세 | `useWishlist(userId, wineId, 'wine', recordRepo)` | HeroCarousel `isWishlisted` + `onWishlistToggle` |
| 홈 카드 (S5) | RecordCard | WishlistButton variant='card' |
| 프로필 (S6) | lists 테이블 조회 | findListByUserAndTarget 기반 |
| 검색 결과 (S3) | SearchResultCard | WishlistButton variant='card' |

---

## RLS 정책

```sql
-- lists는 본인만 CRUD
CREATE POLICY "lists_select_own" ON lists
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "lists_insert_own" ON lists
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "lists_delete_own" ON lists
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "lists_update_own" ON lists
  FOR UPDATE USING (user_id = auth.uid());
```

> RLS는 S1 마이그레이션에서 이미 설정. 여기서는 확인용.
