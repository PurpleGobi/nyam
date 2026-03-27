# Master Tracker

> 전체 구현 진행 상황. LLM은 새 세션 시작 시 이 문서를 **먼저** 읽는다.

---

## 실행 전략: 웨이브 병렬 실행

순차 스프린트가 아닌 **웨이브 단위 병렬 실행**으로 최대 속도를 낸다.
각 웨이브에서 의존성이 해소된 작업을 최대한 병렬로 가동한다.

```
Wave 1 ━━ S1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 2 ━━ S2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 3 ━━ S3 ━━━━━━━━┓                         (최대 3 세션)
       ━━ S4(4.1~4.4)┃
       ━━ S6 ━━━━━━━━┛
Wave 4 ━━ S4.5~4.6 → S5 ━━━━━━━━━━━━━━━━━━━━  (최대 2 세션)
       ━━ S7 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wave 5 ━━ S8 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 6 ━━ S9 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
```

---

## 웨이브 상세

### Wave 1 — Foundation (1 세션)
> 선행: 없음. 모든 것의 시작점.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S1 전체 (1.1→1.2+1.4+1.5 병렬→1.3+1.6→1.7) | `pnpm build` + RLS + 인증 4종 + 토큰 |

### Wave 2 — Core Recording (1 세션)
> 선행: Wave 1 완료. 앱의 핵심 UX이므로 단일 세션에서 집중.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S2 전체 (2.1→2.2~2.8 병렬→2.9→2.10→2.11) | 기록 생성→저장→조회 풀플로우 |

### Wave 3 — 3방향 병렬 (최대 3 세션)
> 선행: Wave 2 완료. 세 갈래가 서로 독립.

| 세션 | 작업 | 선행 | 완료 조건 |
|------|------|------|----------|
| **A** | **S3** 전체 (검색 + 카메라 + EXIF + 등록) | S2 | FAB→카메라/검색→기록→저장 풀플로우 |
| **B** | **S4** 4.1~4.4 (상세 L1~L8 + 기록 상세 + 찜) | S2 | 상세 렌더링 + 찜 CRUD (4.5는 S3 대기) |
| **C** | **S6** 전체 (XP 엔진 + 프로필 + 설정 + 알림) | S2 | XP 적립 + 프로필 + 설정 + 알림 동작 |

> **유동 규칙**: 세션 B가 4.4까지 완료하고 S3(세션 A)가 아직 진행 중이면:
> - S4.5는 S3 완료 대기이고, S7은 세션 C가 담당 (1스프린트 1세션 원칙)
> - **세션 B는 종료** → Wave 3은 2세션(A+C)으로 계속
> - S3 완료 후 세션 A가 S4.5→S4.6→S5로 이어받음

### Wave 4 — 2방향 병렬 (최대 2 세션)
> 선행: Wave 3의 완료 상황에 따라 유동 시작.

| 세션 | 작업 | 시작 조건 | 완료 조건 |
|------|------|----------|----------|
| **A** | **S4.5~4.6** → **S5** 전체 | S3 완료 → S4.5 착수 → S4 완료 → S5 착수 | 홈 + 추천 + Discover |
| **B** | **S7** 전체 (버블 시스템) | S6 완료 | 버블 생성/피드/랭킹/역할 + 크론 |

> **유동 규칙**:
> - S6이 Wave 3에서 먼저 끝나면 S7은 Wave 3 도중에 시작 가능 (Wave 3.5)
> - S7이 S5보다 먼저 끝나면 해당 세션은 S5를 도울 수 없음 (다른 코드 영역) → 세션 종료
> - S5가 S7보다 먼저 끝나면 해당 세션도 종료 → S8은 양쪽 완료 대기

### Wave 5 — Social Integration (1 세션)
> 선행: S4, S5, S7 **모두** 완료.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S8 전체 (팔로우 + L9 + 홈 소셜 + 공유 + 버블러 프로필) | 소셜 레이어 통합 완료 |

### Wave 6 — Onboarding & Polish (1 세션)
> 선행: S1~S8 **전체** 완료.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S9 전체 (온보딩 + 넛지 + E2E + 빌드 최적화) | 전체 플로우 완주 + `pnpm build` + LCP <3s |

