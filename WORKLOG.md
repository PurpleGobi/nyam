# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

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

### 2026-04-06 #13 — 홈 탭 전환 성능 최적화
- **영역**: domain/entities/calendar(신규), domain/repositories/record-repository, infrastructure/supabase-record-repository, application/hooks/(use-home-records, use-calendar-records, use-following-feed), presentation/(calendar-view, home-container)
- **맥락**: 탭 전환 시 Supabase 쿼리 42개→19개(55% 감소). findHomeRecords 통합 호출 + 탭 캐시(stale-while-revalidate) + 캘린더 records 재사용(추가 쿼리 0) + 팔로잉 lazy fetch. CalendarDayData를 domain으로 이동하여 R3 위반 해결.
- **미완료**: calendar-view.tsx text-white 2건 시맨틱 토큰 교체 (pre-existing), bubble dot DB view 미구현
- **다음**: bubble dot을 위한 DB view/RPC, pre-existing lint 정리, text-white 토큰 교체

### 2026-04-06 #12 — 점수 체계 재설계 + Viewer Context + 후속 완료
- **영역**: domain/(entities/score+record, services/score-fallback+record-grouper, repositories/restaurant+wine), infrastructure/supabase-*-repository, application/use-restaurant-detail+use-wine-detail+use-target-scores, presentation/(score-cards+record-card+compact-list-item+calendar-day-detail+score-source-badge+quadrant-input+quadrant-ref-dot+rating-input+restaurant-detail-container+wine-detail-container+home-container), RATING_ENGINE.md
- **맥락**: (1) 4종 점수(나/팔로잉/버블/nyam) 카드 UI + 신뢰도 폴백 순수 함수. (2) 사분면 모드 avg/recent → visits/compare. (3) visits 모드에서 selectedSource별 micro dot(4px) 렌더링 — followingRecords/publicRecords 개별 fetch + QuadrantRefDot isMicroDot. (4) 홈 리스트 source 우선순위 폴백 (record-grouper에서 bestScore 선택). (5) CalendarDayDetail/ScoreSourceBadge 스타일 개선. 신규 4 + 수정 25개.
- **미완료**: bubble dot 미표시 (BubbleScoreRow에 avgAxisX/Y 없음 — DB view/RPC 필요), lint pre-existing 2건 (quadrant-input refs + detail-container deps)
- **다음**: bubble dot을 위한 bubble_shares 확장 or DB view, pre-existing lint 정리

### 2026-04-06 #11 — 프라이버시 모델 재설계
- **영역**: supabase/migrations/047, domain/entities/settings+user, infrastructure/supabase-settings+follow-repository, application/use-settings+use-share-record, presentation/settings-container+privacy-summary, AUTH.md+DATA_MODEL.md
- **맥락**: privacy_profile+privacy_records 2개 → is_public(boolean)+follow_policy(4종) 통합. "기본 비공개, 팔로워/버블 오버라이드" 모델. RLS 8개 교체 + records_followers 신규 (follow_policy!=blocked 조건 포함). 설정 UI를 전체공개 토글+팔로우 정책 선택으로 교체. 비공개 유저도 버블 공유 허용.
- **미완료**: 팔로우 요청/승인 플로우 (pending→accepted), conditional 조건 평가 로직, 보기 필터별 데이터 페칭
- **다음**: 팔로우 승인제 구현, 보기 필터 데이터 페칭 연동

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

### 2026-04-08 #20 — CF Phase 3: 예측 API (predict-score + batch-predict)
- **영역**: domain/repositories/prediction-repository.ts(신규), supabase/functions/predict-score(신규), supabase/functions/batch-predict(신규), infrastructure/repositories/supabase-prediction-repository.ts(신규), shared/di/container.ts(수정)
- **맥락**: CF 예측 API 구현. 단건(predict-score: 7회 DB, breakdown 포함, scope 지원) + 배치(batch-predict: 5회 DB, 최대 50건) Edge Function. PredictionRepository 인터페이스 + functions.invoke() 래퍼 + DI 등록. service_role+JWT 인증, CORS, cf-calculator.ts 로직 인라인 복사.
- **미완료**: predict-score/batch-predict Edge Function 배포(원격 미적용), 실 데이터 속도 벤치마크, supabase/types.ts 재생성 필요
- **다음**: Phase 4 (usePrediction 훅 + UI 컴포넌트), Phase 5 (ScoreSource 'cf' 추가 + 기존 마이그레이션)

