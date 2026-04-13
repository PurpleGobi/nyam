# CF 시스템 개선 — 변경 요약

> 근거: docs/simulations/cf_comprehensive/IMPLEMENTATION_PLAN.md

## 변경 내역

### 1. 관계 부스트 단순화
- `RelationType`: `'mutual' | 'following' | 'none'` → `'following' | 'none'`
- 부스트: mutual(1.5) + following(1.2) → **following(맞팔 포함) 1.5**, none 1.0
- `determineRelation()`: 맞팔 여부 판정 제거, 팔로우 여부만 확인

### 2. 신뢰도에 겹침 다양성 보정 추가
- `computeConfidence()`: `nicheRatio` 파라미터 추가 (기본값 미적용)
- `computeNicheRatio()`: 새 함수 — 겹침 아이템 중 니치(전체 유저 10% 이하 기록) 비율 계산
- `compute-similarity` Edge Function: 적합도 계산 시 니치 비율을 신뢰도에 곱함

### 3. 확신도 % 통일 표시
- ScoreCards: 라벨(데이터 부족/참고용/정상) 제거, `확신 XX%` 통일
- ScoreBreakdownPanel: "Nyam 점수 근거 / 평가자 N명 기반" 헤더 추가, "팔로잉 (가중 ×1.5)" 라벨
- BubbleExpandPanel: 각 버블에 `확신 XX% · N명 평가` 표시

### 4. Nyam vs 버블 점수 분리
- `CfParams` 인터페이스 + `NYAM_CF_PARAMS` / `BUBBLE_CF_PARAMS` 상수 추가
- `getRelationBoost()`: `uniformBoost` 파라미터 추가 (버블 모드: 균등 부스트)
- `predict-score` Edge Function: scope가 있으면 버블 모드 (균등 부스트, 팔로우 조회 스킵)
- `use-target-scores`: `bubbleScoreEntries` 입력, 확신도 최고 버블을 대표로 선택
- `TargetScores.bubble`: `confidence` 필드 추가
- 패널 토글: `expandedPanel` 상태로 통합 (breakdownOpen/bubbleExpandOpen 제거)

### 5. UI: 클릭 펼침 동작
- ScoreCards: Nyam/버블 카드 클릭 시 breakdown/expand 패널 토글
- Container: `togglePanel` 콜백으로 패널 상태 관리

## 변경 파일 목록

| 레이어 | 파일 | 변경 유형 |
|--------|------|----------|
| domain | entities/similarity.ts | RelationType 수정 |
| domain | entities/score.ts | BubbleScoreEntry 추가, TargetScores.bubble.confidence 추가 |
| domain | services/cf-calculator.ts | 부스트 단순화, CfParams, computeNicheRatio, nicheRatio |
| domain | services/__tests__/cf-calculator.test.ts | 테스트 업데이트 (40개 PASS) |
| infrastructure | supabase/functions/compute-similarity/index.ts | 다양성 보정 로직 |
| infrastructure | supabase/functions/predict-score/index.ts | 부스트 단순화 + 버블 모드 |
| infrastructure | supabase/functions/batch-predict/index.ts | 부스트 단순화 |
| application | hooks/use-target-scores.ts | bubbleScoreEntries, expandedPanel, togglePanel |
| presentation | components/detail/score-cards.tsx | 확신 % + 클릭 펼침 |
| presentation | components/detail/score-breakdown-panel.tsx | 헤더 + 가중 ×1.5 라벨 |
| presentation | components/detail/bubble-expand-panel.tsx | BubbleScoreEntry 타입, 확신%+N명 |
| presentation | containers/restaurant-detail-container.tsx | 새 API 연동 |
| presentation | containers/wine-detail-container.tsx | 새 API 연동 |

## 크리티컬 게이트

- [x] pnpm build — PASS
- [x] pnpm lint — PASS (pre-existing 에러만, 신규 0)
- [x] TypeScript — any/as any/@ts-ignore/! 0개
- [x] R1-R5 — 위반 없음
- [x] 테스트 — 40개 PASS
