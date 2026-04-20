<!-- updated: 2026-04-20 -->
---
depends_on: [DATA_MODEL, RECORD_SYSTEM]
affects: [RECOMMENDATION, BUBBLE_SYSTEM, SOCIAL_SYSTEM]
---

# XP_SYSTEM — 경험치 & 레벨 + Prestige(명성) (v2)

> **유저 XP** (유저가 쌓은 경험)와 **Prestige** (식당 자체의 명성)는 **완전히 분리된 두 축**이다. 이 문서는 두 축 모두의 SSOT.
> 최종 갱신: 2026-04-20
> 시뮬레이션 검증: `system_brainstorming/simulation/` (test_xp_charts, test_xp_abuse, test_xp_global)

---

## 0. 두 축 개요

```
┌─────────────────────────────┬──────────────────────────────────┐
│ 유저 XP (§1~§14)             │ Prestige / 명성 (§15~§19)          │
├─────────────────────────────┼──────────────────────────────────┤
│ 저장 위치: users, xp_totals  │ 저장 위치: restaurant_prestige +    │
│                             │          restaurants.prestige JSONB│
│ 대상: 유저                   │ 대상: 식당 (와인은 critic_scores)  │
│ 입력: 유저 행동(기록/소셜)    │ 입력: 외부 시드(미슐랭/블루리본/TV) │
│ 산출: 계산                   │ 산출: 주입 → 트리거 캐시            │
│ 변동: 수시                   │ 변동: 연 1회 수준                  │
└─────────────────────────────┴──────────────────────────────────┘
```

- **유저 XP는 계산되는 값**이고, **Prestige는 외부에서 주입되는 시드 값**이다.
- 두 축은 **서로 영향을 주고받지 않는다** — 권위 있는 식당에 기록한다고 유저 XP 보너스는 없다 (현재 구현 기준).
- Prestige는 과거 "RP(Reputation)"로 도입되었고(055), 058에서 전면 rename되어 현재는 `prestige`로 통일되었다.

---

# Part A — 유저 XP 시스템

## 1. 설계 원칙

- **기록이 핵심** — XP의 96%+는 기록에서 발생. 소셜은 4% 미만
- **품질 가중** — 이름만 등록(+0) vs 풀 기록(+18). 이름만은 XP 0이므로 품질 기록만 보상
- **이기적 동기** — 남을 위한 기록이 아니라 나를 위한 기록에 보상
- **총 XP + 활성 XP 이원화** — 레벨(영구) + 활성도(6개월 윈도우) 분리
- **정직이 항상 유리** — 100시간 정직 기록 = Lv.80, 100시간 어뷰징 = Lv.47 (9.9배 차이)
- **스트릭/리더보드 없음** — 식도락은 매일 하는 게 아니고, 경쟁도 아님
- **레벨 감소 없음** — 총 XP 기반 레벨은 절대 안 깎임

---

## 2. XP 이원화: 총 XP + 활성 XP

```
총 XP    = 누적 (절대 안 줄어듦). 레벨 산정에 사용. "이 사람의 역사"
활성 XP  = 최근 6개월 기록 기반 (자연 변동). 버블 진입 기준. "이 사람의 현재"
```

| 용도 | 총 XP | 활성 XP |
|------|-------|---------|
| 프로필 레벨 표시 | O | X |
| 버블 auto_approve 기준 | 선택 가능 | 선택 가능 |
| 맞팔/팔로우 판단 참고 | O | O |
| 감소 여부 | 절대 안 감소 | 6개월 윈도우로 자연 변동 |

**버블 오너는 총 XP AND/OR 활성 XP 조합으로 가입 기준 설정 가능.**

```
예시:
  파워유저 A: 총 XP 7,500 (Lv.72) | 활성 XP 3,000 (최근 6개월 활발)
  은퇴유저 B: 총 XP 7,500 (Lv.72) | 활성 XP 0 (6개월간 기록 0)
  → 레벨은 같지만, 활성 XP 기준 버블에는 A만 통과
```

---

## 3. XP 축 — 3단계 계층

### 레벨 계층 구조

```
전체 레벨 (Lv.15)                    ← users.total_xp 기반
├── 식당 레벨 (Lv.12)               ← category 중간 계층 (area + genre XP 합산)
│   ├── 지역: 을지로 Lv.7, 강남 Lv.3   ← 세부 축
│   └── 장르: 일식 Lv.6, 한식 Lv.5     ← 세부 축
└── 와인 레벨 (Lv.7)                ← category 중간 계층 (wine_variety + wine_region XP 합산)
    ├── 산지: 보르도 Lv.6, 부르고뉴 Lv.4  ← 세부 축
    └── 품종: 카베르네 소비뇽 Lv.5, 피노 누아 Lv.3   ← 세부 축
```

### 종합 XP vs 카테고리 XP vs 세부 XP

| | 종합 XP | 카테고리 XP | 세부 XP |
|---|---------|-----------|---------|
| 산출 | 기록 XP + 소셜 XP + 보너스 XP + 마일스톤 XP | 해당 도메인 세부 축 XP 합산 | 축 전용 (+5/기록) |
| 용도 | 전체 레벨, 버블 진입 기준 | 식당 레벨 / 와인 레벨 표시 | 축별 레벨 표시 |
| 저장 | `users.total_xp` | `xp_totals` axis_type=`'category'` | `xp_totals` axis_type=`'area'`/`'genre'`/... |
| 교차 | **카테고리/세부 XP는 종합에 미포함** | 독립 | 독립 |

### 카테고리 레벨 (중간 계층)

| 카테고리 | axis_value | 세부 축 합산 대상 | 용도 |
|---------|-----------|-----------------|------|
| **식당 레벨** | `'restaurant'` | area + genre XP 합산 | 프로필 탭 헤더, 알림 ("식당 레벨 12 달성!"), Wrapped |
| **와인 레벨** | `'wine'` | wine_variety + wine_region XP 합산 | 프로필 탭 헤더, 알림 ("와인 레벨 7 달성!"), Wrapped |

- DB: `xp_totals` 테이블에 `axis_type='category'`, `axis_value='restaurant'|'wine'`으로 저장
- 갱신: 세부 축 XP 변동 시 해당 카테고리 XP도 함께 갱신 (application layer — `use-xp-calculation.ts` Step 5)
- 레벨 산출: `xp_seed_levels` 테이블 공용 (전체/카테고리/세부 모두 같은 커브)

### 식당 세부 축 (두 축 병렬)
- **지역별**: 기록한 식당의 위치 기반 (을지로 Lv.7, 강남 Lv.3)
- **장르별**: 일식 Lv.6, 한식 Lv.5 등

### 와인 세부 축 (두 축 병렬)
- **산지별**: 보르도 Lv.6, 부르고뉴 Lv.4 등
- **품종별**: 카베르네 소비뇽 Lv.5, 피노 누아 Lv.3 등

> 하나의 기록 → 종합 XP + 카테고리 XP(합산 갱신) + 해당 세부 축 2개에 동시 적립
> 예: 을지로 일식당 풀 기록 → 종합 +18, 을지로 +5, 일식 +5, 식당 카테고리 XP 갱신

---

## 4. XP 획득 테이블 (확정)

### 4-1. 기록 XP (핵심 — 종합 XP에 적립)

| 기록 수준 | XP | 비고 |
|---|---|---|
| **이름만 등록** | **0** | XP 없음. 기록만 됨. 어뷰징 무력화 |
| **+ 사분면 점수** | **+3** | 최소 평가 |
| **+ 사진 (점수 + EXIF GPS 검증)** | **+8** | 점수 필수 + 실제 방문 증거 |
| **+ 풀 기록 (점수+사진+코멘트+메뉴태그)** | **+18** | 핵심 보상. 가장 효율적 |

