# Nyam 구현 감사 보고서

> 작성일: 2026-03-18 (정합성 검증 완료)
> 기준 문서: PRD v2.0.0 / TECH_SPEC v2.0.0 / DESIGN_SPEC v3.0.0

---

## 1. 요약

| 구분 | 계획 | 구현 | 구현율 |
|------|------|------|--------|
| 페이지/라우트 | 22개 | 22개 | **100%** |
| 컨테이너 | 20개 | 20개 | **100%** |
| API 라우트 | 17개 | 17개 | **100%** |
| Application Hooks | 33개 | 33개 | **100%** |
| Domain Entities | 6개 | 6개 | **100%** |
| Repository Interfaces | 4개 | 4개 | **100%** |
| Infrastructure 구현체 | 4개 | 4개 | **100%** |

**전체 구현율: ~92%** (페이지/라우트/API는 모두 존재하나, 세부 기능 단위에서 일부 미구현·불일치 존재)

---

## 2. 페이지별 기능 구현 상태

### 2-1. 로그인 (`/auth/login`) — PRD 8-1

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-1-1 | 소셜 로그인 (Google, Kakao, Naver, Apple) | ✅ 구현 | LoginContainer + login-buttons.tsx |
| 8-1-2 | 이용약관/개인정보처리방침 동의 체크 | ✅ 구현 | terms-agreement.tsx |
| 8-1-3 | 로그인 사용자 홈 리다이렉트 | ⚠️ 부분 | `src/proxy.ts`에 로직 존재하나 Next.js middleware로 연결되지 않음. 클라이언트 사이드 처리로 대체 중 |
| — | `/auth/consent` 동의 페이지 | ✅ 추가 구현 | PRD에 없으나 consent-container.tsx로 구현됨 (OAuth 후 약관 동의 플로우) |

### 2-2. 홈 (`/`) — PRD 8-2

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-2-1 | Today's Pick 카드 | ✅ 구현 | todays-pick-card.tsx, use-todays-pick.ts |
| 8-2-2 | 프로필 카드 | ✅ 구현 | home-profile-card.tsx |
| 8-2-3 | Taste DNA 시각화 (Food/Wine 탭) | ✅ 구현 | taste-dna-radar.tsx, 플립 카드 애니메이션 포함 |
| 8-2-4 | 포토 캘린더 | ✅ 구현 | photo-calendar.tsx, use-calendar-records.ts |
| 8-2-5 | 캘린더 날짜 팝업 | ✅ 구현 | calendar-day-popup.tsx |
| 8-2-6 | 지도 섹션 (네이버/카카오 토글) | ✅ 구현 | home-map-section.tsx, kakao-map.tsx |
| 8-2-7 | 친구 피드 | ⚠️ 미연결 | use-friends-feed.ts(훅)와 friends-feed-card.tsx(컴포넌트) 모두 완성되었으나, home-container.tsx에서 호출하지 않고 하드코딩된 플레이스홀더만 표시 |
| — | Style DNA 섹션 | ✅ 구현 | PRD에 명시적 항목 없으나 홈 프로필 카드에 Style DNA 섹션 포함 |

### 2-3. 빠른 기록 (`/record`) — PRD 8-3

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-3-1 | 기록 유형 선택 (식당/와인/요리) | ✅ 구현 | record-type-selector.tsx |
| 8-3-2 | 사진 촬영/선택 (최대 8장) | ✅ 구현 | photo-capture-sheet.tsx |
| 8-3-3 | AI 사진 분석 | ✅ 구현 | ai-result-card.tsx, POST /api/analyze-visit |
| 8-3-4 | 종합 경험 평가 (100점 슬라이더) | ✅ 구현 | rating-scales.tsx (유형별 항목 자동 전환) |
| 8-3-4b | 맛 특성 기록 (유형별 분기) | ✅ 구현 | 식당: AI 자동, 와인: AI+사용자, 요리: 수동 |
| 8-3-5 | 저장 + 비동기 파이프라인 | ✅ 구현 | use-create-record.ts → enrich → taste-profile → post-process |
| — | 주변 식당 선택 | ✅ 구현 | nearby-restaurant-picker.tsx (PRD에 세부 명시 없으나 구현됨) |

