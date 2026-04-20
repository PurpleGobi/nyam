# 백앤드 스키마 개념 정리

---

## 테이블 전체 목록 (21개)

### 유지 테이블

| # | 분류 | 테이블 | 역할 |
|---|------|--------|------|
| 1 | 엔티티 | `users` | 사용자 |
| 2 | 엔티티 | `restaurants` | 식당 |
| 3 | 엔티티 | `wines` | 와인 |
| 4 | 엔티티 | `bubbles` | 버블 |
| 5 | 기록 | `lists` | 사용자 × 식당/와인 관계 + 상태 |
| 6 | 기록 | `records` | 방문/시음 1회의 경험 데이터 |
| 7 | 기록 | `record_photos` | 기록 사진 (원본 + 썸네일) |
| 8 | 버블 | `bubble_members` | 사용자 × 버블 관계 |
| 9 | 버블 | `bubble_shares` | 기록의 버블 공유 이벤트 |
| 10 | 버블 | `bubble_ranking_snapshots` | 주간 랭킹 스냅샷 |
| 11 | 소셜 | `follows` | 팔로우 관계 |
| 12 | 소셜 | `comments` | 댓글 |
| 13 | 소셜 | `reactions` | 좋아요/북마크 |
| 14 | 소셜 | `notifications` | 알림 |
| 15 | XP | `xp_totals` | 축별 현재 XP + 레벨 |
| 16 | XP | `xp_log_changes` | XP 변동 이력 |
| 17 | XP | `xp_log_milestones` | 마일스톤 달성 기록 |
| 18 | XP | `xp_seed_levels` | 레벨 정의 (시드) |
| 19 | XP | `xp_seed_milestones` | 마일스톤 정의 (시드) |
| 20 | XP | `xp_seed_rules` | XP 배분 규칙 (시드, 신규) |
| 21 | 기타 | `saved_filters` | 저장된 필터 (재설계 예정) |

### 삭제 테이블

| 테이블 | 삭제 이유 |
|--------|----------|
| ~~wishlists~~ | lists로 통합 (status = 'wishlist') |
| ~~bubble_share_reads~~ | 읽음 추적 불필요 (피드는 메신저가 아님) |
| ~~nudge_history~~ | 넛지는 앱 안에서 의미 없음 |
| ~~nudge_fatigue~~ | 위와 동일 |
| ~~grape_variety_profiles~~ | 고정 데이터 → SSOT 파일로 대체 |
| ~~ai_recommendations~~ | 미연결 코드, Phase 1 추천은 실시간 SQL |

---

## 기록 테이블 구조

### 핵심 관계

```
users ──(lists)── restaurants/wines     "내 목록에 있다"
                      │
                   records              "실제로 경험했다"
```

### lists (구 records + wishlists 통합)

사용자와 식당/와인의 **관계**를 나타내는 테이블.
"이 사용자가 이 식당/와인을 알고 있다"는 사실과 그 상태를 저장.

- 사용자 × 식당/와인 = 1행
- 상태값 하나로 분류: `visited`, `wishlist`, `cellar` 등
- 기존 wishlists 테이블이 별도로 필요 없어짐
  - "찜"은 lists.status = 'wishlist'
  - "방문"은 lists.status = 'visited'

**필터 시스템에서의 의미**: "상태" 필터가 하나의 테이블, 하나의 컬럼에서 해결됨.

### records (구 visits JSONB → 별도 테이블)

방문/시음 1회의 **실제 경험 데이터**.
lists 1행에 대해 여러 records가 쌓일 수 있음 (재방문).

포함 데이터:
- axis_x, axis_y, satisfaction — 사분면 평가
- scene — 상황 태그 (혼밥, 데이트, 친구 등)
- comment — 한줄평
- total_price / purchase_price — 가격
- date, meal_time — 방문 일시
- menu_tags, pairing_categories — 그때 먹은 메뉴/페어링
- has_exif_gps, is_exif_verified — GPS 검증

**필터 시스템에서의 의미**: 각 필드가 독립 컬럼이므로 SQL WHERE로 직접 필터링 가능. JSONB 파싱 불필요.

### record_photos

기록 1건에 대한 사진 0~N장. 별도 테이블로 유지.

분리 이유:
- 사진별 개별 관리 (순서 변경, 삭제)
- 썸네일을 미리 생성해서 저장 → 목록 화면 로딩 속도 확보
- 목록 조회 시 불필요한 사진 데이터를 안 가져올 수 있음

컬럼:
- `url` — 원본 이미지
- `thumbnail_url` — 미리 리사이즈된 썸네일 (업로드 시 생성)
- `order_index` — 순서
- `is_public` — 공개 여부
- `created_at`

