# 06: AI 인사 + 넛지 스트립

> 홈 상단 AI 인사말 (시간대별, 세션 1회, 5초 자동 소멸)과 넛지 스트립 (우선순위 1개, 액션 버튼)

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-2 AI 인사, §2-3 넛지 스트립 |
| `systems/DATA_MODEL.md` | §5 nudge_history, nudge_fatigue 테이블 |
| `prototype/01_home.html` | `.ai-greeting`, `.nudge-strip` |

---

## 선행 조건

- S1: 인증 (사용자 ID, 세션)
- S2: records 테이블 (최근 기록 조회)
- S4: restaurants 테이블 (식당명 참조)

---

## 구현 범위

### 파일 목록

```
src/domain/entities/nudge.ts                            ← Nudge 엔티티
src/domain/services/nudge-priority.ts                   ← 넛지 우선순위 결정 서비스
src/domain/services/greeting-generator.ts               ← 시간대별 AI 인사말 생성
src/domain/repositories/nudge-repository.ts             ← NudgeRepository 인터페이스
src/infrastructure/repositories/supabase-nudge-repository.ts ← Supabase 구현
src/application/hooks/use-ai-greeting.ts                ← AI 인사말 훅
src/application/hooks/use-nudge.ts                      ← 넛지 스트립 훅
src/presentation/components/home/ai-greeting.tsx        ← AI 인사 컴포넌트
src/presentation/components/home/nudge-strip.tsx        ← 넛지 스트립 컴포넌트
```

### 스코프 외

- 실제 사진 라이브러리 접근 (음식/와인 사진 감지) — Phase 2
- 지역 기반 푸시 알림 (geofence) — Phase 2
- AI 서버 기반 개인화 멘트 생성 — Phase 2 (Phase 1은 로컬 템플릿)

---

## 상세 구현 지침

### 1. Nudge 엔티티

```typescript
// src/domain/entities/nudge.ts

type NudgeType = 'photo' | 'unrated' | 'meal_time';

interface Nudge {
  id: string;
  userId: string;
  nudgeType: NudgeType;
  targetId: string | null;       // 관련 record/restaurant ID
  status: 'sent' | 'opened' | 'acted' | 'dismissed' | 'skipped';
  createdAt: string;
}

interface NudgeFatigue {
  userId: string;
  score: number;                 // 피로도 점수 (높을수록 넛지 억제)
  lastNudgeAt: string | null;
  pausedUntil: string | null;   // 이 시각 전까지 넛지 중지
}

interface NudgeDisplay {
  type: NudgeType;
  icon: string;                  // lucide 아이콘명
  title: string;                 // 볼드 유형명
  subtitle: string;              // 날짜/시간 또는 상세
  actionLabel: string;           // 버튼 텍스트
  actionHref: string;            // 액션 목적지
  targetId: string | null;
}
```

### 2. NudgePriority 서비스

```typescript
// src/domain/services/nudge-priority.ts

class NudgePriorityService {
  /**
   * 우선순위에 따라 표시할 넛지 1개 결정
   * 우선순위: photo(1) > unrated(2) > meal_time(3)
   *
   * 조건:
   * - fatigue.pausedUntil이 현재보다 미래면 null 반환
   * - fatigue.score >= 10이면 null 반환 (과도한 넛지 방지)
   * - 같은 타입 넛지는 24시간 이내 재표시 안 함
   */
  static selectTopNudge(
    candidates: NudgeCandidate[],
    fatigue: NudgeFatigue,
    recentHistory: Nudge[]
  ): NudgeDisplay | null;
}

interface NudgeCandidate {
  type: NudgeType;
  priority: 1 | 2 | 3;
  data: NudgeCandidateData;
}
```

**넛지 후보 생성 조건**:

| 우선순위 | 타입 | 조건 | 아이콘 | 액션 |
|---------|------|------|--------|------|
| 1 | `photo` | 최근 24시간 내 사진에 음식/와인 감지 (Phase 1: 최근 기록 기반 시뮬레이션) | `camera` | "기록" → 기록 플로우 |
| 2 | `unrated` | `status = 'checked'`인 레코드 존재 (등록만 하고 미평가) | `star` | "평가하기" → 기록 상세 |
| 3 | `meal_time` | 현재 시간이 식사 후 시간대 (12:30~14:00, 19:00~21:00) | `utensils` | "기록" → 기록 플로우 |

