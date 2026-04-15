# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

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


