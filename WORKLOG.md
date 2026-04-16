# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-16 #54 — 기록 섹션 통합 + 댓글 thread + 리액션 실시간 동기화
- **영역**: domain(comment parentId), infrastructure(supabase-comment/reaction-repo), application(use-comments, use-reactions, use-record-reactions, use-record-comment-counts, use-all-target-records), presentation(all-records-section, all-record-card, comment-list, comment-input, comment-sheet-container, restaurant/wine-detail-container), supabase/migrations/079-081
- **맥락**: (1) 식당/와인 상세에서 "나의 기록"+"모든 기록" → "기록" 섹션 통합(필터칩 전환, 디폴트 "나의 기록"). (2) 리액션 good/bad 상호배타 + 자기글 비활성화. (3) 댓글: 비버블 RLS 허용, 작성자 닉/핸들 표시, 대댓글 thread(parent_id). (4) 바텀시트↔카드 리액션/댓글카운트 실시간 동기화(syncReaction, onCommentCountChange). 33파일 변경.
- **미완료**: 댓글별 좋아요 DB 연동 미구현(로컬 토글만), SSOT 문서 갱신(DATA_MODEL.md, 08_BUBBLE.md)
- **다음**: SSOT 문서 갱신, 브라우저 QA

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