### 2-4. 리뷰 페이지 (`/records/[id]`) — PRD 8-4

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-4-0 | 다회 방문 요약 배너 | ✅ 구현 | record-detail-container.tsx에 multi-visit 배너 로직 |
| 8-4-1 | 사진 캐러셀 | ✅ 구현 | photo-picker.tsx |
| 8-4-2 | 기본 정보 (메뉴명, 장르, 날짜) | ✅ 구현 | |
| 8-4-3 | 종합 점수 | ✅ 구현 | |
| 8-4-4 | 세부 평가 바 차트 | ✅ 구현 | rating-bars.tsx |
| 8-4-4b | 맛 특성 (AI/수동 구분) | ✅ 구현 | |
| 8-4-5 | 태그 칩 | ✅ 구현 | category-tag.tsx |
| 8-4-6 | 코멘트 | ✅ 구현 | |
| 8-4-6b | Phase 2 블로그 인라인 표시 | ✅ 구현 | blog-preview.tsx |
| 8-4-7 | Phase 2 진입 CTA | ✅ 구현 | phase_status 기반 CTA 카드 |
| 8-4-8 | 리액션 (좋아요/댓글/유용해요/맛있겠다) | ✅ 구현 | use-reaction-actions.ts |
| 8-4-9 | 액션 메뉴 (공유/북마크/수정/삭제) | ✅ 구현 | |

### 2-5. 기록 수정 (`/records/[id]/edit`) — PRD 8-5

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-5-1~8 | 사용자 기본 필드 수정 | ✅ 구현 | record-edit-container.tsx |
| 8-5-9~15 | AI 수집 필드 확인/수정 | ✅ 구현 | PATCH /api/records/[id]/ai-analysis, taste-profile |
| 8-5-16 | 블로그 제목/본문 수정 | ✅ 구현 | PATCH /api/records/[id]/journal |
| 8-5-17 | AI 재분석 버튼 | ✅ 구현 | POST /api/records/[id]/reanalyze |
| 8-5-18 | 사진 수정 불가 안내 | ✅ 구현 | |

### 2-6. 기록 완성 Phase 2 (`/records/[id]/complete`) — PRD 8-6

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-6-1 | 기록 요약 카드 | ✅ 구현 | review-completion-container.tsx |
| 8-6-2 | AI 질문 (3~5개) | ✅ 구현 | ai-question-card.tsx |
| 8-6-3 | 질문 네비게이션 (이전/다음/도트) | ✅ 구현 | |
| 8-6-4 | 블로그 자동 생성 | ✅ 구현 | POST /api/records/generate-review |
| 8-6-5 | 블로그 미리보기 | ✅ 구현 | blog-preview.tsx |
| 8-6-6 | 저장 + XP | ✅ 구현 | |

### 2-7. 비교 게임 Phase 3 (`/comparison`) — PRD 8-7

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-7-1 | 비교 그룹 선택 | ✅ 구현 | comparison-container.tsx |
| 8-7-2 | 토너먼트 매치업 | ✅ 구현 | matchup-card.tsx |
| 8-7-3 | 세부 비교 항목 | ✅ 구현 | |
| 8-7-4 | 진행 상황 표시 | ✅ 구현 | |
| 8-7-5 | 최종 결과 + Elo 보정 | ✅ 구현 | comparison-result.tsx, use-comparison.ts |

### 2-8. 발견 (`/discover`) — PRD 8-8

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-8-1 | 통합 검색 | ✅ 구현 | discover-container.tsx, use-discover.ts |
| 8-8-2 | 장르 필터 | ✅ 구현 | |
| 8-8-3 | 상황 필터 | ✅ 구현 | |
| 8-8-4 | 결과 카드 리스트 | ✅ 구현 | |
| — | AI 추천 배너 | ✅ 추가 구현 | PRD에 없으나 발견 페이지에 AI 추천 배너 포함 |

