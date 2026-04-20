<!-- updated: 2026-04-20 -->
# CODEBASE.md — Nyam 코드베이스 구조 인덱스

> 새 세션이 1분 안에 코드베이스를 파악하기 위한 문서. 코드 복사 금지 — 구조와 상태만.
> 마지막 갱신: 2026-04-20 (enrich-restaurant Edge Function + restaurant_enrichment 테이블 083 추가 — 회원 리뷰 없는 식당용 AI 요약 + Google Places 사진 폴백)

## 프로젝트 요약
- 맛집/와인 기록 + 소셜(버블) 앱. Next.js App Router + Supabase + Clean Architecture
- 총 ~502개 TS/TSX 파일, 84개 마이그레이션 파일 (번호 000~083, 078 중복), 7개 Edge Function

## 문서 구조 (2026-04-20 재구성)
- **루트**: `CLAUDE.md` / `WORKLOG.md` / `CODEBASE.md`
- **`development_docs/`**: `00_PRD.md`, `00_IA.md`, `POST_LAUNCH.md` + `systems/` (SSOT 10개)
  - SSOT 10개: DATA_MODEL, AUTH, DESIGN_SYSTEM, RECORD_SYSTEM (구 RATING_ENGINE 확장), XP_SYSTEM, BUBBLE_SYSTEM (신규), SOCIAL_SYSTEM (신규), RECOMMENDATION, MAP_LOCATION (신규), QUERY_OPTIMIZATION
- **`_archive/`**: 과거 문서 (pages 12개, prototype HTML, refactoring, implementation phases/shared/handoff, 개념문서_원본, research, simulations, system_brainstorming)
- 페이지별 스펙은 iOS 이식 시점에 당시 코드 기준으로 재작성 예정 (지금은 _archive/pages/ 참조용)

## src/ 레이어별 구조

### domain/ (순수 비즈니스 로직, 외부 의존 0)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| entities/ | 36 | 타입 정의 (record, restaurant, wine, bubble, xp, score, calendar, home-target, similarity, map-discovery, restaurant-enrichment 등). bookmark.ts 삭제됨. map-discovery.ts: MapDiscoveryItem 등. restaurant.ts: RestaurantPrestige. score.ts: ScoreSource 3종. bubble.ts: BubbleItem (source/recordId 제거됨). restaurant-enrichment.ts: AI 요약 타입 (083 신규) | 안정 |
| repositories/ | 20 | 인터페이스 (RecordRepository, BubbleRepository, HomeRepository, SimilarityRepository, PredictionRepository, EnrichmentRepository 등). BubbleRepository에 큐레이션 메서드 4개 추가. HomeRepository에 HomeDbFilters 인터페이스 + findHomeTargets dbFilters 파라미터 확장. EnrichmentRepository 신규 (083) | 안정 |
| services/ | 13 (+ __tests__/ 디렉토리) | 순수 로직 (xp-calculator, bubble-share-sync, filter-matcher, score-fallback, cf-calculator, distance(haversineDistanceMeters), ai-recognition, bubble-join-service, bubble-permission-service, exif-validator, follow-access, greeting-generator, image-service). map-cluster/nyam-score/onboarding-xp/profile-visibility/visibility-filter 5개 삭제(dead code). cf-calculator 테스트 32개. bubble-share-sync에 evaluateShareRule/matchesShareRule/computeShareDiff/computeItemDiff 포함 | 안정 |
| constants/ | 1 | source-priority.ts (SOURCE_PRIORITY: 'mine'\|'nyam'\|'bubble' 3종) | 안정 |

### infrastructure/ (외부 시스템 구현체)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| repositories/ | 20 | Supabase 구현체 (1:1 domain repo 매칭). supabase-home-repository: fetchTargetMeta→RPC(filter_home_restaurants/wines) 전환, HomeDbFilters 지원. supabase-follow-repository: isMutualFollow→RPC, getMutualFollows 병렬화. bubble_shares→bubble_items 전환 완료. supabase-bubble-repository stub→실제 구현 + auto sync 3개. supabase-enrichment-repository 신규 (083) | 안정 |
| supabase/ | 5 | client, server, auth-service, auth-mapper, types | 안정 |
| api/ | 7 파일 + providers/ 서브디렉토리 | llm, kakao-local, naver-local, google-places, google-image-search, ai-recognition, tavily (+ providers/ 서브디렉토리 별도 카운트) | 안정 |
| api/providers/ | 1 | gemini.ts (Gemini Vision) | 안정 |
| storage/ | 1 | image-upload.ts (uploadBubbleIcon 포함 — shared/di에서 이동) | 안정 |

