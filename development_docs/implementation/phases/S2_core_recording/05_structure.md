# 05: 와인 구조평가 (Structure Evaluation)

> 와인 기록 시 복합성/여운/균형 3개 슬라이더를 조작하여 구조를 평가하고, 만족도를 자동 산출하는 선택적 단계.

---

## SSOT 출처

| 문서 | 섹션 | 내용 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §8 구조 평가 (Structure) | 슬라이더 3개 스펙, 라벨, AI 초기값, 자동산출 공식 |
| `systems/DATA_MODEL.md` | records 테이블 | `complexity INT`, `finish DECIMAL(5,2)`, `balance DECIMAL(5,2)`, `auto_score INT` |
| `pages/05_RECORD_FLOW.md` | §4 와인 통합 기록 화면 | screen-wine-record 내 구조 평가 섹션 |
| `prototype/01_home.html` | screen-wine-record | `.wine-slider-wrap`, `.wine-slider-label`, `.wine-slider`, `.wine-slider-val` |

---

## 선행 조건

- 2.1: 사분면 평가 컴포넌트 완료 (만족도 연동 대상)
- 2.4: 아로마 팔레트 완료 (`aromaRingCount` props 필요)
- `domain/entities/record.ts`에 와인 관련 필드 정의 완료

---

## 구현 범위

### 생성할 파일

| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/presentation/components/record/wine-structure-eval.tsx` | presentation | 슬라이더 3개 UI 컴포넌트 |

> **참고**: `src/domain/entities/wine-structure.ts` (WineStructure 타입, calculateAutoScore, finishToSeconds, getComplexityInitialValue 함수)는 S2-T01(01_domain.md)에서 이미 정의된다. 이 태스크는 해당 타입/함수를 import하여 UI 컴포넌트 구현에 집중한다.

### 스코프 외

- 아로마 팔레트 컴포넌트 (별도 태스크)
- 사분면 만족도 연동 로직 (통합 기록 화면 태스크에서 조합)
- AI 초기값 계산 (Gemini API 연동 — S3에서 구현, 여기서는 `aromaRingCount` props로 대체)

---

## 상세 구현 지침

### 1. Domain 타입 및 순수 함수 (참조)

> 타입 및 계산 함수는 2.1(domain 엔티티)에서 정의된다. 이 태스크는 UI 컴포넌트 구현에 집중한다.

**참조 파일**: `src/domain/entities/wine-structure.ts` (01_domain.md에서 생성)

이 태스크에서 import하여 사용하는 항목:
- `WineStructure` — 구조평가 값 객체 (complexity, finish, balance)
- `calculateAutoScore(activeRingCount, finish, balance)` — 만족도 자동 산출
- `finishToSeconds(value)` — 여운 초 환산
- `getComplexityInitialValue(activeRingCount)` — 복합성 AI 기본값

```typescript
import type { WineStructure } from '@/domain/entities/wine-structure'
import {
  calculateAutoScore,
  finishToSeconds,
  getComplexityInitialValue,
} from '@/domain/entities/wine-structure'
```

추가로 이 컴포넌트에서 사용하는 상수 및 헬퍼 (컴포넌트 파일 내부에 정의):

```typescript
/** 구조평가 기본값 (슬라이더 초기 위치) */
const DEFAULT_WINE_STRUCTURE: WineStructure = {
  complexity: 50,
  finish: 50,
  balance: 50,
}