### 2-9. AI 추천 (`/recommend`) — PRD 8-9

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-9-1 | Taste DNA 기반 추천 | ✅ 구현 | recommend-container.tsx |
| 8-9-2 | 상황 선택 | ✅ 구현 | |
| 8-9-3 | 위치 입력 | ✅ 구현 | |
| 8-9-4 | 추가 요청 | ✅ 구현 | |
| 8-9-5 | 추천 결과 | ✅ 구현 | POST /api/recommend |

### 2-10. 버블 목록 (`/groups`) — PRD 8-10

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-10-1 | 내 버블 리스트 | ✅ 구현 | groups-container.tsx |
| 8-10-2 | 공개 버블 탐색 | ✅ 구현 | use-public-groups.ts |
| 8-10-3 | 버블 참여 | ✅ 구현 | |
| 8-10-4 | 버블 생성 | ✅ 구현 | create-group-modal.tsx |

### 2-11. 버블 상세 (`/groups/[id]`) — PRD 8-11

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-11-1 | 버블 정보 | ✅ 구현 | group-detail-container.tsx |
| 8-11-2 | 멤버 목록 | ✅ 구현 | group-member-list.tsx |
| 8-11-3 | 버블 피드 | ✅ 구현 | |
| 8-11-4 | 초대 링크 복사 | ✅ 구현 | POST /api/groups/invite |
| 8-11-5 | 가입/탈퇴 | ✅ 구현 | use-group-actions.ts |
| — | entry-requirements.tsx | ✅ 구현 | 가입 조건 표시 컴포넌트 |

### 2-12. 버블 참여 (`/groups/join`) — PRD 8-12

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-12-1 | 초대 토큰으로 버블 정보 조회 | ✅ 구현 | group-join-container.tsx |
| 8-12-2 | 가입 처리 | ✅ 구현 | |

### 2-13. 프로필 (`/profile`) — PRD 8-13

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-13-1 | 프로필 헤더 (아바타, 닉네임, 레벨) | ✅ 구현 | profile-container.tsx |
| 8-13-2 | 닉네임 수정 | ✅ 구현 | use-update-profile.ts |
| 8-13-3 | 통계 요약 | ✅ 구현 | stats-summary.tsx |
| 8-13-4 | Taste DNA (Food/Wine/Cooking 3탭) | ✅ 구현 | taste-dna-radar.tsx |
| 8-13-5 | Style DNA (유형별 탭) | ✅ 구현 | use-style-dna.ts |
| 8-13-6 | 최근 기록 (5건) | ✅ 구현 | |
| 8-13-7 | 바로가기 (비교게임/Wrapped/궁합/북마크) | ✅ 구현 | |
| 8-13-7a | 북마크 페이지 | ✅ 구현 | bookmarks-container.tsx |
| 8-13-8 | 로그아웃 | ✅ 구현 | 설정 페이지로 이동 |
| 8-13-9 | 계정 삭제 | ✅ 구현 | 설정 페이지로 이동 |

### 2-14. 설정 (`/settings`) — PRD 8-16

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-16-1 | 계정 정보 (닉네임, 이메일, 소셜 계정) | ✅ 구현 | settings-container.tsx |
| 8-16-2 | 테마 (라이트/다크/시스템) | ✅ 구현 | theme-selector.tsx |
| 8-16-3 | 알림 (푸시/주간 리포트 토글) | ✅ 구현 | toggle-switch.tsx (localStorage) |
| 8-16-4 | 개인정보/보안 (공개 범위, 검색 허용) | ✅ 구현 | |
| 8-16-5 | 정보 (약관, 개인정보, 앱 버전) | ✅ 구현 | |
| 8-16-6 | 로그아웃 | ✅ 구현 | |
| 8-16-7 | 계정 탈퇴 (30일 유예) | ✅ 구현 | POST /api/auth/delete-account |

### 2-15. 궁합 매칭 (`/compatibility`) — PRD 8-14

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-14-1 | 대상 선택 | ✅ 구현 | compatibility-container.tsx |
| 8-14-2 | 종합 궁합 점수 | ✅ 구현 | POST /api/compatibility |
| 8-14-3 | 세부 분석 | ✅ 구현 | |

