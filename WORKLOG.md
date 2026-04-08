# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

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

### 2026-04-07 #16 — 데이터 필터링 체계 전면 리팩토링
- **영역**: domain/(entities/bookmark, constants/source-priority, services/visibility-filter+profile-visibility, repositories/bookmark-repository), infrastructure/(supabase-bookmark-repository, supabase-record-repository 대규모 정리), application/(use-bookmark, use-home-records, use-target-scores, use-reactions), presentation/(restaurant/wine-detail-container, home-container, filter-config, condition-filter-bar), supabase/migrations/049, supabase/functions/process-account-deletion
- **맥락**: lists 테이블 제거 → bookmarks 독립 테이블. SOURCE_PRIORITY 중앙화(5곳→1곳). ScoreSource 'my'→'mine', 'nyam'→'public' 통일. ViewType에 tasted/cellar/unrated 추가. 사분면 소스간 dedup. visibility/profile-visibility 서비스 신규. 계정 삭제 wishlists→bookmarks.
- **미완료**: visibility-filter/profile-visibility는 정의만 (사용처 점진 적용 필요), supabase/types.ts 재생성 필요
- **다음**: visibility 서비스 사용처 적용, supabase gen types 실행

### 2026-04-07 #15 — 상세페이지/카드뷰 통일 + 찜 기능 재설계
- **영역**: presentation/containers/(restaurant-detail, wine-detail, home), components/(record-card, wine-card, home-tabs, hero-carousel, bookmark-button), application/hooks/(use-bookmark, use-restaurant-detail, use-wine-detail, use-home-records), domain/(record, record-repository), infrastructure/supabase-record-repository, supabase/migrations/048
- **맥락**: (1) 상세페이지 섹션 순서 통일(뱃지→스코어카드→사분면→기록→버블). (2) 카드뷰: 높이 170px 통일, 최신기록일+횟수를 점수 아래 소스우선순위 기반 표시, 와인 meta 빈티지·국가·품종, 식당 거리(km). (3) 히어로 사진: 소스 우선순위(나→팔로잉→공개) 최신 사진. (4) 찜: lists.is_bookmarked boolean 추가, status와 독립 동작, wishlist→bookmark 네이밍 통일. (5) 홈: 지도↔뷰모드 아이콘 순서 교체, 캘린더뷰 통계 유지. (6) discover 모듈 제거.
- **미완료**: 브라우저 QA 미실행, wine text-white 2건 잔존
- **다음**: 브라우저 수동 QA, 와인 외부평점 BadgeRow 통합 검토


### 2026-04-08 #18 — CF 시스템 Phase 1: 도메인 계층 + DB 테이블
- **영역**: domain/entities/similarity.ts(신규), domain/services/cf-calculator.ts(신규), domain/services/__tests__/cf-calculator.test.ts(신규), supabase/migrations/051_cf_tables.sql(신규), vitest.config.ts(신규)
- **맥락**: CF_SYSTEM.md 스펙 기반 협업 필터링 순수 계산 서비스 구현. 타입 7개 + 상수 10개 + 함수 8개 + 테스트 32개. user_similarities/user_score_means 캐시 테이블 + RLS. 기존 파일 수정 없음.
- **미완료**: ScoreSource에 'cf' 추가 + SOURCE_PRIORITY 통합은 Phase 5로 이연 (사용처 10+ 파일), supabase/types.ts 재생성 필요, 051 마이그레이션 원격 적용 필요
- **다음**: Phase 2 증분 업데이트 파이프라인 (Edge Function), supabase gen types 실행

### 2026-04-08 #19 — CF Phase 2: 증분 업데이트 파이프라인
- **영역**: domain/repositories/similarity-repository.ts(신규), infrastructure/repositories/supabase-similarity-repository.ts(신규), shared/di/container.ts(수정), supabase/functions/compute-similarity(신규), supabase/migrations/052_cf_trigger.sql(신규)
- **맥락**: records INSERT/UPDATE/DELETE 시 DB trigger → Edge Function → user_score_means 갱신 + user_similarities 증분 재계산. SimilarityRepository 읽기 전용 인터페이스(3메서드) + Supabase 구현체. UPDATE 평가 철회 분기(plan-reviewer 1회차 수정), any/! assertion 제거(quality-guard 2회차 수정).
- **미완료**: Edge Function 배포 + 동작 테스트 (로컬에서만 작성, supabase 원격 미적용), supabase/types.ts 재생성 필요
- **다음**: Phase 3 predict-score Edge Function, supabase gen types 실행

### 2026-04-08 #21 — CF Phase 4: 새 훅 + UI 컴포넌트
- **영역**: application/hooks/(use-nyam-score, use-feed-scores, use-similarity 신규), presentation/components/(detail/confidence-badge, detail/score-breakdown-panel 신규, similarity-indicator 신규, detail/bubble-expand-panel 수정)
- **맥락**: CF 예측/적합도 훅 3개 + 확신도 배지/점수 근거 패널/적합도 표시 UI 4개 구현. lint 에러 2건(react-hooks/set-state-in-effect) 수정 완료. bubble-expand-panel에 cfScore/memberCount optional 필드 추가(하위 호환).
- **미완료**: Phase 5(ScoreSource 'cf' + SOURCE_PRIORITY + 기존 마이그레이션), Phase 6(화면 통합), Edge Function 배포(원격 미적용), supabase/types.ts 재생성 필요
- **다음**: Phase 5 (ScoreSource 변경 + use-target-scores 리팩토링)

### 2026-04-08 #22 — CF Phase 5: 기존 점수 시스템 마이그레이션
- **영역**: domain/(entities/score, constants/source-priority, services/score-fallback, repositories/restaurant+wine), infrastructure/(supabase-restaurant+wine+home-repository), application/(use-target-scores, use-restaurant-detail, use-wine-detail), presentation/(score-cards, score-source-badge, restaurant-detail+wine-detail+home-container)
- **맥락**: ScoreSource 4종→3종('mine'|'nyam'|'bubble'). 'following' 제거, 'public'→'nyam'. TargetScores에서 following 제거 + nyam에 confidence 추가. findPublicSatisfactionAvg 인터페이스+구현 삭제. use-target-scores 4→3종 카드. 상세페이지 사분면 following/public micro dots 제거. useNyamScore 연결.
- **미완료**: Phase 6 화면 통합, pre-existing !단언 4건/text-white 3건, Edge Function 배포(원격 미적용), supabase/types.ts 재생성
- **다음**: Phase 6 (화면별 CF 점수 통합), pre-existing 기술 부채 정리


