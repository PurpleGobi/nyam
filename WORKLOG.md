# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-10 #27 — rp → prestige 용어 통일 리팩토링
- **영역**: supabase/migrations/058(신규), domain/(entities/restaurant+home-target+map-discovery+record+search, services/nyam-score+filter-matcher+filter-query-builder), infrastructure/(supabase-restaurant+record+home-repository, supabase/types.ts), app/api/restaurants/(nearby+search+bounds+prestige/match), application/hooks/use-map-discovery, presentation/(prestige-badges, record-card, compact-list-item, map-compact-item, search-result-item, search-results, nearby-list, map-view, home+restaurant-detail-container), middleware.ts, DATA_MODEL.md, CODEBASE.md
- **맥락**: restaurant_rp(reputation) → restaurant_prestige 용어 통일. DB: 테이블/컬럼/인덱스/RLS/트리거/RPC rename. 코드: RestaurantRp→RestaurantPrestige 타입, .rp→.prestige 필드, /api/restaurants/rp/match→/prestige/match 경로. 약 25개 파일 변경. pnpm build PASS.
- **미완료**: 058 마이그레이션 원격 적용, supabase/types.ts 재생성
- **다음**: 마이그레이션 원격 적용, supabase gen types 실행

### 2026-04-09 #26 — 지도뷰 통합 식당 탐색 허브 리디자인
- **영역**: domain/(entities/map-discovery 신규, services/map-cluster 신규), app/api/restaurants/nearby(enrichment 추가), application/hooks/use-map-discovery(신규), presentation/components/home/(map-filter-bar 신규, map-compact-item 신규, map-view 전면 수정), presentation/containers/home-container
- **맥락**: 지도뷰를 "내 기록 뷰어 + nearby 사이드바" 이원 구조에서 통합 식당 탐색 허브로 리디자인. MapDiscoveryItem 단일 타입으로 내 기록+nearby 통합, 4종 점수(내/nyam/버블/구글) cascade 소팅, 3그룹 필터(보기/명성/점수), 그리드 클러스터링, 4px 도트 마커. nearby API에 Nyam DB cross-reference + Google Places enrichment 추가.
- **미완료**: quality-guard(pnpm build/lint) 미실행, 브라우저 QA 미실행, bubbleScore enrichment 미구현(Phase 2), Google Places 별점 캐싱 미구현
- **다음**: pnpm build && pnpm lint 크리티컬 게이트 실행, /myqa 브라우저 QA, bubbleScore Phase 2

### 2026-04-09 #25 — 지도뷰 카카오맵 → Google Maps 전환
- **영역**: presentation/components/home/map-view.tsx, package.json(@googlemaps/js-api-loader, @types/google.maps 추가), .env.local(NEXT_PUBLIC_GOOGLE_MAPS_KEY)
- **맥락**: 카카오맵 기본 POI 라벨(상호명 등)이 커스텀 마커와 겹쳐 가독성 저하. 카카오맵 SDK는 POI 숨기기 미지원 → Google Maps JavaScript API로 지도 렌더링 교체. Styled Maps로 POI/교통 라벨 off. OverlayView 기반 팩토리 함수로 커스텀 오버레이 구현. 한글화(language:'ko', region:'KR'). 카카오 REST API(nearby/search)는 그대로 유지.
- **미완료**: 없음
- **다음**: 브라우저 QA, Google Cloud Console에서 Maps JavaScript API 활성화 확인 (이미 완료)

### 2026-04-09 #24 — RP(Reputation) 시스템 리디자인: restaurant_accolades → restaurant_rp
- **영역**: supabase/migrations/055, domain/(entities/restaurant+home-target+record+search, services/nyam-score+filter-matcher+filter-query-builder), infrastructure/(supabase-restaurant+record+home-repository), presentation/(prestige-badges 신규, record-card+compact-list-item+map-view+search-results+search-result-item+nearby-list, home+restaurant-detail+search-container), app/api/(rp/match 신규, nearby+search route 수정, accolades 삭제), use-accolades+accolade-badges 삭제, DATA_MODEL.md 갱신
- **맥락**: restaurant_accolades 테이블→restaurant_rp 리디자인. restaurants 테이블에 rp JSONB 캐시 컬럼 추가(michelin_stars/has_blue_ribbon/media_appearances 삭제). 매칭 프로세스 API(카카오 연동). UI AccoladeBadges→PrestigeBadges 전환. 전 레이어 28개 파일 변경. pnpm build PASS.
- **미완료**: 055 마이그레이션 원격 적용, supabase/types.ts 재생성, CODEBASE.md 갱신, map-view.tsx hooks 위반은 수정 완료
- **다음**: 마이그레이션 원격 적용, types 재생성, 매칭 API 실제 테스트