### application/hooks/ (비즈니스 로직 훅, 87개)
- 기록: use-create-record, use-records, use-record-detail, use-record-update, use-record-editor, use-record-references, use-delete-record, use-calendar-records, use-all-target-records
- 식당/와인: use-restaurant-detail, use-restaurant-stats, use-restaurant-enrichment (083 신규), use-wine-detail, use-wine-search, use-wine-stats, use-wine-meta, use-target-meta, use-target-scores
- 버블: use-bubble-create, use-bubble-detail, use-bubble-feed, use-bubble-join, use-bubble-members, use-bubble-member, use-bubble-roles, use-bubble-ranking, use-bubble-items(수동 큐레이션 CRUD), use-bubble-auto-sync(useBubbleAutoSync: 공유 규칙 기반 자동 sync), use-bubble-discover, use-bubble-expertise, use-bubble-list, use-bubble-lookup, use-bubble-similarity, use-bubble-photos, use-bubble-icon-upload, use-bubble-invite-member, use-bubble-settings, use-user-bubbles 등. use-bubble-permissions/use-bubblers-list 삭제(dead code)
- 소셜: use-follow, use-follow-list, use-follow-list-with-similarity (팔로우 목록+적합도 enrichment), use-following-feed, use-comments, use-reactions, use-record-reactions, use-record-comment-counts, use-record-social-counts, use-share-record, use-social-filter-options, use-social-xp, use-mini-profile, use-bubbler-profile, use-user-search
- XP/프로필: use-xp, use-xp-award, use-xp-calculation, use-bonus-xp, use-profile, use-profile-stats, use-profile-level-stats, use-wrapped
- 홈: use-home-targets (target 중심 홈뷰, dbFilters/sort 파라미터 추가), use-home-state, use-map-discovery(HomeTarget→MapDiscoveryItem 변환, nearby fetch+merge, 필터/소팅/클러스터링, genre/district/area 추출→bounds API 전달), use-persisted-filter-state, use-saved-filters, use-current-location, use-user-coords
- CF: use-nyam-score (단건 CF 예측), use-feed-scores (배치 CF 예측), use-similarity (적합도 조회)
- 인증/기타: use-auth-actions, use-auth-subscription, use-invite-link, use-invite-validation, use-ai-greeting, use-axis-level, use-photo-upload, use-photo-management, use-camera-capture, use-naver-import, use-add-flow, use-register, use-settings, use-unread-count, use-search, use-notifications (use-onboarding/use-onboarding-bubbles/use-onboarding-restaurants 삭제 — dead code)

### presentation/
| 경로 | 역할 | 상태 |
|------|------|------|
| containers/ (23) | 페이지별 hook+조합 (home, record-flow, bubble-detail 등). bubble-tab-content.tsx(버블 탭 데이터/렌더 — home-container에서 분할). restaurant/wine/bubble-detail-container에 "리스트에 추가" 기능. record-flow/add-flow-container에 기록 후 "리스트에 추가". useAccolades 제거 → restaurants.prestige 직접 사용 | 안정 |
| components/ (22 dirs + 1 top-level file: similarity-indicator.tsx) | 순수 UI. home/map-view.tsx 전면 리디자인(통합 displayResult 기반, createDotHtml/createClusterHtml). home/map-filter-bar.tsx(신규: 3그룹 필터 UI). home/map-compact-item.tsx(신규: 사진 없는 컴팩트 리스트 아이템, 4종 점수 뱃지). home/filter-popover.tsx(범용 팝오버), home/filter-popover-group.tsx(7종 팝오버 렌더링), home/home-stats-panel.tsx(통계 차트 UI) — condition-filter-bar.tsx에서 분할. ui/prestige-badges.tsx. accolade-badges.tsx 삭제됨 | 안정 |
| hooks/ (6) | UI 전용 (use-back-navigation, use-dropdown, use-referrer, use-bubble-select-mode, use-home-filter-chips, use-condition-chip-handlers) | 안정 |
| providers/ (1) | auth-provider.tsx | 안정 |
| guards/ | 라우트 가드 | 안정 |

