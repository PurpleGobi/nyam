# CF 시스템 개선 구현 계획

> 작성: 2026-04-12
> 근거: PRD §3, CF_SYSTEM.md, 시뮬레이션 결과 (cf_comprehensive/)

---

## 변경 사항 요약

### 1. 관계 부스트 단순화

| 변경 전 | 변경 후 |
|---|---|
| 맞팔 ×1.5, 팔로우 ×1.2, 없음 ×1.0 | **팔로우(맞팔 포함) ×1.5, 없음 ×1.0** |

이유: 팔로우는 "나는 이 사람을 신뢰한다"는 일방적 선언. 상대의 팔로백 여부가 상대 점수의 유용성을 바꾸지 않음.

### 2. 신뢰도에 겹침 다양성 보정 추가

```
신뢰도 = 기본 신뢰도 × 겹침 다양성 비율

기본 신뢰도 = n / (n + 7)
겹침 다양성 비율 = 니치 겹침 수 / 전체 겹침 수
니치 판별: 기록자 수가 전체 유저의 10% 이하
```

시뮬레이션 검증: 공격자 500명(95% 점령)도 부풀림 +0.20으로 완전 무력화. 일반 예측 부작용 없음.

### 3. 확신도 표시 % 통일

- 라벨(데이터 부족/참고용/정상) 제거
- **확신 XX%** 숫자만 표시
- 점수는 항상 표시, 숨기지 않음

### 4. Nyam 점수 vs 버블 점수 분리

| | Nyam 점수 | 버블 점수 |
|---|---|---|
| 대상 | 전체 유저 | 버블 멤버만 |
| 다양성 보정 | 적용 (공격 방어) | 미적용 (신뢰 그룹) |
| 최소 겹침 | 3개 | 0개 (겹침 불필요) |
| 최소 기록자 | 3명 | **1명** |
| 팔로우 부스트 | ×1.5 / ×1.0 | ×1.0 균등 |
| 산출 방식 | CF 가중 예측 | 1명이면 그대로, 2명+이면 CF |
| 확신도 | % 표시 | % 표시 + "N명 평가" |

---

## 수정 대상 파일

### domain 레이어

| 파일 | 변경 |
|---|---|
| `domain/services/cf-calculator.ts` | BOOST_MUTUAL 제거 → BOOST_FOLLOWING=1.5, BOOST_NONE=1.0만. RelationType에서 'mutual' 제거. computeConfidence에 nicheRatio 파라미터 추가. 버블용 파라미터 셋 추가 (MIN_OVERLAP=0, 다양성 보정 off, 부스트 균등) |
| `domain/entities/similarity.ts` | RelationType: 'following' \| 'none' (2종). 'mutual' 제거 |

### infrastructure 레이어

| 파일 | 변경 |
|---|---|
| `supabase/functions/predict-score/index.ts` | 다양성 보정 로직 추가. scope(버블) 모드 시 다양성 보정 off + MIN_OVERLAP=0 + 부스트 균등 |
| `supabase/functions/compute-similarity/index.ts` | 다양성 보정 반영 (적합도 계산 시 니치 겹침 비율) |
| `supabase/functions/batch-predict/index.ts` | predict-score와 동일 변경 |

### application 레이어

| 파일 | 변경 |
|---|---|
| `application/hooks/use-target-scores.ts` | 버블 대표 점수 선택 로직 (확신도 최고 버블) |

### presentation 레이어

| 파일 | 변경 |
|---|---|
| `presentation/components/detail/score-cards.tsx` | 확신 XX% 표시 통일. 클릭 시 펼침 동작 |
| `presentation/components/detail/score-breakdown-panel.tsx` | **신규** — Nyam 점수 기여자 breakdown (팔로잉/유사유저 분리) |
| `presentation/components/detail/bubble-expand-panel.tsx` | **활성화** — 버블별 점수 목록 (이름, 점수, 확신%, 멤버 수) |

---

## UI 구조

```
점수 카드 영역 (3개 가로 배치)
┌──────┐  ┌──────────┐  ┌──────────┐
│  나   │  │   Nyam   │  │   버블    │
│  85  │  │  82      │  │  78      │
│ 2회   │  │ 확신 87% │  │ 확신 64% │
└──────┘  └──────────┘  └──────────┘

Nyam 카드 클릭 → score-breakdown-panel 펼침:
┌─────────────────────────────────┐
│ Nyam 점수 근거                    │
│ 평가자 23명 기반                   │
│                                 │
│ 팔로잉 (가중 ×1.5)                │
│   @kim  적합도 91% → 85점        │
│   @lee  적합도 84% → 80점        │
│                                 │
│ 유사 유저                         │
│   21명 평균 적합도 68% → 81점      │
└─────────────────────────────────┘

버블 카드 클릭 → bubble-expand-panel 펼침:
┌─────────────────────────────────┐
│ 버블별 점수                       │
│                                 │
│ 와인동호회    87  확신 72%  5명    │
│ 강남맛집      79  확신 58%  12명   │
│ 대학동기      91  확신 45%  3명    │
│                                 │
│ * 가입한 버블 중 기록 1건+ 있는 것만│
└─────────────────────────────────┘

버블 카드 대표 점수: 확신도 최고 버블의 점수 표시
```

---

## 구현 순서

```
1. domain/services/cf-calculator.ts — 부스트 단순화 + 다양성 보정 + 버블 파라미터
2. domain/entities/similarity.ts — RelationType 정리
3. supabase/functions/compute-similarity — 다양성 보정
4. supabase/functions/predict-score — 다양성 보정 + 버블 모드
5. supabase/functions/batch-predict — 동일
6. application/hooks/use-target-scores.ts — 버블 대표 점수
7. presentation/components/detail/score-cards.tsx — 확신 % + 클릭 펼침
8. presentation/components/detail/score-breakdown-panel.tsx — 신규
9. presentation/components/detail/bubble-expand-panel.tsx — 활성화
```
