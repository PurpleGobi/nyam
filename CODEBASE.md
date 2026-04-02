# CODEBASE.md — Nyam 코드베이스 구조 인덱스

> 새 세션이 1분 안에 코드베이스를 파악하기 위한 문서. 코드 복사 금지 — 구조와 상태만.
> 마지막 갱신: 2026-04-02

## 프로젝트 요약
- 맛집/와인 기록 + 소셜(버블) 앱. Next.js App Router + Supabase + Clean Architecture
- 총 ~440개 TS/TSX 파일, 42개 마이그레이션, 3개 Edge Function

## src/ 레이어별 구조

### domain/ (순수 비즈니스 로직, 외부 의존 0)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| entities/ | 30 | 타입 정의 (record, restaurant, wine, bubble, xp 등) | 안정 |
| repositories/ | 15 | 인터페이스 (RecordRepository, BubbleRepository 등) | 안정 |
| services/ | 16 | 순수 로직 (nyam-score, xp-calculator, bubble-share-sync, filter-matcher 등) | 안정 |

### infrastructure/ (외부 시스템 구현체)
| 경로 | 파일 수 | 역할 | 상태 |
|------|---------|------|------|
| repositories/ | 15 | Supabase 구현체 (1:1 domain repo 매칭) | 안정 |
| supabase/ | 5 | client, server, auth-service, auth-mapper, types | 안정 |
| api/ | 7 | llm, kakao-local, naver-local, google-places, google-image-search, ai-recognition, tavily | 안정 |
| api/providers/ | 1 | gemini.ts (Gemini Vision) | 안정 |
| storage/ | 1 | image-upload.ts | 안정 |

### application/hooks/ (비즈니스 로직 훅, 57개)
- 기록: use-create-record, use-records, use-record-detail, use-calendar-records
- 식당/와인: use-restaurant-detail, use-wine-detail, use-wine-search, use-wine-stats
- 버블: use-bubble-create, use-bubble-detail, use-bubble-feed, use-bubble-join, use-bubble-members, use-bubble-roles, use-bubble-ranking 등
- 소셜: use-follow, use-comments, use-reactions, use-share-record
- XP/프로필: use-xp, use-xp-award, use-profile, use-wrapped
- 기타: use-discover, use-home-records, use-search, use-notifications, use-onboarding

### presentation/
| 경로 | 역할 | 상태 |
|------|------|------|
| containers/ (23) | 페이지별 hook+조합 (home, record-flow, bubble-detail 등) | 안정 |
| components/ (20 dirs) | 순수 UI (add-flow, bubble, camera, charts, detail, discover, home, record, search 등) | 안정, 일부 WIP |
| hooks/ (3) | UI 전용 (use-back-navigation, use-dropdown, use-referrer) | 안정 |
| providers/ (1) | auth-provider.tsx | 안정 |
| guards/ | 라우트 가드 | 안정 |

### shared/
| 경로 | 역할 | 상태 |
|------|------|------|
| di/container.ts | DI 조합 루트 — 15개 repo + imageService + auth 함수 | 안정 |
| di/auth-mappers.ts | 인증 매퍼 | 안정 |
| constants/ | aroma-sectors, llm-config, navigation, onboarding-seeds, wine-meta | 안정 |
| utils/ | cn, date-format, debounce, exif-parser, fuzzy-match, gauge-color 등 | 안정 |
| types/ | kakao-maps.d.ts | 안정 |

### app/ (라우팅)
- (main)/: home, add, bubbles, discover, profile, record, register, restaurants, search, settings, users, wines
- api/: discover(5), location(1), records(1), restaurants(3), wines(4)
- auth/: callback, login
- onboarding/, design-system/

## supabase/
- migrations/ (42개, 000~041): 스키마 전체 + RLS + triggers + cron + WSET 아로마 구조
- functions/ (3): process-account-deletion, refresh-active-xp, weekly-ranking-snapshot

## DI 등록 현황 (container.ts)
15개 repo 모두 등록 완료: record, restaurant, wine, photo, xp, notification, bubble, follow, savedFilter, discover, profile, settings, comment, reaction, onboarding
+ imageService, uploadBubbleIcon, getSupabaseClient, signInWithProvider, signOutUser

## 알려진 기술 부채
- orchestration/ 문서 5개 삭제 상태 (MASTER_TRACKER, CURRENT_SPRINT 등)
- container.ts에 uploadBubbleIcon 유틸이 DI 파일 안에 있음 (storage로 이동 권장)
- presentation/components 일부가 대형 파일 (share-rule-editor, condition-filter-bar 수정 중)