### shared/
| 경로 | 역할 | 상태 |
|------|------|------|
| di/container.ts | DI 조합 루트 — 20개 repo + imageService + auth 함수 + uploadBubbleIcon re-export | 안정 |
| di/auth-mappers.ts | 인증 매퍼 | 안정 |
| constants/ | aroma-sectors, llm-config, navigation, onboarding-seeds, wine-meta | 안정 |
| app/globals.css | 디자인 토큰 SSOT 구현 (:root CSS 변수 선언; accent-food/accent-wine/brand 등) | 안정 |
| utils/ | cn, date-format, debounce, exif-parser, fuzzy-match, gauge-color, postgrest-filter (.or() injection 방어 헬퍼, WORKLOG #57) 등 | 안정 |
| types/ | kakao-maps.d.ts | 안정 |

### app/ (라우팅)
- (main)/: 홈(`(main)/page.tsx` — 별도 `home/` 디렉토리 없음), add, bubbles, followers, profile, record, register, restaurants, search, settings, users, wines
- api/: location(1: resolve), places(1: photo — Google Places 사진 프록시, 083 신규), records(1: identify), restaurants(4 active routes: route.ts, search, bounds(genre/district/area 필터 추가), prestige/match + nearby/ 빈 디렉토리 존재), wines(4: route.ts, detail-ai, search, search-ai), import(2: auto-fill, naver-map). accolades route 삭제됨
- auth/: callback, login
- onboarding/, design-system/

## supabase/
- migrations/ (84개 파일, 번호 000~083, 078 중복): 스키마 전체 + RLS + triggers + cron + WSET 아로마 구조 + 버블 트리거 SECURITY DEFINER 수정 + lists→bookmarks 전환(049) + CF 캐시 테이블(051) + CF trigger(052→078 pg_net) + bubble_items(053+054) + restaurant_prestige 리디자인(055) + 058 prestige rename + 059 쿼리 최적화 인덱스(gin/btree) + 061 RPC 함수 4개 + 063 bookmarks DROP + 067 bubble_photos + 068 bubble_shares DROP + 073~078 bubble_items 완전 단순화(source+record_id+added_by DROP, 기록삭제/멤버탈퇴 트리거, 성능 인덱스) + 079 reactions good/bad + 080 comments 비버블 허용 + 081 comments parent_id(대댓글 thread) + 082 security_hardening (records RLS 정렬 + Storage LIST 제거 + bubble_expertise security_invoker + 19함수 search_path + cf trigger GUC 전환) + 083 restaurant_enrichment (AI 요약 캐시 테이블)
- functions/ (7): process-account-deletion, refresh-active-xp, weekly-ranking-snapshot(bubble_items 전환 완료), compute-similarity(CF 증분 갱신), predict-score(단건 CF 예측, JWT+service_role), batch-predict(배치 CF 예측, 최대 50건), enrich-restaurant(회원리뷰 없는 식당 → Tavily+GooglePlaces+Naver+Gemini 1회 요약, photo_name 저장)

## DI 등록 현황 (container.ts)
20개 repo 등록: record, restaurant, wine, photo, xp, notification, bubble, follow, savedFilter, profile, settings, comment, reaction, onboarding, filterState, home, similarity, prediction, bubblePhoto, enrichment (bookmark 제거됨 ※ `types.ts`에 `has_bookmark` 1건 잔존 — types 재생성 대기. `api/import/naver-map`의 bookmark는 네이버 API 필드(bookmarkId/Count)로 도메인과 무관)
+ imageService, uploadBubbleIcon(infrastructure/storage에서 re-export), getSupabaseClient, signInWithProvider, signOutUser

## 알려진 기술 부채
- presentation/components 일부가 대형 파일 (share-rule-editor 등 — home-container, condition-filter-bar는 Phase 5에서 분할 완료)
- 지도뷰 bubbleScore enrichment 미구현 — nearby API에서 항상 null 반환 (Phase 2로 이연)
- 지도뷰 Google Places 별점 캐싱 미구현 — 미매칭 nearby 식당마다 매번 API 호출 (restaurants.google_rating 저장 권장)
