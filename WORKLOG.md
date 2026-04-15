# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-15 #47 — bubble_items 완전 단순화 (source + record_id + added_by 제거)
- **영역**: domain/(BubbleItem: addedBy+recordId+source 전부 제거), infrastructure/(supabase-bubble-repository ~30곳 added_by→bubble_members+records JOIN, supabase-restaurant/wine/profile-repository 동일 전환), application/(use-bubble-auto-sync·use-bubble-items·use-share-record userId 인자 정리), supabase/migrations/073~078(source DROP→record_id DROP→added_by DROP, 기록삭제 트리거 활성멤버 전체 체크, 멤버탈퇴 트리거 신규, member_item_stats 성능 최적화, RLS 단순화, 성능 인덱스 2개, CF 트리거+Edge Function 배포)
- **맥락**: bubble_items가 (id, bubble_id, target_id, target_type, added_at)만 남는 순수 큐레이션 테이블로 완전 단순화. "누가 기록했는지"는 records+bubble_members JOIN으로 확인. 기록 삭제 시 활성 멤버 전체 기록 체크 → 아무도 없으면 삭제. 멤버 탈퇴 시에도 동일 정리. CF 적합도/신뢰도 자동 갱신 (compute-similarity 배포 + pg_net 트리거).
- **미완료**: 없음
- **다음**: 브라우저 QA

### 2026-04-15 #44 — 버블 설정 페이지 멤버 진입점 개방
- **영역**: presentation/containers/bubble-detail-container.tsx (설정 아이콘 isOwner→isMember)
- **맥락**: 1줄 수정으로 해결.
- **미완료**: 없음
- **다음**: 없음

### 2026-04-15 #42 — CF Shrinkage mean centering + 적합도 UI
- **영역**: supabase/functions/predict-score(shrinkage 보정 평균 도입, λ=10, 전체평균 가중 보간, profiles→users 수정), docs/CF_SYSTEM.md(§3.1·§3.3 수식 업데이트), domain/similarity-repository(BubbleSimilarityResult+getBubbleSimilarities), infrastructure/supabase-similarity-repository(버블 적합도 일괄 조회), application/use-bubble-similarity(restaurant+wine 병합 훅), presentation/(mini-profile-popup 유저 적합도, bubble-card·compact-list-bubble·bubble-detail-container 버블 적합도), supabase migrations(user_score_means+user_similarities 테이블 생성, records RLS 인증유저 전체 읽기, redundant SELECT 정책 제거)
- **맥락**: (1) records 공개 기록 표시 불일치 → records_authenticated_read RLS 추가 + redundant 정책 4개 제거. (2) Nyam 점수 미산출 → user_score_means/user_similarities 테이블 DB 미적용 발견·생성·시드. (3) Edge Function 배포 버전 불일치(MIN_OVERLAP=3, mutual 4상태) → repo 코드로 재배포(v2→v3). (4) full mean centering이 n=2~3에서 왜곡(50+58→69) → shrinkage 도입으로 57로 개선. (5) 미니 프로필에 유저간 적합도, 버블 카드/리스트/상세에 버블 적합도 표시.
- **미완료**: compute-similarity Edge Function에도 shrinkage 적용, 디버그 임시 파일은 정리 완료
- **다음**: compute-similarity shrinkage 적용, CF_SYSTEM.md §3.1 적합도 계산에도 shrinkage 반영

### 2026-04-14 #41 — 팔로우 시스템 단순화 (B안: 즉시 팔로우, 2상태)
- **영역**: domain/(follow.ts AccessLevel 2종, follow-access.ts 단순화, follow-repository.ts pending 제거), infrastructure/supabase-follow-repository(즉시 accepted, getAccessLevel 단일조회, follow_counts RPC, Realtime 구독), application/(use-follow 2상태 토글, use-follow-list Realtime 연동, use-user-search 신규 DB 검색), presentation/(follow-button 팔로우/팔로잉 2종, followers-container 요청섹션 제거+DB검색, bubbler-hero mutual 분기 제거, bubbler-profile mutual→following)
- **맥락**: 기존 4종 AccessLevel(none/pending/follow/mutual) + follow_policy 승인 로직을 X(트위터) 모델로 전환. 팔로우 즉시 반영, 승인 과정 없음. getCounts RPC로 5회→1회 최적화. Realtime으로 타인의 팔로우가 실시간 반영. 팔로워 페이지에서 전체 Supabase 사용자 DB 실시간 검색(debounce 300ms). use-follow-requests.ts 삭제.
- **미완료**: following-feed의 mutual 필터 라벨 정리, member-grid의 FollowStatus 타입 정리
- **다음**: 홈 소셜 피드 mutual 필터 검토, supabase/types.ts 재생성