/** 여운 값을 표시 문자열로 변환. 예: 72 → "11초+" */
function formatFinishDisplay(value: number): string {
  const sec = finishToSeconds(value)
  return `${sec}초+`
}
```

### 2. Presentation 컴포넌트

**파일**: `src/presentation/components/record/wine-structure-eval.tsx`

```typescript
interface WineStructureEvalProps {
  /** 현재 구조평가 값 */
  value: { complexity: number; finish: number; balance: number }
  /** 값 변경 콜백 */
  onChange: (value: { complexity: number; finish: number; balance: number }) => void
  /** 아로마 휠에서 선택된 링 수 (1~3). 복합성 AI 기본값 + 자동산출에 사용 */
  aromaRingCount: number
  /** 자동 산출 만족도 변경 콜백. 슬라이더 조작 시마다 호출 */
  onAutoScoreChange: (autoScore: number) => void
}
```

#### 렌더링 구조

```
<div className="wine-structure-eval">
  <div className="rest-record-section-title">
    구조 평가 (Structure)
  </div>

  {/* 복합성 슬라이더 */}
  <div className="wine-slider-wrap">
    <div className="wine-slider-label">
      <span>복합성</span>
      <span className="wine-slider-val">{value.complexity}</span>
    </div>
    <input
      type="range"
      className="wine-slider"
      min={0}
      max={100}
      value={value.complexity}
      onChange={handleComplexityChange}
    />
    <div className="wine-slider-sub-labels">
      <span>1차향 (과일/꽃)</span>
      <span>2차향 (발효)</span>
      <span>3차향 (숙성)</span>
    </div>
  </div>

  {/* 여운 슬라이더 */}
  <div className="wine-slider-wrap">
    <div className="wine-slider-label">
      <span>여운</span>
      <span className="wine-slider-val">{formatFinishDisplay(value.finish)}</span>
    </div>
    <input
      type="range"
      className="wine-slider"
      min={0}
      max={100}
      value={value.finish}
      onChange={handleFinishChange}
    />
    <div className="wine-slider-sub-labels">
      <span>짧음 (&lt;3초)</span>
      <span>보통 (5~8초)</span>
      <span>긺 (10초+)</span>
    </div>
  </div>

  {/* 균형 슬라이더 */}
  <div className="wine-slider-wrap">
    <div className="wine-slider-label">
      <span>균형</span>
      <span className="wine-slider-val">{value.balance}</span>
    </div>
    <input
      type="range"
      className="wine-slider"
      min={0}
      max={100}
      value={value.balance}
      onChange={handleBalanceChange}
    />
    <div className="wine-slider-sub-labels">
      <span>산미 치우침</span>
      <span>조화</span>
      <span>타닌/알코올 치우침</span>
    </div>
  </div>
</div>
```

#### 내부 로직

```typescript
// 슬라이더 변경 시마다:
// 1. onChange로 부모에게 새 값 전달
// 2. calculateAutoScore() 호출하여 onAutoScoreChange 콜백 실행

function handleSliderChange(
  field: 'complexity' | 'finish' | 'balance',
  rawValue: string
) {
  const numValue = Number(rawValue)
  const newStructure = { ...value, [field]: numValue }
  onChange(newStructure)
  onAutoScoreChange(calculateAutoScore(aromaRingCount, newStructure.finish, newStructure.balance))
}
```

#### 마운트 시 초기화

- `aromaRingCount`가 변경되면 `getComplexityInitialValue(aromaRingCount)`로 복합성 기본값 업데이트
- 이미 사용자가 복합성을 수동 조작한 상태라면 기본값 덮어쓰기 금지
- 기본값 적용 여부를 추적하는 내부 ref: `hasUserModifiedComplexity`

---

## 목업 매핑

### 프로토타입 CSS 클래스 → Tailwind 매핑

| 프로토타입 클래스 | CSS 정의 | Tailwind 구현 |
|-----------------|---------|--------------|
| `.wine-slider-wrap` | `margin-bottom: 16px` | `mb-4` |
| `.wine-slider-label` | `display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--text-sub); font-weight:600; margin-bottom:6px` | `flex justify-between items-center text-[13px] text-muted-foreground font-semibold mb-1.5` |
| `.wine-slider-val` | `font-weight:800; color:var(--accent-wine)` | `font-extrabold text-[var(--accent-wine)]` |
| `.wine-slider` | `-webkit-appearance:none; width:100%; height:6px; border-radius:3px; background:var(--border); outline:none` | 커스텀 CSS 필요 (shadcn Slider 또는 `<input type="range">` + 글로벌 스타일) |
| `.wine-slider::-webkit-slider-thumb` | `width:22px; height:22px; border-radius:50%; background:var(--accent-wine); cursor:pointer; border:3px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.2)` | 커스텀 CSS |
| 서브 라벨 (inline style) | `display:flex; justify-content:space-between; font-size:10px; color:var(--text-hint); margin-top:3px` | `flex justify-between text-[10px] text-muted-foreground/60 mt-0.5` |

### 프로토타입 HTML 참조 (line 6665~6703)

```html
<!-- 구조 평가: 복합성 · 여운 · 균형 -->
<div class="rest-record-section">
  <div class="rest-record-section-title">구조 평가 (Structure)</div>
  <div class="wine-slider-wrap">
    <div class="wine-slider-label">
      <span>복합성</span>
      <span class="wine-slider-val" id="wineComplexityVal">68</span>
    </div>
    <input type="range" class="wine-slider" min="0" max="100" value="68" />
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-hint);margin-top:3px;">
      <span>1차향 (과일/꽃)</span><span>2차향 (발효)</span><span>3차향 (숙성)</span>
    </div>
  </div>
  <!-- 여운, 균형 동일 패턴 -->