### 3. GreetingGenerator 서비스

```typescript
// src/domain/services/greeting-generator.ts

interface GreetingContext {
  currentHour: number;              // 0~23
  recentRecords: {
    restaurantName: string;
    satisfaction: number;
    visitDate: string;
    area: string;
    scene: string | null;
  }[];
  weeklyRecordCount: number;
  frequentArea: string | null;      // 최근 2주 가장 많이 방문한 지역
}

interface GreetingResult {
  message: string;                  // 인사말 본문
  restaurantId: string | null;      // data-restaurant-id (탭 시 이동)
}

class GreetingGenerator {
  /**
   * 시간대 + 사용자 기록 기반 인사말 생성
   * Phase 1: 로컬 템플릿 기반
   * Phase 2: AI 서버 생성
   */
  static generate(context: GreetingContext): GreetingResult;
}
```

**시간대별 멘트 템플릿**:

| 시간대 | 시간 범위 | 템플릿 |
|--------|----------|--------|
| 아침 | 6~11시 | 최근 기록 리뷰 — "어제 {식당}은 어떠셨어요?" |
| 점심 | 11~15시 | 지역 패턴 — "이번 주 {지역} 쪽을 자주 가셨네요 — 오늘은 새로운 데 어때요?" |
| 저녁 | 15~21시 | 상황 제안 — "데이트라면 {식당} 다시 가셔도" |
| 밤 | 21~6시 | 기록 요약 — "이번 주 기록 {N}건 — 꾸준히 잘 하고 계세요" |

**템플릿 선택 규칙**:
- `recentRecords.length === 0` → 기본 환영 메시지 ("오늘도 맛있는 하루 보내세요!")
- `recentRecords.length > 0` → 시간대별 템플릿에 데이터 바인딩
- `restaurantId` 설정: 식당명이 언급된 경우에만 해당 restaurant.id 할당

### 4. NudgeRepository 인터페이스

```typescript
// src/domain/repositories/nudge-repository.ts

interface NudgeRepository {
  getRecentHistory(userId: string, hours: number): Promise<Nudge[]>;
  getFatigue(userId: string): Promise<NudgeFatigue>;
  createNudge(nudge: Omit<Nudge, 'id' | 'createdAt'>): Promise<void>;
  updateStatus(id: string, status: Nudge['status']): Promise<void>;
  incrementFatigue(userId: string): Promise<void>;
}
```

### 5. AIGreeting 컴포넌트

```typescript
interface AIGreetingProps {
  message: string;
  restaurantId: string | null;
  onDismiss: () => void;
}
```

```css
.ai-greeting {
  padding: 14px 20px 12px;
  background: var(--bg);
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  cursor: default;
}
.ai-greeting.dismissing {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.ai-greeting-text {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.55;
  color: var(--text);
}

.ai-greeting-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-hint);
}

.ai-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--positive); /* #7EAE8B */
  animation: aiPulse 2s ease infinite;
}

@keyframes aiPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

- 위치: 앱 헤더 아래, 넛지 스트립 위
- 서브텍스트: "● nyam AI · 나의 기록 기반"
- AI dot: 5x5px, `--positive` (#7EAE8B), `aiPulse` 2s
- 소멸: 5초 후 자동 (`opacity + max-height` fade out, transition 0.6s cubic-bezier)
- 세션 내 1회만 (`sessionStorage` 플래그)
- `data-restaurant-id` 있으면 탭 시 `/restaurants/${restaurantId}` 이동

### 6. useAIGreeting 훅

```typescript
// src/application/hooks/use-ai-greeting.ts

