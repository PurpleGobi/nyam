# RECORD_DETAIL — 기록 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM, XP_SYSTEM
> affects: HOME, RESTAURANT_DETAIL, WINE_DETAIL
> route: /records/[id]
> prototype: 없음 (식당/와인 상세 페이지 타임라인에서 탭하여 진입하는 화면)

---

## 1. 현재 상태

**기록 상세 전용 프로토타입은 아직 없다.**
기록 정보는 현재 다음 위치에서 확인 가능:
- 식당 상세 (02_detail_restaurant.html) → Layer 5: 나의 기록 타임라인
- 와인 상세 (02_detail_wine.html) → Layer 6: 나의 기록 타임라인

타임라인 아이템 탭 시 `/records/[id]`로 이동하는 것으로 설계되어 있으나 (00_IA.md, 02_RESTAURANT_DETAIL.md, 03_WINE_DETAIL.md 참조), 상세 화면 자체의 프로토타입은 미구현 상태.

아래는 00_IA.md와 관련 문서를 기반으로 한 기록 상세 페이지 스펙이다.

---

## 2. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←]                          [⋯]    │  헤더 (record-nav 스타일)
│                                      │
│ 스시코우지                            │  대상명 (H2, 21px, weight 800)
│ 2026.03.19 · [데이트]                 │  방문일 + 상황 태그 칩
│                                      │
│ ── 사분면 ──────────────────────     │  Section 1: 미니 사분면
│ ┌──────────────────────────────────┐ │
│ │       포멀                        │ │
│ │        |  ●92                    │ │  이 기록 = 강조 점
│ │ 저렴 ──┼── 고가                   │ │  다른 기록 = 반투명(30%)
│ │   ○    |                         │ │
│ │       캐주얼                      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 만족도 ─────────────────────     │  Section 2: 점수
│        92                            │  Display 2.5rem, bold
│   ━━━━━━━━━━━━━ (컬러 바)            │  만족도 색상 매핑
│                                      │
│ ── 아로마 (와인만) ──────────────    │  Section 3: 아로마 휠
│ ┌──────────────────────────────────┐ │
│ │  [선택된 섹터 하이라이트]          │ │  아로마 휠 시각화
│ │  검은베리 · 바닐라 · 가죽          │ │  aroma_labels 칩 나열
│ └──────────────────────────────────┘ │
│ 복합성 68 · 여운 7초+ · 균형 85      │  구조 평가 요약 (있을 때만)
│                                      │
│ ── 한줄평 ─────────────────────     │  Section 4 (있을 때만)
│ "분위기 최고, 코스 구성도 훌륭"       │
│                                      │
│ ── 사진 ──────────────────────      │  Section 5 (있을 때만)
│ [사진1] [사진2] [사진3]  →           │  가로 스크롤, 탭→풀스크린
│                                      │
│ ── 페어링 (와인만) ────────────     │  Section 6 (있을 때만)
│ [🥩 적색육] [🧀 치즈·유제품]          │  선택된 페어링 칩
│                                      │
│ ── 메뉴/팁 (식당만) ──────────      │  Section 7 (있을 때만)
│ 추천 메뉴: [A코스] [런치세트]         │  태그 칩
│ 팁: "예약 필수, 런치 가성비 좋음"     │
│                                      │
│ ── 실용 정보 ─────────────────      │  Section 8
│ 💰 ₩85,000 (1인)                    │  가격
│ 👥 김영수                            │  동반자
│ 📅 2026.03.19                       │  방문일
│ 🍷 Château Margaux 2018 (와인 연결) │  식당 기록: 연결된 와인
│ 🍽 스시코우지 (식당 연결)             │  와인 기록: 연결된 식당
│                                      │
│ ── 경험치 ────────────────────      │  Section 9
│ 을지로 +18 XP (Lv.4)                │
│ 일식 +12 XP (Lv.3)                  │
│                                      │
│ ── 액션 ──────────────────────      │  Section 10
│ [수정하기]  [삭제하기]                │
│ [버블에 공유 (P2)]                   │
│                                      │
│                          [h-20 여백] │
└──────────────────────────────────────┘
```

---

## 3. 섹션별 상세

### 헤더

| 요소 | 스펙 |
|------|------|
| 뒤로 버튼 | `chevron-left` → 이전 페이지 |
| 더보기 | `more-horizontal` → 드롭다운: 수정, 삭제, 공유(P2) |
| 스크롤 시 | 고정 헤더 + 대상명 (glassmorphism, `rgba(248,246,243,0.55)` + blur 20px) |

### 대상명 + 방문 정보

- **대상명**: 21px, weight 800
  - 식당: `var(--text)` 색상 → 탭 시 `/restaurants/[id]`
  - 와인: `var(--wine)` 색상 → 탭 시 `/wines/[id]`
  - 와인: 와인명 + 생산자 + 빈티지 (있으면)
- **방문일**: 12px, `var(--text-sub)`, YYYY.MM.DD 형식
- **상황 태그**: 칩 형태, 상황별 색상 (02_RESTAURANT_DETAIL.md Layer 5 참조). `scene` 값 있을 때만 표시

```css
--scene-solo:     #7A9BAE;  /* 혼밥/혼술 */
--scene-romantic: #B8879B;  /* 데이트 */
--scene-friends:  #7EAE8B;  /* 친구/모임 */
--scene-family:   #C9A96E;  /* 가족/페어링 */
--scene-business: #8B7396;  /* 회식/선물 */
--scene-drinks:   #B87272;  /* 술자리/시음 */
```

### Section 1: 미니 사분면

- 높이: h-48 (192px)
- **이 기록의 점**: 불투명, 만족도 색상 fill
- **같은 대상의 다른 기록**: 반투명(30%), 동일 색상 규칙
- 식당: X축 = 가격(저렴↔고가), Y축 = 분위기(캐주얼↔포멀)
- 와인: X축 = 산미(낮음↔높음), Y축 = 바디(Light↔Full)
- 점 크기 = 만족도 (1~100 → 12~54px)
- 기록 1개뿐이면 점 하나만 표시
- **탭 동작**: 해당 식당/와인 상세 페이지로 이동

### Section 2: 만족도 점수

- 숫자: Display 2.5rem, bold
- 컬러 바: 만족도 5단계 게이지 색상 (DESIGN_SYSTEM §1 참조)
  - `--gauge-1`(#C4B5A8) → `--gauge-3`(#9FA5A3) → `--gauge-5`(#7A9BAE)
- 바 너비 = 만족도 %

### Section 3: 아로마 (와인 기록만)

- `aroma_regions`이 있을 때만 표시
- 아로마 휠 시각화: 선택된 섹터 하이라이트, 미선택 = neutral-100
- 하단에 `aroma_labels` 텍스트 나열 (칩 형태)
- 구조 평가 요약 (complexity, finish, balance 값 있으면):
  ```
  복합성 68 · 여운 7초+ · 균형 85
  ```

### Section 4: 한줄평

- `comment` 필드 있을 때만 표시
- Body (1rem, `var(--text-sub)`), italic 스타일
- 최대 200자

### Section 5: 사진

- `record_photos` 있을 때만 표시
- 가로 스크롤, `order_index` 순
- 각 사진: `rounded-lg`, h-48 (192px)
- 탭 → 풀스크린 모달 (좌우 스와이프, 핀치 줌)

### Section 6: 페어링 (와인 기록만)

- `pairings` 있을 때만 표시
- 선택된 페어링 카테고리를 칩으로 나열
- 칩 스타일: `var(--wine-light)` 배경, `var(--wine-border)` 테두리, `var(--wine)` 텍스트

### Section 7: 메뉴 태그 / 팁 (식당 기록만)

- `menu_tags` 있을 때: 태그 칩 (`rounded-full bg-neutral-100 px-3 py-1`)
- `tips` 있을 때: Small (0.875rem, `var(--text-sub)`)
- 둘 다 없으면 섹션 숨김

### Section 8: 실용 정보

| 항목 | 표시 | 조건 |
|------|------|------|
| 가격 | 원화 포맷 (1인/병) | 없으면 "-" |
| 동반자 | 아바타 + 이름 나열 | 있을 때만 |
| 방문일 | YYYY.MM.DD | 항상 표시 |
| 연결된 와인 | 와인명 + 탭→와인 상세 | 식당 기록 + 와인 연결 시 |
| 연결된 식당 | 식당명 + 탭→식당 상세 | 와인 기록 + `linked_restaurant_id` 시 |

### Section 9: 경험치

- 이 기록으로 적립된 XP (`xp_histories`에서 `record_id`로 조회)
- 각 축별 표시: `{axis_value} +{xp_amount} XP (Lv.{level})`
- 레벨 색상: `level_thresholds.color` 적용
- XP 없으면 섹션 숨김

### Section 10: 액션

- **[수정하기]**: Secondary 버튼
  - 탭 → 기록 플로우 (05_RECORD_FLOW) 통합 기록 화면 진입, 기존 데이터 pre-fill
  - 사분면 위치, 만족도, 상황 태그, 코멘트, 동반자, 가격 등 모두 pre-fill
  - 와인: 아로마, 구조 평가, 페어링도 pre-fill
  - 수정 후 저장 시 `records` UPDATE + XP 재계산
- **[삭제하기]**: Destructive 버튼 (`text-red-500`)
  - 탭 → 확인 모달: "이 기록을 삭제하시겠습니까? 경험치가 차감됩니다."
  - 확인 시: soft delete (`status → 'deleted'` 또는 `deleted_at` 설정)
  - XP 재계산: `xp_histories`에서 해당 `record_id` 관련 XP 차감
  - 삭제 후 → 이전 페이지로 이동
- **[버블에 공유]**: Phase 2. Phase 1에서는 숨김

---

## 4. 빈 상태 패턴

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 사분면 | axis_x/y NULL (checked 상태) | "사분면 평가를 추가해보세요" + [평가하기] |
| 아로마 | 와인 아닌 경우 or aroma_regions NULL | 섹션 숨김 |
| 한줄평 | comment NULL | 섹션 숨김 |
| 사진 | record_photos 0개 | 섹션 숨김 |
| 페어링 | 와인 아닌 경우 or pairings NULL | 섹션 숨김 |
| 메뉴/팁 | menu_tags + tips 모두 NULL | 섹션 숨김 |
| 실용 정보 | price + companions NULL | 방문일만 표시 |
| 경험치 | xp_histories 0건 | 섹션 숨김 |

---

## 5. 인터랙션

| 인터랙션 | 상세 |
|---------|------|
| 스크롤 시 | 고정 헤더 (glassmorphism) + 대상명 |
| 사진 탭 | 풀스크린 모달 (좌우 스와이프, 핀치 줌, [×] 닫기) |
| 사분면 탭 | 해당 식당/와인 상세 페이지로 이동 |
| 대상명 탭 | 상세 페이지 (`/restaurants/[id]` 또는 `/wines/[id]`) |
| 연결된 와인 탭 | `/wines/[id]` |
| 연결된 식당 탭 | `/restaurants/[id]` |
| 삭제 확인 모달 | `AlertDialog` (200ms ease-in-out) |

---

## 6. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 기록 기본정보 | records | 실시간 |
| 사진 | record_photos | 실시간 |
| 식당/와인 정보 | restaurants / wines | 캐시 (2주) |
| 사분면 좌표 | records.axis_x/y + 동일 target records | 실시간 |
| 아로마 | records.aroma_regions/labels | 실시간 |
| 구조 평가 | records.complexity/finish/balance | 실시간 |
| 페어링 | records.pairings | 실시간 |
| 경험치 | xp_histories + user_experiences | 실시간 |
| 와인 연결 | records.linked_wine_id → wines | 실시간 |
| 식당 연결 | records.linked_restaurant_id → restaurants | 실시간 |

---

## 7. Phase 구분

### Phase 1
- Section 1~10 전체 (버블 공유 버튼 제외)
- 수정, 삭제 기능
- 홈 카드 탭, 식당/와인 상세 타임라인 탭에서 진입

### Phase 2
- [버블에 공유] 버튼 활성화
- 공유 시: 버블 선택 바텀시트 → `bubble_shares` INSERT
- 공유된 기록에는 버블 아이콘 표시

---

## 8. 라우팅

```
/records/[id]
  ← 홈 카드 탭
  ← 식당 상세 Layer 5 타임라인 아이템 탭
  ← 와인 상세 Layer 6 타임라인 아이템 탭
  ← 프로필 최근 기록 탭
  → /restaurants/[id] (대상명 탭, 사분면 탭 — 식당 기록)
  → /wines/[id] (대상명 탭, 사분면 탭 — 와인 기록)
  → 05_RECORD_FLOW 통합 기록 화면 (수정하기)
```
