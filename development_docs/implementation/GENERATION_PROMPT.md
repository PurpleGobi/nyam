# Nyam v2 — 세부 구현 지침 자동 생성 프롬프트

> **이 파일을 LLM에게 전달하면, 64개의 세부 구현 지침 파일을 자동으로 생성한다.**
> 사람의 개입 없이, 6라운드에 걸쳐 순차+병렬로 전체를 완성한다.

---

## 너의 임무

`development_docs/implementation/phases/` 하위에, MASTER_TRACKER.md가 참조하는 **64개 세부 지침 문서**를 생성한다.

현재 각 스프린트 폴더에는 `00_overview.md`만 존재하며, `01_xxx.md` ~ `NN_validation.md`가 **모두 부재**한다.
이 파일들을 빠짐없이, 실제 코딩이 가능한 수준의 구체성으로 작성한다.

---

## 실행 순서 (6라운드)

의존 관계에 따라 6라운드로 나눈다. **같은 라운드 안의 스프린트는 병렬 생성한다.**

```
Round 1 ─── S1 (7개 파일)                          ← 기반, 의존 없음
Round 2 ─── S2 (11개 파일)                         ← S1 엔티티 참조
Round 3 ─── S3 (8개) + S4 (6개) + S6 (5개) 병렬    ← S2 완료 후 세 갈래 독립
Round 4 ─── S5 (9개) + S7 (7개) 병렬               ← S5는 S4 참조, S7은 S6 참조
Round 5 ─── S8 (6개)                               ← S5+S7 참조
Round 6 ─── S9 (5개)                               ← 전체 참조
```

**라운드 내 실행 방법:**
- 병렬 가능한 스프린트는 Agent 서브에이전트를 동시에 띄워 병렬 처리한다
- 각 서브에이전트에게 해당 스프린트의 SSOT 문서 목록과 파일 목록을 전달한다
- 한 라운드의 파일 생성 + 검증 루프가 **이슈 0**이 되어야 다음 라운드로 넘어간다

---

## 라운드 완료 검증 루프 (매 라운드 종료 시 필수)

**파일 생성 후, 다음 라운드로 넘어가기 전에 반드시 이 검증 루프를 실행한다.**

```
파일 생성 완료
  │
  ├─ [검증 회차 1] 독립 검증 실행 (아래 체크리스트 전항목)
  │   ├─ SSOT 원본 문서를 다시 열어서 대조 (캐시/기억 의존 금지)
  │   ├─ 이슈 발견 → 수정
  │   └─ 이슈 0개 → ✅ 라운드 완료 → 다음 라운드
  │
  ├─ [검증 회차 2] 수정 후 재검증
  │   ├─ ⚠️ 이전 검증 기록을 무시한다. 처음 검토하는 것처럼 전항목을 다시 확인한다.
  │   ├─ 이슈 발견 → 수정
  │   └─ 이슈 0개 → ✅ 라운드 완료 → 다음 라운드
  │
  ├─ [검증 회차 3~N] 동일 반복
  │   └─ 매 회차마다 이전 검증 결과를 참조하지 않고, 백지 상태에서 검증한다
  │
  └─ 최대 5회. 5회 후에도 이슈 → 잔여 이슈 목록을 출력하고 사용자에게 보고
```

### 검증 체크리스트 (매 회차 전항목 실행)

#### A. 완전성 검사
- [ ] MASTER_TRACKER.md의 해당 스프린트 "지침 문서" 컬럼 파일이 **전부** 존재하는가
- [ ] 각 파일이 "필수 구조"의 **모든 섹션**을 포함하는가 (SSOT 출처 / 선행 조건 / 구현 범위 / 상세 구현 지침 / 검증 체크리스트)
- [ ] validation 파일에 R1~R5 grep 명령어가 포함되어 있는가
- [ ] validation 파일에 이전 스프린트 회귀 테스트가 포함되어 있는가