> 한 기록당 위 중 최고 1개만 적용 (중복 아님)
> 같은 대상(식당/와인) 점수: **6개월에 1회만** (리뷰/사진 추가는 자유)
> **재방문 규칙**: 6개월 내 같은 대상 재방문 시, 점수 XP(+3)분만 차감.
> 사진(+8→5), 풀기록(+18→15)은 콘텐츠 기여분 유지.
> 구현: `isDuplicateScoreBlocked(lastScoreDate)` — `score_updated_at` 기준 6개월 체크

### 4-2. 세부 축 XP (종합 XP에 미포함)

| 세부 축 | XP | 조건 |
|---------|-----|------|
| 지역 (area) | +5 | 식당 기록당 자동 |
| 음식장르 (genre) | +5 | 식당 기록당 자동 |
| 와인산지 (wine_region) | +5 | 와인 기록당 자동 |
| 와인품종 (wine_variety) | +5 | 와인 기록당 자동 |

> 세부 축 XP 적립 시 해당 **카테고리 레벨** (식당/와인)의 XP도 동시 갱신.
> 카테고리 XP = 소속 세부 축 XP 합산. 예: 식당 카테고리 XP = Σ(지역 XP) + Σ(장르 XP)
> DB: `xp_totals` axis_type=`'category'`, axis_value=`'restaurant'`|`'wine'`에 저장

### 4-3. 소셜 XP (종합 XP에 적립)

| 활동 | XP | 비고 |
|------|-----|------|
| 버블에 기록 큐레이션 | +1 | 기록 있는 큐레이션만 |
| 좋아요(good 리액션) 받음 | +1 | bad 리액션은 XP 없음. 찜 시스템은 migration 063에서 제거됨 |
| 팔로워 획득 (버블/개인) | +1 | |
| 맞팔 성사 | +2 | 양쪽 모두 **(스펙 — 현재 요청자만 부여됨, 미구현 이슈)**. 상세: SOCIAL_SYSTEM §2.7, §11 |

> **소셜 XP 합산 일일 상한: 10 XP/일** (어떤 조합이든)

### 4-4. 보너스 XP (종합 XP에 적립, 1회)

| 활동 | XP |
|------|-----|
| 온보딩 완료 | +10 |
| 첫 기록 | +5 |
| 첫 버블 생성 | +5 |
| 첫 버블 큐레이션 | +3 |

### 4-5. 마일스톤 XP (종합 XP에 적립, 달성 시 1회)

> SSOT: DATA_MODEL.md의 `xp_seed_milestones` + `xp_log_milestones` 테이블

| 마일스톤 유형 | 기준 (threshold) | XP 범위 |
|-------------|-----------------|---------|
| 세부 축 고유 장소/병 수 | 10 / 20 / 30 / 50 / 100 | +25 / +30 / +35 / +40 / +50 |
| 종합 기록 수 (global) | 50 / 100 / 200 / 500 / 1000 | +30 / +40 / +40 / +50 / +50 |
| 재방문 횟수 (area) | 5 / 10 / 20 / 50 | +25 / +30 / +35 / +40 |

- DB: `xp_seed_milestones` 테이블에 `axis_type`, `metric`, `threshold`, `xp_reward` 정의
- 달성 시 `xp_log_milestones`에 기록 + `xp_log_changes`에 reason=`'milestone'`
- 프로필 레벨 상세 시트에 다음 마일스톤 진행률 표시

### 4-6. 최대 단건 XP

```
풀 기록 1건: +18 XP (종합) + 세부 축 2개 × +5 (종합 미포함)
+ 마일스톤 달성 시 추가 보너스 (해당 시점에만)
```

### 4-7. Prestige ↔ XP 관계 (중요)

**현재 구현 기준, 식당의 prestige는 유저 XP 산정에 영향을 주지 않는다.**

- 미슐랭 3스타 식당에 풀 기록해도, 동네 식당에 풀 기록해도 **똑같이 +18 XP**.
- `domain/services/xp-calculator.ts`에 prestige 관련 보너스 로직 없음 (2026-04-20 기준).
- 근거: XP는 "유저가 한 일"에 대한 보상이고, prestige는 "대상의 공신력"이다. 두 축이 섞이면 권위 식당 쇼핑이 발생하여 설계 원칙(§1 "이기적 동기")과 충돌한다.
- 향후 정책 변경 시 이 섹션과 xp-calculator를 함께 수정한다.

---

## 5. 레벨 커브

### 설계 목표

```
초반 빠르게 → 점점 느리게 (게임식)
파워유저: 1년=Lv.62, 2년=Lv.72, 3년=Lv.78, 4년=Lv.81
캐주얼:  1년=Lv.12, 2년=Lv.18
Lv.99 = 전설 (XP 100,000 — 사실상 도달 불가 설계)
```

### 레벨 테이블 (앵커 포인트)

> 아래는 레벨 커브를 정의하는 **앵커 포인트**. "대표 유저"는 설계 의도 기준 근사치.
> 실제 시뮬레이션 결과는 §7 참조 (예: 파워유저 1년 시뮬레이션 = Lv.57).

| XP | 레벨 | 대표 유저 |
|-----|------|----------|
| 0 | Lv.1 | 가입 직후 |
| 3 | Lv.2 | 첫 기록 |
| 25 | Lv.6 | 슬리퍼 1년 |
| 50 | Lv.8 | 슬리퍼 2년 |
| 100 | Lv.12 | 캐주얼 1년 |
| 200 | Lv.18 | 캐주얼 2년 |
| 500 | Lv.30 | 활동적 2년 |
| 3,700 | Lv.62 | 파워유저 1년 |
| 7,500 | Lv.72 | 파워유저 2년 |
| 12,000 | Lv.78 | 파워유저 3년 |
| 16,000 | Lv.81 | 파워유저 4년 |
| 25,000 | Lv.85 | 극파워 5년 |
| 50,000 | Lv.92 | — |
| 100,000 | Lv.99 | 전설 (도달 불가 설계) |

### 레벨 커브 구현

위 레벨 테이블의 앵커 포인트 간 **선형 보간**으로 Lv.1~99 전체 XP 테이블을 생성한다.

```typescript
// 앵커 포인트 (레벨, 누적 XP) — 위 테이블과 동일
// 구현: domain/services/xp-calculator.ts (generateLevelThresholds)
const ANCHORS: [number, number][] = [
  [1, 0], [2, 3], [6, 25], [8, 50], [12, 100], [18, 200],
  [30, 500], [62, 3_700], [72, 7_500], [78, 12_000], [81, 16_000],
  [85, 25_000], [92, 50_000], [99, 100_000],
]
// 앵커 간 선형 보간 → xp_seed_levels 시드 데이터 (007_experience.sql)
// 시뮬레이션: system_brainstorming/simulation/models.py 참조
```

### 레벨 칭호

> SSOT: DATA_MODEL.md의 `xp_seed_levels` 테이블 (`title`, `color` 필드)
>
> 매핑 값(색상/CSS 변수/Tailwind 이름)의 SSOT는 **DESIGN_SYSTEM.md §10**이며, `shared/utils/level-color.ts`는 현재 미사용(dead code 후보, §14 Shared 참고).

