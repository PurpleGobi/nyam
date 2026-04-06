# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

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

### 2026-04-02 #6 — 프로젝트 문서 체계 재구성
- **영역**: CLAUDE.md, CODEBASE.md, WORKLOG.md, development_docs/systems/*.md
- **맥락**: 세션 관리를 WORKLOG/CODEBASE 기반으로 전환. orchestration/handoff 문서 삭제. systems/*.md 전면 갱신.
- **미완료**: 없음
- **다음**: 없음

### 2026-04-02 #5 — 와인 한줄평 입력칸 분리
- **영역**: presentation/components/record (와인 기록 플로우)
- **맥락**: AI tasting_notes와 사용자 comment가 혼용되던 문제 수정. 입력 필드 분리.
- **미완료**: 없음
- **다음**: 없음

### 2026-04-02 #4 — 아로마 휠 텍스트 균일화
- **영역**: presentation/components/record (아로마 휠)
- **맥락**: 모든 링에 '/' 줄바꿈 적용 + 글자 수 기반 동적 폰트 사이즈. 시인성 개선 연속작업.
- **미완료**: 없음
- **다음**: 없음 (아로마 휠 시리즈 완료)

### 2026-04-02 #3 — WSET 기준 아로마 휠 재구조화 + BLIC 품질 평가
- **영역**: domain/entities/aroma, shared/constants/aroma-sectors, migration 041
- **맥락**: WSET 표준 아로마 휠 3링 구조 + 품질 평가(BLIC) 시스템 도입 + AI 자동 채움 파이프라인.
- **미완료**: 없음
- **다음**: 없음


