# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-20 #58 — 회원 리뷰 없는 식당용 AI 외부 정보 요약 + Google Places 사진 폴백
- **영역**: supabase/migrations/083_restaurant_enrichment.sql(신규 테이블+RLS+trigger), supabase/functions/enrich-restaurant/index.ts(신규 Edge Function), src/domain/entities/restaurant-enrichment.ts(신규), src/domain/repositories/enrichment-repository.ts(신규), src/infrastructure/repositories/supabase-enrichment-repository.ts(신규), src/shared/di/container.ts(enrichmentRepo 등록), src/application/hooks/use-restaurant-enrichment.ts(신규, 폴링 3초), src/app/api/places/photo/route.ts(신규, Google Places Photo 프록시 302), src/presentation/components/detail/info-enrichment-block.tsx(신규, AI 요약 카드+source 칩), src/presentation/containers/restaurant-detail-container.tsx(heroPhotos 폴백 체인 + 정보 섹션 블록 통합), development_docs/systems/DATA_MODEL.md + CODEBASE.md 갱신
- **맥락**: 카카오 시드만 있고 회원 리뷰 없는 식당의 상세 페이지가 정보 공백 문제 해결. Edge Function이 Tavily+Google Places(New v1)+Naver Local을 병렬 수집 → Gemini 1회 호출로 pros/cons/atmosphere/price_range/signatures 생성 + 각 claim에 source_ids 필수. 원문 전재 금지, 20자 인용 제한, 30일 TTL 캐싱. 사진은 Google Places photo_name만 저장 → /api/places/photo 프록시가 photoUri 받아 302 redirect(키 노출 방지). UI는 기존 정보 섹션 하단에 AI 카드 + 전체 출처 아코디언 + "📸 사진 출처: Google" attribution. migration 083 적용 + Edge Function version 1 ACTIVE 배포 완료. 빌드 통과.
- **미완료**: 실제 호출 QA (enrichment 결과 품질 확인), 에지케이스(Google Places ID 매칭 실패/Gemini 응답 오류), 비용 모니터링 세팅
- **다음**: 브라우저 QA로 실제 식당 상세 진입 테스트 + 결과물 확인