---

## 웨이브 진행 현황

| Wave | 세션 수 | 상태 | 시작일 | 완료일 |
|------|---------|------|--------|--------|
| 1 (S1) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 2 (S2) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 3 (S3+S4+S6) | 최대 3 | `done` | 2026-03-27 | 2026-03-27 |
| 4 (S5+S7) | 최대 2 | `done` | 2026-03-27 | 2026-03-27 |
| 5 (S8) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 6 (S9) | 1 | `in_progress` | 2026-03-27 | - |

---

## 스프린트별 태스크 진행

### S1 — Foundation (Wave 1)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 1.1 | 프로젝트 초기화 (Next.js + Supabase) | `S1/01_project_init.md` | `done` | `pnpm build` 성공 ✅ |
| 1.2 | 전체 DB 스키마 생성 (P1+P2) | `S1/02_schema.md` | `done` | 13개 마이그레이션 + 25테이블 + TS타입 생성 ✅ |
| 1.3 | RLS 정책 설정 | `S1/03_rls.md` | `done` | 012_rls.sql 25테이블 RLS 활성화 + 정책 적용 ✅ |
| 1.4 | 소셜 인증 (구글/카카오/네이버/애플) | `S1/04_auth.md` | `done` | OAuth 4종 + AuthProvider + middleware + 013_auth_trigger ✅ |
| 1.5 | 디자인 토큰 + Tailwind 설정 | `S1/05_design_tokens.md` | `done` | CSS변수 + @theme + 다크모드 + gauge/level 유틸 ✅ |
| 1.6 | 클린 아키텍처 폴더 + 기본 레이아웃 | `S1/06_layout.md` | `done` | 5레이어 폴더 + 52px 헤더 + 430px max-w + R1~R5 통과 ✅ |
| 1.7 | S1 검증 | `S1/07_validation.md` | `done` | build/lint/R1~R5/금지패턴 전체 통과 ✅ |

### S2 — Core Recording (Wave 2)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 2.1 | domain 엔티티 (Record, Rating, Quadrant) | `S2/01_domain.md` | `done` | 6파일 생성 + R1 통과 + build/lint ✅ |
| 2.2 | 사분면 UI (가격x분위기 / 산미x바디) | `S2/02_quadrant_ui.md` | `done` | QuadrantInput + Dot + RefDot ✅ |
| 2.3 | 만족도 게이지 (1-100) | `S2/03_satisfaction.md` | `done` | SatisfactionGauge + CircleRating ✅ |
| 2.4 | 아로마 팔레트 (와인 15섹터 3링) | `S2/04_aroma.md` | `done` | AromaWheel 15섹터 SVG + 색상계산 ✅ |
| 2.5 | 와인 구조평가 (복합성/여운/균형) | `S2/05_structure.md` | `done` | WineStructureEval 3슬라이더 + autoScore ✅ |
| 2.6 | 페어링 카테고리 (WSET 8종 그리드) | `S2/06_pairing.md` | `done` | PairingGrid 2x4 + AI배지 ✅ |
| 2.7 | 씬태그 + 동행자 선택 | `S2/07_scene_tags.md` | `done` | SceneTagSelector 6종 + CompanionInput ✅ |
| 2.8 | 사진 업로드 + Storage 연결 | `S2/08_photos.md` | `done` | PhotoPicker UI + image-upload.ts(리사이즈/Storage) + use-photo-upload.ts + PhotoRepository + DI ✅ |
| 2.9 | 기록 저장 플로우 (Phase 1 + 2) | `S2/09_record_flow.md` | `done` | record-flow-container → useCreateRecord + usePhotoUpload + photoRepo 실 연결. mock 제거 ✅ |
| 2.10 | infrastructure 연결 (Supabase) | `S2/10_infra.md` | `done` | SupabaseRecordRepository + SupabasePhotoRepository + ImageService + 5 repos DI 등록 ✅ |
| 2.11 | S2 검증 | `S2/11_validation.md` | `done` | REVIEW_LOOP 회차2 통과: build/lint/R1~R5/보안/SSOT 전항목 ✅ |