function useAIGreeting(): {
  greeting: GreetingResult | null;
  isVisible: boolean;
  dismiss: () => void;
}
```

- 세션 첫 방문 시 1회만 생성 (`sessionStorage.getItem('greeting_shown')` 체크)
- 5초 타이머 후 `dismiss()` 자동 호출
- `dismiss()`: `.dismissing` 클래스 추가 → 600ms 후 `isVisible = false`

### 7. NudgeStrip 컴포넌트

```typescript
interface NudgeStripProps {
  nudge: NudgeDisplay;
  onAction: () => void;
  onDismiss: () => void;
}
```

```css
.nudge-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--accent-food-light); /* #F5EDE8 */
  border-bottom: 1px solid rgba(193, 123, 94, 0.15);
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.nudge-strip.dismissing {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.nudge-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent-food); /* #C17B5E */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nudge-icon svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.nudge-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.nudge-text strong {
  font-weight: 700;
}

.nudge-action {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-food);
  background: rgba(193, 123, 94, 0.12);
  border-radius: 8px;
  padding: 6px 12px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.nudge-close {
  font-size: 16px;
  color: var(--text-hint);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
```

- 최대 1개만 표시
- 아이콘 매핑: photo → `camera`, unrated → `star`, meal_time → `utensils`
- 텍스트 형식: `<strong>{유형}</strong> · {날짜/시간}`
- 소멸: AI 인사말과 함께 5초 후 자동 + 수동 닫기(✕)
- ✕ 탭 시 `nudge_history.status = 'dismissed'` 업데이트 + fatigue 증가
- 액션 버튼 탭 시 `status = 'acted'` 업데이트 + 해당 플로우 이동

### 8. useNudge 훅

```typescript
// src/application/hooks/use-nudge.ts

function useNudge(): {
  nudge: NudgeDisplay | null;
  isVisible: boolean;
  handleAction: () => void;
  handleDismiss: () => void;
}
```

- `NudgePriorityService.selectTopNudge()` 호출로 표시할 넛지 결정
- `isVisible`: AI 인사와 동기화 (5초 후 함께 소멸)
- `handleDismiss()`: nudge_history 상태 갱신 + fatigue 증가 + `.dismissing` 애니메이션

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `.ai-greeting` | `AIGreeting` |
| `prototype/01_home.html` `.nudge-strip` | `NudgeStrip` |

---

## 데이터 흐름

```
[세션 시작] → useAIGreeting()
  → GreetingGenerator.generate({ currentHour, recentRecords, weeklyCount, frequentArea })
  → AIGreeting(message, restaurantId)
  → 5초 후 dismiss → opacity 0 + max-height 0

[세션 시작] → useNudge()
  → NudgeRepository.getRecentHistory() + getFatigue()
  → NudgePriorityService.selectTopNudge(candidates, fatigue, history)
  → NudgeStrip(nudge) — 1개만
  → 5초 후 자동 소멸 또는 수동 ✕/액션

[넛지 액션] → handleAction() → router.push(actionHref) + status='acted'
[넛지 닫기] → handleDismiss() → status='dismissed' + fatigue++
```

---

## 검증 체크리스트

```
□ AI 인사: 15px/500, line-height 1.55
□ AI 인사: 서브텍스트 "● nyam AI · 나의 기록 기반", 11px --text-hint
□ AI 인사: AI dot 5x5 --positive, aiPulse 2s 애니메이션
□ AI 인사: 5초 후 자동 소멸 (opacity + max-height, 0.6s cubic-bezier)
□ AI 인사: 세션 내 1회만 (새로고침 후 미표시)
□ AI 인사: data-restaurant-id 있으면 탭 시 식당 상세 이동
□ AI 인사: 시간대별 멘트 (아침/점심/저녁/밤) 정상 분기
□ 넛지: max 1개 표시, 우선순위 photo > unrated > meal_time
□ 넛지: --accent-food-light 배경, border-bottom rgba(193,123,94,0.15)
□ 넛지: 28x28 아이콘 (radius 8px, --accent-food 배경, 흰색 SVG 14x14)
□ 넛지: 액션 버튼 12px 700, rgba(193,123,94,0.12) 배경
□ 넛지: ✕ 닫기 16px --text-hint
□ 넛지: 5초 후 자동 소멸 (AI 인사와 동기)
□ 넛지: fatigue >= 10이면 미표시
□ 넛지: 같은 타입 24시간 이내 재표시 방지
□ 360px: 인사말/넛지 줄바꿈 정상
□ R1~R5 위반 없음 (GreetingGenerator, NudgePriorityService → domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