목록 화면에서는 `thumbnail_url`만 로드, 상세 화면에서 `url` (원본) 로드.

### 변경 전후 비교

**Before (현재)**
```
records (1행 = 사용자 × 식당/와인)
  └── visits: JSONB[] ← 방문별 데이터가 배열로 묶여있음
wishlists (별도 테이블) ← 찜 데이터
```

문제점:
- "상태" 필터가 records + wishlists 두 테이블을 조인해야 함
- visits JSONB 안의 scene, satisfaction 등을 SQL로 필터링하기 어려움
- 비정규화 캐시(avg_satisfaction 등)로 부분 해결하지만 한계

**After (변경 방향)**
```
lists (1행 = 사용자 × 식당/와인, 상태 포함)
  └── records (1행 = 방문 1회, 모든 경험 데이터가 독립 컬럼)
```

장점:
- 상태 필터: lists.status 하나로 해결
- 경험 필터: records 컬럼에 직접 WHERE 가능
- wishlists 테이블 불필요 (lists로 통합)

---

## 버블 테이블 구조

### 핵심 관계

```
bubbles ──(bubble_members)── users          "누가 어떤 버블에 속해있다"
                │
          bubble_shares                     "기록을 버블에 공유했다"
                │
     bubble_ranking_snapshots               "주간 랭킹 스냅샷"
```

### bubbles (엔티티)

버블 자체의 정보.

핵심 정보:
- `name`, `description`, `icon`, `icon_bg_color`
- `focus_type` — 'all' | 'restaurant' | 'wine'
- `area` — 지역
- `created_by` — 생성자

가입/접근 정책:
- `join_policy` — 가입 방식 (default 'invite_only')
- `visibility` — 버블 공개 범위 (default 'private')
- `content_visibility` — 콘텐츠 공개 수준 (default 'rating_only')
- `min_records`, `min_level` — 가입 자격 조건
- `max_members` — 인원 제한
- `invite_code`, `invite_expires_at` — 초대 링크

공유/검색 설정:
- `allow_comments`, `allow_external_share`
- `is_searchable`, `search_keywords`, `rules`

비정규화 캐시:
- `member_count`, `record_count`, `follower_count`
- `avg_satisfaction`, `unique_target_count`
- `weekly_record_count`, `prev_weekly_record_count` — 활성도
- `last_activity_at`

### bubble_members

사용자 × 버블 관계. (lists와 비슷한 패턴)

- `bubble_id`, `user_id` — 누가 어떤 버블에
- `role` — 'member' | 'admin' 등
- `status` — 'active' | 'pending' 등
- `share_rule` — JSONB, 자동 공유 필터 규칙
- `visibility_override` — JSONB, 이 버블에서의 공개 설정 오버라이드

비정규화 캐시:
- `taste_match_pct`, `common_target_count`, `avg_satisfaction`
- `member_unique_target_count`, `weekly_share_count`
- `badge_label` — 랭킹 뱃지

### bubble_shares

기록을 버블에 공유한 이벤트.

- `record_id` — 어떤 기록을
- `bubble_id` — 어떤 버블에
- `shared_by` — 누가
- `shared_at` — 언제
- `auto_synced` — 자동 공유인지 수동인지
- `target_id` — 비정규화: 식당/와인 ID (records JOIN 없이 식당별 조회 가능)
- `target_type` — 비정규화: 'restaurant' | 'wine' (target_id만으로는 식당/와인 구분 불가)

### bubble_ranking_snapshots

주간 랭킹 스냅샷. 등락(▲▼) 표시용.

- `bubble_id`, `target_id`, `target_type`
- `period_start` — 주간 시작일
- `rank_position`, `avg_satisfaction`, `record_count`

---

## 소셜 테이블 구조

comments와 reactions는 분리 유지 — 각 테이블이 작아서 인덱스 히트가 빠르고, 댓글만/리액션만 필요한 경우가 대부분.

### follows

사용자 간 팔로우 관계.

- `follower_id`, `following_id` — 누가 누구를
- `status` — 'accepted' (default) | 'pending'
- `created_at`

### comments

버블 피드 내 댓글.

- `target_type`, `target_id` — 어디에 (bubble_share 등)
- `bubble_id` — 어떤 버블에서
- `user_id` — 작성자
- `content` — 내용
- `is_anonymous` — 익명 여부
- `created_at`

### reactions

좋아요/북마크 등 리액션.

- `target_type`, `target_id` — 어디에
- `reaction_type` — 'like' | 'bookmark' 등
- `user_id` — 누가
- `created_at`

### notifications

알림.

