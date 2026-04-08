# CODEBASE.md — Nyam 코드베이스 구조 인덱스

> 새 세션이 1분 안에 코드베이스를 파악하기 위한 문서. 코드 복사 금지 — 구조와 상태만.
> 마지막 갱신: 2026-04-08 (버블 큐레이션 리스트 Phase 1~5 전체 완료)

## 프로젝트 요약
- 맛집/와인 기록 + 소셜(버블) 앱. Next.js App Router + Supabase + Clean Architecture
- 총 ~450개 TS/TSX 파일, 54개 마이그레이션, 6개 Edge Function

## src/ 레이어별 구조

### domain/ (순수 비즈니스 로직, 외부 의존 0)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| entities/ | 34 | 타입 정의 (record, restaurant, wine, bubble, xp, score, calendar, bookmark, home-target, similarity 등). grouped-target 삭제됨. score.ts: ScoreSource 3종('mine'\|'nyam'\|'bubble'), TargetScores.nyam에 confidence 추가. bubble.ts: BubbleItem, BubbleItemSource 타입 추가 | 안정 |
| repositories/ | 19 | 인터페이스 (RecordRepository, BookmarkRepository, BubbleRepository, HomeRepository, SimilarityRepository, PredictionRepository 등). BubbleRepository에 큐레이션 메서드 4개 추가(addItem/removeItem/getItems/isItemInBubble) | 안정 |
| services/ | 19 | 순수 로직 (nyam-score, xp-calculator, bubble-share-sync, filter-matcher, score-fallback, visibility-filter, profile-visibility, cf-calculator 등). record-grouper 삭제됨. cf-calculator 테스트 32개 (vitest). bubble-share-sync에 evaluateBookmarkTargets, computeItemDiff 추가 | 안정 |
| constants/ | 1 | source-priority.ts (SOURCE_PRIORITY: 'mine'\|'nyam'\|'bubble'\|'bookmark' 4종) | 안정 |

### infrastructure/ (외부 시스템 구현체)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| repositories/ | 19 | Supabase 구현체 (1:1 domain repo 매칭, supabase-bookmark-repository, supabase-home-repository, supabase-similarity-repository, supabase-prediction-repository 추가). supabase-bubble/restaurant/wine/home/profile-repository: bubble_shares→bubble_items 전환 완료. supabase-bubble-repository stub 4개→실제 구현 + auto sync 메서드 3개 추가 | 안정 |
| supabase/ | 5 | client, server, auth-service, auth-mapper, types | 안정 |
| api/ | 7 | llm, kakao-local, naver-local, google-places, google-image-search, ai-recognition, tavily | 안정 |
| api/providers/ | 1 | gemini.ts (Gemini Vision) | 안정 |
| storage/ | 1 | image-upload.ts | 안정 |

### application/hooks/ (비즈니스 로직 훅, 63개)
- 기록: use-create-record, use-records, use-record-detail, use-calendar-records
- 식당/와인: use-restaurant-detail, use-wine-detail, use-wine-search, use-wine-stats, use-target-scores
- 찜/셀러: use-bookmark (onBubbleSync 콜백 추가)
- 버블: use-bubble-create, use-bubble-detail, use-bubble-feed, use-bubble-join, use-bubble-members, use-bubble-roles, use-bubble-ranking, use-bubblers-list, use-bubble-items(신규: 수동 큐레이션 CRUD), use-bubble-auto-sync(syncBookmarkToAllBubbles 추가) 등
- 소셜: use-follow, use-follow-list-with-similarity (팔로우 목록+적합도 enrichment), use-comments, use-reactions, use-share-record
- XP/프로필: use-xp, use-xp-award, use-profile, use-wrapped
- 홈: use-home-targets (use-home-records 대체, target 중심 홈뷰)
- CF: use-nyam-score (단건 CF 예측), use-feed-scores (배치 CF 예측), use-similarity (적합도 조회)
- 기타: use-search, use-notifications, use-onboarding

### presentation/
| 경로 | 역할 | 상태 |
|------|------|------|
| containers/ (23) | 페이지별 hook+조합 (home, record-flow, bubble-detail 등). restaurant/wine/bubble-detail-container에 "리스트에 추가" 기능. record-flow/add-flow-container에 기록 후 "리스트에 추가" | 안정 |
| components/ (19 dirs) | 순수 UI (add-flow, bubble, camera, charts, detail, home, record, search 등) + score-source-badge (discover 제거) + similarity-indicator. detail/에 confidence-badge, score-breakdown-panel 추가. bubble/에 add-to-bubble-sheet, add-item-search-sheet 신규. share-rule-editor에 includeBookmarks 토글 추가 | 안정, 일부 WIP |
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
- api/: location(1), records(1), restaurants(3), wines(4)
- auth/: callback, login
- onboarding/, design-system/

## supabase/
- migrations/ (54개, 000~054): 스키마 전체 + RLS + triggers + cron + WSET 아로마 구조 + 버블 트리거 SECURITY DEFINER 수정 + lists→bookmarks 전환(049) + CF 캐시 테이블(051) + CF trigger(052: records→compute-similarity Edge Function 호출) + bubble_items 테이블+RLS+데이터 이관(053) + bubble_items triggers(054: 자동 동기화 트리거)
- functions/ (6): process-account-deletion, refresh-active-xp, weekly-ranking-snapshot(bubble_items 전환 완료), compute-similarity(CF 증분 갱신), predict-score(단건 CF 예측, JWT+service_role), batch-predict(배치 CF 예측, 최대 50건)

## DI 등록 현황 (container.ts)
19개 repo 모두 등록 완료: record, restaurant, wine, photo, xp, notification, bubble, follow, savedFilter, bookmark, profile, settings, comment, reaction, onboarding, userCoords(hook), home, similarity, prediction
+ imageService, uploadBubbleIcon, getSupabaseClient, signInWithProvider, signOutUser

## 알려진 기술 부채
- container.ts에 uploadBubbleIcon 유틸이 DI 파일 안에 있음 (storage로 이동 권장)
- presentation/components 일부가 대형 파일 (share-rule-editor, condition-filter-bar 수정 중)
- visibility-filter/profile-visibility 서비스가 정의만 되어 있음 (사용처 점진 적용 필요)
- supabase/types.ts 재생성 필요 (bookmarks + home + CF 캐시 테이블 + bubble_items + 054 triggers 반영)
- bubble-detail-container.tsx #FFFFFF 하드코딩 4건 (pre-existing)