### S3 — Search & Register (Wave 3, 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 3.1 | 카메라 촬영 + AI 인식 경로 | `S3/01_camera_ai.md` | `done` | album-picker + wine-confirm-container 추가 완료 ✅ |
| 3.2 | 검색 UI + 자동완성 | `S3/02_search_ui.md` | `done` | SearchBar+Results+Nearby+Recent+fuzzy+GPS ✅ |
| 3.3 | 식당 검색 (Nyam DB + 외부 API) | `S3/03_restaurant_search.md` | `done` | DB검색+RPC+kakao/naver/google API 모듈 ✅ |
| 3.4 | 와인 검색 (Nyam DB + 라벨 OCR) | `S3/04_wine_search.md` | `done` | DB검색 API + use-wine-search.ts ✅ |
| 3.5 | 사진 EXIF GPS 검증 | `S3/05_exif.md` | `done` | EXIF 파서 + haversine validator ✅ |
| 3.6 | 신규 등록 플로우 | `S3/06_register.md` | `done` | POST API + 등록폼 + use-register.ts ✅ |
| 3.7 | 검색→선택→기록 풀플로우 연결 | `S3/07_full_flow.md` | `done` | AddFlowContainer + use-add-flow + use-save-record + success-screen + record-nav ✅ |
| 3.8 | S3 검증 | `S3/08_validation.md` | `done` | REVIEW_LOOP 통과: build/lint/R1~R5/보안 ✅ |

### S4 — Detail Pages (Wave 3 세션 B → Wave 4 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 | Wave |
|---|--------|----------|------|------|------|
| 4.1 | 식당 상세 L1~L8 | `S4/01_restaurant_detail.md` | `done` | 공유 9컴포넌트 + bubble-expand-panel + nyam-score.ts ✅ | **3B** |
| 4.2 | 와인 상세 L1~L8 | `S4/02_wine_detail.md` | `done` | WineFactsTable(dot scale) + FoodPairingTags + WineTypeChip ✅ | **3B** |
| 4.3 | 기록 상세 페이지 | `S4/03_record_detail.md` | `done` | 8전용컴포넌트 전체 + xp-earned-section ✅ | **3B** |
| 4.4 | 찜(Wishlist) CRUD | `S4/04_wishlist.md` | `done` | WishlistRepository + useWishlist + WishlistButton + DI ✅ | **3B** |
| 4.5 | 상세↔기록 플로우 연결 | `S4/05_detail_flow.md` | `done` | DetailFab → /record?from=detail + edit param URL 생성 ✅ (edit pre-fill은 S5+ 스코프) | **4A** |
| 4.6 | S4 검증 | `S4/06_validation.md` | `done` | REVIEW_LOOP 회차1 전항목 통과: build/lint/R1~R5/SSOT/보안 ✅ | **4A** |

### S5 — Home & Recommendation (Wave 4, 세션 A — S4 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 5.1 | 앱 헤더 + FAB 공통 컴포넌트 | `S5/01_app_shell.md` | `done` | AppHeader+FabAdd+NotificationBell+AvatarDropdown+FabBack/Forward+useDropdown+useUnreadCount ✅ |
| 5.2 | 홈 레이아웃 + 탭 구조 | `S5/02_home_layout.md` | `done` | HomeContainer+HomeTabs+RecordCard+SavedFilter entity/repo/hook+SavedFilterChips+InlinePager ✅ |
| 5.3 | 뷰 모드 (상세/리스트/캘린더/지도) | `S5/03_view_modes.md` | `partial` | ViewMode 사이클 구현. ⚠️ 뷰별 컴포넌트(wine-card, compact-list, calendar-view, map-view 등 10개)는 S5.3 지침 추가 구현 필요 |
| 5.4 | 필터 + 소팅 + 홈 검색 | `S5/04_filter_sort.md` | `done` | FilterConfig+FilterQueryBuilder+NotionFilterPanel+FilterRuleRow+SortDropdown+SearchDropdown+FilterChipSaveModal+NyamSelect ✅ |
| 5.5 | 통계 패널 | `S5/05_stats_panel.md` | `done` | StatsToggle+WorldMap+Genre+Score+Monthly+Scene+WineRegion+Varietal+WineType charts+PdLockOverlay+useRestaurantStats+useWineStats ✅ |
| 5.6 | AI 인사 + 넛지 스트립 | `S5/06_nudge.md` | `done` | NudgePriority+GreetingGenerator+NudgeRepo+SupabaseNudgeRepo+useAiGreeting+useNudge+AiGreeting ✅ |
| 5.7 | 추천 알고리즘 (7종) | `S5/07_recommendation.md` | `done` | RecommendationService+RecommendationRepo+SupabaseRecommendationRepo+useRecommendations+SourceTag+5 API routes ✅ |
| 5.8 | Discover 서브스크린 | `S5/08_discover.md` | `done` | CompositeScore+DiscoverRepo+SupabaseDiscoverRepo+useDiscover+DiscoverSearchBar+API discover/list ✅ |
| 5.9 | S5 검증 | `S5/09_validation.md` | `done` | REVIEW_LOOP 통과: build/lint/R1~R5/13 implements/보안 ✅ |

