# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-14 #37 — 지도 "검색 중" 배지 가독성 개선
- **영역**: presentation/components/home/map-view.tsx(isNearbyLoading 배지 글자색 토큰 교체)
- **맥락**: 홈 지도 뷰 상단에 뜨는 "지도 검색 중..." 인라인 배지의 글자색이 `--text-hint`(#B5AFA8)로 흐려 읽기 어려웠음. `--text`(#3D3833, 메인 토큰)로 교체해 또렷하게 표시. 배경·테두리·폰트 크기 등 나머지 스타일은 유지.
- **미완료**: 없음
- **다음**: 필요 시 fontWeight/fontSize 추가 강조 검토

### 2026-04-14 #36 — BottomSheet 컴포넌트 중앙화 (15개 시트 마이그레이션)
- **영역**: presentation/components/ui/bottom-sheet.tsx(규격 강제화: title 필수, 핸들/헤더/X 항상 표시), globals.css(bottom-sheet-header/body/handle CSS 표준화), 15개 바텀시트 전체 마이그레이션(bubble-info/discover/preview/picker/add-item/join-flow, edit-field/delete-account/bubble-privacy/naver-import/level-detail, link-search/share-to-bubble/comment-sheet/follow-button)
- **맥락**: 바텀시트 UI가 제각각(핸들 유무, 헤더 스타일, 닫기 방식, 애니메이션 유무 불일치). BottomSheet 컴포넌트를 props 4개(isOpen/onClose/title/maxHeight)로 단순화하고, 핸들·헤더·X 버튼을 항상 렌더링하도록 강제. 소비자가 내부 구조를 override할 수 없게 함. 15개 시트를 전부 마이그레이션하여 일관된 UX 확보. 브라우저에서 하나씩 테스트 완료.
- **미완료**: share-list-sheet(풀스크린 전용) 미마이그레이션
- **다음**: share-list-sheet 풀스크린 모드 검토, 브라우저 QA 추가 검증

### 2026-04-13 #35 — 초대 팝업 리디자인 + 핸들 설정 + 중복/취소 관리
- **영역**: application/hooks/(use-invite-link 3일 고정, use-bubble-invite-member 중복체크+취소, use-bubble-member pendingInvites, use-settings updateHandle), domain/(notification-repo deleteNotification+getPendingBubbleInvites, settings handle), infrastructure/(supabase-notification-repo, supabase-settings-repo updateHandle), presentation/(invite-popup 신규, bubble-settings 초대대기+취소, pending-approval-list hideEmptyMessage, edit-field-sheet prefix/description/inputFilter, settings-container 핸들변경, bubble-detail-container+bubble-settings-container 토스트+새로고침), supabase/migrations/065+066(RLS)
- **맥락**: (1) 초대 링크(만료 3일 고정) + 직접 초대(닉네임/핸들/이메일 검색) 통합 팝업으로 리디자인. (2) 중복 초대 방지(DB pendingInvites + 세션 invitedIds 이중 체크, 토스트 알림). (3) 초대 취소(notification 삭제 + RLS 066). (4) 설정 멤버관리에 "초대 수락 대기" 목록 표시(RLS 065) + 즉시 새로고침. (5) 핸들 설정/변경 UI(설정>계정, @접두사, 영문소문자+숫자+밑줄 필터, UNIQUE 검증).
- **미완료**: 065/066 마이그레이션 로컬 파일은 생성했으나 원격은 MCP로 적용 완료. 초대 수락/거절 알림 처리 UI 미구현.
- **다음**: 브라우저 QA, 초대 수락 처리 UX

### 2026-04-13 #34 — 홈뷰 버블 필터 미작동 수정 + 로고 클릭 초기화
- **영역**: presentation/(home-container: urlBubbleId→activeBubbleId state 전환, handleLogoReset 추가, components/layout/app-header: onLogoClick prop)
- **맥락**: 버블 상세→리스트 보기 진입 시 필터 변경이 작동하지 않던 버그 수정. urlBubbleId가 상수여서 viewTypes가 항상 ['bubble']로 고정되고 칩 변경 시 초기화 effect가 재실행되며 덮어쓰기됨. state로 전환하여 필터 변경 시 bubble 모드 해제. 로고 클릭 시 필터/소팅/검색/소셜필터 전체 디폴트 복원.
- **미완료**: 없음
- **다음**: 브라우저 QA

### 2026-04-13 #33 — 버블에서 제거 기능 + 버블 상세/설정 UI 리디자인
- **영역**: application/hooks/(use-bubble-items: batchRemoveFromBubble 추가, use-home-targets: refreshKey 파라미터, use-home-state: initialSort), presentation/(home-container: FAB 버블 제거 선택 모드+BubblePickerSheet 자기 버블 제외, bubble-create-form: 수동/자동 공유 라디오 UI, bubble-settings: 공유 방식 라디오+토글 정리+stats 제거, bubble-detail-container: 정보/통계 섹션 리디자인+설정 버튼 이동, bubble-settings-container: 저장 후 상세 복귀)
- **맥락**: (1) 홈뷰에서 버블 필터 활성 시 FAB에 "버블에서 제거" 메뉴 추가 — 선택 모드로 아이템 선택 후 BubblePickerSheet 없이 바로 제거+리스트 갱신. (2) BubblePickerSheet에서 현재 보고 있는 버블 제외(자기 버블 중복 추가 방지). (3) 버블 생성/설정: 공유 규칙을 수동/자동 라디오로 변경(디폴트 수동). (4) 버블 상세: 가입조건·공개설정 태그, 통계 카드를 상세로 이동. (5) 설정: stats prop 제거, 토글 레이아웃 정리, 저장 후 상세 페이지 복귀.
- **미완료**: 없음
- **다음**: 브라우저 QA

### 2026-04-13 #32 — 찜(bookmark) 기능 전체 제거
- **영역**: domain/(entities/bookmark 삭제, repositories/bookmark-repository 삭제, entities/home-target에서 isBookmarked/isCellar 제거, services/filter-matcher에서 bookmark/cellar 필터 제거), infrastructure/(supabase-bookmark-repository 삭제, supabase-home-repository에서 bookmarks 쿼리 제거), application/(use-bookmark 삭제, use-bubble-auto-sync에서 syncBookmarkToAllBubbles 제거, use-naver-import+use-reactions에서 bookmarkRepo 제거), presentation/(bookmark-button 삭제, hero-carousel에서 하트 제거, search-result-item에서 Heart 제거, wine-card isCellar dead code 제거, home-container isCellar 분기 제거, restaurant/wine-detail-container useBookmark 제거), shared/di/container.ts bookmarkRepo 제거, CODEBASE.md+DATA_MODEL.md 갱신
- **맥락**: 찜 → 버블 큐레이션 전환 완료에 따른 dead code 전면 삭제. 5파일 삭제 + 17파일 정리, 순 -558줄. bookmarks 테이블 Supabase 쿼리 1개 추가 제거로 홈 성능 소폭 개선.
- **미완료**: bookmarks DB 테이블 DROP 마이그레이션 (데이터 백업 후 별도 진행)
- **다음**: bookmarks 테이블 마이그레이션 정리, supabase/types.ts 재생성

### 2026-04-13 #31 — 홈 초기 로딩 최적화 + 검색 UI + 탭 전환 버그 수정
- **영역**: infrastructure/supabase-home-repository(prefetchSharedData+fetchRecordsAndBookmarks 통합), application/hooks/(use-home-targets race condition fix, use-restaurant-stats+use-wine-stats+use-xp+use-social-filter-options에 enabled/levelOnly 지연 로드), presentation/(search-container 인라인 검색, home-container stats 지연, app-header XP levelOnly), development_docs/systems/QUERY_OPTIMIZATION.md(신규), CLAUDE.md 참조맵
- **맥락**: (1) 쿼리 최적화 5대 원칙(P1~P5) 수립. (2) homeRepo: follows/bubble_members 중복 조회 제거(P1), 3체인 병렬+필터 없을 때 meta+records 전부 병렬(P2), record_photos FK join으로 별도 쿼리 제거, 소셜 records 9컬럼 최소 SELECT(P3). (3) stats/XP/소셜 필터를 지연 로드하여 초기 네트워크 경합 제거. (4) 탭 전환 race condition: requestIdRef로 stale 응답 무시. (5) 검색 UI: 필터 추가 버튼과 같은 줄에 인라인 검색. Supabase 요청 62% 감소(100+→38).
- **미완료**: 없음
- **다음**: 브라우저 QA, 프로덕션 EXPLAIN ANALYZE 성능 검증

### 2026-04-13 #30 — FAB Speed Dial + 버블에 추가 선택 모드 (찜→버블 전환)
- **영역**: presentation/(layout/fab-add 전면 리디자인, bubble/bubble-picker-sheet 신규, home/compact-list-item+map-compact-item+map-view+record-card+wine-card에서 Heart 제거+선택 모드 추가), containers/(home, bubble-create), application/hooks/use-bubble-items(batchAddToBubble), globals.css(바텀시트 z-index)
- **맥락**: 찜(bookmark) 기능을 버블 기반 큐레이션으로 전환 결정. (1) FabAdd를 Speed Dial로 변경(기록 추가/버블에 추가 2개 메뉴, dim overlay, ×전환). (2) "버블에 추가" → 아이템 배경 틴트 선택 모드 → FAB "N개 추가" 버튼 변환 → BubblePickerSheet(버블 목록+BubbleIcon+새 버블 만들기). (3) Heart/전체찜 UI 전면 제거. (4) 바텀시트 z-index 90/91로 상향(지도 위). (5) 버블 생성 후 sync 에러 시에도 라우팅 진행.
- **미완료**: 상세 페이지 FAB Speed Dial 적용, 버블 포크(복제) 기능, bookmarks 테이블 deprecation
- **다음**: 상세 페이지에서 FAB "버블에 추가" → 바로 버블 선택 시트, 버블 포크 1탭 복제

### 2026-04-12 #29 — 찜(Heart) 토글 리스트/카드 뷰 전체 적용
- **영역**: domain/repositories/bookmark-repository(batchAdd/batchRemove), infrastructure/supabase-bookmark-repository, application/hooks/use-bookmark(useBookmarkMap), presentation/(bookmark-button, record-card, wine-card, compact-list-item, map-compact-item, search-result-item, nearby-list, search-results), containers/(home, search)
- **맥락**: 찜 기능을 상세 페이지 히어로에서 전체 리스트/카드 뷰로 확장. 이후 찜→버블 전환 결정으로 #30에서 Heart UI 전면 제거.
- **미완료**: 없음 (#30으로 대체)
- **다음**: 없음

### 2026-04-10 #28 — 지도뷰 명성 cascade 필터 + 뱃지 grade 표시
- **영역**: domain/(entities/filter-config+condition-chip, services/filter-matcher+filter-query-builder), presentation/(prestige-badges, bib-gourmand-icon 신규, condition-filter-bar, icons/index), application/hooks/use-map-discovery
- **맥락**: 지도뷰 명성 필터를 cascade 방식으로 전면 리디자인. type 선택 시 grade sub-chip 자동 생성(위치 필터 패턴). 상위 칩 1개에 type 누적, X로 전체 리셋. 뱃지에 grade 반영(아이콘 개수, 빕 구르망 전용 아이콘, TV 프로그램명). filter-matcher에 prestige_grade:* 매칭 추가. use-map-discovery에 grade 클라이언트 사이드 필터링 추가.
- **미완료**: 없음
- **다음**: 브라우저 QA, grade 필터 실제 데이터 검증

