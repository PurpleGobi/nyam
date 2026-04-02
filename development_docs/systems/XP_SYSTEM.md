# XP_SYSTEM — 경험치 & 레벨 (v2)

> affects: RECORD_FLOW, PROFILE, BUBBLE, HOME, ONBOARDING
> 최종 갱신: 2026-04-02
> 시뮬레이션 검증: `system_brainstorming/simulation/` (test_xp_charts, test_xp_abuse, test_xp_global)

---

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
| 버블에 공유 | +1 | |
| 좋아요/찜 받음 | +1 | |
| 팔로워 획득 (버블/개인) | +1 | |
| 맞팔 성사 | +2 | 양쪽 모두 |

> **소셜 XP 합산 일일 상한: 10 XP/일** (어떤 조합이든)

### 4-4. 보너스 XP (종합 XP에 적립, 1회)

| 활동 | XP |
|------|-----|
| 온보딩 완료 | +10 |
| 첫 기록 | +5 |
| 첫 버블 생성 | +5 |
| 첫 버블 공유 | +3 |

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

**통계 레벨:**
- 식당/와인 표시 점수 = Trimmed Mean (양끝 5% 제거)
- 극단 점수 자동 배제, 패널티 없음

### 6-2. 시뮬레이션 검증 결과

> 출처: `system_brainstorming/simulation/test_xp_abuse.py`

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

## 12. DB 스키마

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

소셜 이벤트 시 (별도 hook: use-social-xp.ts):
1. 일 상한 10 체크 (getDailySocialCounts)
2. 잔여분만 적립 (users.total_xp += socialXp)
3. xp_log_changes 이력 기록 (social_* reason)

EXIF 검증: 기록 저장 시 has_exif_gps / is_exif_verified 플래그 설정
```

---

## 14. 코드 파일 맵

### Domain (순수 로직, 외부 의존 0)

| 파일 | 역할 |
|------|------|
| `domain/entities/xp.ts` | XP 타입 정의 (AxisType, XpReason, UserExperience, LevelInfo 등) |
| `domain/repositories/xp-repository.ts` | XpRepository 인터페이스 |
| `domain/services/xp-calculator.ts` | 순수 XP 계산 (기록/소셜/보너스/레벨/어뷰징 체크), XP_CONSTANTS 상수 |
| `domain/services/onboarding-xp.ts` | 온보딩 전용 XP 계산 (완료 +10, 버블 생성, 식당 등록) |

### Infrastructure (Supabase 구현)

| 파일 | 역할 |
|------|------|
| `infrastructure/repositories/supabase-xp-repository.ts` | XpRepository 구현체 (xp_totals, xp_log_changes, xp_seed_* 테이블 접근) |

### Application (비즈니스 오케스트레이션)

| 파일 | 역할 |
|------|------|
| `application/hooks/use-xp-calculation.ts` | 기록 XP 적립 전체 흐름 (Step 0~7) |
| `application/hooks/use-xp-award.ts` | 진입점 래퍼 (로딩 상태 + 레벨업 알림) |
| `application/hooks/use-social-xp.ts` | 소셜 XP 적립 (일일 상한 적용) |
| `application/hooks/use-axis-level.ts` | 축별 레벨 조회 (식당/와인 상세용) |

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
| `shared/utils/level-color.ts` | 레벨→색상/CSS변수/Tailwind 매핑 **(미사용 dead code — 실제로는 `xp-calculator.ts`의 getLevelColor 사용)** |
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