</div>
```

---

## 데이터 흐름

```
[아로마 팔레트 완료]
    │
    ▼ aromaRingCount (1 | 2 | 3)
    │
[WineStructureEval 마운트]
    │
    ├─ getComplexityInitialValue(aromaRingCount) → complexity 초기값 설정
    │
    ▼ 사용자 슬라이더 조작
    │
    ├─ onChange({ complexity, finish, balance }) → 부모 상태 갱신
    │
    ├─ calculateAutoScore(aromaRingCount, finish, balance) → onAutoScoreChange(autoScore)
    │     │
    │     └─ 부모: records.auto_score에 저장
    │         부모: satisfaction 자동 갱신 (수동 조정 전이라면)
    │
    ▼ 저장 시
    │
    ├─ records.complexity = value.complexity       (INT, 0~100)
    ├─ records.finish = value.finish               (DECIMAL(5,2), 0~100)
    ├─ records.balance = value.balance             (DECIMAL(5,2), 0~100)
    ├─ records.auto_score = calculateAutoScore()   (INT, 1~100)
    └─ records.satisfaction = 사용자 최종값         (INT, 1~100)
        (auto_score와 다를 수 있음 — 수동 조정 시)
```

### 만족도 자동산출 vs 수동 조정 규칙

```
1. 구조평가 슬라이더 조작 → auto_score 재계산 → satisfaction 자동 갱신
2. 사용자가 사분면에서 만족도를 직접 드래그 → satisfaction 수동 설정
3. 수동 설정 후 다시 구조평가 슬라이더 조작 → auto_score만 갱신, satisfaction은 수동값 유지
4. auto_score와 satisfaction이 다르면 → "자동 산출과 다릅니다" 힌트 없음 (사용자 의도 존중)
```

이 규칙의 추적은 **부모 컴포넌트(통합 기록 화면)**에서 `isManualSatisfaction: boolean` 상태로 관리. WineStructureEval은 항상 `onAutoScoreChange`만 호출하고, 부모가 `isManualSatisfaction`에 따라 satisfaction 갱신 여부를 결정한다.

---

## 검증 체크리스트

```
□ pnpm build — 에러 없음
□ pnpm lint — 경고 0개
□ TypeScript strict — any/as any/@ts-ignore/! 0개
□ R1 준수 — wine-structure.ts에 React/Supabase/Next import 없음
□ R4 준수 — wine-structure-eval.tsx에 infrastructure/Supabase import 없음
□ 슬라이더 3개 범위 — 모두 0~100, 정수 출력
□ 여운 표시 — 초 환산 정확 (0→1초, 50→8초, 100→15초)
□ 자동산출 공식 — clamp(1, 100, 50 + complexityBonus + finish*0.1 + balance*0.15)
□ complexityBonus — 1링=0, 2링=+7, 3링=+15
□ 복합성 AI 기본값 — 1링=30, 2링=60, 3링=85
□ 수동 조작 후 AI 기본값 미적용 확인
□ CSS 클래스명 — 프로토타입과 일치 (wine-slider-wrap, wine-slider-label, wine-slider-val, wine-slider)
□ 색상 — var(--accent-wine) 사용, 하드코딩 금지
□ 모바일 360px — 슬라이더 터치 영역 충분, 레이아웃 깨짐 없음
□ 디자인 토큰 — bg-white/text-black 하드코딩 없음
```