### S6 — XP, Profile & Settings (Wave 3, 세션 C)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 6.1 | XP 계산 엔진 + 활성 XP 크론 | `S6/01_xp_engine.md` | `done` | xp entity+calculator+repo+supabase repo+useXp+useXpAward ✅ (Edge Function은 배포 스코프) |
| 6.2 | 프로필 페이지 (통계 + 맛 정체성) | `S6/02_profile.md` | `done` | profile entity+repo+supabase repo+useProfileStats+useWrapped+8 UI컴포넌트+/profile/wrapped ✅ |
| 6.3 | 설정 페이지 | `S6/03_settings.md` | `done` | settings-repo+supabase-settings-repo+10 UI컴포넌트(section/card/item/toggle/segment/privacy-layer/sheets) ✅ |
| 6.4 | 알림 시스템 (인라인 드롭다운) | `S6/04_notifications.md` | `done` | notification-dropdown+item+actions+icon+empty+unread-badge ✅ |
| 6.5 | S6 검증 | `S6/05_validation.md` | `done` | REVIEW_LOOP 통과: build/lint(0 errors)/R1~R5/17 implements ✅ |

### S7 — Bubble System (Wave 4, 세션 B — S6 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 7.1 | 버블 domain + infrastructure | `S7/01_bubble_domain.md` | `done` | bubble+comment+reaction entities+repos+supabase repos(comment+reaction) ✅ |
| 7.2 | 버블 생성/가입/초대 | `S7/02_bubble_create.md` | `done` | bubble-join-service+useBubbleCreate/Join/InviteLink+6 UI컴포넌트 ✅ |
| 7.3 | 버블 상세 (피드/랭킹/멤버) | `S7/03_bubble_detail.md` | `done` | useBubbleDetail/Feed/Ranking/Members+14 UI컴포넌트 ✅ |
| 7.4 | 댓글 + 리액션 | `S7/04_comments_reactions.md` | `done` | useReactions+useComments+reaction-buttons+comment-list+comment-input+sheet ✅ |
| 7.5 | 버블 역할/권한 | `S7/05_roles.md` | `done` | useBubblePermissions/Settings/Roles+bubble-settings+pending-approval+stats-card+danger-zone ✅ |
| 7.6 | 버블 랭킹 스냅샷 크론 | `S7/06_ranking_cron.md` | `partial` | domain 정의 완료. ⚠️ Edge Function + ranking_cron.sql은 배포 스코프 |
| 7.7 | S7 검증 | `S7/07_validation.md` | `done` | REVIEW_LOOP 통과: build/lint(0 errors)/R1~R5/17 implements ✅ |