- `user_id` — 받는 사람
- `notification_type` — 알림 종류
- `actor_id` — 행동한 사람
- `target_type`, `target_id` — 대상
- `bubble_id` — 버블 관련이면
- `metadata` — JSONB, 추가 정보
- `is_read` — 읽음 여부
- `action_status` — 액션 상태 (승인/거절 등)
- `created_at`

---

## XP/레벨 테이블 구조

### 설계 원칙
- XP 부여 트리거는 전부 DB 변화 (records INSERT, follows INSERT 등)
- XP 계산 로직은 서버(DB 트리거/함수)에서 처리 → 안전성 확보
- 시드 데이터는 DB에 유지 (서버에서 참조 필요)
- `xp_` prefix 통일, 성격별 `seed_` / `log_` 중간 prefix

### 테이블 목록

| 테이블 | 역할 | 성격 |
|--------|------|------|
| `xp_totals` | 축별 현재 XP + 레벨 | 현재 상태 |
| `xp_log_changes` | XP 변동 이력 (언제, 왜, 얼마나) | 로그 |
| `xp_log_milestones` | 마일스톤 달성 기록 | 로그 |
| `xp_seed_levels` | 레벨별 필요 XP, 칭호, 색상 | 시드 |
| `xp_seed_milestones` | 마일스톤 달성 조건 + 보상 XP | 시드 |
| `xp_seed_rules` | 행동별 XP 배분 규칙 | 시드 (신규) |

### 네이밍 변경 이력

| 구 이름 | 신 이름 | 변경 이유 |
|---------|---------|----------|
| `user_experiences` | `xp_totals` | xp_ prefix 통일 |
| `xp_histories` | `xp_log_changes` | 성격(log) 명시 |
| `user_milestones` | `xp_log_milestones` | xp_ prefix + log 성격 |
| `level_thresholds` | `xp_seed_levels` | xp_ prefix + seed 성격 |
| `milestones` | `xp_seed_milestones` | xp_ prefix + seed 성격 |
| (하드코딩) | `xp_seed_rules` | 코드 상수 → DB 시드로 이전 |

### XP 부여 흐름 (서버 처리)

```
DB 변화 발생 (records INSERT, follows INSERT 등)
  │
  ├── xp_seed_rules 참조 → XP 계산
  ├── xp_log_changes에 이력 기록
  ├── xp_totals 잔고 갱신
  ├── xp_seed_levels 참조 → 레벨업 판정
  ├── xp_seed_milestones 참조 → 마일스톤 달성 체크
  └── xp_log_milestones에 달성 기록
```

### XP 부여 트리거 전체 목록

| XP 종류 | 트리거 (DB 변화) | 비고 |
|---------|-----------------|------|
| 기록 XP (+3/8/18) | records INSERT | 품질에 따라 차등 |
| 세부 축 XP (+5) | records INSERT | area, genre, wine_region, wine_variety |
| 소셜 XP (share/like/follow +1, mutual +2) | bubble_shares/reactions/follows INSERT | 일일 상한 10 |
| 보너스 XP (온보딩 +10, 첫 기록 +5 등) | 각각 DB INSERT | 1회성 |
| 마일스톤 보상 | 마일스톤 달성 시 | xp_seed_milestones.xp_reward |

---

## 식당 상세보기 쿼리 흐름

### 전제
- `bubble_members` (내 버블 목록)는 로그인 시 1회 조회 후 클라이언트 캐시
- `bubble_shares`에 `target_id` 비정규화 → records JOIN 없이 식당별 조회 가능

### 식당 상세 진입 시 (병렬 3개)

```
[동시 요청]
├── A: restaurants WHERE id = 식당id              → 기본 정보
├── B: records WHERE target_id = 식당id AND user_id = 나  → 내 기록
└── C: bubble_shares WHERE target_id = 식당id
                     AND bubble_id IN (캐시된 내 버블들)   → 버블 공유 기록 + bubble_id
```

### 예상 속도

| 쿼리 | 예상 시간 | 비고 |
|------|----------|------|
| A: restaurants (PK 조회) | ~20ms | 목록에서 이미 캐시된 경우 스킵 가능 |
| B: records (인덱스 조회) | ~30ms | target_id + user_id 인덱스 |
| C: bubble_shares (인덱스 조회) | ~30ms | target_id + bubble_id 인덱스 |
| **총 체감 시간** | **~0.1~0.15초** | 병렬이므로 가장 느린 쿼리 기준 + 네트워크 |

### 핵심 최적화 포인트
- bubble_members는 매번 쿼리하지 않음 (캐시)
- bubble_shares.target_id 비정규화로 records JOIN 제거
- record_photos는 lazy load (기록 펼칠 때 thumbnail_url만 로드)