| 레벨 구간 | 칭호 | 색상 | CSS 변수 | Tailwind |
|----------|------|------|---------|---------|
| Lv.1~3 | 입문자 | Green (#7EAE8B) | `--positive` | `positive` |
| Lv.4~5 | 초보 미식가 | Blue (#7A9BAE) | `--accent-social` | `accent-social` |
| Lv.6~7 | 탐식가 | Purple (#8B7396) | `--accent-wine` | `accent-wine` |
| Lv.8~9 | 미식가 | Orange (#C17B5E) | `--accent-food` | `accent-food` |
| Lv.10+ | 식도락 마스터 | Gold (#C9A96E) | `--caution` | `caution` |

- 프로필, 버블 멤버 카드, 버블러 프로필에서 `Lv.N 칭호` 형식으로 표시
- 색상은 레벨 배지, 프로그레스 바, 레벨 표시 전반에 적용
- 구현: `domain/services/xp-calculator.ts` (getLevelColor/getLevelTitle) — 모든 컴포넌트에서 사용
- 참고: `shared/utils/level-color.ts`는 CSS변수/Tailwind 매핑을 정의하나 현재 미사용 (dead code)
- 상세: DESIGN_SYSTEM.md 참조

---

## 6. 어뷰징 방지

### 6-1. 다층 방어 체계

**계정 레벨:**
- 소셜 로그인만 허용 (카카오/구글/애플/네이버)
- 1 소셜 계정 = 1 Nyam 계정 (중복 가입 차단)

**기록 레벨:**
- 이름만 등록 = XP 0 (어뷰징 무의미)
- 같은 대상(식당/와인) 점수: 6개월 1회 제한 *(구현됨: `isDuplicateScoreBlocked`)*
- 하루 기록 상한: 20개 *(구현됨: `isDailyRecordCapReached`)*
- EXIF GPS 검증 (반경 200m)

**소셜 레벨:**
- 소셜 XP 합산 일 상한 10 *(구현됨: `xp-calculator.ts` SOCIAL_DAILY_CAP)*
- 기록 0 계정의 팔로우 XP 미부여 *(미구현 — 향후 추가 예정)*
- 비정상 패턴 탐지 (1분 내 10+ 팔로우) *(미구현 — 향후 추가 예정)*
- 맞팔 XP 양쪽 부여 *(미구현 — 현재 요청자만 +2 부여됨. 스펙: SOCIAL_SYSTEM §2.7. 상세: §4-3)*

**통계 레벨:**
- 식당/와인 표시 점수 = Trimmed Mean (양끝 5% 제거)
- 극단 점수 자동 배제, 패널티 없음

### 6-2. 시뮬레이션 검증 결과

> 출처: `system_brainstorming/simulation/test_xp_abuse.py`
> ⚠️ 레벨은 시뮬레이션 시점 draft 커브 기반. 최종 `xp_seed_levels`와 소폭 차이 있음. **XP 값과 효율 비율(9.9배)은 정확.**

**100시간 투자 효율 비교:**

| 방법 | XP | 레벨 | 검증 | 판정 |
|------|-----|------|------|------|
| **정직: 풀 기록** | **14,410** | **Lv.80** | **800개** | **최적** |
| 정직: 사진+점수 | 9,610 | Lv.75 | 1,200개 | 좋음 |
| 어뷰: 이름만 등록 | 10 | Lv.3 | 0개 | XP 0 |
| 어뷰: 팔로워 팜 | 1,010 | Lv.41 | 0개 | 상한 적용 |
| 어뷰: 복합 최적화 | 1,460 | Lv.47 | 3,000개 | 정직의 1/10 |

→ **정직이 9.9배 효율적. 어뷰징할 동기 없음.**

**공격별 방어 매트릭스:**

| 공격 | 방어 | 결과 | 판정 |
|------|------|------|------|
| 이름 5,000개 등록 | XP=0 | Lv.3 | 완전 차단 |
| 점수만 600개 | 검증률 0% | Lv.51 (프로필 식별) | 차단 |
| EXIF 위조 50개 | 가성비 낮음 | Lv.27 (정직=Lv.31) | 차단 |
| 팔로워 팜 180일 | 일 상한 10 | Lv.51 (정직=Lv.75) | 차단 |
| 광고주 조작 20계정 | 6개월 1회 | 40점/년 + trimmed mean | 차단 |

---

## 7. 행위 편향 유저별 레벨 시뮬레이션

> 출처: `system_brainstorming/simulation/test_xp_charts.py`
> ⚠️ 레벨은 시뮬레이션 시점 draft 커브 기반. 최종 `xp_seed_levels`와 소폭 차이 있음.

### 7-1. 유저 등급별 연차별 레벨

| 등급 | 1년 | 2년 | 3년 | 4년 |
|------|-----|-----|-----|-----|
| 슬리퍼 (월 1.5건) | Lv.6 | Lv.8 | Lv.11 | Lv.13 |
| 캐주얼 (월 5건) | Lv.12 | Lv.18 | Lv.25 | Lv.30 |
| 활동적 (월 11건) | Lv.30 | Lv.42 | Lv.50 | Lv.56 |
| 파워유저 (월 23건) | Lv.57 | Lv.68 | Lv.73 | Lv.81 |

### 7-2. 행위 편향 유저별 비교

| 유형 | 행동 패턴 | 월 XP | 1년 | 2년 | 기록% | 판정 |
|------|----------|-------|-----|-----|-------|------|
| **식당러** | 식당만 12건/월, 풀기록 | 224 | Lv.57 | Lv.68 | 97% | 적절 |
| **와인러** | 와인 중심, 식당 가끔 | 206 | Lv.54 | Lv.64 | 96% | 적절 |
| **사진러** | 사진 많이, 리뷰 안 씀 | 100 | Lv.44 | Lv.55 | 96% | 적절 |
| **소셜러** | 기록 간단, 소셜 활발 | 56 | Lv.31 | Lv.43 | 32% | 소셜 과다 경고 |
| **기록러** | 모든 기록 상세 | 206 | Lv.54 | Lv.64 | 96% | 적절 |
| **등록러** | 이름만 20건/월 | 3 | Lv.8 | Lv.10 | 0% | 설계 의도 (느림) |

> **기록러 Lv.64 > 소셜러 Lv.43** — 기록이 핵심이라는 설계 의도 작동
> **등록러 Lv.10 = 기록러의 1/6** — 이름만 등록은 사실상 무의미

### 7-3. XP 소스 비율 (활성 유저 평균)

| 소스 | 비율 |
|------|------|
| **기록 XP** | **~96%** |
| 소셜 XP | ~3% |
| 보너스 XP | ~1% |

---

## 8. 글로벌 규모 레벨 분포

> 출처: `system_brainstorming/simulation/test_xp_global.py`
> 기준: 글로벌 142만 가입, 24개월
> ⚠️ 레벨은 시뮬레이션 시점 draft 커브 기반. 최종 `xp_seed_levels`와 소폭 차이 있음.

### 8-1. 종합 레벨 분포 (잔존 ~107만명)

| 구간 | 비율 | 지역 Lv | 장르 Lv | 산지 Lv | 품종 Lv |
|------|------|---------|---------|---------|---------|
| Lv.2-3 | 43.3% | — | — | — | — |
| Lv.4-10 | 25.4% | 3~4 | 3~4 | — | — |
| Lv.11-20 | 15.7% | 5~6 | 5~6 | 2 | 2 |
| Lv.21-50 | 14.8% | 7~10 | 7~9 | 3~5 | 3~5 |
| Lv.51+ | 0.8% | 17 | 16 | 9 | 9 |

### 8-2. 인플레이션 지표

| 지표 | 수치 | 판정 |
|------|------|------|
| Lv.20+ | 16.6% | 정상 (활동적+파워 유저 집중) |
| 최고 레벨 | Lv.72 (M1 가입 파워유저) | 정상 |

---

## 9. EXIF 검증 로직

```
사진 업로드 시:
1. EXIF 메타데이터 추출 (GPS 좌표, 촬영 시간)
2. GPS 좌표 ↔ 식당/와인바 위치 비교
3. 반경 200m 이내 → has_exif_gps: true, is_exif_verified: true
4. GPS 없거나 불일치 → 사진 XP(+8) 미부여 (점수만 있으면 +3만 적용)
   → 사진 자체는 기록에 저장됨. XP만 미부여.
5. 검증됨(is_exif_verified) 기록 수 = 프로필의 핵심 신뢰 지표 (active_verified)
```

> **주의**: 사진 XP(+8)는 `has_exif_gps && is_exif_verified` 모두 true일 때만 부여.
> GPS 없는 사진은 기록에 첨부되지만 XP는 점수 기준(+3)만 적용됨.
> 구현: `xp-calculator.ts` calculateRecordXp — `hasPhoto = record.hasExifGps === true && record.isExifVerified === true`

---

## 10. 표시 점수: Trimmed Mean

```
식당/와인의 표시 점수 = trimmed_mean(모든 점수, trim=0.05)
  → 양쪽 끝 5% 제거 후 평균
  → 트롤/극단값 자동 배제
  → 개인 점수는 그대로 유지 (본인에게는 자기 점수가 보임)
  → 시스템이 "이상한 점수"를 판단하지 않음 — 통계적 자연 제거
```

---

## 11. 레벨 표시 규칙

| 위치 | 표시 내용 | 구현 컴포넌트 |
|------|----------|-------------|
| 앱 헤더 | 종합 레벨 뱃지 + 현재 레벨 XP 프로그레스 바 | `layout/header-level-bar.tsx` |
| 프로필 | 종합 레벨 + 칭호 + 식당 탭(지역·장르) + 와인 탭(산지·품종) | `profile/profile-header.tsx`, `profile/total-level-card.tsx`, `profile/level-list.tsx` |
| 프로필 레벨 상세 시트 | 레벨 + 칭호 + XP + 통계(3열) + XP 분석(5항목) + 다음 마일스톤 | `profile/level-detail-sheet.tsx` |
| 프로필 최근 XP 이력 | 최근 5건 XP 변동 이력 (이유·금액·시간) | `profile/recent-xp-list.tsx` |
| 버블 피드 기록 옆 | 종합 레벨 (Lv.N) | `bubble/feed-card.tsx` |
| 버블 멤버 그리드 | 종합 레벨 + 칭호 (Lv.N 미식가) | `bubble/member-grid.tsx` |
| 버블 멤버 리스트 | 종합 레벨 (Lv.N) | `bubble/member-list-view.tsx` |
| 버블러 프로필 | 종합 레벨 + 칭호 + 아바타 링 색상 | `bubbler/bubbler-hero.tsx` |
| 식당 상세 | 나의 관련 세부 축 레벨 (장르 Lv.N, 지역 Lv.N) | `detail/axis-level-badge.tsx` in `restaurant-detail-container.tsx` |
| 와인 상세 | 나의 관련 세부 축 레벨 (산지 Lv.N, 품종 Lv.N) | `detail/axis-level-badge.tsx` in `wine-detail-container.tsx` |
| 버블 기록 카드 (식당/와인 상세) | 작성자 종합 레벨 + 칭호 | `detail/bubble-record-card.tsx` |
| 기록 완료 XP 섹션 | 축별 현재 레벨 | `record/xp-earned-section.tsx` |
| 온보딩 XP 팝업 | 온보딩 단계별 XP 획득 표시 | `onboarding/xp-popup.tsx` |
| Wrapped 카드 | 카테고리별 레벨 + 칭호 | `profile/wrapped-card.tsx` |
| 버블 주간 랭킹 | 포디움 1~3위 + 평균만족도 + 기록수 + 등락 | `bubble/ranking-podium.tsx`, `bubble/ranking-list.tsx` |
| 버블 가입 신청 (대기 목록) | 종합 레벨 + 기록 수 + 취향 일치율 | `bubble/pending-approval-list.tsx` |
| 버블 검색/탐색 카드 | 종합 레벨 + 기록 수 + 취향 일치율 | `bubble/bubble-discover-sheet.tsx` |
| 버블 가입 조건 표시 | "Lv.N 이상" / "검증 기록 N개 이상" | `bubble/join-flow.tsx` |

---

## 12. DB 스키마 (유저 XP)

> SSOT: `000_schema_reference.sql` + DATA_MODEL.md
> 테이블 네이밍: `xp_` 접두사 체계 (xp_totals, xp_log_*, xp_seed_*)

### 12-1. users 테이블 XP 관련 필드

```sql
-- users 테이블 (CREATE TABLE 시 포함)
total_xp        INT NOT NULL DEFAULT 0,
active_xp       INT NOT NULL DEFAULT 0,        -- 최근 6개월 기록 XP 합산
active_verified INT NOT NULL DEFAULT 0,         -- 최근 6개월 EXIF 검증 기록 수
auth_provider   VARCHAR(20) NOT NULL,           -- 'kakao' | 'google' | 'apple' | 'naver'
auth_provider_id VARCHAR(100) NOT NULL UNIQUE;
```

### 12-2. records 테이블 XP 관련 필드

```sql
-- records 테이블 (CREATE TABLE 시 포함)
has_exif_gps      BOOLEAN NOT NULL DEFAULT false,
is_exif_verified  BOOLEAN NOT NULL DEFAULT false,
record_quality_xp INT NOT NULL DEFAULT 0,       -- 산출된 기록 XP (0, 3, 5, 8, 15, 18 — 6개월 중복 차감 후 저장)
score_updated_at  TIMESTAMPTZ;                  -- 같은 대상(식당/와인) 점수 6개월 제한 기준
```

### 12-3. xp_totals (축별 경험치 — 구 user_experiences)

```sql
CREATE TABLE xp_totals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  axis_type  VARCHAR(20) NOT NULL,
  axis_value VARCHAR(50) NOT NULL,
  total_xp   INT NOT NULL DEFAULT 0,
  level      INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, axis_type, axis_value),
  CONSTRAINT chk_ue_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region'))
);
-- axis_value: 'restaurant'|'wine' (category) / '을지로' (area) / '일식' (genre) 등
```

> **`bubble_expertise` 뷰 집계 범위 주의** — `bubble_expertise` 뷰(050_bubble_expertise_view.sql)는 `xp_totals` 중 **세부 축 4종(area/genre/wine_variety/wine_region)만 집계**하며, **category 축(restaurant/wine)은 제외**한다. category는 세부 축 XP의 합산 캐시(중간 계층, §3 참조)이므로 뷰에서 다시 집계하면 중복이 되기 때문이다.
> - 근거: BUBBLE_SYSTEM §5-5 (버블 전문성은 세부 축 기준), XP_SYSTEM §17-5 (뷰는 유저 XP의 버블별 집계)
> - 결과: 버블 전문성/추천 알고리즘은 "을지로"·"일식"·"보르도"·"피노 누아" 같은 **세부 축 단위**로만 작동하고, "식당 레벨"·"와인 레벨" 같은 카테고리 단위는 버블 전문성 판정에 사용되지 않는다.

### 12-4. xp_log_changes (XP 변동 이력 — 구 xp_histories)

```sql
CREATE TABLE xp_log_changes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  record_id  UUID,
  axis_type  VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount  INT,
  reason     VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_xp_reason CHECK (reason IN (
    'record_name','record_score','record_photo','record_full',
    'detail_axis','category',
    'social_share','social_like','social_follow','social_mutual',
    'bonus_onboard','bonus_first_record','bonus_first_bubble','bonus_first_share',
    'milestone','revisit'
  ))
);
-- ※ DB reason 코드 `social_like`는 079 good/bad 전환 이후에도 하위 호환 위해 유지. UI/도메인 SocialAction은 `good`
```

### 12-5. xp_seed_levels (레벨 정의 시드 — 구 level_thresholds)

```sql
CREATE TABLE xp_seed_levels (
  level       INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title       VARCHAR(20),
  color       VARCHAR(10)
);
-- 99행 시드: 앵커 포인트 간 선형 보간 (§5 참조)
```

### 12-6. xp_seed_milestones (마일스톤 정의 시드 — 구 milestones)

```sql
CREATE TABLE xp_seed_milestones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,
  metric    VARCHAR(30) NOT NULL,
  threshold INT NOT NULL,
  xp_reward INT NOT NULL,
  label     VARCHAR(50) NOT NULL,
  CONSTRAINT chk_milestones_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region','global'))
);
```

### 12-7. xp_log_milestones (마일스톤 달성 기록 — 구 user_milestones)

```sql
CREATE TABLE xp_log_milestones (
  user_id      UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES xp_seed_milestones(id),
  axis_value   VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, milestone_id, axis_value)
);
```

### 12-8. xp_seed_rules (XP 배분 규칙 참조)

```sql
CREATE TABLE xp_seed_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(30) NOT NULL UNIQUE,
  xp_amount   INT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 12-9. DB 함수 (RPC)

```sql
-- 원자적 total_xp 증가
increment_user_total_xp(p_user_id UUID, p_xp_delta INT) → VOID

-- 원자적 xp_totals upsert
upsert_user_experience(p_user_id, p_axis_type, p_axis_value, p_xp_delta, p_new_level) → SETOF xp_totals

-- 활성 XP 일괄 갱신 (크론용, 매일 04:00 KST)
refresh_active_xp() → VOID
-- active_xp = 최근 6개월 기록의 record_quality_xp 합산 (소셜/보너스 미포함)
-- active_verified = 최근 6개월 EXIF 검증 기록 수

-- 통계 조회 (LevelDetailSheet용)
get_unique_count(p_user_id, p_axis_type, p_axis_value) → INT
get_record_count_by_axis(p_user_id, p_axis_type, p_axis_value) → INT
get_revisit_count_by_axis(p_user_id, p_axis_type, p_axis_value) → INT
```

> **082 search_path 잠금 주석** — `082_security_hardening.sql`에서 XP 관련 함수의 `search_path`를 `public, pg_temp`(또는 필요 시 `public, pg_temp, extensions`)로 `ALTER FUNCTION ... SET search_path = ...` 고정했다. 대상: `refresh_active_xp`, `increment_user_total_xp`, `upsert_user_experience`, `sync_restaurant_prestige_cache` 등. 이는 Supabase advisor의 mutable `search_path` 경고 대응으로, 호출 컨텍스트가 스키마를 덮어써 악성 함수 해석을 유도하는 경로를 차단한다.

### 12-10. 크론 스케줄

| 크론 | 주기 | 함수 | 설명 |
|------|------|------|------|
| 활성 XP 갱신 | 매일 19:00 UTC (04:00 KST) | `refresh_active_xp()` | 6개월 윈도우 active_xp/active_verified 갱신 |
| 주간 랭킹 스냅샷 | 매주 월요일 00:00 UTC | Edge Function | 버블 주간 랭킹 집계 |

---

## 13. XP 적립 로직

> 구현: `application/hooks/use-xp-calculation.ts` (processRecordXp)
> 진입점: `application/hooks/use-xp-award.ts` (awardXp — 로딩 상태 + 레벨업 알림 래퍼)

```
기록 저장 시 (processRecordXp 단계):

Step 0. 일일 기록 상한 체크 (20개/일, 신규만 — 수정 시 스킵)
Step 1. 기록 품질 판정 → XP 결정 (이름=0, 점수=3, 사진=8, 풀=18)
Step 2. 같은 식당/와인 점수 6개월 제한 체크
        → 점수(+3)분만 차감. 사진(+8→5), 풀기록(+18→15)은 콘텐츠 기여분 유지
Step 2.5. record_quality_xp DB 저장 (records 테이블)
Step 2.6. 수정 모드 시 차액 산출 (현재 XP - 이전 XP)
Step 3. 종합 XP 적립 (users.total_xp += xpDelta) + xp_log_changes 이력 기록
Step 3.5. 첫 기록 보너스 체크 (+5, bonus_first_record, 1회)
Step 4. 세부 축 XP 적립 (xp_totals에 +5, 종합 미포함, 신규만)
        → area/genre (식당) 또는 wine_region/wine_variety (와인)
        → 세부 축 레벨업 체크
Step 5. 카테고리 XP 갱신 (해당 세부 축 합산 → xp_totals category 행)
        → 카테고리 레벨업 체크
Step 6. 마일스톤 체크 — 세부 축(area/genre/wine_region/wine_variety)만 대상
        → 각 세부 축의 unique_count로 해당 축의 모든 마일스톤 판정
        → 달성 시: xp_log_milestones 기록 + 보너스 XP 적립 + xp_log_changes 이력
        → ⚠️ 현재 한계: global 마일스톤(종합 기록 수) 미체크, revisit 마일스톤도 unique_count로 판정
Step 7. 종합 레벨 체크 → 호출측(use-xp-award)에서 레벨업 알림 생성

보너스 XP (별도 hook: use-bonus-xp.ts):
- 온보딩 완료 시 (+10): onboarding-container.tsx → awardBonus('onboard')
- 첫 버블 생성 시 (+5): use-bubble-create.ts → awardBonus('first_bubble')
- 첫 버블 큐레이션 시 (+3): use-share-record.ts → awardBonus('first_share')
- 첫 기록은 Step 3.5에서 직접 처리 (use-xp-calculation.ts)
- 모두 hasBonusBeenGranted 중복 체크 후 1회만 지급

소셜 이벤트 시 (별도 hook: use-social-xp.ts):
1. 일 상한 10 체크 (getDailySocialCounts)
2. 잔여분만 적립 (users.total_xp += socialXp)
3. xp_log_changes 이력 기록 (social_* reason)

EXIF 검증: 기록 저장 시 has_exif_gps / is_exif_verified 플래그 설정
```

---

## 14. 코드 파일 맵 (유저 XP)

### Domain (순수 로직, 외부 의존 0)

| 파일 | 역할 |
|------|------|
| `domain/entities/xp.ts` | XP 타입 정의 (AxisType, XpReason, UserExperience, LevelInfo 등) |
| `domain/repositories/xp-repository.ts` | XpRepository 인터페이스 |
| `domain/services/xp-calculator.ts` | 순수 XP 계산 (기록/소셜/보너스/레벨/어뷰징 체크), XP_CONSTANTS 상수 |

### Infrastructure (Supabase 구현)

| 파일 | 역할 |
|------|------|
| `infrastructure/repositories/supabase-xp-repository.ts` | XpRepository 구현체 (xp_totals, xp_log_changes, xp_seed_* 테이블 접근) |

### Application (비즈니스 오케스트레이션)

| 파일 | 역할 |
|------|------|
| `application/hooks/use-xp-calculation.ts` | 기록 XP 적립 전체 흐름 (Step 0~7) |
| `application/hooks/use-xp-award.ts` | 진입점 래퍼 (로딩 상태 + 레벨업 알림) |
| `application/hooks/use-xp.ts` | XP 조회 hook (experiences, thresholds, recentXp 20건, totalXp) |
| `application/hooks/use-bonus-xp.ts` | 보너스 XP 적립 (onboard/first_bubble/first_share — 1회 중복 체크) |
| `application/hooks/use-social-xp.ts` | 소셜 XP 적립 (일일 상한 적용) |
| `application/hooks/use-axis-level.ts` | 축별 레벨 조회 (식당/와인 상세용) |
| `application/hooks/use-profile.ts` | 프로필 조회 hook (experiences, recentXp 5건, thresholds 포함) |

> **XP 이력 건수 — 용도별 분리 (의도된 중첩)**
> - `use-profile.ts` → **5건**: 프로필 화면 "최근 XP 이력" 요약용 (§11 `profile/recent-xp-list.tsx`). 프로필 초기 로드 비용 최소화.
> - `use-xp.ts` → **20건**: 프로필 레벨 상세 시트(§11 `profile/level-detail-sheet.tsx`)의 XP 분석/전체 이력 표시용. 시트 오픈 시에만 로드.
> - 두 hook이 각자 다른 스케일의 이력을 조회하며, 중첩으로 보이지만 **로딩 시점과 화면 맥락이 다른 용도 분리**다.

### Presentation (UI 컴포넌트)

> 경로: `presentation/components/` 기준 (§11 레벨 표시 규칙과 동일 기준)

| 파일 | 역할 |
|------|------|
| `layout/header-level-bar.tsx` | 앱 헤더 레벨 프로그레스 바 |
| `profile/profile-header.tsx` | 프로필 헤더 레벨 뱃지 |
| `profile/total-level-card.tsx` | 종합 레벨 카드 |
| `profile/level-list.tsx` | 축별 경험치 스크롤 리스트 |
| `profile/level-detail-sheet.tsx` | 레벨 상세 시트 (통계 + XP 분석) |
| `profile/recent-xp-list.tsx` | 최근 XP 이력 (5건) |
| `profile/wrapped-card.tsx` | Wrapped 카드 |
| `detail/axis-level-badge.tsx` | 세부 축 레벨 뱃지 (식당/와인 상세) |
| `detail/bubble-record-card.tsx` | 버블 기록 카드 (작성자 레벨) |
| `record/xp-earned-section.tsx` | 기록 완료 XP 표시 |
| `onboarding/xp-popup.tsx` | 온보딩 XP 팝업 |
| `bubble/feed-card.tsx` | 버블 피드 기록 (레벨 표시) |
| `bubble/member-grid.tsx` | 버블 멤버 그리드 (레벨+칭호) |
| `bubble/member-list-view.tsx` | 버블 멤버 리스트 (레벨) |
| `bubble/ranking-podium.tsx` | 버블 주간 랭킹 포디움 |
| `bubble/ranking-list.tsx` | 버블 주간 랭킹 리스트 |
| `bubbler/bubbler-hero.tsx` | 버블러 프로필 (레벨+칭호+아바타 링) |

### Shared

| 파일 | 역할 |
|------|------|
| `shared/utils/level-color.ts` | 레벨→색상/CSS변수/Tailwind 매핑. **현재 미사용 (dead code 후보)** — 어떤 컴포넌트/훅에서도 import되지 않으며, 실제 색상/칭호 산출은 `domain/services/xp-calculator.ts`의 `getLevelColor` / `getLevelTitle`이 담당. 매핑 SSOT는 DESIGN_SYSTEM.md §10. 제거 또는 통합 대상. |
| `shared/di/container.ts` | `xpRepo` DI 바인딩 |

### DB 마이그레이션

| 파일 | 역할 |
|------|------|
| `supabase/migrations/000_schema_reference.sql` | 전체 스키마 참조 (xp_totals, xp_log_*, xp_seed_* 정의) |
| `supabase/migrations/007_experience.sql` | XP 테이블 생성 + xp_seed_levels 시드 (Lv.1~99) |
| `supabase/migrations/017_xp_functions.sql` | DB 함수 (increment_user_total_xp, upsert_user_experience, refresh_active_xp) |
| `supabase/migrations/020_milestone_seeds.sql` | 마일스톤 시드 데이터 |
| `supabase/migrations/021_active_xp_cron.sql` | 활성 XP 크론 스케줄 (매일 19:00 UTC) |
| `supabase/migrations/022_xp_stat_functions.sql` | 통계 RPC 함수 (get_unique_count, get_record_count_by_axis, get_revisit_count_by_axis) |

### Edge Functions

| 파일 | 역할 |
|------|------|
| `supabase/functions/refresh-active-xp/index.ts` | 활성 XP 크론 (매일 04:00 KST) |
| `supabase/functions/weekly-ranking-snapshot/index.ts` | 주간 랭킹 크론 (매주 월요일 00:00 UTC) |

---

# Part B — Prestige(명성) 시스템

## 15. Prestige란 무엇인가

### 15-1. 정의

**Prestige는 식당 자체에 부여되는 "명성" 점수**다. 미슐랭 가이드, 블루리본 서베이, TV 맛집 프로그램 출연 등 **외부 권위 기관이 인정한 식당 정보**를 표현하며, 유저의 점수 평가와는 **별개로 관리되는 시드 데이터**다.

```
유저 XP             =  "이 사람이 쌓은 경험"      (유저 테이블, 계산)
Prestige (명성)    =  "이 식당의 권위/공신력"    (식당 테이블, 외부 주입)
```

### 15-2. 과거 명칭 — RP (Reputation)

- **2026-04-09**: `restaurant_accolades` 테이블을 없애고 새 시스템 도입 (`055_restaurant_rp.sql`). 당시 이름은 **RP (Reputation)**. 테이블 `restaurant_rp`, 캐시 컬럼 `restaurants.rp`.
- **이후**: 용어 혼동 방지를 위해 `058_rename_rp_to_prestige.sql`에서 전면 rename.
  - `restaurant_rp` → `restaurant_prestige`
  - `rp_type/rp_grade/rp_year` → `prestige_type/prestige_grade/prestige_year`
  - `restaurants.rp` JSONB → `restaurants.prestige` JSONB
  - 인덱스·RLS 정책·트리거 함수(`sync_restaurant_rp_cache` → `sync_restaurant_prestige_cache`)·RPC까지 모두 rename.
- **현재(2026-04-20)**: `prestige`가 정식 용어. "RP"는 과거 명칭으로만 언급된다.

### 15-3. 왜 별도 시스템인가

- 명성 데이터는 **유저가 생성하지 않는다** — 크롤링/엑셀로 외부에서 주입된다.
- **비정기 업데이트** — 미슐랭은 연 1회, TV는 방영 시, 블루리본은 연 1회.
- 식당과의 **매칭이 필요** — 외부 데이터의 식당 이름과 DB의 식당이 다를 수 있으므로 이름/좌표 기반 매칭 프로세스가 별도로 존재.
- **UI 여러 곳에 뱃지로 표시** — 별도 API 호출 없이 빠르게 렌더링되어야 하므로 `restaurants` 테이블에 JSONB 캐시 컬럼을 둔다.

### 15-4. 와인에는 Prestige가 없다

와인에는 `restaurants.prestige`에 해당하는 컬럼이 없다. 대신 와인은 `wines.critic_scores` JSONB에 **와인 평론가 점수**를 저장한다:

```jsonc
// wines.critic_scores 예시 (DATA_MODEL.md §2.4 참조)
{ "WS": 95, "JR": 18.5, "JH": 96, "RP": 97 }
// RP = Robert Parker (와인 평론가), 식당 prestige의 RP(Reputation)와 무관
```

> 주의: wines.critic_scores의 `"RP"`는 와인 평론가 **Robert Parker**의 약자이지, 과거 식당 명성 시스템의 Reputation과는 **의미가 완전히 다르다**. 문서·코드에서 혼동하지 않도록 유의.

---

## 16. Prestige 데이터 구조

### 16-1. restaurant_prestige (시드 테이블 — 원본)

크롤링/엑셀에서 들어온 원본 명성 데이터. **이 테이블이 명성 데이터의 유일한 입력 지점**이다.

> 스키마 상세: DATA_MODEL.md §6 `restaurant_prestige`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `restaurant_id` | UUID FK (nullable) | restaurants 테이블과 매칭되면 채워짐. ON DELETE SET NULL |
| `restaurant_name` | TEXT | 원본 식당 이름 |
| `restaurant_name_norm` | TEXT | 정규화 이름 (매칭용) |
| **`prestige_type`** | TEXT | `'michelin'` \| `'blue_ribbon'` \| `'tv'` (CHECK) |
| **`prestige_year`** | INT | 선정/방영 연도 |
| **`prestige_grade`** | TEXT | 등급 또는 프로그램명 (아래 표 참조) |
| `region`, `area`, `address`, `phone` | TEXT | 매칭 보조 |
| `lat`, `lng` | DOUBLE | 좌표 (매칭 보조, 반경 50m 체크) |
| `kakao_id` | TEXT | 카카오맵 ID (매칭 후 저장) |
| `source_url` | TEXT | 원본 소스 |
| `verified` | BOOLEAN | 검증 여부 |

**`prestige_grade` 값 규칙:**

| prestige_type | prestige_grade 예시 |
|---------------|---------------------|
| `michelin` | `3_star`, `2_star`, `1_star`, `bib` |
| `blue_ribbon` | `3_ribbon`, `2_ribbon`, `1_ribbon` |
| `tv` | 프로그램명 그대로: `흑백요리사`, `줄서는식당`, `생활의달인` 등 |

### 16-2. restaurants.prestige (JSONB 캐시)

`restaurants` 테이블의 JSONB 컬럼. **`restaurant_prestige`에서 트리거로 자동 동기화**되며, UI에서 JOIN 없이 바로 읽는다.

```jsonc
// restaurants.prestige 예시
[
  { "type": "michelin",    "grade": "2_star" },
  { "type": "blue_ribbon", "grade": "3_ribbon" },
  { "type": "tv",          "grade": "흑백요리사" }
]
```

- `year`는 포함하지 않음 (뱃지 표시에 불필요).
- GIN 인덱스 적용 (`idx_restaurants_prestige`).
- 도메인 타입: `src/domain/entities/restaurant.ts` → `RestaurantPrestige { type, grade }`.

---

## 17. Prestige 산출 로직

### 17-1. 핵심: "산출"이 아니라 "주입 + 동기화"

**Prestige는 계산되는 값이 아니다.** 외부 시드 데이터를 `restaurant_prestige`에 INSERT/UPDATE/DELETE 하면, 트리거가 `restaurants.prestige` JSONB 캐시를 자동 재구축한다. 활성 멤버 수·만족도·기록 수 같은 **유저 행동 기반 계산은 포함되지 않는다** (2026-04-20 기준 구현).

```
크롤링/엑셀
    │
    ▼
┌─────────────────────┐
│  restaurant_prestige │  ← 시드 데이터 INSERT/UPDATE/DELETE
│  (원본 테이블)         │
└──────────┬──────────┘
           │
           │  매칭 프로세스 (POST /api/restaurants/prestige/match)
           │  1. 기존 restaurants에서 이름·좌표로 검색 (정규화 이름 완전 일치 + 50m 이내)
           │  2. 없으면 카카오 API로 검색 → 이름 포함 매치 + 50m 이내면 매칭
           │  3. 그래도 없으면 신규 restaurants 생성 후 매칭
           │  4. 전부 실패 → restaurant_id = NULL 유지
           ▼
┌─────────────────────┐   트리거 (자동)      ┌──────────────────────┐
│  restaurant_prestige │ ──────────────────→ │  restaurants.prestige  │
│  restaurant_id 매칭   │   sync_restaurant_  │  JSONB 캐시           │
└─────────────────────┘   prestige_cache()   └──────────┬───────────┘
                                                       │
                                                       ▼
                                                  UI 뱃지 렌더
```

### 17-2. 트리거: `sync_restaurant_prestige_cache()`

- **위치**: `058_rename_rp_to_prestige.sql` 내 `CREATE OR REPLACE FUNCTION sync_restaurant_prestige_cache()`
- **트리거**: `trg_sync_restaurant_prestige_cache` (AFTER INSERT/UPDATE/DELETE, FOR EACH ROW)
- **동작**:
  - INSERT: 새 명성 추가 → 대상 식당의 `prestige` JSONB 재구축
  - UPDATE: `restaurant_id` 변경 시 이전 식당과 새 식당 **모두** 갱신
  - DELETE: 명성 제거 → 대상 식당의 `prestige` JSONB 재구축 (항목이 0이면 `[]`)
- **결과값 구조**: `jsonb_agg(jsonb_build_object('type', prestige_type, 'grade', prestige_grade))`
- **수동 갱신 불필요** — 트리거가 모든 경우를 처리한다.

### 17-3. 매칭 API — `POST /api/restaurants/prestige/match`

- **구현**: `src/app/api/restaurants/prestige/match/route.ts`
- **절차**:
  1. `restaurant_prestige`에서 `restaurant_id IS NULL`인 행 최대 200건 조회
  2. 각 행에 대해:
     - **Step A**: `restaurants`에서 정규화 이름 완전 일치 + 좌표 50m 이내 → 매칭
     - **Step B**: 카카오 API 검색 → 이름 포함 매치 + 좌표 50m 이내 → 기존 식당 있으면 매칭 / 없으면 신규 생성 후 매칭
     - **Step C**: 실패 시 `restaurant_id = NULL` 유지 (재시도 대상)
  3. 매칭된 `restaurant_id` 세트에 대해 `restaurants.prestige` 캐시 bulk 갱신
- **의존**: `infrastructure/api/kakao-local.ts` (카카오 로컬 검색), supabase service client

### 17-4. 시드 업데이트 주기

| 소스 | 주기 | 방법 |
|------|------|------|
| 미슐랭 | 연 1회 | 크롤링 → CSV → `restaurant_prestige` UPSERT → match API 호출 |
| 블루리본 | 연 1회 | 크롤링 → CSV → `restaurant_prestige` UPSERT → match API 호출 |
| TV 프로그램 | 비정기 (방영 시) | 엑셀 → `restaurant_prestige` INSERT (`prestige_type='tv'`, `prestige_grade=프로그램명`) → match API 호출 |

미슐랭처럼 같은 식당의 등급이 매년 바뀌는 경우 `prestige_year`가 다른 새 행을 추가한다. 캐시 JSONB에는 동일 타입의 여러 행이 병합되지만, UI(`PrestigeBadges`)는 타입별 중복을 제거해 1개만 표시한다.

### 17-5. bubble_expertise 뷰와의 관계 — **무관**

`bubble_expertise` 뷰(050_bubble_expertise_view.sql)는 **버블 멤버들의 `xp_totals`를 집계**해 버블별 축(axis_type/axis_value) 전문성을 산출한다 (`bubble_id, axis_type, axis_value, total_xp, max_level, avg_level, member_count`). **Prestige는 이 뷰의 입력이나 출력에 전혀 등장하지 않는다.** 둘은 서로 다른 층위의 개념이다:

- `bubble_expertise` = 유저 XP의 버블별 집계
- `prestige` = 식당 단위의 외부 시드

> **082 보안 강화 주석** — `082_security_hardening.sql`에서 `bubble_expertise` 뷰를 `WITH (security_invoker = true)`로 재생성했다. RLS는 이제 뷰 호출자 권한으로 평가된다 (기존 PostgreSQL 기본값인 `SECURITY DEFINER` → `SECURITY INVOKER` 전환). 이에 따라 뷰를 조회하는 사용자의 권한으로 `bubble_members` / `xp_totals` RLS 정책이 적용되므로, 비멤버가 타 버블의 전문성 데이터를 우회 조회할 수 없다.

---

## 18. Prestige 활용

### 18-1. UI: PrestigeBadges 컴포넌트

- **위치**: `src/presentation/components/ui/prestige-badges.tsx`
- **Props**: `{ prestige: RestaurantPrestige[]; size?: 'sm' | 'md' }`
- **아이콘 매핑**:

| prestige_type | 아이콘 | 비고 |
|---------------|--------|------|
| `michelin` | `MichelinIcon` (3성/2성/1성은 아이콘 반복, `bib`은 `BibGourmandIcon`) | 커스텀 SVG 아이콘 |
| `blue_ribbon` | `BlueRibbonIcon` (3/2/1 리본은 아이콘 반복) | 커스텀 SVG 아이콘 |
| `tv` | lucide `Tv` + 프로그램명 텍스트 | 색상 `var(--accent-wine)` |

- `size='sm'`: 11px (목록/카드용), `size='md'`: 14px (상세 헤더용)
- **같은 `type:grade` 키 기준으로 중복 제거하여 한 번만 렌더** (내부 로직: `key = ${item.type}:${item.grade}`)

### 18-2. 표시 위치 (현재 구현)

`prestige`는 다음 경로에서 `restaurants.prestige` JSONB를 직접 읽어 렌더링된다 (JOIN 불필요):

- 홈 카드/리스트 (`home/record-card.tsx`, `home/compact-list-item.tsx`, `home/map-compact-item.tsx`)
- 식당 상세 헤더 (`restaurant-detail-container.tsx`)
- 검색 결과 (`search/search-results.tsx`, `search/search-result-item.tsx`)
- 지도뷰 (`home/map-view.tsx`)

구체적 컴포넌트 목록은 `grep -l "prestige" src/presentation/components/` 로 확인.

### 18-3. Prestige 기반 필터

홈·검색의 "명성" 필터는 `restaurants.prestige` JSONB에 대해 contains 연산을 사용한다:

- **PostgREST**: `prestige=cs.[{"type":"michelin"}]` / `prestige=eq.[]`(명성 없음)
- **RPC**: 062 마이그레이션에서 3-way split — `search_restaurants_bounds_simple` / `search_restaurants_bounds_auth` / `search_restaurants_bounds_source` 각각이 `p_prestige_types TEXT[]`를 받아 `jsonb_array_elements(rst.prestige)`로 type 필터링. `src/app/api/restaurants/bounds/route.ts`는 인증/소스 여부에 따라 세 RPC 중 하나를 호출한다. 레거시 `search_restaurants_in_bounds`는 호출 금지 (QUERY_OPTIMIZATION §4-1 참고).
- **domain layer**:
  - `domain/services/filter-matcher.ts` — `matchPrestige()`, 속성 `prestige`(있음/없음) 및 `prestige_grade:<type>` 복합 조건
  - `domain/services/filter-query-builder.ts` — PostgREST 필터 문자열 생성

- GIN 인덱스(`idx_restaurants_prestige`)로 필터 성능 확보.

### 18-4. 추천 알고리즘과의 연계

Prestige의 추천 알고리즘 활용 여부 및 방식은 **RECOMMENDATION.md에 위임**한다. 본 문서는 데이터 구조와 캐시 메커니즘까지만 정의한다.

> 참고: 과거 `domain/services/nyam-score.ts`에서 prestige 보너스를 사용하던 설계가 개념문서에 남아있으나, `nyam-score.ts`는 **dead code로 삭제됨**(WORKLOG #50, 2026-04-15). 현재 prestige는 UI 뱃지와 검색·지도 RPC 필터 용도가 주 사용처다.

---

## 19. Prestige 관련 파일 맵

### Domain

| 파일 | 역할 |
|------|------|
| `domain/entities/restaurant.ts` | `RestaurantPrestige { type, grade }`, `Restaurant.prestige: RestaurantPrestige[]` |
| `domain/services/filter-matcher.ts` | `matchPrestige()`, attribute 체크(`prestige`, `prestige_grade:*`) |

### Infrastructure / API

| 파일 | 역할 |
|------|------|
| `src/app/api/restaurants/prestige/match/route.ts` | 매칭 API (restaurant_prestige → restaurants) |
| `src/app/api/restaurants/bounds/route.ts` | 지도뷰 RPC 호출 시 `p_prestige_types` 전달 |
| `src/app/api/restaurants/search/route.ts` | 검색 RPC 호출 |
| `infrastructure/api/kakao-local.ts` | 매칭 보조 (카카오 로컬 검색) |

### Presentation

| 파일 | 역할 |
|------|------|
| `presentation/components/ui/prestige-badges.tsx` | 뱃지 렌더링 (sm/md) |
| `presentation/components/home/record-card.tsx` | 홈 카드 prestige 표시 |
| `presentation/components/home/compact-list-item.tsx` | 홈 리스트 prestige 표시 |
| `presentation/components/home/map-compact-item.tsx` | 지도뷰 리스트 |
| `presentation/components/home/map-view.tsx` | 지도 핀 |
| `presentation/components/search/search-result-item.tsx` | 검색 결과 |

### DB 마이그레이션

| 파일 | 역할 |
|------|------|
| `supabase/migrations/055_restaurant_rp.sql` | 원본 도입 (`restaurant_rp` + `restaurants.rp` + sync 트리거 + RPC 리턴 타입 변경). `restaurant_accolades`로부터 데이터 이전 |
| `supabase/migrations/058_rename_rp_to_prestige.sql` | 전면 rename: 테이블/컬럼/인덱스/RLS 정책/트리거 함수/RPC(`restaurants_within_radius`, `search_restaurants_in_bounds`) 모두 `rp` → `prestige` |
| `supabase/migrations/062_search_restaurants_bounds_split.sql` | Prestige RPC 3-way split — `search_restaurants_bounds_simple` / `_auth` / `_source` 분리, 각 RPC가 `p_prestige_types TEXT[]` 수용. 레거시 `search_restaurants_in_bounds` deprecated (§18-3) |
| `supabase/migrations/082_security_hardening.sql` | XP 관련 함수 `search_path` 고정(`refresh_active_xp`, `increment_user_total_xp`, `upsert_user_experience`, `sync_restaurant_prestige_cache` 등) + `bubble_expertise` 뷰 `SECURITY INVOKER` 전환 (§12-9, §17-5) |

### 시드/크롤링 (저장소 외 또는 DB/ 경로)

| 경로 | 역할 |
|------|------|
| `DB/미슐랭_크롤링/` | 미슐랭 연 1회 업데이트용 크롤링 스크립트 (저장소 외부 자산) |
| `DB/블루리본_크롤링/` | 블루리본 연 1회 업데이트용 |

---

## 20. 통합 정리

| 질문 | 답변 |
|------|------|
| 유저 XP와 Prestige는 같은 축인가? | **아니다.** 완전히 독립. 유저 테이블 vs 식당 테이블, 계산 vs 주입. |
| 권위 식당(높은 prestige)에 기록하면 XP 보너스가 있나? | **현재 없다** (`xp-calculator.ts`에 prestige 분기 없음). 설계 원칙 §1("이기적 동기") 보존용. |
| Prestige는 와인에도 있나? | **없다.** 와인은 `wines.critic_scores` JSONB에 평론가 점수(WS/JR/JH/Parker's RP 등)를 별도 관리. 식당의 prestige와 **이름·의미 모두 다르다**. |
| RP와 Prestige는 다른 시스템인가? | **같은 시스템의 옛 이름과 현재 이름.** 055에서 RP로 도입, 058에서 전면 rename. 과거 마이그레이션/기록에만 `rp` 흔적이 남아있다. |
| Prestige가 활성 멤버·만족도로 계산되나? | **아니다.** 외부 시드(미슐랭/블루리본/TV) 주입 + 매칭 + 트리거 캐시만 있다. 유저 행동 기반 산출 로직은 현재 없다. |
| `bubble_expertise` 뷰가 prestige에 영향을 주나? | **아니다.** 서로 다른 층위. 뷰는 유저 XP의 버블별 집계일 뿐. |