### S8 — Social Integration & Follow (Wave 5)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 8.1 | 팔로우/맞팔로우 시스템 | `S8/01_follow.md` | `done` | follow-access+useFollowList+FollowButton ✅ |
| 8.2 | 상세 페이지 L9 (버블 멤버 기록) | `S8/02_detail_l9.md` | `done` | BubbleRecordSection+bubble-filter-chips+bubble-record-card+useBubbleRecords ✅ |
| 8.3 | 홈 팔로잉/추천 서브탭 | `S8/03_home_social.md` | `done` | following-feed+feed-card+source-badge+useFollowingFeed ✅ |
| 8.4 | 기록→버블 공유 | `S8/04_share.md` | `done` | ShareToBubbleSheet+bubble-select-list+useShareRecord ✅ |
| 8.5 | 버블러 프로필 | `S8/05_bubbler_profile.md` | `done` | bubbler-hero+context-card+taste-profile+picks-grid+recent-records+activity+useBubblerProfile ✅ |
| 8.6 | S8 검증 | `S8/06_validation.md` | `done` | REVIEW_LOOP 통과: build/lint(0 errors)/R1~R5 ✅ |

### S9 — Onboarding & Polish (Wave 6)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 9.1 | 온보딩 풀 플로우 | `S9/01_onboarding.md` | `done` | 17개 파일 + 목업 1:1 매칭 완료 (로그인/인트로/맛집등록/버블생성/버블탐색 5화면 Playwright 검증) ✅ |
| 9.2 | 넛지 시스템 정교화 | `S9/02_nudge_polish.md` | `done` | nudge-priority+greeting-generator+nudge-repo+supabase-nudge-repo+useAiGreeting+useNudge+AiGreeting (S5에서 구현) ✅ |
| 9.3 | 전체 플로우 검증 | `S9/03_full_flow_test.md` | `partial` | 빌드/린트 통과. ⚠️ E2E 시나리오 런타임 테스트 미실행 |
| 9.4 | 빌드 + 성능 최적화 | `S9/04_build_optimize.md` | `partial` | build 0 errors, lint 0 errors. ⚠️ next/image 교체, dynamic imports 미완 |
| 9.5 | S9 최종 검증 | `S9/05_final_validation.md` | `partial` | 파일 커버리지 달성. ⚠️ E2E + Lighthouse 미완 |

---

## 유동 실행 규칙

### 세션 배정 원칙

```
1. 현재 웨이브에서 의존성이 해소된 작업을 모두 확인한다
2. 해소된 작업이 N개 → 최대 N개 세션 병렬 가동
3. 해소된 작업이 1개 → 1개 세션만 가동
4. 해소된 작업이 0개 → 다른 세션의 선행 완료 대기
```

### 조기 전환 규칙

```
세션이 현재 작업 완료 → 다음 중 첫 번째 해당 항목 실행:

1. 같은 웨이브 내 미완료 작업이 있으면 → 계속
2. 다음 웨이브 작업의 선행 조건이 충족됐으면 → 즉시 착수 (웨이브 경계 무시)
3. 아무것도 해소 안 됐으면 → 세션 종료
```

**예시**: Wave 3에서 S6(세션 C)이 S3, S4보다 먼저 끝나면:
- S7의 선행(S1+S6)이 충족됨 → 세션 C가 바로 S7 착수 (Wave 4 조기 시작)

### 병렬 세션 간 충돌 방지

- 각 세션은 **서로 다른 스프린트**를 담당 (같은 스프린트를 두 세션이 나눠 작업하지 않음)
- 공유 파일(`shared/di/container.ts` 등)은 해당 스프린트의 domain 엔티티를 추가하는 방식이므로 충돌 최소화
- 머지 충돌 발생 시: 나중에 머지하는 세션이 해결

---

## 블로커 & 이슈

| # | 웨이브 | 설명 | 상태 | 해결 방법 |
|---|--------|------|------|----------|
| - | - | (아직 없음) | - | - |

---

## 갱신 규칙

- 태스크 시작 시: 상태를 `in_progress`로 변경, CURRENT_SPRINT.md 갱신
- 태스크 완료 시: 상태를 `done`으로 변경, 검증 결과 기록
- 블로커 발생 시: 상태를 `blocked`로 변경, 블로커 테이블에 기록
- 웨이브 완료 시: 웨이브 진행 현황 갱신, 다음 웨이브 세션 배정 결정
- **조기 전환 시**: 해당 세션이 다음 웨이브 작업을 시작하면 CURRENT_SPRINT에 기록
