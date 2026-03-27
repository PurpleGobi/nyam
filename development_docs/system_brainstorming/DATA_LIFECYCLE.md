# 데이터 생명주기 — 수집 · 저장 · 활용 전체 맵

> Nyam의 핵심 가치: **"쉬운 기록 → 자동 정리 → 똑똑한 재활용"**
> 이 문서는 데이터가 어디서 수집되고, 어떤 테이블에 저장되며, 어디서 어떻게 재활용되는지를 정리한다.
> 참조: systems/DATA_MODEL.md, systems/XP_SYSTEM.md, systems/RATING_ENGINE.md, systems/RECOMMENDATION.md, 모든 pages/*.md (01~12), 모든 prototype/*.html

---

## 1. 주요 기록 수집 (Primary Data Collection)

사용자가 **의도적으로 입력**하는 핵심 데이터. 모든 추천·통계·소셜의 원천.

### 1-1. 온보딩 (prototype/00_onboarding.html, 12_ONBOARDING.md)

| 단계 | 수집 항목 | 저장 위치 | 비고 |
|------|-----------|-----------|------|
| 소셜 로그인 | auth_provider (kakao/google/apple), email, avatar_url | `users` | auth_provider_id UNIQUE — 중복 가입 차단. 닉네임 자동 생성 |
| 인트로 | — | — | "낯선 별점 천 개보다, 믿을만한 한 명의 기록" 소개만 |
| Step 1/3 — 기록 | 지역 선택 (6개 시드: 을지로, 광화문, 성수, 강남, 홍대, 이태원) + 식당 등록(검색→선택) | `users.preferred_areas` + `records` (기록 생성) | 식당 등록 시 XP 획득 (+3~+18). 기록 생성이 온보딩의 핵심 |
| Step 2/3 — 버블 생성 | name, icon, description (가족/친구/직장동료 템플릿) | `bubbles` + `bubble_members` (role=owner) | 템플릿 선택 → 초대 링크 생성. bonus_first_bubble +5 XP |
| Step 3/3 — 버블 탐색 | 공개 버블 둘러보기 (4개 시드) → 팔로우/가입 | `bubble_members` (role=follower 또는 pending) | 가입 조건 (min_level, min_records) 표시. 조건 충족 시 auto_approve |
| 온보딩 완료 | — | `xp_histories` (bonus_onboard +10) | 총 최대 +15 XP (온보딩+첫버블). 5종 넛지 시작 |

### 1-2. 기록 플로우 (05_RECORD_FLOW.md, RATING_ENGINE.md)

기록은 **2단계**: Phase 1 (필수, 3초 캡처) → Phase 2 (선택, 풍성화)

**식당 기록**

| 항목 | Phase | 수집 방법 | 저장 컬럼 |
|------|-------|-----------|-----------|
| 대상 식당 | P1 | 검색 / 사진(GPS+AI 장르추론) | `records.target_id` → `restaurants.id` |
| 만족도 | P1 | Circle Rating 드래그 (1-100) | `records.satisfaction` |
| 사분면 좌표 | P1 | 2D 탭+드래그 | `records.axis_x` (가격 0~100%), `records.axis_y` (분위기 0~100%) |
| 상황 태그 | P1 | 칩 1개 선택 (6종) | `records.scene` (solo/romantic/friends/family/business/drinks) |
| 사진 | P2 | 카메라/갤러리 | `record_photos` (url, order_index) |
| 한줄평 | P2 | 텍스트 200자 | `records.comment` |
| 추천 메뉴 | P2 | 태그 자동완성 | `records.menu_tags` (TEXT[]) |
| 사용팁 | P2 | 텍스트 | `records.tips` |
| 동행자 | P2 | 사용자 태그 | `records.companions` (TEXT[], 무조건 비공개) |
| 동행자 수 | P2 | 자동/수동 | `records.companion_count` (필터/통계용, 공개 가능) |
| 1인 결제 금액 | P2 | 금액 입력 | `records.total_price` (원) |
| 방문일 | P2 | 날짜 선택 / EXIF | `records.visit_date` |
| 식사시간 | P2 | EXIF 추론 또는 수동 | `records.meal_time` (breakfast/lunch/dinner/snack) |
| 연결 와인 | P2 | 검색 | `records.linked_wine_id` |
| EXIF GPS | 자동 | 사진 메타데이터 | `records.has_exif_gps`, `records.is_exif_verified` (200m 이내 시 true) |

**와인 기록**

| 항목 | Phase | 수집 방법 | 저장 컬럼 |
|------|-------|-----------|-----------|
| 대상 와인 | P1 | 라벨 OCR (3모드) / 검색 | `records.target_id` → `wines.id` |
| 카메라 모드 | P1 | 개별/진열장/영수증 | `records.camera_mode`, `records.ocr_data` (JSONB) |
| 와인 분류 | P1 | 시음/셀러/찜 선택 | `records.wine_status` (tasted/cellar/wishlist) |
| 만족도 | P1 | Circle Rating 드래그 (1-100) | `records.satisfaction` |
| 사분면 좌표 | P1 | 2D 탭+드래그 | `records.axis_x` (산미 0~100%), `records.axis_y` (바디 0~100%) |
| 아로마 팔레트 | P1 | 12섹터 원형 팔레트 (3링, 터치/드래그) | `records.aroma_regions` (JSONB), `records.aroma_labels` (TEXT[]), `records.aroma_color` (hex) |
| 복합성 | P1 (선택) | 0~100 슬라이더 | `records.complexity` |
| 여운 | P1 (선택) | 0~100 슬라이더 | `records.finish` |
| 균형 | P1 (선택) | 0~100 슬라이더 | `records.balance` |
| 자동 산출 만족도 | P1 (선택) | 복합성+여운+균형 공식 | `records.auto_score` |
| 상황 태그 | P1 | 칩 1개 선택 (7종) | `records.scene` (solo/romantic/gathering/pairing/gift/tasting/decanting) |
| 사진 | P2 | 카메라 3모드 (개별/선반/영수증) | `record_photos` |
| 한줄평 | P2 | 텍스트 | `records.comment` |
| 페어링 카테고리 | P2 | WSET 8-카테고리 선택 | `records.pairing_categories` (TEXT[]) |
| 구매 가격 | P2 | 금액 입력 | `records.purchase_price` (원, 병 단가) |
| 방문/음용일 | P2 | 날짜 선택 | `records.visit_date` (셀러일 때는 구매 날짜) |
| 연결 식당 | P2 | 검색 | `records.linked_restaurant_id` |

### 1-3. 홈 화면에서의 기록 (prototype/01_home.html, 06_HOME.md)

| 수집 루트 | 항목 | 비고 |
|-----------|------|------|
| FAB (+) 버튼 | → 기록 플로우 진입 | 현재 탭(식당/와인)에 따라 분기 |
| 넛지 스트립 CTA | 미평가 식당 평가 유도 | 우선순위: 사진 감지 > 미평가 > 식사시간 |
| 미평가 카드 CTA | 만족도 즉시 입력 | records.satisfaction 업데이트 |

### 1-4. 상세 페이지에서의 기록 (prototype/02_detail_*.html, 02_RESTAURANT_DETAIL.md, 03_WINE_DETAIL.md)

| 수집 루트 | 항목 | 비고 |
|-----------|------|------|
| FAB (+) 버튼 | 해당 식당/와인 사분면 평가 바로 진입 | 대상 선택 스킵 |
| 재방문/재시음 | 이전 위치 반투명 표시된 사분면 | 새 record 생성 |

### 1-5. 버블에서의 기록 (prototype/04_bubbles_detail.html, 08_BUBBLE.md)

| 수집 루트 | 항목 | 저장 테이블 |
|-----------|------|-------------|
| 버블 내 기록 공유 | 기존 record → 버블에 공유 | `bubble_shares` (record_id + bubble_id + shared_by) |
| 버블 내 새 기록 | → 기록 플로우 + 자동 공유 | `records` + `bubble_shares` |

---

## 2. 보조 기록 수집 (Secondary Data Collection)

사용자의 **반응·상호작용**에서 수집되는 데이터. 소셜 신뢰도와 추천 품질의 핵심.

| 항목 | 수집 위치 | 저장 테이블 | 저장 형태 |
|------|-----------|-------------|-----------|
| 찜 (위시리스트) | 상세 페이지 하트, AI 추천, 버블 피드 | `wishlists` | user_id + target_type + target_id + source (direct/bubble/ai/web) |
| 리액션 — 좋아요 | 버블 피드 | `reactions` | type=`like` |
| 리액션 — 가고싶다 | 버블 피드 | `reactions` | type=`want` |
| 리액션 — 나도가봤어 | 버블 피드 | `reactions` | type=`check` |
| 리액션 — 맛있어보인다 | 버블 피드 | `reactions` | type=`fire` |
| 리액션 — 찜 | 버블 피드 | `reactions` (type=`bookmark`) → `wishlists` INSERT 트리거 | bookmark은 wishlists 생성의 진입점 |
| 댓글 | 버블 피드 | `comments` | content 300자, text only. bubble_id 연결. is_anonymous 지원 |
| 읽음 처리 | 버블 피드 | `bubble_share_reads` | share_id + user_id + read_at |
| 팔로우 | 프로필, 버블러 프로필, 버블 멤버 목록 | `follows` | follower_id + following_id + status (pending/accepted/rejected) |
| 버블 가입 | 버블 목록/상세 | `bubble_members` | user_id + bubble_id + role + status |
| 알림 확인 | 알림 드롭다운 | `notifications.is_read` | true로 업데이트 |
| 알림 액션 (수락/거절) | 알림 드롭다운 인라인 버튼 | `notifications.action_status` + 대상 테이블 | bubble_members.status 또는 follows.status 변경 |
| AI 추천 무시 | 홈 추천 서브탭 | `ai_recommendations.is_dismissed` | true로 업데이트 |

---

## 3. 설정 기록 (Settings & Configuration Data)

사용자가 **환경·개인정보·표시 방식**을 제어하는 데이터. (prototype/05_settings.html, 11_SETTINGS.md)

### 3-1. 프라이버시 설정

| 설정 | 저장 컬럼 | 값 | 설정하는 것 |
|------|-----------|-----|-------------|
| 기본 공개 대상 | `users.privacy_profile` | `public` / `bubble_only` / `private` | 프로필·기록을 누구에게 보여줄지 기본 범위 |
| 기록 공개 범위 | `users.privacy_records` | `all` / `shared_only` / `private` | 기록 중 어디까지 공개할지 (전체/공유된 것만/비공개) |
| 전체 공개 시 가시 항목 | `users.visibility_public` (JSONB) | 7개 키 각각 true/false | score, comment, photos, level, quadrant, bubbles, price 중 무엇을 보여줄지 |
| 버블 기본 가시 항목 | `users.visibility_bubble` (JSONB) | 7개 키 각각 true/false | 버블 멤버에게 보이는 기본 항목 |
| 버블별 커스텀 | `bubble_members.visibility_override` (JSONB) | NULL(기본값 사용) 또는 7개 키 | 특정 버블에서만 다른 설정 ("기본값"/"커스텀" 배지로 구분) |

**프라이버시 해석 우선순위** (get_visible_fields RPC):
```
본인 → 전부 공개
같은 버블 멤버 → visibility_override ?? visibility_bubble
그 외 → visibility_public
```

### 3-2. 알림 설정

| 설정 | 저장 컬럼 | 설정하는 것 |
|------|-----------|-------------|
| 푸시 전체 ON/OFF | `users.notify_push` | 모든 푸시 알림 총괄 |
| 레벨업 알림 | `users.notify_level_up` | 레벨 달성 알림 |
| 버블 가입 알림 | `users.notify_bubble_join` | 가입 신청/승인 알림 |
| 팔로우 알림 | `users.notify_follow` | 팔로우 요청/수락 알림 |
| 방해 금지 시작 | `users.dnd_start` (TIME) | 알림 무음 시작 시각 (예: 23:00) |
| 방해 금지 종료 | `users.dnd_end` (TIME) | 알림 무음 종료 시각 (예: 08:00) |

### 3-3. 화면 디폴트 설정

| 설정 | 저장 컬럼 | 옵션 | 설정하는 것 |
|------|-----------|------|-------------|
| 첫 화면 | `users.pref_landing` | last / home / bubbles / profile | 앱 실행 시 어디로 갈지 |
| 홈 탭 | `users.pref_home_tab` | last / restaurant / wine | 홈 진입 시 기본 탭 |
| 식당 서브탭 | `users.pref_restaurant_sub` | last / visited / wishlist / recommended / following | 식당 탭 기본 서브내비 |
| 와인 서브탭 | `users.pref_wine_sub` | last / tasted / wishlist / cellar | 와인 탭 기본 서브내비 |
| 버블 탭 | `users.pref_bubble_tab` | last / bubble / bubbler | 버블 페이지 기본 탭 |
| 보기 모드 | `users.pref_view_mode` | last / detailed / compact / calendar | 홈 뷰 모드 |

### 3-4. 기능 디폴트 설정

| 설정 | 저장 컬럼 | 옵션 | 설정하는 것 |
|------|-----------|------|-------------|
| 기본 정렬 | `users.pref_default_sort` | latest / score_high / score_low / name / visit_count | 목록 기본 소팅 |
| 기록 입력 방식 | `users.pref_record_input` | camera / search | 기록 시 카메라 우선인지 검색 우선인지 |
| 버블 공유 방식 | `users.pref_bubble_share` | ask / auto / never | 기록 후 버블 공유 행동 |
| 온도 단위 | `users.pref_temp_unit` | C / F | 와인 서빙 온도 표시 단위 |

### 3-5. 필터 프리셋

| 설정 | 저장 테이블 | 설정하는 것 |
|------|-------------|-------------|
| 필터칩 저장 | `saved_filters` | Notion-style 필터 규칙 세트를 이름 붙여 저장. target_type별로 분리 |

**target_type 종류**:
- `restaurant` / `wine`: 홈 식당/와인 탭
- `bubble` / `bubbler`: 버블 페이지 탭
- `bubble_feed` / `bubble_ranking` / `bubble_member`: 버블 상세 탭별

### 3-6. 계정 관리

| 설정 | 저장 컬럼 | 설정하는 것 |
|------|-----------|-------------|
| 계정 삭제 요청 | `users.deleted_at` | 삭제 요청 시점 기록 |
| 삭제 모드 | `users.delete_mode` | anonymize(익명화) / hard_delete(완전삭제) |
| 삭제 예정일 | `users.delete_scheduled_at` | deleted_at + 30일. 유예 기간 내 복구 가능 |

---

## 4. 데이터 활용 맵 (Data Reuse & Composition)

수집된 원시 데이터가 **화면별·뷰별**로 어떻게 재조합되는지.

### 4-1. 홈 — 식당 탭 (prototype/01_home.html, 06_HOME.md)

**서브내비**: 방문 | 찜 | 추천 | 팔로잉

**보기 모드 순환**: 상세(카드) → 간단(컴팩트 리스트) → 캘린더

| 뷰 모드 | 표시 데이터 | 원천 테이블 | 조합 방식 |
|----------|-------------|-------------|-----------|
| **상세 뷰** (카드) | 대표사진(캐러셀), 식당명, 만족도 점수(게이지 컬러), 씬태그 칩(색상별), 장르·지역·가격대, 방문일 | `records` + `record_photos` + `restaurants` | records를 target_id로 그룹핑 → 최신 record 기준 카드. 점수색=5단계 게이지 색상 |
| **간단 뷰** (컴팩트) | 순위번호, 썸네일(40x40), 식당명, 장르·지역 메타, 점수(18px bold) | `records` + `restaurants` | 동일 데이터의 1줄 리스트. 순위 1~3은 accent 색상 |
| **캘린더 뷰** | 월별 그리드, 날짜별 기록 도트(점수 컬러), meal_time 라벨 | `records.visit_date` + `records.meal_time` | 월별 캘린더에 record 매핑. 같은 날 여러 기록은 점심/저녁 라벨 구분 |
| **지도 뷰** | 방문 식당 핀 | `records` + `restaurants` (lat, lng) | 지도 위에 식당 위치 마커 |
| **통계 패널** | 맛 지도(방문 식당 핀), 장르 차트, 점수 분포, 월별 소비 트렌드 | `records` + `restaurants` | aggregate 쿼리 (COUNT, AVG, SUM, GROUP BY genre/area/month) |
| **미평가 카드** | 식당명, "평가하기" CTA | `records` (satisfaction IS NULL, status='checked') | EXIF 사진 감지 후 미평가 필터 |

**필터 시스템** (Notion-style, 모든 뷰 공통):

| 필터 속성 | 데이터 원천 | 지원 연산자 |
|-----------|-------------|------------|
| 상황 (scene) | `records.scene` | is / is_not / contains / not_contains |
| 음식종류 (genre) | `restaurants.genre` | is / is_not |
| 위치 (area) | `restaurants.area` | is / is_not |
| 점수 (satisfaction) | `records.satisfaction` | gte / lt |
| 시기 (visit_date) | `records.visit_date` | gte / lt |
| 동반자 (companion_count) | `records.companion_count` | is / gte / lt |
| 명성 (prestige) | `restaurants.michelin_stars`, `has_blue_ribbon`, `media_appearances` | is (michelin_1/2/3, blue_ribbon, tv) |
| 가격대 (price_range) | `restaurants.price_range` | is / gte / lt |

**소팅 옵션**: 최신순 / 점수 높은순 / 점수 낮은순 / 이름순 / 방문 많은순

---

### 4-2. 홈 — 와인 탭 (prototype/01_home.html, 06_HOME.md)

**서브내비**: 시음 | 찜 | 셀러

> 서브내비는 `records.wine_status` (tasted/wishlist/cellar) 기반 필터

**보기 모드 순환**: 상세 → 간단 → 캘린더 (식당과 동일)

| 뷰 모드 | 표시 데이터 | 원천 테이블 | 조합 방식 |
|----------|-------------|-------------|-----------|
| **상세 뷰** (카드) | 와인 라벨사진, 와인명, 만족도 점수(게이지 컬러), 타입칩(레드/화이트/로제/스파클링/오렌지/포티파이드/디저트 — 7종 각각 고유 색상), 품종, 산지, 빈티지 | `records` + `record_photos` + `wines` | records를 target_id로 그룹핑 → 최신 record 기준 |
| **간단 뷰** (컴팩트) | 순위번호, 썸네일(40x40, 어두운 gradient+와인병 아이콘), 와인명, 타입·산지 메타, 점수 | `records` + `wines` | 1줄 리스트. 와인 accent 색상 |
| **캘린더 뷰** | 날짜별 시음 기록 도트 | `records.visit_date` | 월별 캘린더에 record 매핑 |
| **통계 패널** | 산지 맵(3-level: 세계→국가→지역), 품종 차트(껍질 두께 순), 점수 분포, 월별 소비 | `records` + `wines` + `grape_variety_profiles` | aggregate + 지역 계층 드릴다운 + body_order 정렬 |

**필터 시스템**:

| 필터 속성 | 데이터 원천 | 지원 연산자 |
|-----------|-------------|------------|
| 타입 (wine_type) | `wines.wine_type` | is / is_not (red/white/rose/sparkling/orange/fortified/dessert) |
| 산지 (region) | `wines.region`, `wines.country` | is / is_not / contains |
| 품종 (variety) | `wines.variety`, `wines.grape_varieties` | contains / not_contains |
| 점수 (satisfaction) | `records.satisfaction` | gte / lt |
| 바디 (axis_y) | `records.axis_y` | gte / lt |
| 산미 (axis_x) | `records.axis_x` | gte / lt |
| 가격 (purchase_price) | `records.purchase_price` | gte / lt |
| 상황 (scene) | `records.scene` | is / is_not |
| 시기 (visit_date) | `records.visit_date` | gte / lt |
| 아로마 (aroma_labels) | `records.aroma_labels` | contains |

**소팅 옵션**: 최신순 / 점수 높은순 / 점수 낮은순 / 이름순 / 시음 많은순

---

### 4-3. 버블 상세 — 피드/랭킹/멤버 탭 (prototype/04_bubbles_detail.html, 08_BUBBLE.md)

**탭**: 피드 | 랭킹 | 멤버

#### 피드 탭 — 뷰 순환: 피드(타임라인) / 카드 / 리스트

| 뷰 모드 | 표시 데이터 | 원천 테이블 | 조합 방식 |
|----------|-------------|-------------|-----------|
| **피드 뷰** | 공유자(아바타+이름+레벨+핸들), 대상명, 사진, 만족도, 씬칩, 한줄평, 리액션 카운트(like/want/check/fire), 댓글 수, 읽음 수("외 4명이 봤어요"), 공유 시각 | `bubble_shares` + `records` + `users` + `reactions` + `comments` + `bubble_share_reads` | get_bubble_feed RPC: share 기준으로 record+user JOIN, 리액션/댓글/읽음 LATERAL 집계 |
| **카드 뷰** | 대상 사진, 이름, 버블 내 평균 점수, 기록자 수 | `bubble_shares` + `records` + `restaurants`/`wines` | 대상별 GROUP BY → 버블 멤버 평균 점수 |
| **리스트 뷰** | 대상명, 버블 평균 점수, 기록자 수, 최근 기록일 | 동일 | compact 표시 |

#### 랭킹 탭

| 표시 데이터 | 원천 테이블 | 조합 방식 |
|-------------|-------------|-----------|
| 주간 Top N, 순위(▲▼NEW), 평균 점수, 기록 수 | `bubble_ranking_snapshots` | 이번 주 rank - 지난 주 rank = 등락. 지난 주 없으면 "NEW" |

#### 멤버 탭

| 표시 데이터 | 원천 테이블 | 조합 방식 |
|-------------|-------------|-----------|
| 아바타(gradient), 이름, 핸들, 레벨+칭호, 기록 수(버블 내), 고유 장소 수, 평균 점수, 취향 일치도(%), 공통 방문 장소 수, 대표 배지, 팔로우 상태 | `bubble_members` + `users` + `follows` | bubble_members의 캐시 컬럼 활용 (taste_match_pct, common_target_count, avg_satisfaction 등) |

**피드 탭 필터**:

| 필터 속성 | 데이터 원천 | 연산자 |
|-----------|-------------|--------|
| 유형 (target_type) | `records.target_type` | is (restaurant/wine) |
| 멤버 (member) | `bubble_shares.shared_by` → `users` | is / is_not |
| 시기 (period) | `bubble_shares.shared_at` | gte / lt |
| 점수 (satisfaction) | `records.satisfaction` | gte / lt |

**멤버 탭 필터**:

| 필터 속성 | 데이터 원천 | 연산자 |
|-----------|-------------|--------|
| 역할 (role) | `bubble_members.role` | is (owner/admin/member/follower) |
| 취향 일치 (taste_match) | `bubble_members.taste_match_pct` | gte / lt |
| 레벨 (level) | `users.total_xp` → level 환산 | gte / lt |
| 팔로우 (follow_status) | `follows` 조회 | is (following/mutual/none) |

---

### 4-4. 식당 상세 (prototype/02_detail_restaurant.html, 02_RESTAURANT_DETAIL.md)

**조건부 뷰 모드** (기록 유무에 따라 다른 화면):
- **"내 기록" 모드**: 내 기록이 있을 때 — 타임라인, 사분면 맵, 연결 와인 표시
- **"추천" 모드**: 내 기록도 없고 버블도 없을 때 — nyam 점수 + 권위 뱃지 중심
- **"버블 리뷰" 모드**: 내 기록은 없지만 버블 기록이 있을 때 — 버블 멤버 기록 중심

| 레이어 | 활용 데이터 | 원천 테이블 | 조합 방식 |
|--------|-------------|-------------|-----------|
| L1 히어로 | 사진 캐러셀(224px) + 썸네일(160×110) | `record_photos` + `restaurants.photos` | 내 사진 → 외부 사진 순 |
| L3 점수 3칸 | 내 점수 + nyam 점수 + 버블 점수 | `records` (mine) / `restaurants.nyam_score` / `bubble_shares`+`records` | 내 AVG, nyam=외부 가중평균 캐시, 버블=멤버 Trimmed Mean(5%) |
| L3b 버블 확장 패널 | 버블별 평균 점수 + 멤버 아바타+점수 | `bubble_shares` + `records` + `bubble_members` + `users` | 내 소속 버블별 그룹핑 → 멤버별 점수 나열 |
| L5 타임라인 | 내 방문 이력 (씬칩, 점수, 코멘트, 사진 썸네일) | `records` + `record_photos` | target_id 필터 → visit_date DESC |
| L6 포지션 맵 | 사분면에 내 방문별 점 + 참조 점 (2+ 기록 시) | `records` (axis_x, axis_y, satisfaction) | 만족도→점크기+컬러 매핑 |
| L7 실용 정보 | 주소+미니맵, 영업시간, 전화, 메뉴 | `restaurants` (address, hours, phone, menus, lat, lng) | 접이식 메뉴 섹션 |
| L8 연결 와인 | 이 식당에서 마신 와인 카드 | `records.linked_wine_id` + `wines` | linked_wine_id로 JOIN, 가로 스크롤 |
| L9 버블 기록 | 버블 멤버들의 이 식당 기록 | `bubble_shares` + `records` (같은 target_id) | 버블별 필터 + 멤버 기록 카드 |

### 4-5. 와인 상세 (prototype/02_detail_wine.html, 03_WINE_DETAIL.md)

| 레이어 | 활용 데이터 | 원천 테이블 | 조합 방식 |
|--------|-------------|-------------|-----------|
| L1 히어로 | 사진 캐러셀 + 라벨 세로 썸네일(110×160) | `record_photos` + `wines.label_image_url` | 라벨 클릭 시 슬라이드 아웃 |
| L2 기본 정보 | 와인명, 생산자·빈티지, 타입칩(7종)+산지+품종 | `wines` | 타입별 고유 색상 칩 |
| L3 점수 3칸 | 식당 상세와 동일 구조 | `records` / `wines.nyam_score` / `bubble_shares`+`records` | 동일 |
| L5 와인 맵 | 산미×바디 사분면 (히어로 점 38px + 참조 점 28px) | `records` (axis_x, axis_y, satisfaction) | 와인 accent 색상 |
| L5b 페어링 | WSET 페어링 태그 (8-카테고리) | `records.pairing_categories` + `wines.food_pairings` | 사용자 경험 + DB 기본 추천 병렬 표시 |
| L6 타임라인 | 내 시음 이력 + 식당 연결 링크(map-pin) | `records` + `restaurants` (linked) | target_id 필터 → visit_date DESC |
| L7 와인 정보표 | 품종, 산지, 도수, 바디/산미/당도(dot 표시), 서빙온도, 디캔팅, 참고가, 음용 적기 | `wines` 컬럼들 | 2-컬럼 표 |
| L8 연결 식당 | 이 와인을 마신 식당 카드 | `records.linked_restaurant_id` + `restaurants` | linked_restaurant_id로 JOIN, 가로 스크롤 |
| L9 버블 기록 | 버블 멤버들의 와인 기록 | `bubble_shares` + `records` | 버블별 필터칩 + 멤버 점수·코멘트 |

### 4-6. 기타 활용처

| 화면 | 활용 데이터 | 원천 테이블 | 조합 방식 |
|------|-------------|-------------|-----------|
| **기록 상세** (04_RECORD_DETAIL.md) | 미니 사분면, 만족도+컬러바, 아로마(와인), 한줄평, 사진, 페어링(와인)/메뉴태그(식당), 실용정보(가격/동행자수/방문일), 획득 XP | `records` + `record_photos` + `xp_histories` | 단일 record 기준 풀 렌더 |
| **탐색 (Discover)** (07_DISCOVER.md) | 추천 식당/와인 카드, 카테고리별 큐레이션 | `ai_recommendations` + `records` + `restaurants` + `wines` | Phase 1~3 추천 알고리즘 결과 표시 |
| **프로필** — 맛 정체성 (10_PROFILE.md) | taste_summary(AI 요약), taste_tags(AI 태그) | `users.taste_summary`, `users.taste_tags` | 기록 N개 이상 변경 시 AI 재생성 |
| **프로필** — 활동 요약 | 총 레벨+XP+진행바, 개요 그리드(식당방문/와인시음/평균점수/이번달XP), 활동 히트맵(GitHub 스타일), 최근 경험치 | `users` (total_xp, record_count) + `user_experiences` (category) + `xp_histories` + `records` | 히트맵=records.created_at 날짜별 COUNT, 연속기록=current_streak |
| **프로필** — 식당 통계 | 요약(총방문/평균점수/방문지역), 지역·장르별 레벨, 가본식당 지도, 장르 수평바차트, 점수 분포, 월별 소비, 상황별 방문 | `records` (restaurant) + `restaurants` + `user_experiences` (area/genre) | GROUP BY genre/area/scene/month + aggregate + 월별 SUM(total_price) |
| **프로필** — 와인 통계 | 요약(시음수/평균점수/셀러보유), 산지·품종별 레벨, 산지 3-level 지도, 품종 차트(body_order 순), 점수 분포, 월별 소비(병수), 타입별 분포(레드/화이트/로제/스파클링) | `records` (wine) + `wines` + `grape_variety_profiles` + `user_experiences` (wine_variety/wine_region) | GROUP BY country/region/variety/type + body_order 정렬 |
| **프로필** — 레벨 디테일 시트 | 축별 레벨+XP+진행바, 통계(고유장소/총기록/재방문), XP 구성(새장소/재방문/품질보너스/마일스톤/소셜), 다음 마일스톤 | `user_experiences` + `xp_histories` + `milestones` + `user_milestones` | reason별 GROUP BY, 미달성 마일스톤 조회 |
| **프로필** — Wrapped 카드 | 맛 정체성 시각화 (카테고리 필터: 전체/식당/와인, 게이지 2개: 개인정보×디테일) | `users` taste 관련 + `records` aggregate | 공유 가능 카드 이미지 생성 |
| **버블러 프로필** (04_bubbler_profile.html) | 상대방 프로필 + 취향 매칭도 + 컨텍스트(버블 내 순위, 공통 장소) | `users` + `bubble_members` (taste_match_pct, common_target_count, weekly_share_count) + `follows` | 캐시 컬럼 활용, 팔로우 상태 표시 |
| **추천 시스템** (RECOMMENDATION.md) | 재방문, 상황별, 사분면, 찜 리마인드, 권위, 와인 페어링, 지역 푸시 | `records` + `wishlists` + `restaurants` + `wines` + `ai_recommendations` | Phase 1 SQL 규칙 → Phase 2 소셜 CF → Phase 3 ML |
| **넛지 시스템** (12_ONBOARDING.md) | 미평가 기록, 식사시간, 사진 감지, 새 지역, 주간 요약 | `records` (status='checked') + `nudge_history` + `nudge_fatigue` | 6종 넛지(location/time/photo/unrated/new_area/weekly), 피로도 반영 |
| **알림** (09_NOTIFICATIONS.md) | 5종 핵심(level_up, bubble_join_request, bubble_join_approved, follow_request, follow_accepted) + 5종 부가(bubble_invite, bubble_new_record, bubble_member_joined, reaction_like, comment_reply) | `notifications` | metadata JSONB로 JOIN 없이 드롭다운 즉시 렌더. 최대 20개 표시 |

---

## 5. 백엔드 테이블 — 저장 구조 종합

### 5-1. 핵심 엔티티

| 테이블 | 역할 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| `users` | 사용자 계정·프로필·설정 전부 | id, nickname, handle, avatar_url, avatar_color, bio, taste_summary, taste_tags, preferred_areas, privacy_*, visibility_*, notify_*, pref_*, total_xp, active_xp, record_count, follower_count, following_count, current_streak | 1:N → records, wishlists, follows, bubble_members, notifications |
| `restaurants` | 식당 마스터 | id, name, address, country, city, area, district, genre, price_range, lat, lng, phone, hours, photos, menus, naver/kakao/google_rating, michelin_stars, has_blue_ribbon, media_appearances, nyam_score | 1:N → records (target_type='restaurant') |
| `wines` | 와인 마스터 | id, name, producer, region, sub_region, country, variety, grape_varieties, wine_type, vintage, abv, label_image_url, photos, body/acidity/sweetness_level, food_pairings, serving_temp, decanting, reference_price, drinking_window_*, vivino_rating, critic_scores, classification, nyam_score | 1:N → records (target_type='wine') |

### 5-2. 기록

| 테이블 | 역할 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| `records` | 핵심 기록 (식당+와인 통합) | id, user_id, target_id, target_type, status(checked/rated/draft), wine_status, camera_mode, ocr_data, axis_x, axis_y, satisfaction, scene, aroma_regions/labels/color, complexity, finish, balance, auto_score, comment, menu_tags, pairing_categories, tips, companions, companion_count, total_price, purchase_price, visit_date, meal_time, linked_restaurant_id, linked_wine_id, has_exif_gps, is_exif_verified, record_quality_xp, score_updated_at | FK → users, restaurants(via target_id), wines(via target_id) |
| `record_photos` | 기록 사진 | id, record_id, url, order_index | FK → records (CASCADE) |

### 5-3. 소셜

| 테이블 | 역할 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| `bubbles` | 버블(커뮤니티) | id, name, description, focus_type, area, visibility, content_visibility, allow_comments, allow_external_share, join_policy, min_records, min_level, max_members, rules, icon, icon_bg_color, invite_code, + 비정규화 캐시(follower/member/record_count, avg_satisfaction, unique_target_count, weekly_record_count 등) | FK → users (created_by) |
| `bubble_members` | 버블 멤버십 | bubble_id, user_id (PK), role(owner/admin/member/follower), status(pending/active/rejected), visibility_override, + 활동 캐시(taste_match_pct, common_target_count, avg_satisfaction, member_unique_target_count, weekly_share_count, badge_label) | FK → bubbles, users |
| `bubble_shares` | 기록→버블 공유 | id, record_id, bubble_id, shared_by, shared_at. UNIQUE(record_id, bubble_id) | FK → records, bubbles, users |
| `comments` | 댓글 | id, target_type('record'), target_id, bubble_id, user_id, content(300자), is_anonymous | FK → bubbles(CASCADE), users |
| `reactions` | 리액션 | id, target_type('record'/'comment'), target_id, reaction_type(like/bookmark/want/check/fire), user_id. UNIQUE(type+target+reaction+user) | FK → users |
| `bubble_share_reads` | 읽음 처리 | share_id, user_id (PK), read_at | FK → bubble_shares(CASCADE), users |
| `bubble_ranking_snapshots` | 주간 랭킹 | bubble_id, target_id, target_type, period_start(월요일), rank_position, avg_satisfaction, record_count. PK(bubble+target+type+period) | FK → bubbles(CASCADE) |
| `follows` | 팔로우 | follower_id, following_id (PK), status(pending/accepted/rejected) | FK → users × 2 |
| `notifications` | 알림 | id, user_id, notification_type(10종), actor_id, target_type, target_id, bubble_id, metadata(JSONB), is_read, action_status(pending/accepted/rejected) | FK → users, bubbles(SET NULL) |

### 5-4. 경험치 & 레벨

| 테이블 | 역할 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| `user_experiences` | 축별 XP 누적 | id, user_id, axis_type(category/area/genre/wine_variety/wine_region), axis_value, total_xp, level. UNIQUE(user+type+value) | FK → users |
| `xp_histories` | XP 이력 로그 | id, user_id, record_id, axis_type, axis_value, xp_amount, reason(12종+) | FK → users, records |
| `level_thresholds` | 레벨 정의 (시드) | level(PK), required_xp, title, color | — |
| `milestones` | 마일스톤 정의 (시드) | id, axis_type, metric, threshold, xp_reward, label | — |
| `user_milestones` | 달성 기록 | user_id, milestone_id, axis_value (PK 3개), achieved_at | FK → users, milestones |

### 5-5. 시스템

| 테이블 | 역할 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| `wishlists` | 찜 | id, user_id, target_id, target_type, source(direct/bubble/ai/web), source_record_id, is_visited. UNIQUE(user+target+type) | FK → users, records |
| `saved_filters` | 필터 프리셋 | id, user_id, name, target_type(7종), context_id, rules(JSONB), sort_by, order_index | FK → users |
| `ai_recommendations` | AI 추천 | id, user_id, target_id, target_type, reason, algorithm, confidence, is_dismissed, expires_at | FK → users |
| `nudge_history` | 넛지 이력 | id, user_id, nudge_type(6종), target_id, status(sent/opened/acted/dismissed/skipped) | FK → users |
| `nudge_fatigue` | 넛지 피로도 | user_id(PK), score, last_nudge_at, paused_until | FK → users |
| `grape_variety_profiles` | 포도 품종 참조 | name(PK), name_ko, body_order, category(red/white), typical_body/acidity/tannin | — |

---

## 6. 데이터 흐름 다이어그램

```
┌──────────────────────────────────────────────────────────────────────┐
│                          수집 (Input)                                │
│                                                                      │
│  온보딩 ───┐                                                         │
│  홈 FAB ───┤                                                         │
│  상세 FAB ─┤──→ records + record_photos ──→ XP 적립 (xp_histories    │
│  넛지 CTA ─┘                                     + user_experiences) │
│                      │                                               │
│                      ├──→ restaurants / wines (마스터 자동 생성/매칭) │
│                      │                                               │
│  찜 하트 ────────→ wishlists                                         │
│  팔로우 버튼 ────→ follows ───────→ notifications                    │
│  버블 가입 ──────→ bubble_members ─→ notifications                   │
│  기록 공유 ──────→ bubble_shares                                     │
│  리액션 탭 ──────→ reactions (bookmark → wishlists 트리거)           │
│  댓글 입력 ──────→ comments                                          │
│  읽음 스크롤 ────→ bubble_share_reads                                │
│  설정 변경 ──────→ users (privacy/notify/pref 컬럼들)               │
│  필터 저장 ──────→ saved_filters                                     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   저장 (DB)  │
                    │  + 트리거    │ (카운트 증분 실시간)
                    │  + 크론      │ (통계 캐시 일/주간)
                    └──────┬──────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                        활용 (Output)                                 │
│                                                                      │
│  홈 식당탭 ←─── records × restaurants (뷰 3종 + 필터/소팅 + 통계)   │
│  홈 와인탭 ←─── records × wines (뷰 3종 + 필터/소팅 + 통계)        │
│  버블 피드 ←─── bubble_shares × records × users (get_bubble_feed)   │
│  버블 랭킹 ←─── bubble_ranking_snapshots (주간 크론)                │
│  버블 멤버 ←─── bubble_members 캐시 (taste_match, badge 등)        │
│  식당 상세 ←─── records(mine) + nyam_score + bubble_shares(avg)     │
│  와인 상세 ←─── records(mine) + nyam_score + linked_restaurant      │
│  프로필 ←────── records aggregate + user_experiences + taste_*       │
│  버블러 ←────── users + bubble_members(context) + follows           │
│  추천 ←──────── records + wishlists + ai_recommendations            │
│  넛지 ←──────── records(incomplete) + nudge_history/fatigue         │
│  XP/레벨 ←──── xp_histories + level_thresholds + milestones        │
│  알림 ←──────── notifications (metadata JSONB → JOIN-free 렌더)     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. 점수 표시 원칙

| 점수 종류 | 계산 방법 | 표시 위치 | 색상 |
|-----------|-----------|-----------|------|
| 내 점수 | `records.satisfaction` 개별 값 | 카드, 상세 L3 "내 점수" | 5단계 게이지 (gauge-1~5) |
| nyam 점수 | `restaurants.nyam_score` / `wines.nyam_score` (외부 평점+권위 가중평균 캐시) | 상세 L3 "nyam 점수" | 동일 |
| 버블 점수 | 해당 버블 멤버 records의 **Trimmed Mean (5%)** | 상세 L3 "버블 점수", 확장 패널 | 동일 |

**게이지 5단계 색상** (DESIGN_SYSTEM.md):
| 구간 | 색상 | 느낌 |
|------|------|------|
| 0~20 | `#C4B5A8` | 웜그레이 |
| 21~40 | `#B0ADA4` | 쿨그레이 |
| 41~60 | `#9FA5A3` | 세이지 |
| 61~80 | `#889DAB` | 스틸블루 |
| 81~100 | `#7A9BAE` | 슬레이트 |

> **Trimmed Mean (5%)**: 양끝 5% 극단값 제거 후 평균. 트롤/극단값 자동 배제. 개인 점수는 그대로 유지 (본인에게는 자기 점수가 보임).

**nyam_score 계산 공식** (02_RESTAURANT_DETAIL.md):
```
식당: web_avg(40% Naver + 30% Kakao + 30% Google) × 0.82 + prestige_bonus × 1.15
와인: 외부 평점(Vivino/평론가 RP·WS·JR·JH) + 등급 인증(Grand Cru 등) 가중 평균
```
> 주기적 재계산 후 `restaurants.nyam_score` / `wines.nyam_score`에 캐시.

---

## 8. 비정규화 & 캐시 전략

### 트리거 기반 (실시간 — SET col = col ± 1 증분)

| 이벤트 | 갱신 대상 |
|--------|-----------|
| records INSERT/DELETE | `users.record_count` ±1 |
| follows INSERT/UPDATE/DELETE (accepted 변동) | `users.follower_count`, `users.following_count` ±1 |
| bubble_members INSERT/UPDATE/DELETE (active member 변동) | `bubbles.member_count` ±1 |
| bubble_shares INSERT/DELETE | `bubbles.record_count` ±1, `bubbles.last_activity_at` = shared_at |

### 크론 기반 (일/주간 — aggregate 재계산)

| 주기 | 갱신 대상 | 원천 |
|------|-----------|------|
| 매일 | `users.active_xp`, `users.active_verified` | records (최근 6개월) |
| 매일 | `bubbles.avg_satisfaction`, `bubbles.unique_target_count` | bubble_shares × records |
| 주간 (월요일) | `bubbles.weekly_record_count`, `bubbles.prev_weekly_record_count` | bubble_shares (이번 주/지난 주) |
| 주간 | `bubble_members.avg_satisfaction`, `member_unique_target_count`, `weekly_share_count` | bubble_shares × records (멤버별) |
| 주간 | `bubble_ranking_snapshots` INSERT | bubble_shares × records (지난 주 기준 순위) |
| 주간 | `bubble_members.badge_label` | milestones 기반 TOP 1 배지 |
| 주간 | `users.current_streak` | records 연속 기록 주 검사 |
| 주기적 | `restaurants.nyam_score`, `wines.nyam_score` | 외부 평점 + 권위 인증 재계산 |

### 뷰어 의존 캐시 (application layer)

| 대상 | 컬럼 | 갱신 조건 |
|------|------|-----------|
| `bubble_members.taste_match_pct` | 뷰어와의 취향 일치도 | 뷰어 로그인 시 또는 기록 변동 시 재계산 |
| `bubble_members.common_target_count` | 뷰어와 공통 방문 장소 수 | taste_match_pct와 동시 갱신 |

---

## 9. wishlists vs reactions.bookmark vs wine_status 관계

```
사용자가 하트 누름 (상세 페이지)
  → wishlists INSERT (source='direct')

버블 피드에서 bookmark 리액션
  → reactions INSERT (type='bookmark')
  → wishlists INSERT 트리거 (source='bubble', source_record_id=원본)

와인 찜 = wishlists (target_type='wine')
        = records.wine_status='wishlist' 와 동기화

최종 저장소는 항상 wishlists 테이블
```