### 2026-04-08 #23 — 버블 큐레이션 리스트 리팩토링 Phase 1~5 전체 완료
- **영역**: domain/(entities/bubble, repositories/bubble-repository, services/bubble-share-sync), infrastructure/(supabase-bubble/restaurant/wine/home/profile-repository), application/(use-bubble-items 신규, use-bubble-auto-sync, use-bookmark), presentation/(add-to-bubble-sheet+add-item-search-sheet 신규, share-rule-editor, restaurant/wine/bubble-detail-container, record-flow/add-flow-container), supabase/(migrations/053+054, functions/weekly-ranking-snapshot), development_docs/systems/XP_SYSTEM.md
- **맥락**: Phase 1(DB+Domain) → Phase 2(domain 서비스 확장+stub 실제 구현+auto sync 3메서드) → Phase 3(hooks: syncBookmarkToAllBubbles, onBubbleSync 콜백) → Phase 4(UI: 수동 리스트 추가 시트, includeBookmarks 토글, 상세/기록 후 리스트 추가) → Phase 5(bubble_shares→bubble_items 전환, Edge Function 전환, 054 triggers 마이그레이션, 용어 갱신). 크리티컬 게이트 전체 PASS.
- **미완료**: 053/054 마이그레이션 원격 적용, Edge Function 배포, supabase/types.ts 재생성, bubble-detail-container.tsx #FFFFFF 하드코딩 4건(pre-existing)
- **다음**: 마이그레이션 원격 적용, Edge Function 배포, types 재생성

### 2026-04-08 #20 — 엑셀 자동 채우기 + Import upsert
- **영역**: app/api/import/auto-fill(신규), infrastructure/supabase-settings-repository(import upsert+템플릿 수정), application/use-settings(autoFillFile), presentation/settings-container(Wand2 버튼)
- **맥락**: (1) 템플릿 수정: scene dropdown(식당 6종/와인 7종), price_range 설명, axis_y→경험 만족도, 와인 aroma~intensity 자동검색 표시. (2) /api/import/auto-fill: 엑셀 업로드→카카오검색(식당)+AI상세검색(와인)→채워진 엑셀 반환. (3) importData upsert: Excel 시트별 restaurant/wine findOrCreate+record insert. (4) 설정 UI "엑셀 자동 채우기" 버튼.
- **미완료**: 브라우저 QA 미실행
- **다음**: 시드 데이터 준비, 브라우저 QA

### 2026-04-08 #19 — 데이터 가져오기 Excel 템플릿 + Dropdown
- **영역**: domain/repositories/settings-repository, infrastructure/supabase-settings-repository, application/hooks/use-settings, presentation/containers/settings-container, package.json(exceljs 추가)
- **맥락**: (1) exceljs로 import 템플릿 생성: 식당/와인 2시트, 헤더+설명행+예시3건, dropdown(genre 16종, wine_type 7종, meal_time, price_range), 범위검증(0~100), 자동검색 컬럼 연녹색 표시, 쉼표구분 컬럼 셀 코멘트 안내. (2) 설정 데이터 섹션에 "입력 템플릿 다운로드" 버튼 추가(FileSpreadsheet 아이콘). (3) generateImportTemplate() domain 인터페이스+구현+hook+UI 연결.
- **미완료**: 없음 (다음 커밋에서 완료)
- **다음**: 완료

### 2026-04-08 #18 — 위치 필터칩 UX 수정 + Excel 가져오기
- **영역**: presentation/components/home/condition-filter-bar, infrastructure/supabase-settings-repository, presentation/containers/settings-container, package.json
- **맥락**: (1) 위치 필터 도시 칩: 쉐브론→X 표시(최상위 필터), X 클릭 시 전체 location 그룹 제거, 편집 팝오버 '전체' 옵션 제거. (2) 설정 데이터 가져오기에 Excel(.xlsx/.xls) 지원 추가(xlsx 패키지).
- **미완료**: 없음
- **다음**: 브라우저 QA

### 2026-04-07 #17 — DB_v4 타겟 중심 홈뷰 리팩토링
- **영역**: domain/(entities/home-target 신규, repositories/home-repository 신규, services/filter-matcher, entities/grouped-target 삭제, services/record-grouper 삭제), infrastructure/supabase-home-repository 신규, application/hooks/(use-home-targets 신규, use-home-records 삭제), shared/di/container.ts(homeRepo 등록), presentation/home-container, infrastructure/supabase-record-repository(findHomeRecords+가상row 제거)
- **맥락**: 홈뷰 데이터 모델을 record 중심→target(restaurant/wine) 중심으로 전환. HomeTarget 엔티티+HomeRepository 인터페이스+7단계 파이프라인 Supabase 구현체 신규. 가상 row(bookmark-xxx, cellar-xxx) 완전 제거. groupRecordsByTarget()+GroupedTarget 삭제. 찜/셀러만 있는 대상이 자연스럽게 HomeTarget으로 존재.
- **미완료**: 브라우저 QA 미실행, supabase/types.ts 재생성 필요
- **다음**: 브라우저 QA 실행, supabase gen types 실행


### 2026-04-08 #18 — CF 시스템 Phase 1: 도메인 계층 + DB 테이블
- **영역**: domain/entities/similarity.ts(신규), domain/services/cf-calculator.ts(신규), domain/services/__tests__/cf-calculator.test.ts(신규), supabase/migrations/051_cf_tables.sql(신규), vitest.config.ts(신규)
- **맥락**: CF_SYSTEM.md 스펙 기반 협업 필터링 순수 계산 서비스 구현. 타입 7개 + 상수 10개 + 함수 8개 + 테스트 32개. user_similarities/user_score_means 캐시 테이블 + RLS. 기존 파일 수정 없음.
- **미완료**: ScoreSource에 'cf' 추가 + SOURCE_PRIORITY 통합은 Phase 5로 이연 (사용처 10+ 파일), supabase/types.ts 재생성 필요, 051 마이그레이션 원격 적용 필요
- **다음**: Phase 2 증분 업데이트 파이프라인 (Edge Function), supabase gen types 실행