### 2026-04-14 #40 — 버블 오너 표시 (카드=닉네임, 상세=닉네임+@핸들)
- **영역**: domain/entities/bubble.ts(ownerNickname/ownerHandle 추가), infrastructure/supabase-bubble-repository(BUBBLE_SELECT_WITH_OWNER FK 조인, toBubble 확장, findById/findByUserId/findPublic/create/update/findByInviteCode 전체 교체, toEntityRow READ_ONLY_FIELDS로 조인파생필드 쓰기 차단), presentation/components/bubble/bubble-card.tsx(오너 닉네임 by 라인 추가), presentation/containers/bubble-detail-container.tsx(설명 아래 운영자 닉네임+@핸들 노출)
- **맥락**: 버블이 누가 만든 건지 불명확하던 문제 해결. A안(엔티티 조인) 선택 — Bubble 엔티티에 ownerNickname/ownerHandle 옵셔널 필드 추가, Supabase PostgREST FK 조인(`owner:users!created_by`)으로 별도 쿼리 없이 자연스럽게 전달. 카드뷰는 공간 제약으로 닉네임만 (`by 닉네임`), 상세페이지는 닉네임+@핸들 병기 (기존 Nyam 컨벤션). toEntityRow에 READ_ONLY_FIELDS 세트를 둬서 update 시 조인 파생 필드가 실수로 DB에 쓰이는 것 차단.
- **미완료**: 없음
- **다음**: 브라우저 QA (FK 조인 정상 동작, handle null 케이스, 카드 레이아웃)

### 2026-04-14 #39 — 버블 카드 레벨 벳지 상위 2개만 노출
- **영역**: presentation/components/bubble/bubble-card.tsx(expertise 정렬+slice(0,2))
- **맥락**: 버블 카드뷰의 전문 분야 태그(Lv.X)가 home-container.getExpertiseTop3에서 넘어온 3개를 모두 표시하고 있었음. 카드 공간 대비 정보량이 많아 상위 2개만 노출하도록 카드 내부에서 sort(avgLevel desc) + slice(0,2)로 강제. CompactListBubble(리스트뷰)은 영향 없음.
- **미완료**: 없음
- **다음**: 없음

### 2026-04-14 #38 — 버블 상세 비멤버 액션 버튼 정리 (가입하기/대상추가 FAB 게이트)
- **영역**: presentation/containers/bubble-detail-container.tsx(isMember/canJoin 게이트, 가입하기 버튼 + BubbleJoinContainer 연결, 대상추가 FAB 멤버전용), application/hooks/use-bubble-detail.ts(refetch를 멤버정보까지 재조회하도록 확장)
- **맥락**: 비멤버·비오너 사용자에게 "초대" 버튼이 노출되던 버그 수정. 가입 상태(owner/admin/member)에 따라 초대 버튼과 "가입하기" 버튼을 상호배타적으로 노출. joinPolicy에 따라 라벨 분기(closed→팔로우, manual_approve→가입신청, open/auto_approve→가입하기, invite_only→숨김). 기존 미사용 상태였던 BubbleJoinContainer를 재활용해 JoinFlow 시트 연결. 가입 성공 시 useBubbleDetail.refetch로 멤버 정보 재조회. 대상추가 FAB도 멤버전용으로 게이트.
- **미완료**: 없음
- **다음**: 브라우저 QA (각 joinPolicy별 버튼 라벨·가입 후 UI 전환 확인)

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


