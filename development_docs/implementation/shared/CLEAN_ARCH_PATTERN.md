# Clean Architecture 구현 패턴

> 모든 기능 구현 시 이 패턴을 따른다. CLAUDE.md의 클린 아키텍처 규칙(R1~R5)의 실행 가이드.

---

## 기능 구현 순서 (절대 규칙)

```
1. domain/entities/       — 타입/인터페이스 정의
2. domain/repositories/   — repository 인터페이스 정의
3. domain/services/       — (필요 시) 순수 비즈니스 로직
4. infrastructure/        — Supabase 구현체
5. application/hooks/     — 비즈니스 로직 hook
6. presentation/components/ — 순수 UI 컴포넌트
7. presentation/containers/ — hook + component 조합
8. app/                   — page.tsx (Container 렌더링만)
```

---

## 레이어별 규칙 요약

### domain/ (순수 — 외부 의존성 0)

```typescript
// ✅ 허용
export interface Restaurant { id: string; name: string; ... }
export interface RestaurantRepository { findById(id: string): Promise<Restaurant | null>; }

// ❌ 금지
import { supabase } from '@/infrastructure/supabase'  // R1 위반
import { useEffect } from 'react'                      // R1 위반
```

### infrastructure/ (domain 인터페이스 구현)

```typescript
// ✅ 허용
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import { supabase } from '@/infrastructure/supabase/client'

export class SupabaseRestaurantRepository implements RestaurantRepository { ... }
```

### application/ (domain 인터페이스에만 의존)

```typescript
// ✅ 허용
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'

export function useRestaurant(repo: RestaurantRepository, id: string) { ... }

// ❌ 금지
import { SupabaseRestaurantRepository } from '@/infrastructure/...'  // R3 위반
```

### presentation/components/ (순수 UI)

```typescript
// ✅ 허용 — props만 받음
export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) { ... }

// ❌ 금지
import { useRestaurant } from '@/application/hooks/...'  // Component에서 hook 금지
```

### presentation/containers/ (조합자)

```typescript
// ✅ 허용 — hook 호출 + component 렌더링
export function RestaurantCardContainer({ id }: { id: string }) {
  const { data } = useRestaurant(repo, id)
  return <RestaurantCard restaurant={data} />
}

// ❌ 금지 — 직접 스타일링
<div className="bg-white p-4 ...">  // Container에서 시각적 스타일 금지
```

### app/ (라우팅만)

```typescript
// ✅ 허용
export default function RestaurantPage() {
  return <RestaurantDetailContainer />
}

// ❌ 금지
const data = await supabase.from('restaurants')...  // R5 위반
```

---

## 의존성 주입 패턴

> DI container는 `shared/di/`에 둔다. `infrastructure/`에 두면 presentation→infrastructure import가 발생하여 R4 위반.

```typescript
// shared/di/container.ts — 조합 루트 (composition root)
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'

export const restaurantRepo: RestaurantRepository = new SupabaseRestaurantRepository()

// presentation/containers/에서 사용
import { restaurantRepo } from '@/shared/di/container'
import { useRestaurant } from '@/application/hooks/use-restaurant'

export function RestaurantDetailContainer({ id }: Props) {
  const { data } = useRestaurant(restaurantRepo, id)
  ...
}
```

> `shared/di/container.ts`는 유일하게 infrastructure를 import할 수 있는 조합 루트.
> presentation은 `@/shared/di/`에서 이미 타입이 domain 인터페이스로 좁혀진 인스턴스를 받으므로 R4를 준수한다.

---

## 파일 네이밍

```
domain/entities/restaurant.ts              # kebab-case
domain/repositories/restaurant-repository.ts
infrastructure/repositories/supabase-restaurant-repository.ts
application/hooks/use-restaurant.ts        # use- prefix
presentation/components/restaurant-card.tsx  # kebab-case, .tsx
presentation/containers/restaurant-detail-container.tsx
```