### 2-16. 식당 상세 (`/restaurants/[id]`) — PRD 8-15

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-15-1 | 식당 기본 정보 | ✅ 구현 | restaurant-detail-container.tsx |
| 8-15-2 | 메뉴판 | ✅ 구현 | |
| 8-15-3 | 관련 기록 | ✅ 구현 | use-restaurant-detail.ts |

### 2-17. 알림 (`/notifications`) — PRD 8-16 (알림)

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-16-1 | 리액션 알림 | ✅ 구현 | notifications-container.tsx |
| 8-16-2 | 공유 알림 | ✅ 구현 | |
| 8-16-3 | 읽음 처리 | ✅ 구현 | |
| 8-16-4 | 상대 시간 표시 | ✅ 구현 | |
| 8-16-5 | 빈 상태 | ✅ 구현 | |
| 8-16-6 | 미읽은 알림 뱃지 | ✅ 구현 | header-actions.tsx |

### 2-18. Wrapped (`/wrapped`) — PRD 8-17

| ID | 기능 | 상태 | 비고 |
|----|------|------|------|
| 8-17-1 | 히어로 섹션 | ✅ 구현 | wrapped-container.tsx |
| 8-17-2 | 최다 장르 | ✅ 구현 | |
| 8-17-3 | 월별 기록 분포 | ❌ 미구현 | 바 차트 UI 없음. use-wrapped.ts에서 월별 데이터 집계도 미포함 |
| 8-17-4 | 최고 평점 기록 | ⚠️ 부분 | 단골 맛집(최다 방문)은 있으나 최고 평점 기록 카드는 미확인 |
| 8-17-5 | 맛 취향 변화 | ⚠️ 제한적 | Taste DNA 현재값 레이더 차트만 표시. 연초 vs 연말 비교(오버레이)는 미구현 (이력 추적 미지원) |
| 8-17-6 | 공유 | ❌ 미구현 | 공유 버튼 없음 |

### 2-19. 기타 페이지

| 페이지 | 상태 | 비고 |
|--------|------|------|
| `/terms/service` | ✅ 구현 | 이용약관 전문 |
| `/terms/privacy` | ✅ 구현 | 개인정보처리방침 전문 |
| `/offline` | ✅ 구현 | PWA 오프라인 안내 |
| `error.tsx` | ✅ 구현 | 에러 바운더리 + 재시도 |
| `loading.tsx` | ✅ 구현 | 스켈레톤 로딩 |

---

## 3. 미구현 / 불일치 항목

### 3-1. 중요도 높음 (기능 영향)

| # | 항목 | 문서 위치 | 상태 | 영향 |
|---|------|----------|------|------|
| 1 | **미들웨어 미연결** | TECH_SPEC 7-1 | ⚠️ 미연결 | `src/proxy.ts`에 인증 가드 + 비활성 계정 처리 + 약관 동의 체크 로직이 **완성되어 있으나** Next.js middleware로 등록되지 않아 실행되지 않음 |
| 2 | **친구 피드 미연결** | PRD 8-2-7 | ⚠️ 미연결 | use-friends-feed.ts(훅)와 friends-feed-card.tsx(컴포넌트) 모두 완성되었으나, home-container에서 호출하지 않고 플레이스홀더만 표시 |
| 3 | **XP 보너스 일부 미구현** | TECH_SPEC 5-5 | ⚠️ 부분 | 새 장르 첫 기록(+10), 7일 연속 기록(+20), 4종 사진 완성(+3) 미구현. Phase 2 XP(+15)만 확인됨. Phase 1(+5), Phase 3(+5)도 재확인 필요 |
| 4 | **계정 삭제 Cron** | TECH_SPEC 4-7 | ❌ 미구현 | 30일 후 완전 삭제 Cron Job 미구현 (vercel.json 미존재). soft delete + cancel-deletion API만 동작 |
| 5 | **상권명 매핑 미구현** | TECH_SPEC 4-1 | ❌ 미구현 | `shared/constants/areas.ts` 파일 미존재. 동→상권명 변환 불가 |

