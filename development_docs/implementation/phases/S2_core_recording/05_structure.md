# 05: 와인 품질평가 BLIC (Quality Evaluation)

> 와인 기록 시 균형/여운/강도/복합성 4개 슬라이더를 조작하여 품질을 평가하고, 만족도를 자동 산출하는 선택적 단계.

---

## SSOT 출처

| 문서 | 섹션 | 내용 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §8 품질 평가 (Quality) | 슬라이더 4개(BLIC) 스펙, 라벨, AI 초기값, 자동산출 공식 |
| `systems/DATA_MODEL.md` | records 테이블 | `balance DECIMAL(5,2)`, `finish DECIMAL(5,2)`, `intensity INT`, `complexity INT`, `auto_score INT` |
| `prototype/01_home.html` | screen-wine-record | 슬라이더 UI |

---

## 선행 조건

- 2.1: domain 엔티티 완료 (WineStructure BLIC 타입)
- 2.4: 아로마 휠 완료 (`aromaRingCount` props 필요)

---

## 구현 범위

### 생성할 파일

| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/presentation/components/record/wine-structure-eval.tsx` | presentation | 슬라이더 4개(BLIC) UI 컴포넌트 |

> **참고**: `src/domain/entities/wine-structure.ts`는 S2-T01에서 정의. `LabeledGaugeSlider`는 공용 UI 컴포넌트(`src/presentation/components/ui/gauge-slider.tsx`).

---

## 상세 구현 지침

### WineStructureEval 컴포넌트

```typescript
interface WineStructureEvalProps {
  value: WineStructure        // { balance, finish, intensity, complexity }
  onChange: (value: WineStructure) => void
  aromaRingCount: number
  onAutoScoreChange: (autoScore: number) => void
}
```

**슬라이더 4개 (BLIC 순서)**:

| 순서 | 필드 | 라벨 | 값 표시 | 하위 마크 |
|------|------|------|---------|----------|
| 1 | balance | 균형 | 숫자 | 불균형 / 보통 / 완벽한 조화 |
| 2 | finish | 여운 | `${finishToSeconds(v)}초+` | 짧음 (<3초) / 보통 (5~8초) / 긴 (10초+) |
| 3 | intensity | 강도 | 숫자 | 연한/희미 / 보통 / 강렬/집중 |
| 4 | complexity | 복합성 | 숫자 | 1차향 (과일/꽃) / 2차향 (발효) / 3차향 (숙성) |

**기존 설계 대비 변경**:
- 3개 슬라이더(복합성/여운/균형) → 4개(균형/여운/강도/복합성, BLIC 순서)
- `intensity` 필드 추가
- `LabeledGaugeSlider` 공용 컴포넌트 사용 (커스텀 `<input type="range">` 대신)
- `accentVar="--accent-wine"` 속성으로 와인 테마 색상 적용

**내부 로직**:
- 슬라이더 변경 시마다 `calculateAutoScore(aromaRingCount, newVal.finish, newVal.balance)` 호출
- `aromaRingCount` 변경 시 `getComplexityInitialValue(aromaRingCount)`로 복합성 기본값 업데이트
- 사용자가 복합성을 수동 조작한 경우 AI 기본값 덮어쓰기 금지 (`hasUserModifiedComplexity` ref)

---

## 검증 체크리스트

```
□ pnpm build — 에러 없음
□ pnpm lint — 경고 0개
□ R4 준수 — infrastructure/Supabase import 없음
□ 슬라이더 4개 — BLIC 순서 (균형, 여운, 강도, 복합성)
□ 여운 표시 — 초 환산 정확 (0→1초, 50→8초, 100→15초)
□ 자동산출 공식 — clamp(1, 100, 50 + complexityBonus + finish*0.1 + balance*0.15)
□ complexityBonus — 1링=0, 2링=+7, 3링=+15
□ 복합성 AI 기본값 — 1링=30, 2링=60, 3링=85
□ 수동 조작 후 AI 기본값 미적용 확인
□ LabeledGaugeSlider 사용 + accentVar="--accent-wine"
□ 모바일 360px — 슬라이더 터치 영역 충분
□ 디자인 토큰 — 하드코딩 없음
```
