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

### 2026-04-06 #10 — 홈 필터 시스템 재구성 + Write-Behind Cache 영속화
- **영역**: domain/entities/filter-config, condition-chip, filter-matcher, infrastructure/supabase-filter-state-repository, application/hooks/use-persisted-filter-state, presentation/home-container, condition-filter-bar, supabase/migrations/046
- **맥락**: (1) 식당탭 필터 재구성: 상태→보기(멀티셀렉트OR), 위치(구)+생활권→위치 통합(내 위치+행정구역/생활권 탭), 순서 재배치(10종). (2) 필터 상태 Write-Behind Cache: localStorage 즉시 + debounce 1500ms Supabase + visibilitychange flush + timestamp 비교 복원. (3) R4 리팩토링: presentation에서 shared/di import 제거, application hooks로 이동.
- **미완료**: 보기 필터의 "버블"/"공개" 데이터 페칭 미연동 (UI만), "내 위치" GPS 연동 미구현 (UI만), 와인탭 필터 순서/통합 미적용
- **다음**: 프라이버시 재설계 → 완료(#11)

### 2026-04-03 #9 — 버블 멤버 카운트/통계 트리거 수정 + 버블러 탭 구현
- **영역**: supabase/migrations/044, application/hooks/use-bubblers-list, presentation/containers/bubble-list-container
- **맥락**: (1) member_count 트리거가 RLS에 막혀 비-owner INSERT 시 카운트 미갱신 → SECURITY DEFINER 적용. (2) 멤버별 통계(member_unique_target_count, weekly_share_count, avg_satisfaction) 갱신 트리거 없음 → bubble_shares INSERT/DELETE 시 자동 재계산 추가. (3) 기존 데이터 일괄 재계산. (4) 버블러 탭이 하드코딩 빈 상태 → useBubblersList 훅 + BubblerCard 구현.
- **미완료**: "우리가족" 버블에 테스트 계정 초대 알림이 DB에 없음 — 유저가 실제로 초대를 보냈는지 재확인 필요
- **다음**: 브라우저에서 버블러 탭/멤버 통계 E2E 검증

### 2026-04-02 #8 — 버블 검색/탐색 + 알림 기반 초대/수락 시스템
- **영역**: application/hooks, presentation/components/bubble, infrastructure/repositories, supabase/migrations
- **맥락**: Discover Sheet 4탭 실데이터 연결 (findPublic). 닉네임/이메일 유저 검색 → 초대 알림 → 수락 시 멤버 추가. 가입 신청 시 owner 알림 → 승인 시 active 전환. RLS 정책 2개 추가 (042, 043). 두 계정 E2E 검증 완료.
- **미완료**: 없음
- **다음**: 가입 신청(manual_approve) 플로우도 E2E 테스트 필요

### 2026-04-02 #7 — 버블 조건부 공유 필터 domain 필드 수정
- **영역**: domain/entities/bubble, domain/services/bubble-share-sync, presentation/components/bubble/share-rule-editor
- **맥락**: 식당/와인 필터 속성 중 status, satisfaction, visit_date 키 중복으로 칩 중복/규칙 손실/크로스 도메인 평가 실패. rules에 domain 필드 추가하여 완전 분리. evaluateShareRule도 targetType별 규칙만 적용.
- **미완료**: 없음
- **다음**: 없음 (검증 완료)