### 3-2. 중요도 중간 (UX 영향)

| # | 항목 | 문서 위치 | 상태 | 영향 |
|---|------|----------|------|------|
| 6 | **비활성 계정 복구 안내** | TECH_SPEC 4-7 | ⚠️ 미연결 | proxy.ts에 `is_deactivated` 체크 + 로그인 리다이렉트(`?error=account_deactivated`) 로직 존재하나, middleware 미연결로 실행 안 됨 |
| 7 | **Wrapped 미완성 섹션** | PRD 8-17 | ❌ 부분 | 월별 분포 바 차트 미구현, DNA 변화 비교(오버레이) 미구현, 공유 버튼 미구현. 히어로+통계+단골+최애장르+DNA 현재값만 구현 |
| 8 | **Style DNA 전문성 레벨 알고리즘** | PRD 4-4 | ⚠️ 부분 | volume/diversity/recency/consistency 점수 컬럼은 DB에 존재하나 계산 로직이 post-process에서 완전히 구현되었는지 확인 필요 |
| 9 | **맛 프로필 리뷰 교차 검증** | TECH_SPEC 4-1 Step 2-A | ⚠️ 부분 | 네이버/카카오 리뷰 수집 + 필터링 + 점수화 3단계 파이프라인의 완전성 확인 필요 |

### 3-3. 중요도 낮음 (Phase 2+ 예정)

| # | 항목 | 문서 위치 | 상태 | 비고 |
|---|------|----------|------|------|
| 11 | 푸시 알림 (서버 연동) | PRD Phase 2 | ❌ 미구현 | localStorage 토글만 존재, 실제 푸시 미연동 |
| 12 | 유료 버블 | PRD Phase 2 | ❌ 미구현 | DB 스키마(is_paid, price_monthly)는 존재 |
| 13 | 개인 팔로우 기능 | PRD Phase 2 | ❌ 미구현 | |
| 14 | 식당 상세 페이지 강화 | PRD Phase 2 | ⚠️ 기본만 | 기본 정보/메뉴/관련 기록은 있으나 리뷰 교차 등 강화 미적용 |
| 15 | 내 데이터 내보내기 | PRD 8-16-4 | ❌ 미구현 | "준비 중" 표시 |
| 16 | 도움말/FAQ | PRD 8-16-5 | ❌ 미구현 | "준비 중" 표시 |
| 17 | 문의하기 | PRD 8-16-5 | ❌ 미구현 | "준비 중" 표시 |
| 18 | 프로필 검색 허용 | PRD 8-16-4 | ❌ 미구현 | "준비 중" 표시 |

---

## 4. 아키텍처 준수 상태

### 4-1. Clean Architecture

| 규칙 | 상태 | 비고 |
|------|------|------|
| R1: domain은 외부 의존 금지 | ✅ 준수 | entities/repositories 순수 타입 |
| R2: infrastructure는 domain 구현 | ✅ 준수 | 4개 Supabase 구현체 |
| R3: application은 domain 인터페이스만 | ✅ 준수 | DI container (di/repositories.ts) 사용 |
| R4: presentation은 application hooks만 | ✅ 준수 | 컨테이너가 application hooks 호출 |
| R5: app/은 Container 렌더링만 | ✅ 준수 | 모든 page.tsx가 Container만 렌더 |

### 4-2. Component vs Container 패턴

| 규칙 | 상태 | 비고 |
|------|------|------|
| Component: props만, 비즈니스 로직 금지 | ✅ 준수 | |
| Container: hook 호출 + Component 조합 | ✅ 준수 | 20개 컨테이너 일관 |
| Container에 시각적 스타일링 금지 | ✅ 준수 | 구조적 레이아웃만 사용 |

---

