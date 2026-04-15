# CODEBASE.md — Nyam 코드베이스 구조 인덱스

> 새 세션이 1분 안에 코드베이스를 파악하기 위한 문서. 코드 복사 금지 — 구조와 상태만.
> 마지막 갱신: 2026-04-13 (찜(bookmark) 기능 전체 제거)

## 프로젝트 요약
- 맛집/와인 기록 + 소셜(버블) 앱. Next.js App Router + Supabase + Clean Architecture
- 총 ~450개 TS/TSX 파일, 55개 마이그레이션, 6개 Edge Function

## src/ 레이어별 구조

### domain/ (순수 비즈니스 로직, 외부 의존 0)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| entities/ | 34 | 타입 정의 (record, restaurant, wine, bubble, xp, score, calendar, home-target, similarity, map-discovery 등). bookmark.ts 삭제됨. map-discovery.ts: MapDiscoveryItem 등. restaurant.ts: RestaurantPrestige. score.ts: ScoreSource 3종. bubble.ts: BubbleItem (source/recordId 제거됨) | 안정 |
| repositories/ | 19 | 인터페이스 (RecordRepository, BookmarkRepository, BubbleRepository, HomeRepository, SimilarityRepository, PredictionRepository 등). BubbleRepository에 큐레이션 메서드 4개 추가. HomeRepository에 HomeDbFilters 인터페이스 + findHomeTargets dbFilters 파라미터 확장 | 안정 |
| services/ | 19 | 순수 로직 (nyam-score, xp-calculator, bubble-share-sync, filter-matcher, score-fallback, visibility-filter, profile-visibility, cf-calculator, map-cluster 등). filter-query-builder.ts 삭제(dead code — DB RPC로 대체). map-cluster.ts: selectTopN(cascade 소팅), clusterPoints(그리드 기반). cf-calculator 테스트 32개. bubble-share-sync에 evaluateBookmarkTargets, computeItemDiff 추가 | 안정 |
| constants/ | 1 | source-priority.ts (SOURCE_PRIORITY: 'mine'\|'nyam'\|'bubble'\|'bookmark' 4종) | 안정 |

### infrastructure/ (외부 시스템 구현체)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| repositories/ | 19 | Supabase 구현체 (1:1 domain repo 매칭). supabase-home-repository: fetchTargetMeta→RPC(filter_home_restaurants/wines) 전환, HomeDbFilters 지원. supabase-follow-repository: isMutualFollow→RPC, getMutualFollows 병렬화. bubble_shares→bubble_items 전환 완료. supabase-bubble-repository stub→실제 구현 + auto sync 3개 | 안정 |
| supabase/ | 5 | client, server, auth-service, auth-mapper, types | 안정 |
| api/ | 7 | llm, kakao-local, naver-local, google-places, google-image-search, ai-recognition, tavily | 안정 |
| api/providers/ | 1 | gemini.ts (Gemini Vision) | 안정 |
| storage/ | 1 | image-upload.ts | 안정 |

### application/hooks/ (비즈니스 로직 훅, 63개)
- 기록: use-create-record, use-records, use-record-detail, use-calendar-records
- 식당/와인: use-restaurant-detail, use-wine-detail, use-wine-search, use-wine-stats, use-target-scores
- 버블: use-bubble-create, use-bubble-detail, use-bubble-feed, use-bubble-join, use-bubble-members, use-bubble-roles, use-bubble-ranking, use-bubblers-list, use-bubble-items(신규: 수동 큐레이션 CRUD), use-bubble-auto-sync(syncBookmarkToAllBubbles 추가) 등
- 소셜: use-follow, use-follow-list-with-similarity (팔로우 목록+적합도 enrichment), use-comments, use-reactions, use-share-record
- XP/프로필: use-xp, use-xp-award, use-profile, use-wrapped
- 홈: use-home-targets (target 중심 홈뷰, dbFilters/sort 파라미터 추가), use-map-discovery(HomeTarget→MapDiscoveryItem 변환, nearby fetch+merge, 필터/소팅/클러스터링, genre/district/area 추출→bounds API 전달)
- CF: use-nyam-score (단건 CF 예측), use-feed-scores (배치 CF 예측), use-similarity (적합도 조회)
- 기타: use-search, use-notifications, use-onboarding (use-accolades 삭제됨 — restaurants.prestige 캐시로 대체)

