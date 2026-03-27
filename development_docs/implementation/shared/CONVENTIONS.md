# Conventions

> 코드 작성 규칙 요약. CLAUDE.md의 코딩 규칙을 실행 수준으로 정리.

---

## 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 | kebab-case | `restaurant-card.tsx` |
| 컴포넌트 | PascalCase | `RestaurantCard` |
| Hook | use- prefix | `useRestaurant` |
| 타입/인터페이스 | PascalCase | `Restaurant`, `RestaurantRepository` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RATING_SCORE` |
| CSS 변수 | --kebab-case | `--accent-food` |

---

## Import 규칙

```typescript
// 절대 경로 (다른 레이어)
import { Restaurant } from '@/domain/entities/restaurant'

// 상대 경로 (같은 폴더 내에서만)
import { formatScore } from './utils'
```

---

## 디자인 토큰 사용

```tsx
// ✅ 올바른 사용
<div className="bg-background text-foreground">
<span className="text-primary">  // 식당 accent
<span className="text-wine">     // 와인 accent

// ❌ 금지
<div className="bg-white">       // 하드코딩
<div className="bg-[#F8F6F3]">   // 직접 색상값
```

---

## 컴포넌트 구조

```tsx
// 1. imports
// 2. types
// 3. component
// 4. export

interface RestaurantCardProps {
  restaurant: Restaurant
  onPress?: () => void
}

function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  return (...)
}

export { RestaurantCard }
```

---

## 금지 사항 (빠른 참조)

- `any`, `as any`, `@ts-ignore`, `!` 남발
- `console.log` (디버깅 후 반드시 제거)
- `SECURITY DEFINER`
- Component에서 Supabase 직접 호출
- `bg-white`, `text-black` 등 하드코딩 컬러
- 문서에 없는 기능 추가
- 마이그레이션 없이 스키마 변경