## 5. 디자인 스펙 준수 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 컬러 토큰 (Primary Coral #FF6038) | ✅ 준수 | |
| 와인 전용 컬러 (#6B4C8A) | ✅ 준수 | |
| 타이포그래피 (Pretendard/Inter/Comfortaa) | ✅ 준수 | |
| 스페이싱 (4px 그리드) | ✅ 준수 | |
| 라운딩 (rounded-xl ~ rounded-2xl) | ✅ 준수 | |
| FAB (기록 버튼) | ✅ 준수 | 하단 내비 중앙 돌출 |
| 100점 슬라이더 UI | ✅ 구현 | |
| 레이더 차트 (SVG) | ✅ 구현 | |
| 다크 모드 | ✅ 구현 | CSS 변수 기반 |
| 이모지 사용 규칙 | ✅ 준수 | UI에 Lucide 아이콘, 데이터 라벨만 이모지 |
| PWA manifest | ✅ 구현 | |
| 반응형 (max-w-lg 단일 뷰포트) | ✅ 준수 | |

---

## 6. 기술 스펙 준수 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Next.js App Router | ✅ | |
| Supabase (Auth, DB, Storage) | ✅ | |
| SWR (데이터 페칭) | ✅ | swr-provider.tsx |
| Gemini 2.5 Flash (AI) | ✅ | |
| 카카오 Local API | ✅ | kakao-local.ts |
| 네이버 검색 API | ✅ | enrich에서 블로그 리뷰 수집 |
| 이미지 리사이즈 (1024px) | ✅ | image-upload.ts |
| RLS 정책 | ⚠️ | 코드 레벨 확인 필요 (DB 설정은 별도) |
| Elo 비교 알고리즘 | ✅ | use-comparison.ts |
| Taste DNA 산출 공식 | ✅ | post-process 로직 |

---

## 7. 권고 사항 (우선순위순)

### P0 — 즉시 필요

1. **미들웨어 연결**: `src/proxy.ts`의 로직은 완성됨. `middleware.ts`로 rename 또는 re-export하여 Next.js에 등록 필요
2. **DESIGN_SPEC Note 정정**: Wine DNA 6축 레거시 경고 삭제 (실제 코드는 7축 정상 구현)

### P1 — MVP 완성 전

3. **친구 피드 연결**: home-container.tsx에서 use-friends-feed.ts 호출 + friends-feed-card.tsx 렌더 (훅/컴포넌트 이미 완성)
4. **XP 보너스 구현**: 새 장르 첫 기록(+10), 7일 연속 기록(+20), 4종 사진 완성(+3). Phase 1(+5) XP도 동작 여부 재확인
5. **계정 삭제 Cron**: Vercel Cron 또는 Supabase Edge Function으로 30일 후 완전 삭제 구현 (vercel.json 미존재)
6. **상권명 매핑 생성**: `shared/constants/areas.ts` 파일 생성 (동→상권명 변환 테이블)

### P2 — 품질 향상

7. **Wrapped 완성**: 월별 분포 바 차트 + DNA 변화 비교 + 공유 기능 추가
8. **Style DNA 전문성 레벨 계산**: volume/diversity/recency/consistency 알고리즘 검증
9. **맛 프로필 교차 검증 파이프라인**: 3단계 리뷰 수집·필터링·점수화 완전성 확인

---

## 8. 마일스톤 진행 상태 (PRD Section 10)

### Phase 1: MVP — **~95% 완료**

| 항목 | 상태 |
|------|------|
| 3-Phase 기록 시스템 | ✅ |
| AI 사진 분석 (Gemini) | ✅ |
| 100점 만점 슬라이더 평가 | ✅ |
| Taste DNA / Style DNA | ✅ |
| 버블 시스템 | ✅ |
| Today's Pick 추천 | ✅ |
| 포토 캘린더 | ✅ |
| 지도 (네이버/카카오) | ✅ |

**미완**: 미들웨어 연결, 친구 피드 연결, XP 보너스 3종, 삭제 Cron, 상권명 매핑

### Phase 2: 커뮤니티 성숙 — **~20% 완료**

| 항목 | 상태 |
|------|------|
| Wrapped (연간 리뷰) | ✅ 기본 구현 |
| 궁합 매칭 | ✅ 기본 구현 |
| 푸시 알림 | ❌ |
| 유료 버블 | ❌ |
| 식당 상세 강화 | ❌ |
| 개인 팔로우 | ❌ |