### 2026-04-20 #57 — 보안 종합 감사(/cso comprehensive) 후속 패치 일괄
- **영역**: middleware.ts, src/app/api/restaurants/prestige/match, supabase/functions/{process-account-deletion,refresh-active-xp,compute-similarity}/index.ts, supabase/config.toml, src/app/api/import/naver-map, src/shared/utils/postgrest-filter.ts(신규), src/{app/api/wines,restaurants,records}/* + 4 repository (.or() escape 7곳), src/app/api/import/auto-fill (xlsx→exceljs), src/infrastructure/repositories/supabase-settings-repository.ts (xlsx→exceljs), src/app/api/wines/{detail-ai,search-ai}/route.ts (input length cap), src/app/api/records/identify/route.ts (imageUrl host allowlist), src/infrastructure/api/ai-recognition.ts (AI 응답 sanitize), next.config.ts (CSP+headers), .env.example 전면 재작성, package.json (xlsx 제거), supabase/migrations/082_security_hardening.sql (records RLS 스펙 정렬 + storage list 정책 제거 + bubble_expertise security_invoker + 19 함수 search_path + cf trigger GUC 패턴)
- **맥락**: cso 리포트(.gstack/security-reports/2026-04-20-comprehensive.json) CRITICAL 5건/HIGH 6건/MEDIUM 5건/INFO 1건 중 키 회전 외 모두 처리. records_authenticated_read(qual=true) 제거 → AUTH.md §4-5 스펙(public/followers/bubble_member) 정상 적용. searchUsers email 필터 제거(컬럼 비노출). naver-map SSRF substring→hostname allowlist + manual redirect 3hop. PostgREST `.or()` filter injection 방어 helper + 7곳. xlsx (RCE/ReDoS, no patch) 완전 제거. AI 응답 길이/range/enum sanitize. Supabase advisor 26→4건(잔여 4건은 PostGIS 시스템/대시보드 토글)
- **미완료** (사용자 수동):
  1. **키 회전(필수)**: Supabase service_role / KAKAO_REST_API_KEY (둘 다 git history 노출, KAKAO는 현재 키와 동일). 회전 후 Vercel 환경변수 갱신
  2. **GUC 설정**: 키 회전 후 Supabase SQL Editor에서 `ALTER DATABASE postgres SET app.supabase_url TO 'https://gfshmpuuafjvwsgrxnie.supabase.co'; ALTER DATABASE postgres SET app.service_role_key TO '<new key>';`
  3. **.env.local 정리**: `NEXT_PUBLIC_NAVER_MAP_CLIENT_SECRET`(40자) 삭제, `NAVER_MAP_CLIENT_SECRET`로 리네임. `NEXT_PUBLIC_NAVER_CLIENT_ID`/`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 둘 중 사용하는 쪽만 유지
  4. **Supabase 대시보드**: Auth → Password security → "Check leaked passwords" 활성화 (HIBP)
  5. **Supabase 대시보드 Functions**: process-account-deletion / refresh-active-xp / compute-similarity / weekly-ranking-snapshot / batch-predict / predict-score 모두 verify_jwt = true 확인 (config.toml 명시했지만 대시보드 재배포 필요)
  6. **Vercel 환경변수**: `PRESTIGE_MATCH_CRON_SECRET` 신규 추가 (Vercel Cron으로 호출 시 Authorization: Bearer {value}). NEXT_PUBLIC_GOOGLE_MAPS_KEY는 GCP Console에서 referer 도메인 잠금 확인
  7. **Edge functions 재배포**: 코드 변경됨 → `supabase functions deploy process-account-deletion refresh-active-xp compute-similarity` 실행
- **다음**: 위 7개 수동 항목 사용자 처리 후 advisor 재검증

### 2026-04-20 #56 — 문서 체계 대정리: SSOT 10개 재구성 + _archive 분리
- **영역**: development_docs/systems/ (전체), development_docs/*.md (구조), _archive/ (신규), CLAUDE.md, CODEBASE.md
- **맥락**: (1) 폴더 정리 — prototype/refactoring/pages/implementation(phases,handoff,shared)/개념문서/research/simulations/system_brainstorming 전부 `_archive/`로 이동. docs/ 폴더 제거. (2) SSOT 확장 7→10개 — RATING_ENGINE→RECORD_SYSTEM(3-Phase+AI 리뷰 추가), BUBBLE_SYSTEM(신규, 자동공유 필터+랭킹), SOCIAL_SYSTEM(신규, 팔로우+댓글+리액션+알림), MAP_LOCATION(신규, 생활권+Google Maps+크롤링). (3) 기존 SSOT 전면 정합성 갱신 — DATA_MODEL(bubble_shares제거/bubble_items신규/bookmarks제거/comments.parent_id/bubble_photos), AUTH(RLS 60→69개), XP_SYSTEM(RP→Prestige 흡수), RECOMMENDATION(CF 알고리즘 정식 문서화), QUERY_OPTIMIZATION(인덱스/RPC 카탈로그), DESIGN_SYSTEM(--text-inverse, @theme 매핑 재작성). (4) 코드/개념문서 불일치 발견 기록 — CF가 Pearson/Cosine 아닌 Mean-centering+2D 유클리드, 지도는 카카오맵 아닌 Google Maps, wines.critic_scores "RP"는 Robert Parker. (5) CLAUDE.md 참조 문서 맵/프로젝트 구조 갱신.
- **미완료**: 페이지별 스펙은 iOS 이식 시 당시 코드 기준 재작성 예정 (지금 만들어도 계속 변경됨). types.ts는 081 이후 재생성 필요 (DATA_MODEL에 주석)
- **다음**: 커밋 + 이후 작업은 새 SSOT 체계로 진행

### 2026-04-16 #55 — 통계 페이지 UI 전면 개선 + 데이터 부족 안내 일관화
- **영역**: presentation/components/home(home-stats-panel, pd-lock-overlay, world-map-chart, wine-type-chart, monthly-chart), presentation/containers/home-container
- **맥락**: (1) 통계 모드 진입 시 필터/소팅/목록 숨김(캘린더 모드 패턴). (2) SummaryCard(요약 그리드)+SectionCard(아이콘+타이틀 카드)+로딩 스켈레톤+StatsEmpty 추가. (3) PdLockOverlay 하드코딩 rgba→디자인 토큰(다크모드 호환)+진행 상태 표시. (4) 통계 아이콘 임계값 5→1 완화(와인 탭 노출). (5) WorldMapChart/WineTypeChart/MonthlyChart 자체 카드·라벨 중복 제거.
- **미완료**: 없음
- **다음**: 브라우저 QA

### 2026-04-16 #54 — 기록 섹션 통합 + 댓글 thread + 리액션 실시간 동기화
- **영역**: domain(comment parentId), infrastructure(supabase-comment/reaction-repo), application(use-comments, use-reactions, use-record-reactions, use-record-comment-counts, use-all-target-records), presentation(all-records-section, all-record-card, comment-list, comment-input, comment-sheet-container, restaurant/wine-detail-container), supabase/migrations/079-081
- **맥락**: (1) 식당/와인 상세에서 "나의 기록"+"모든 기록" → "기록" 섹션 통합(필터칩 전환, 디폴트 "나의 기록"). (2) 리액션 good/bad 상호배타 + 자기글 비활성화. (3) 댓글: 비버블 RLS 허용, 작성자 닉/핸들 표시, 대댓글 thread(parent_id). (4) 바텀시트↔카드 리액션/댓글카운트 실시간 동기화(syncReaction, onCommentCountChange). 33파일 변경.
- **미완료**: 댓글별 좋아요 DB 연동 미구현(로컬 토글만)
- **다음**: 브라우저 QA

### 2026-04-16 #53 — 버블 피드 댓글 + 리액션(good/bad) 기능 구현
- **영역**: domain(reaction, xp), infrastructure(supabase-reaction/bubble/xp-repo), application(use-reactions, use-social-xp, use-bubble-feed), presentation(reaction-buttons, feed-card, comment-list, bubble-settings, bubble-detail-container, comment-sheet-container), supabase/migrations/079
- **맥락**: 기존 want/check/fire/like/bookmark 5종 리액션을 good/bad 2종으로 완전 교체. 버블 피드에서 CompactListItem 탭 → 개별 기록 드릴다운 BottomSheet 추가. 각 기록에 good/bad 리액션 + 말풍선 아이콘(댓글 수) → CommentSheetContainer 연결. 버블 설정에 "댓글 허용" 토글 복원. 총 17개 파일 수정/생성.
- **미완료**: 댓글별 좋아요 구조적 한계(comment-sheet-container targetId 이슈), N+1 쿼리 최적화(batch API)
- **다음**: SSOT 문서 갱신(DATA_MODEL.md, 08_BUBBLE.md), 브라우저 QA

### 2026-04-16 #52 — 대형 파일 분할 + 기타 정비 (Phase 5+6)
- **영역**: presentation/containers/home-container.tsx, presentation/components/home/condition-filter-bar.tsx, infrastructure/storage, shared/di, supabase/types.ts
- **맥락**: home-container.tsx(1,525→1,120줄, -27%) 4파일 분할: use-bubble-select-mode.ts, use-home-filter-chips.ts, home-stats-panel.tsx, bubble-tab-content.tsx. condition-filter-bar.tsx(1,361→~230줄, -83%) 3파일 분할: filter-popover.tsx, use-condition-chip-handlers.ts, filter-popover-group.tsx. uploadBubbleIcon을 shared/di→infrastructure/storage로 이동. supabase/types.ts 재생성.
- **미완료**: 없음
- **다음**: 남은 기술 부채 점검

### 2026-04-15 #51 — 하드코딩 색상 정리 (Phase 4)
- **영역**: globals.css, presentation/components 및 containers 68파일
- **맥락**: globals.css에 `--text-inverse: #FFFFFF` 토큰 추가. 68파일에서 #FFFFFF/#fff/bg-white/text-white → 디자인 토큰 교체 (color: var(--text-inverse), text-text-inverse, bg-elevated 등 120건+). rgba 반투명 오버레이, 브랜드 SVG, 카카오맵 인라인은 제외. pre-existing lint 에러(bubble-settings-container useRef) 수정. pnpm build/lint 통과.
- **미완료**: 없음
- **다음**: 남은 기술 부채 점검

### 2026-04-15 #50 — Dead Code 제거 (Phase 3)
- **영역**: domain/services 5파일 삭제, application/hooks 5파일 삭제, shared/utils/distance.ts, package.json
- **맥락**: 미사용 domain services 5개(map-cluster, nyam-score, onboarding-xp, profile-visibility, visibility-filter) 삭제. 미사용 application hooks 5개(use-bubble-permissions, use-bubblers-list, use-onboarding, use-onboarding-bubbles, use-onboarding-restaurants) 삭제. haversineDistance 중복 4곳 제거 → distance.ts에 haversineDistanceMeters 통합. @base-ui/react, tw-animate-css 제거, shadcn devDeps 이동. 순 삭제 -808줄.
- **미완료**: 없음
- **다음**: 남은 기술 부채 점검

### 2026-04-15 #49 — 타입 안전성 수정 (non-null assertion 57건 + as any 1건 제거)
- **영역**: presentation 8파일, infrastructure 4파일, app/api 1파일
- **맥락**: non-null assertion(!) 57건을 ?? defaultValue 또는 early guard로 교체. as any 1건을 RecordRow 타입으로 교체. useCallback deps 누락 lint 경고 2건 수정. pnpm build/lint 통과.
- **미완료**: 없음
- **다음**: 남은 기술 부채 점검

### 2026-04-15 #48 — Clean Architecture R3/R4 위반 수정
- **영역**: domain/entities/wine.ts, application 2파일, presentation 2파일, app/api 1파일, presentation/containers/bubble-create-container.tsx
- **맥락**: WineSearchCandidate를 infrastructure→domain으로 이동하여 R3/R4 위반 해소. bubble-create-container에서 shared/di 직접 import 제거 → useBubbleCreate.updateBubble hook 래핑. R3 위반 2→0건, R4 위반 3→0건.
- **미완료**: 없음
- **다음**: 타입 안전성 수정