### presentation/
| 경로 | 역할 | 상태 |
|------|------|------|
| containers/ (23) | 페이지별 hook+조합 (home, record-flow, bubble-detail 등). restaurant/wine/bubble-detail-container에 "리스트에 추가" 기능. record-flow/add-flow-container에 기록 후 "리스트에 추가". useAccolades 제거 → restaurants.prestige 직접 사용 | 안정 |
| components/ (19 dirs) | 순수 UI. home/map-view.tsx 전면 리디자인(통합 displayResult 기반, createDotHtml/createClusterHtml). home/map-filter-bar.tsx(신규: 3그룹 필터 UI). home/map-compact-item.tsx(신규: 사진 없는 컴팩트 리스트 아이템, 4종 점수 뱃지). ui/prestige-badges.tsx. accolade-badges.tsx 삭제됨 | 안정 |
| hooks/ (3) | UI 전용 (use-back-navigation, use-dropdown, use-referrer) | 안정 |
| providers/ (1) | auth-provider.tsx | 안정 |
| guards/ | 라우트 가드 | 안정 |

### shared/
| 경로 | 역할 | 상태 |
|------|------|------|
| di/container.ts | DI 조합 루트 — 19개 repo + imageService + auth 함수 | 안정 |
| di/auth-mappers.ts | 인증 매퍼 | 안정 |
| constants/ | aroma-sectors, llm-config, navigation, onboarding-seeds, wine-meta | 안정 |
| utils/ | cn, date-format, debounce, exif-parser, fuzzy-match, gauge-color 등 | 안정 |
| types/ | kakao-maps.d.ts | 안정 |

### app/ (라우팅)
- (main)/: home, add, bubbles, profile, record, register, restaurants, search, settings, users, wines
- api/: location(1), records(1), restaurants(4: nearby, search, bounds(genre/district/area 필터 추가), prestige/match), wines(4). accolades route 삭제됨
- auth/: callback, login
- onboarding/, design-system/

## supabase/
- migrations/ (78개, 000~078): 스키마 전체 + RLS + triggers + cron + WSET 아로마 구조 + 버블 트리거 SECURITY DEFINER 수정 + lists→bookmarks 전환(049) + CF 캐시 테이블(051) + CF trigger(052→078 pg_net) + bubble_items(053+054) + restaurant_prestige 리디자인(055) + 058 prestige rename + 059 쿼리 최적화 인덱스(gin/btree) + 061 RPC 함수 4개 + 073~078 bubble_items 완전 단순화(source+record_id+added_by DROP, 기록삭제/멤버탈퇴 트리거, 성능 인덱스)
- functions/ (6): process-account-deletion, refresh-active-xp, weekly-ranking-snapshot(bubble_items 전환 완료), compute-similarity(CF 증분 갱신), predict-score(단건 CF 예측, JWT+service_role), batch-predict(배치 CF 예측, 최대 50건)

## DI 등록 현황 (container.ts)
18개 repo 등록: record, restaurant, wine, photo, xp, notification, bubble, follow, savedFilter, profile, settings, comment, reaction, onboarding, userCoords(hook), home, similarity, prediction (bookmark 제거됨)
+ imageService, uploadBubbleIcon, getSupabaseClient, signInWithProvider, signOutUser

## 알려진 기술 부채
- container.ts에 uploadBubbleIcon 유틸이 DI 파일 안에 있음 (storage로 이동 권장)
- presentation/components 일부가 대형 파일 (share-rule-editor, condition-filter-bar 수정 중)
- visibility-filter/profile-visibility 서비스가 정의만 되어 있음 (사용처 점진 적용 필요)
- supabase/types.ts 재생성 필요 (bookmarks + home + CF 캐시 + bubble_items + 055 prestige + 058 rename + 059 인덱스 + 061 RPC 반영)
- bubble-detail-container.tsx #FFFFFF 하드코딩 4건 (pre-existing)
- search-results.tsx/search-container.tsx의 WineSearchCandidate infrastructure import (pre-existing R4 위반)
- 지도뷰 bubbleScore enrichment 미구현 — nearby API에서 항상 null 반환 (Phase 2로 이연)
- 지도뷰 Google Places 별점 캐싱 미구현 — 미매칭 nearby 식당마다 매번 API 호출 (restaurants.google_rating 저장 권장)
