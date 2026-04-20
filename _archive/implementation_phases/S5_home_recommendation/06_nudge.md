# 06: AI 인사 + 넛지 스트립

> 홈 상단 AI 인사말 (시간대별, 세션 1회, 5초 자동 소멸). 넛지 스트립은 미구현.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-2 AI 인사, §2-3 넛지 스트립 |
| `prototype/01_home.html` | `.ai-greeting`, `.nudge-strip` |

---

## 구현 상태

### 구현 완료

```
src/domain/services/greeting-generator.ts               ← 시간대별 AI 인사말 생성
src/application/hooks/use-ai-greeting.ts                ← AI 인사말 훅
src/presentation/components/home/ai-greeting.tsx        ← AI 인사 컴포넌트
```

### 미구현

```
(넛지 시스템 전체 미구현)
- src/domain/entities/nudge.ts                          ← Nudge 엔티티
- src/domain/services/nudge-priority.ts                 ← 넛지 우선순위 결정 서비스
- src/domain/repositories/nudge-repository.ts           ← NudgeRepository 인터페이스
- src/infrastructure/repositories/supabase-nudge-repository.ts
- src/application/hooks/use-nudge.ts                    ← 넛지 스트립 훅
- src/presentation/components/home/nudge-strip.tsx      ← 넛지 스트립 컴포넌트
```

---

## 상세 구현 현황

### 1. GreetingGenerator 서비스

```typescript
// src/domain/services/greeting-generator.ts

interface GreetingContext {
  currentHour: number
  recentRecords: {
    restaurantName: string
    restaurantId: string
    satisfaction: number
    visitDate: string
    area: string
    scene: string | null
  }[]
  weeklyRecordCount: number
  frequentArea: string | null
}

interface GreetingResult {
  message: string
  restaurantId: string | null   // 탭 시 해당 식당으로 이동
}

function generateGreeting(context: GreetingContext): GreetingResult
```

- 시간대별 멘트 템플릿: 아침(6~11시), 점심(11~15시), 저녁(15~21시), 밤(21~6시)
- `recentRecords.length === 0` → 기본 환영 메시지
- `recentRecords.length > 0` → 시간대별 템플릿에 데이터 바인딩

### 2. useAiGreeting 훅

```typescript
function useAiGreeting(params: {
  recentRecords: GreetingContext['recentRecords']
  weeklyRecordCount: number
  frequentArea: string | null
}): {
  greeting: GreetingResult
  isVisible: boolean
  isDismissing: boolean
  dismiss: () => void
}
```

- 세션 첫 방문 시 1회만 생성 (`sessionStorage` 'nyam_greeting_shown')
- 5초 타이머 후 `dismiss()` 자동 호출
- `dismiss()`: isDismissing=true → 600ms 후 isVisible=false + sessionStorage 설정
- `generateGreeting()` 로컬 호출 (서버 API 없음)

### 3. AIGreeting 컴포넌트

```typescript
interface AiGreetingProps {
  greeting: GreetingResult
  isDismissing: boolean
  onDismiss: () => void
}
```

- 위치: 앱 헤더 아래, HomeTabs 위
- 텍스트: 15px/500, line-height 1.55, letter-spacing -0.2px
- 서브텍스트: "● nyam AI · 나의 기록 기반" (11px, --text-hint)
- AI dot: 5x5px, `--positive` (#7EAE8B), `animate-[aiPulse_2s_ease_infinite]`
- 소멸 애니메이션: max-height 0 + opacity 0 + padding 0 (0.6s cubic-bezier)
- `data-restaurant-id` 있으면 클릭 시 `/restaurants/${restaurantId}` 이동

### 4. HomeContainer에서의 사용

```typescript
// 최근 기록 5건으로 인사말 컨텍스트 생성
const recentRecordsForGreeting = records
  .filter(r => r.targetType === 'restaurant' && r.visitDate)
  .slice(0, 5)
  .map(r => ({ restaurantName, restaurantId, satisfaction, visitDate, area, scene }))

const weeklyRecordCount = records.filter(r => visitDate >= oneWeekAgo).length

const { greeting, isVisible, isDismissing, dismiss } = useAiGreeting({
  recentRecords: recentRecordsForGreeting,
  weeklyRecordCount,
  frequentArea: null,
})
```

---

## 넛지 스트립 (미구현 — Phase 2 계획)

넛지 시스템 전체가 미구현 상태. Phase 2에서 구현 예정:

- Nudge 엔티티 (photo/unrated/meal_time 타입)
- NudgePriority 서비스 (우선순위: photo > unrated > meal_time)
- NudgeRepository (nudge_history, nudge_fatigue 테이블)
- NudgeStrip 컴포넌트 (최대 1개, 액션 버튼, ✕ 닫기)
- 피로도 관리 (fatigue >= 10 시 미표시)
- 동일 타입 24시간 재표시 방지

---

## 데이터 흐름

```
[세션 시작] → useAiGreeting()
  → generateGreeting({ currentHour, recentRecords, weeklyCount, frequentArea })
  → AiGreeting(greeting, isDismissing)
  → 5초 후 dismiss → opacity 0 + max-height 0 → isVisible=false
```

---

## 검증 체크리스트

```
□ AI 인사: 15px/500, line-height 1.55
□ AI 인사: 서브텍스트 "● nyam AI · 나의 기록 기반", 11px --text-hint
□ AI 인사: AI dot 5x5 --positive, aiPulse 2s 애니메이션
□ AI 인사: 5초 후 자동 소멸 (max-height + opacity + padding)
□ AI 인사: 세션 내 1회만 (sessionStorage)
□ AI 인사: data-restaurant-id 있으면 탭 시 식당 상세 이동
□ AI 인사: 시간대별 멘트 (아침/점심/저녁/밤) 정상 분기
□ 넛지 스트립: 미구현 (Phase 2)
□ R1~R5 위반 없음 (greeting-generator → domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
