# S2-T03: 만족도 게이지 + Circle Rating

> 수평 바 형태의 SatisfactionGauge(읽기 전용 표시)와 드래그로 조작하는 CircleRating(인터랙티브 입력) 2개 컴포넌트를 구현한다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §3 조작 플로우 | 만족도 드래그 인터랙션 |
| `systems/RATING_ENGINE.md` | §4 점 비주얼 스펙 | Circle Rating 크기/색상/glow/숫자 |
| `systems/RATING_ENGINE.md` | §5 애니메이션 & 햅틱 | 만족도 드래그 햅틱, glow 레벨 변화 |
| `systems/DESIGN_SYSTEM.md` | §1 게이지 색상 | gauge 색상 채널 |
| `prototype/00_design_system.html` | §15b Circle Rating | 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `getGaugeLevel` 함수 사용 가능
- S2-T02에서 `shared/utils/gauge-color.ts` 생성 완료 — `getGaugeColor` 사용 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/presentation/components/record/satisfaction-gauge.tsx` | presentation | 수평 바 게이지 (읽기 전용) |
| `src/presentation/components/record/circle-rating.tsx` | presentation | 드래그 가능한 원형 레이팅 |

---

## 상세 구현 지침

### 1. SatisfactionGauge

**Props**:

```typescript
interface SatisfactionGaugeProps {
  value: number
  labelLeft?: string         // 기본값: "별로"
  labelRight?: string        // 기본값: "최고"
  showNumber?: boolean       // 기본값: true
}
```

- Tailwind CSS 기반 구현 (인라인 style에서 변경됨)
- `getGaugeColor(value)` (default 채널)로 fill 색상 결정

### 2. CircleRating

**Props**:

```typescript
interface CircleRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}
```

**비주얼 스펙 (현재 구현)**:

| 속성 | 값 | 공식 |
|------|-----|------|
| 크기 범위 | 14px ~ 60px | `size = 14 + (value / 100) * 46` |
| 색상 | gauge default 채널 | `getGaugeColor(value)` |
| 숫자 fontSize | min 10px | `max(10, size * 0.35)` |
| Glow 기본 | `0 0 ${size*0.3}px ${color}80` | — |
| Glow 드래그 | `0 0 ${size*0.3}px ${color}A6` + brightness(1.1) | — |
| Glow 고점수+드래그 | `0 0 ${size*0.3}px ${color}CC` + brightness(1.2) | — |

**참고**: 기존 설계에서의 크기 공식 `28 + (score / 100) * 92` (28~120px)은 현재 `14 + (value / 100) * 46` (14~60px)으로 변경되었다.

**인터랙션**: 수직 드래그 (위=증가, 아래=감소), sensitivity 0.5/px, setPointerCapture

**햅틱**: 시작 10ms, 10점 단위 15ms, gauge 레벨 변화 20ms

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ SatisfactionGauge: 수평 바, fill 색상 getGaugeColor, 좌측 "별로" 우측 "최고"
□ CircleRating: 크기 14~60px, 수직 드래그, glow 3단계
□ 햅틱: 시작/10점 단위/gauge 경계
□ touch-action: none
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