#### B. SSOT 정합성 검사
- [ ] 해당 스프린트의 SSOT 문서(systems/*.md, pages/*.md)를 **다시 열어서** 읽는다
- [ ] SSOT에 정의된 테이블/컬럼/타입/계산식/규칙이 세부 지침에 **빠짐없이** 반영되었는가
- [ ] SSOT에 정의된 UI 레이어(L1~L9)/탭/뷰모드/인터랙션이 **빠짐없이** 반영되었는가
- [ ] SSOT에 **없는** 기능이나 필드가 자의적으로 추가되지 않았는가
- [ ] 참조 섹션 번호(§N)가 정확한가

#### C. 목업 정합성 검사
- [ ] 해당 스프린트의 prototype/*.html을 **다시 열어서** 읽는다
- [ ] 목업의 화면 ID, 컴포넌트 배치, 시각적 구조가 세부 지침에 반영되었는가
- [ ] 목업 매핑 테이블이 정확한가 (화면 ID ↔ 구현 컴포넌트)

#### D. 일관성 검사
- [ ] 같은 라운드 내 다른 스프린트의 파일과 엔티티명/타입명이 충돌하지 않는가
- [ ] 이전 라운드에서 생성된 파일과 엔티티명/인터페이스명이 일관되는가
- [ ] Clean Architecture 레이어 배치가 올바른가 (domain에 외부 의존 없음, presentation에서 infrastructure 직접 import 없음)
- [ ] 파일 경로가 CLAUDE.md의 src/ 폴더 구조와 일치하는가

#### E. 품질 검사
- [ ] 모호한 표현("적절히", "등", "필요에 따라", "기타")이 0개인가
- [ ] 모든 타입 정의에 구체적 필드와 타입이 명시되어 있는가
- [ ] 모든 비즈니스 로직에 구체적 수치/조건이 명시되어 있는가
- [ ] 데이터 흐름이 구체적 함수명/테이블명/컬럼명으로 기술되어 있는가

### 검증 원칙 (절대 규칙)

1. **매 회차 백지 검증**: 이전 회차의 검증 결과, 수정 이력, "이미 확인함" 같은 기억을 **의도적으로 무시**한다. 처음 보는 문서인 것처럼 A~E 전항목을 실행한다.
2. **SSOT 원본 재열람 필수**: 검증할 때마다 SSOT 문서를 **실제로 다시 열어서** 읽는다. 이전에 읽은 기억에 의존하지 않는다.
3. **수정은 즉시**: 이슈 발견 시 다음 회차로 미루지 않고 즉시 수정한다.
4. **이슈 0 = 통과**: 단 하나의 이슈라도 남아 있으면 다음 라운드로 넘어가지 않는다.

---

## 라운드별 상세 지시

### Round 1: S1 Foundation (7개 파일)

**읽을 SSOT 문서:**
- `development_docs/systems/DATA_MODEL.md`
- `development_docs/systems/AUTH.md`
- `development_docs/systems/DESIGN_SYSTEM.md`
- `development_docs/00_PRD.md` (기술 스택 섹션)
- `development_docs/implementation/phases/S1_foundation/00_overview.md`

**읽을 공통 문서 (전 라운드 공통, 최초 1회만):**
- `CLAUDE.md`
- `development_docs/implementation/shared/CLEAN_ARCH_PATTERN.md`
- `development_docs/implementation/shared/CONVENTIONS.md`
- `development_docs/implementation/shared/TESTING_STRATEGY.md`
- `development_docs/implementation/orchestration/REVIEW_LOOP.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S1_foundation/01_project_init.md` | Next.js App Router + TypeScript strict + Tailwind + shadcn/ui + Supabase 초기화. `pnpm dev` → localhost:7911. package.json 의존성 전체 목록. tsconfig strict 설정. |
| `S1_foundation/02_schema.md` | DATA_MODEL.md의 **모든 테이블**을 마이그레이션 파일로 변환. P1+P2 전체. 각 테이블의 컬럼명, 타입, FK, 인덱스, enum 정의를 그대로 옮긴다. 마이그레이션 파일 분할 전략(순서 의존성). |
| `S1_foundation/03_rls.md` | AUTH.md의 RLS 정책을 SQL로 변환. 테이블별 SELECT/INSERT/UPDATE/DELETE 정책. `auth.uid()` 기반 행 수준 보안. 버블 역할 기반 접근은 S7에서 확장됨을 명시. |
| `S1_foundation/04_auth.md` | AUTH.md의 소셜 로그인 4종(구글/카카오/네이버/애플) 구현. Supabase Auth + OAuth provider 설정. 콜백 라우트. 로그인/로그아웃 플로우. `users` 테이블 자동 생성 트리거. |
| `S1_foundation/05_design_tokens.md` | DESIGN_SYSTEM.md의 **모든 토큰**을 Tailwind CSS 변수로 변환. 컬러(식당 accent-food / 와인 accent-wine / 브랜드), 타이포그래피(Pretendard + Comfortaa), 스페이싱, 라운딩, 그림자, 반응형 브레이크포인트. globals.css + tailwind.config.ts. |
| `S1_foundation/06_layout.md` | CLAUDE.md 클린 아키텍처 폴더 구조 생성. src/ 하위 전체 디렉토리. shared/di/container.ts 뼈대. app/(main)/layout.tsx 기본 레이아웃. 모바일 퍼스트 360px 기준. |
| `S1_foundation/07_validation.md` | S1 전체 검증. pnpm build/lint, 타입 체크, RLS 테스트, 인증 플로우, 토큰 적용, R1~R5 grep 명령어. |

---

### Round 2: S2 Core Recording (11개 파일)

**읽을 SSOT 문서:**
- `development_docs/systems/RATING_ENGINE.md` — 사분면, 만족도, 아로마, 구조평가, 페어링, 씬태그 전체
- `development_docs/systems/DATA_MODEL.md` — records, record_photos 테이블
- `development_docs/pages/05_RECORD_FLOW.md` — 기록 플로우 UI, Phase 1/2, 진입 경로
- `development_docs/prototype/01_home.html` — `screen-rest-record`, `screen-wine-record`, `screen-add-success`
- `development_docs/prototype/00_design_system.html` — §15 점 비주얼, §15b Circle Rating
- `development_docs/implementation/phases/S2_core_recording/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S2_core_recording/01_domain.md` | Record, Rating, Quadrant, AromaSelection, WineStructure, Pairing, SceneTag 엔티티. DATA_MODEL.md records 테이블 컬럼 → TypeScript 타입 1:1 매핑. repository 인터페이스(RecordRepository). 외부 의존 0 확인. |
| `S2_core_recording/02_quadrant_ui.md` | RATING_ENGINE.md §2 사분면. 식당(가격x분위기), 와인(산미x바디). 터치/드래그로 좌표 이동. 만족도 조절은 독립 제스처. 좌표계 범위, 기본 위치, 시각적 피드백. prototype의 사분면 목업 구조 반영. |
| `S2_core_recording/03_satisfaction.md` | RATING_ENGINE.md §3 만족도. 1-100 범위. Circle Rating(28px~120px, 5단계 색상, glow). 10점 단위 햅틱. DESIGN_SYSTEM §15b 스펙. |
| `S2_core_recording/04_aroma.md` | RATING_ENGINE.md §5 아로마 팔레트. 15섹터 3링(1차향 8 + 2차향 4 + 3차향 3). 탭 토글, 드래그 연속 칠하기. aroma_color 가중평균 계산식. 섹터별 색상 코드. |
| `S2_core_recording/05_structure.md` | RATING_ENGINE.md §6 구조평가. 복합성/여운/균형 슬라이더 3개. 선택 항목. 만족도 자동산출 공식(수동 우선). |
| `S2_core_recording/06_pairing.md` | RATING_ENGINE.md §7 페어링. WSET 8종 카테고리 그리드. 다중 선택. AI pre-select 로직. 직접 입력 필드. |
| `S2_core_recording/07_scene_tags.md` | RATING_ENGINE.md §4 씬태그. 식당 6종(solo/romantic/friends/family/business/drinks) 단일 선택. 동행자 선택 UI. |
| `S2_core_recording/08_photos.md` | 사진 촬영/갤러리 선택 UI. Supabase Storage 업로드. record_photos 테이블 저장. 이미지 리사이즈/압축. 최대 장수 제한. |
| `S2_core_recording/09_record_flow.md` | RECORD_FLOW.md의 Phase 1(필수) + Phase 2(선택) 플로우. 식당 기록 3단계 vs 와인 기록 5단계(RATING_ENGINE §8). status 값(checked/rated/reviewed). 진입 경로별 분기(카메라/검색/상세FAB). 저장 후 성공 화면. |
| `S2_core_recording/10_infra.md` | SupabaseRecordRepository implements RecordRepository. records INSERT/SELECT/UPDATE 쿼리. record_photos 연동. shared/di/container.ts 등록. application hook(useCreateRecord, useRecords). |
| `S2_core_recording/11_validation.md` | S2 전체 검증 + S1 회귀. 사분면 좌표 저장 정확도, Circle Rating 동작, 아로마 선택/색상, 사진 업로드, Phase 1→2 플로우. |

---

### Round 3: S3 + S4 + S6 병렬 (19개 파일)

> **3개 서브에이전트를 동시에 띄운다.**

#### 서브에이전트 A: S3 Search & Register (8개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/01_SEARCH_REGISTER.md`
- `development_docs/pages/05_RECORD_FLOW.md` — 진입 경로 3종
- `development_docs/systems/RATING_ENGINE.md` — §9 AI 태그 추천, EXIF GPS
- `development_docs/systems/XP_SYSTEM.md` — §4-1 EXIF 차등 XP, §9
- `development_docs/prototype/01_home.html` — `screen-add-restaurant`, `screen-add-wine`
- `development_docs/implementation/phases/S3_search/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S3_search/01_camera_ai.md` | FAB(+) → 바텀시트 → 카메라 촬영. Gemini Vision AI 인식(식당: 메뉴판/간판, 와인: 라벨). AI 결과로 기록 화면 pre-fill. 카메라 3모드(메뉴/라벨/영수증). |
| `S3_search/02_search_ui.md` | 검색 바 UI. 텍스트 입력 → 자동완성 드롭다운. 식당/와인 탭 전환. 최근 검색, 인기 검색어. 01_SEARCH_REGISTER.md UI 스펙. |
| `S3_search/03_restaurant_search.md` | Nyam DB 우선 → 외부 API 폴백(카카오/네이버/구글 Places). 검색 결과 통합 정렬. 외부 결과 선택 시 restaurants 테이블 자동 생성. |
| `S3_search/04_wine_search.md` | Nyam DB 우선 → 라벨 OCR 폴백. OCR 결과에서 와인명/빈티지/생산자 추출. wines 테이블 검색/생성. |
| `S3_search/05_exif.md` | 사진 EXIF GPS 추출. 식당 좌표와 반경 200m 비교. `is_exif_verified` 플래그. XP 차등 적용(XP_SYSTEM §4-1). |
| `S3_search/06_register.md` | 신규 식당/와인 등록 폼. 필수/선택 필드. restaurants/wines 테이블 INSERT. 등록 후 기록 화면 연결. |
| `S3_search/07_full_flow.md` | FAB→카메라/검색→대상 선택→기록 화면→저장 풀플로우. 3가지 진입 경로(카메라 Primary / 검색 / 상세 FAB) 통합. status 흐름(checked→rated→reviewed). |
| `S3_search/08_validation.md` | S3 검증 + S1/S2 회귀. 카메라→AI→pre-fill, 검색→자동완성, 외부 API, EXIF, 등록, 풀플로우. |

#### 서브에이전트 B: S4 Detail Pages (6개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/02_RESTAURANT_DETAIL.md` — L1~L8 레이어
- `development_docs/pages/03_WINE_DETAIL.md` — L1~L8 레이어
- `development_docs/pages/04_RECORD_DETAIL.md`
- `development_docs/systems/RATING_ENGINE.md` — 사분면 점 비주얼, 배경 컬러
- `development_docs/prototype/02_detail_restaurant.html`
- `development_docs/prototype/02_detail_wine.html`
- `development_docs/implementation/phases/S4_detail_pages/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S4_detail_pages/01_restaurant_detail.md` | L1 히어로 → L2 기본 정보 → L3 3슬롯 점수 → L4 뱃지 → L5 기록 타임라인 → L6 사분면 → L7 실용 정보 → L8 연결 와인. 각 레이어의 데이터 소스, 컴포넌트, props 명세. prototype 매핑. |
| `S4_detail_pages/02_wine_detail.md` | L1 히어로 → L2 기본 정보 → L3 3슬롯 점수 → L4 뱃지 → L5 와인 맵 → L6 페어링 → L7 기록 타임라인 → L8 와인 정보+연결 식당. 각 레이어 명세. prototype 매핑. |
| `S4_detail_pages/03_record_detail.md` | 기록 전체 필드 조회. 사분면/만족도/아로마/구조평가/페어링/씬태그/사진/메모 표시. 수정 모드. 삭제(soft delete). 버블 공유 버튼(S8까지 비활성). |
| `S4_detail_pages/04_wishlist.md` | 상세 히어로 하트 버튼. wishlists 테이블 CRUD. 찜 추가/해제 토글. 찜 목록은 홈 서브탭에서 표시(S5). |
| `S4_detail_pages/05_detail_flow.md` | 상세 페이지 FAB(+) → 재방문/재시음 기록(이전 좌표 반투명 표시). 카드→상세→기록→상세 순환 네비게이션. S3 완료 후 착수. |
| `S4_detail_pages/06_validation.md` | S4 검증 + 이전 회귀. L1~L8 렌더링, 찜 CRUD, 상세↔기록 순환, 360px 모바일. |

#### 서브에이전트 C: S6 XP, Profile & Settings (5개 파일)

**읽을 SSOT 문서:**
- `development_docs/systems/XP_SYSTEM.md` — XP 계산, 레벨, 뱃지, 맛 정체성, 어뷰징 방지
- `development_docs/systems/DATA_MODEL.md` — user_experiences, xp_histories, level_thresholds, milestones, user_milestones
- `development_docs/pages/10_PROFILE.md`
- `development_docs/pages/11_SETTINGS.md`
- `development_docs/pages/09_NOTIFICATIONS.md`
- `development_docs/prototype/03_profile.html`
- `development_docs/prototype/05_settings.html`
- `development_docs/prototype/06_notifications.html`
- `development_docs/implementation/phases/S6_xp_profile/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S6_xp_profile/01_xp_engine.md` | XP_SYSTEM.md 전체를 코드로 번역. 복합XP + 축별XP + 카테고리XP 계산식. 레벨 테이블(level_thresholds). 활성XP 6개월 롤링 윈도우 크론/Edge Function. 어뷰징 방지(일일 캡, 중복 방지). 마일스톤 달성 트리거. |
| `S6_xp_profile/02_profile.md` | PROFILE.md 전체 레이아웃. 아바타/닉네임/맛 정체성. 활동 요약(기록수, 레벨, 뱃지). 통계 섹션. 맛 DNA 시각화. prototype/03_profile.html 매핑. |
| `S6_xp_profile/03_settings.md` | SETTINGS.md 전체. 계정 정보, 프라이버시 설정(privacy_profile, visibility), 알림 on/off, 테마, 로그아웃, 계정 삭제. prototype/05_settings.html 매핑. |
| `S6_xp_profile/04_notifications.md` | NOTIFICATIONS.md 전체. 인라인 드롭다운(페이지 아님). 알림 타입별 템플릿. 읽음/안읽음 처리. 뱃지 카운트. prototype/06_notifications.html 매핑. |
| `S6_xp_profile/05_validation.md` | S6 검증 + 이전 회귀. XP 적립 정확도, 레벨업, 크론, 프로필 렌더링, 설정 저장, 알림. |

---

### Round 4: S5 + S7 병렬 (16개 파일)

> **2개 서브에이전트를 동시에 띄운다.**

#### 서브에이전트 A: S5 Home & Recommendation (9개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/06_HOME.md` — 홈 레이아웃, 탭, 뷰 모드, 필터, 소팅, 통계, AI 인사, 넛지
- `development_docs/pages/07_DISCOVER.md` — Discover 서브스크린
- `development_docs/systems/RECOMMENDATION.md` — 7종 추천 알고리즘
- `development_docs/systems/RATING_ENGINE.md` — 카드 표시용 사분면 점, 만족도 색상
- `development_docs/00_IA.md` — 앱 헤더, FAB, 네비게이션 구조
- `development_docs/prototype/01_home.html` — `screen-home`, `screen-discover`
- `development_docs/implementation/phases/S5_home_recommendation/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S5_home_recommendation/01_app_shell.md` | 앱 헤더: nyam 로고(Comfortaa), 버블 아이콘(--brand), 알림 뱃지, 아바타 드롭다운. FAB: + 추가(44x44 우하단), ← 뒤로(상세). glassmorphism 스타일. 00_IA.md 참조. |
| `S5_home_recommendation/02_home_layout.md` | 식당/와인 탭 토글(언더라인: food=--accent-food, wine=--accent-wine). 서브탭: 식당(방문/찜/추천/팔로잉), 와인(마신/찜/셀러). 탭별 독립 상태. |
| `S5_home_recommendation/03_view_modes.md` | 4종 뷰: 상세(카드 풀) → 리스트(컴팩트) → 캘린더(월간 사진) → 지도(카카오맵 마커). 뷰 전환 버튼. 각 뷰의 데이터 표시 범위와 컴포넌트. |
| `S5_home_recommendation/04_filter_sort.md` | 노션 스타일 필터: 다중 조건 AND/OR, 필드 선택(점수/카테고리/씬태그/날짜/지역). 소팅: 최신/점수/방문횟수. 홈 검색(상단 바). |
| `S5_home_recommendation/05_stats_panel.md` | 통계 패널 토글(접기/펴기). 총 기록 수, 평균 만족도, 카테고리 분포, 월별 추이 차트. 식당/와인 탭별 독립 통계. |
| `S5_home_recommendation/06_nudge.md` | AI 인사(5초 소멸, 기록 기반 개인화 문구). 넛지 스트립(미평가/식사시간/사진감지, 1개씩 표시). 조건별 표시 로직. |
| `S5_home_recommendation/07_recommendation.md` | RECOMMENDATION.md 7종: 재방문추천/상황추천/사분면추천/권위자추천/버블추천/페어링추천/지역푸시. 각 알고리즘의 입력→계산→출력 로직. 기록 수에 따른 점진적 해금. 추천 카드 UI. |
| `S5_home_recommendation/08_discover.md` | DISCOVER.md 전체. 홈 내 서브스크린(별도 페이지 아님). 지역 칩 필터, 검색, 카드 리스트. 추천 카드와 Discover 카드 혼합 표시. |
| `S5_home_recommendation/09_validation.md` | S5 검증 + 이전 회귀. 탭/뷰/필터/통계/인사/넛지/추천/Discover 전체. 360px 레이아웃. |

#### 서브에이전트 B: S7 Bubble System (7개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/08_BUBBLE.md` — 버블 목록, 상세, 생성, 피드, 랭킹, 멤버, 댓글, 리액션, 데이터 접근
- `development_docs/systems/AUTH.md` — §2 버블 역할(owner/admin/member/follower), §2-3 가입정책 5종
- `development_docs/systems/XP_SYSTEM.md` — 활성XP 가입조건, 소셜XP
- `development_docs/prototype/04_bubbles.html` — 버블 목록
- `development_docs/prototype/04_bubbles_detail.html` — 버블 상세(피드/랭킹/멤버/설정)
- `development_docs/implementation/phases/S7_bubble/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S7_bubble/01_bubble_domain.md` | Bubble, BubbleMember, BubbleRanking, Comment, Reaction 엔티티. DATA_MODEL.md bubbles/bubble_members/bubble_ranking_snapshots 테이블 매핑. BubbleRepository 인터페이스. SupabaseBubbleRepository 구현. DI 등록. |
| `S7_bubble/02_bubble_create.md` | 버블 생성 폼(이름, 아이콘, 설명, 가입조건, 공개여부). 5종 가입정책(invite_only/closed/manual_approve/auto_approve/open) 각각의 로직. 초대 링크 생성. XP 기반 가입조건 검증(총XP + 활성XP 조합). |
| `S7_bubble/03_bubble_detail.md` | 3탭 구조: 피드(3뷰 모드+필터+소팅) / 랭킹(Top N+등락 표시) / 멤버(목록+역할+초대). content_visibility 제한(비멤버: rating_only/rating_and_comment). prototype 매핑. |
| `S7_bubble/04_comments_reactions.md` | 리액션 3종(want/check/fire) 토글. 댓글 CRUD. 댓글 내 @멘션. 리액션/댓글 카운트. 알림 트리거(S6 알림 연동). |
| `S7_bubble/05_roles.md` | AUTH.md §2 역할: owner(전체권한) / admin(멤버관리+설정) / member(기본활동) / follower(조회만). 역할별 허용 동작 매트릭스. 역할 변경/위임 플로우. |
| `S7_bubble/06_ranking_cron.md` | 주간 랭킹 스냅샷 Edge Function/크론. bubble_ranking_snapshots 테이블. 랭킹 기준(기록수/평균만족도/활동XP). 이전 주 대비 등락(▲▼─) 계산. |
| `S7_bubble/07_validation.md` | S7 검증 + 이전 회귀. 생성→가입→피드→랭킹→댓글/리액션→역할→크론 풀플로우. RLS 정책. |

---

### Round 5: S8 Social Integration (6개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/08_BUBBLE.md` — §2-3 개인 팔로우 접근 레이어, 버블 공유
- `development_docs/pages/02_RESTAURANT_DETAIL.md` — L9 버블 멤버 기록
- `development_docs/pages/03_WINE_DETAIL.md` — L9 버블 멤버 기록
- `development_docs/pages/06_HOME.md` — 팔로잉 서브탭
- `development_docs/pages/10_PROFILE.md` — 버블러 프로필(팔로워/팔로잉 수, 맛 매치%)
- `development_docs/prototype/04_bubbler_profile.html`
- `development_docs/implementation/phases/S8_integration/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S8_integration/01_follow.md` | follows 테이블 CRUD. 팔로우→맞팔로우 감지. 접근 레벨: 팔로우(이름+점수), 맞팔(리뷰/사진/팁 전체). 프라이버시 설정 연동. |
| `S8_integration/02_detail_l9.md` | 식당/와인 상세에 L9 레이어 추가. 버블 멤버 기록 카드. 버블 필터 드롭다운. 멤버 기록이 없을 때 빈 상태. |
| `S8_integration/03_home_social.md` | 홈 팔로잉 서브탭. 팔로잉 유저의 기록 피드(시간순). 추천 서브탭(기존 추천+Discover 혼합). |
| `S8_integration/04_share.md` | 기록 상세 → "버블에 공유" → 버블 선택 → 완료. shared_to_bubbles 연동. 공유 후 버블 피드에 표시. |
| `S8_integration/05_bubbler_profile.md` | 타인 프로필 조회 페이지. 상대 정보 + 맛 매치%(±5%) + 팔로우 버튼. 프라이버시 설정에 따른 노출 범위. prototype/04_bubbler_profile.html 매핑. |
| `S8_integration/06_validation.md` | S8 검증 + 전체 회귀. 팔로우→맞팔, L9, 소셜 탭, 공유, 버블러 프로필. |

---

### Round 6: S9 Onboarding & Polish (5개 파일)

**읽을 SSOT 문서:**
- `development_docs/pages/12_ONBOARDING.md` — 온보딩 풀플로우 (SSOT, 00_IA.md보다 우선)
- `development_docs/pages/09_NOTIFICATIONS.md` — 넛지 시스템
- `development_docs/prototype/00_onboarding.html`
- `development_docs/implementation/phases/S9_onboarding_polish/00_overview.md`

**생성할 파일:**

| 파일 | 핵심 내용 |
|------|----------|
| `S9_onboarding_polish/01_onboarding.md` | ONBOARDING.md 풀플로우: 로그인→인트로→맛집등록(지역선택→식당체크)→버블생성(가족/친구/동료 템플릿+초대)→버블탐색→홈. 30초 내 완료 가능. 각 단계 스킵 가능 여부. prototype 매핑. |
| `S9_onboarding_polish/02_nudge_polish.md` | 넛지 조건 정교화: 미평가 기록 있을 때, 식사 시간대(11-13시, 17-19시), 사진 감지 시. 표시 우선순위. 닫기/스누즈 동작. |
| `S9_onboarding_polish/03_full_flow_test.md` | E2E 시나리오: 신규가입→온보딩→기록생성→버블가입→기록공유→프로필확인→팔로우→홈 전체 순환. 시나리오별 검증 체크리스트. |
| `S9_onboarding_polish/04_build_optimize.md` | pnpm build 성공. LCP < 3s(3G), < 1s(WiFi). 번들 < 500KB 초기. 이미지 최적화(next/image). 코드 스플리팅. 불필요 의존성 제거. 콘솔 에러/경고 0. |
| `S9_onboarding_polish/05_final_validation.md` | 전체 프로젝트 최종 검증. S1~S9 모든 기능 회귀. R1~R5 전체. pnpm build/lint. TypeScript strict(any/as any/@ts-ignore/! = 0). RLS 전체. 360px 모바일. 보안. |

---

## 각 파일의 필수 구조

**모든 세부 지침 파일은 이 구조를 반드시 따른다.**

```markdown
# [태스크 번호]: [태스크명]

> 한 줄 요약

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/RATING_ENGINE.md` | §2 사분면 좌표계 |
| `pages/05_RECORD_FLOW.md` | Phase 1 필수 항목 |
| `prototype/01_home.html` | #screen-rest-record |

---

## 선행 조건

- [ ] S1 전체 완료 (DB + 인증 + 토큰)
- [ ] 2.1 domain 엔티티 정의 완료

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 | 레이어 |
|----------|------|--------|
| `src/domain/entities/record.ts` | Record 엔티티 타입 | domain |
| `src/presentation/components/record/quadrant-input.tsx` | 사분면 입력 UI | presentation |

### 생성하지 않는 것 (스코프 외)

- 검색 연동 (S3에서 구현)
- 상세 페이지 (S4에서 구현)

---

## 상세 구현 지침

### 1. [구체적 구현 항목]

**타입 정의:**
```typescript
// src/domain/entities/record.ts
export interface Record {
  id: string
  user_id: string
  restaurant_id: string | null
  wine_id: string | null
  record_type: 'restaurant' | 'wine'
  quadrant_x: number  // -2 ~ +2
  quadrant_y: number  // -2 ~ +2
  satisfaction: number // 1 ~ 100
  // ...DATA_MODEL.md records 테이블의 모든 컬럼
}
```

**비즈니스 로직:**
- 사분면 좌표 범위: x축 -2~+2, y축 -2~+2 (RATING_ENGINE §2-1)
- 기본 위치: (0, 0) 중앙
- 만족도 범위: 1~100, 기본값 50 (RATING_ENGINE §3)

**UI 구현:**
- prototype `#screen-rest-record`의 레이아웃 구조를 따른다
- 터치 영역: 44x44px 이상 (CLAUDE.md 모바일 규칙)
- 디자인 토큰: `bg-surface-primary`, `border-border` 사용 (하드코딩 금지)

### 2. [다음 구현 항목]
...

---

## 목업 매핑

| 목업 (prototype/*.html) | 화면 ID | 구현 컴포넌트 |
|-------------------------|---------|-------------|
| `prototype/01_home.html` | `#screen-rest-record` | `src/presentation/components/record/restaurant-record-form.tsx` |

---

## 데이터 흐름

```
사용자 터치 → QuadrantInput(onChange) → useCreateRecord(hook)
→ RecordRepository.create() → Supabase records INSERT
→ 성공 → 홈 이동 + toast
```

---

## 검증 체크리스트

- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] 사분면 좌표가 records 테이블에 정확히 저장됨
- [ ] `grep -r "from 'react" src/domain/` → 결과 없음 (R1)
- [ ] `grep -r "from '@supabase" src/presentation/` → 결과 없음 (R4)
- [ ] 360px 뷰포트에서 레이아웃 깨짐 없음
```

---

## 작성 원칙 (절대 규칙)

### 1. 모호함 제로

**금지 표현과 대체:**

| 금지 | 대체 |
|------|------|
| "적절히 구현" | 구체적 함수명, 파라미터, 반환값 명시 |
| "필요에 따라" | 조건을 정확히 명시 (예: "기록이 3개 이상일 때") |
| "등", "기타" | 전체 목록을 나열 |
| "디자인에 맞게" | 사용할 토큰명을 명시 (예: `bg-surface-primary`) |
| "관련 테이블" | 테이블명.컬럼명을 명시 (예: `records.quadrant_x`) |
| "에러 처리" | 에러 타입, 반환값, UI 표시 방법을 명시 |

### 2. SSOT 정합성

- systems/*.md의 **타입, 컬럼명, 계산식, 규칙, 상수값**을 그대로 코드 수준으로 번역
- pages/*.md의 **레이어(L1~L9), UI 구조, 탭, 인터랙션**을 그대로 구현 지침에 매핑
- prototype/*.html의 **화면 ID, 컴포넌트 배치, 시각적 패턴**을 반영
- **문서에 없는 기능이나 필드를 자의적으로 추가하지 않는다**
- SSOT 문서의 **섹션 번호**를 명시하여 역추적 가능하게 한다

### 3. 독립 실행 가능

- 각 파일만 읽고도 해당 태스크를 **완전히** 구현할 수 있어야 한다
- 같은 스프린트의 다른 세부 지침 파일을 참조하지 않는다
- 필요한 타입 정의, 함수 시그니처, DB 컬럼은 해당 파일 안에 포함한다
- 이전 스프린트에서 생성된 엔티티/인터페이스는 import 경로만 명시한다

### 4. Clean Architecture 강제

- 모든 파일 경로에 레이어를 명시한다
- domain은 외부 의존 0 (React, Supabase, Next.js import 불가)
- infrastructure는 `implements` 키워드로 domain 인터페이스 구현
- presentation에서 infrastructure 직접 import 금지 (shared/di 경유)
- R1~R5 검증 grep 명령어를 검증 체크리스트에 포함한다

### 5. validation 파일 규칙

- 해당 스프린트의 **모든 태스크** 검증을 통합
- `pnpm build`, `pnpm lint`, TypeScript strict 확인
- R1~R5 grep 명령어 전체 포함
- **이전 스프린트 회귀 테스트** 항목 포함 (REVIEW_LOOP.md 참조)
- 360px 모바일, 보안(RLS, 키 노출), SSOT 정합성 확인

---

## 최종 확인 (Round 6 검증 루프 통과 후)

Round 6까지 모든 검증 루프를 통과한 뒤, 마지막으로 **전체 64개 파일에 대한 크로스 라운드 검증**을 수행한다.
이 검증도 동일하게 백지 상태에서 실행하며, 이슈 0이 될 때까지 반복한다.

```
□ MASTER_TRACKER.md의 "지침 문서" 컬럼에 있는 파일명 64개가 모두 존재
□ 각 파일이 "필수 구조"의 모든 섹션을 포함
□ 모호한 표현("적절히", "등", "필요에 따라", "기타") 0개
□ 00_overview.md 파일들은 수정되지 않음
□ 모든 파일에 SSOT 출처 섹션 번호가 명시됨
□ 모든 파일에 구체적 파일 경로(src/...)가 포함됨
□ 모든 validation 파일에 R1~R5 grep 명령어가 포함됨
□ 스프린트 간 엔티티명/인터페이스명/타입명이 일관됨 (S2에서 정의한 Record를 S4가 동일하게 참조)
□ 스프린트 간 스코프 경계가 명확함 (한 기능이 두 스프린트에 중복 기술되지 않음)
□ 모든 SSOT 문서(systems 6개 + pages 12개)의 내용이 64개 파일에 빠짐없이 분배됨
```
