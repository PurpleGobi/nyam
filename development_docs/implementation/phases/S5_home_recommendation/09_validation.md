# 09: S5 검증 — 홈 & 추천 전체 검증 + 회귀 테스트

> S5 전체 기능 검증 + S1~S4/S6 회귀 테스트

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `CLAUDE.md` | 크리티컬 게이트, 스프린트 완료 시 추가 체크 |
| `pages/06_HOME.md` | 전체 |
| `pages/07_DISCOVER.md` | 전체 |
| `systems/RECOMMENDATION.md` | 전체 |
| `systems/DESIGN_SYSTEM.md` | 전체 컬러 토큰, 타이포그래피, 컴포넌트 |

---

## 선행 조건

- S5-01 ~ S5-08 태스크 전체 완료

---

## 구현 범위

### 파일 목록

```
(별도 파일 생성 없음 — 검증 전용 태스크)
```

### 스코프 외

- 새 기능 구현 (이 태스크는 검증만)

---

## 1. 빌드 & 린트 게이트

```bash
□ pnpm build          # 에러 0개
□ pnpm lint           # 경고 0개
□ TypeScript strict   # any/as any/@ts-ignore/! 사용 0건
```

검증 명령어:

```bash
# any 검사
grep -rn "as any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx" | wc -l
# 결과: 0

# ! non-null assertion 검사 (테스트 파일 제외)
grep -rn "\!\\." src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|\.d\.ts\|!=\|!=" | wc -l
# 결과: 0 (또는 정당한 사용만)
```

---

## 2. Clean Architecture 검증 (R1~R5)

```bash
# R1: domain에 외부 의존 없음
□ grep -r "from 'react\|from '@supabase\|from 'next" src/domain/
# 결과: 0건

# R2: infrastructure가 domain 인터페이스를 implements로 구현
□ grep -rL "implements" src/infrastructure/repositories/
# 결과: 0건 (모든 파일에 implements 존재)

# R3: application이 infrastructure 직접 사용 안 함
□ grep -r "from '.*infrastructure" src/application/
# 결과: 0건

# R4: presentation이 Supabase/infrastructure 직접 사용 안 함
□ grep -r "from '@supabase\|from '.*infrastructure" src/presentation/
# 결과: 0건

# R5: app/ page.tsx가 Container 렌더링만
□ 수동 확인: src/app/(main)/page.tsx → HomeContainer import + 렌더링만
□ 수동 확인: src/app/(main)/discover/page.tsx → DiscoverContainer import + 렌더링만
```

---

## 3. S5 기능별 검증

### 3-1. 앱 셸 (01_app_shell)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 앱 헤더 main variant | 홈 화면 렌더 확인 | nyam 로고 (Comfortaa 22px gradient) + bubbles (#FF6038) + 벨(34x34) + 아바타(30x30) |
| 앱 헤더 inner variant | 식당 상세 화면 확인 | ← back + title + actions |
| glassmorphism | 시각 확인 | blur(20px), rgba(248,246,243,0.55), shadow |
| 알림 뱃지 | 미읽음 생성 후 확인 | 7px #FF6038 dot 표시 |
| 아바타 드롭다운 | 아바타 탭 | 120px min-width, 프로필/설정 항목 |
| 외부 클릭 | 드롭다운 열린 상태에서 외부 탭 | 닫힘 |
| FAB back | 상세 페이지 좌하단 | 44x44, glassmorphism, chevron-left |
| FAB add | 홈 우하단 | 44x44, glassmorphism, plus 22x22 |
| FAB forward | 기록 플로우 | accent 배경, 흰색 아이콘 |
| 다크모드 | 테마 전환 | 로고 gradient #FF8060→#B8A0C8 |

### 3-2. 홈 레이아웃 (02_home_layout)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 식당/와인 탭 | 탭 전환 | accent 밑줄 색상 변경 (food: #C17B5E, wine: #8B7396) |
| 탭 sticky | 스크롤 | top:0 고정, z-index:10 |
| 뷰 모드 유지 | 탭 전환 | list 모드에서 탭 변경 → list 유지 |
| 저장 필터칩 | 렌더 확인 | 방문/찜/추천/팔로잉 (식당), 시음/찜/셀러 (와인) |
| 칩 active | 칩 탭 | accent 배경 + 흰색 텍스트 |
| 칩 카운트 | 데이터 연동 | 실제 레코드 수 표시 |
| 인라인 페이저 | 칩 overflow | ◀ 1/3 ▶ 표시, disabled opacity 0.2 |
| 지도 버튼 | 와인 탭 | 숨김 확인 |
| 상호 배타 | 필터 열기 | 소팅/검색 자동 닫힘 |

### 3-3. 뷰 모드 (03_view_modes)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 카드 뷰 | 식당 카드 렌더 | 46% 사진 + info, radius 16px, min-height 190px |
| 소스 태그 | 나/버블/웹 | 색상 정확 (§3-4 참조) |
| 사분면 미니 | dot 위치/크기 | 44x44, dot 4~10px, 게이지 색상 |
| 미평가 카드 | status='checked' | 회색 gradient + "평가하기 →" |
| 와인 카드 | 와인 탭 | 어두운 gradient + --accent-wine |
| 버블 행 | 멤버 2명 + 3명 | 최대 2명 표시, +1 표시 |
| 리스트 뷰 | 뷰 전환 | rank 1-3 accent, 40x40 thumb, score 18px |
| 캘린더 뷰 | 뷰 전환 | 7열 그리드, 사진 배경, 점수 오버레이 |
| 캘린더 today | 오늘 날짜 | box-shadow 2px accent |
| 날짜 상세 | 날짜 탭 | 하단 팝업, compact-item 목록 |
| 지도 뷰 | 지도 버튼 탭 | 320px height, 핀 마커, 하단 리스트 |
| 뷰 사이클 | 아이콘 버튼 | card → list → calendar → card |

### 3-4. 필터/소팅/검색 (04_filter_sort)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 필터 패널 | 필터 버튼 탭 | Where/And/Or 접속사 |
| 식당 속성 | 드롭다운 | 11종 모두 표시 (상태~소스) |
| 와인 속성 | 탭 전환 후 드롭다운 | 12종 모두 표시 (상태~복합도) |
| 연산자 | 드롭다운 | 6종 (is/is_not/contains/not_contains/gte/lt) |
| 필터 추가/삭제 | + 필터 추가 / ✕ | 행 추가/삭제 정상 |
| 필터 적용 | 조건 설정 후 | 레코드 목록 필터링 반영 |
| 접속사 전환 | And/Or 탭 | 전체 전환 |
| 소팅 | 소팅 버튼 | 5개 옵션, 선택 시 자동 닫힘 |
| 검색 | 검색 버튼 | textarea + clear, placeholder |
| 칩 저장 | 필터칩으로 저장 | 이름 입력 → 칩 행 추가 |
| 독립 상태 | 뷰 모드 전환 | card 필터 → list 전환 → 별도 상태 |

### 3-5. 통계 패널 (05_stats_panel)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 식당 세계지도 | 통계 토글 | SVG 렌더, 도시 마커 크기 비례 |
| 장르 차트 | 통계 패널 | 수평 바, accent-food, count 내림차순 |
| 점수 분포 | 통계 패널 | 6등분 (~49/50s/60s/70s/80s/90s) |
| 월별 소비 | 통계 패널 | 6개월, 금액 뱃지, 당월 강조 |
| 상황별 차트 | 통계 패널 | scene 전용 색상 |
| 와인 산지 지도 L0 | 와인 통계 | 세계지도, 와인 dot 4색 |
| 와인 산지 지도 L1 | 국가 탭 | 드릴다운, 뒤로 버튼 |
| 와인 산지 지도 L2 | 산지 탭 | 세부 산지, 빈 상태 CTA |
| 품종 차트 | 와인 통계 | bodyOrder 정렬, 20종, 토글 |
| PD 잠금 | 기록 0개 | 와인 통계 섹션별 잠금 오버레이 |
| PD 해제 | 기록 5/10/20개 | 순차적 해제 확인 |

### 3-6. AI 인사 + 넛지 (06_nudge)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| AI 인사 | 세션 첫 진입 | 15px/500 텍스트, "● nyam AI" 서브텍스트 |
| 시간대 분기 | 시간 변경 | 아침/점심/저녁/밤 멘트 |
| 5초 소멸 | 대기 | opacity + max-height fade out |
| 세션 1회 | 새로고침 | 미표시 |
| 넛지 표시 | 후보 존재 시 | max 1개, 우선순위 photo > unrated > meal_time |
| 넛지 액션 | 버튼 탭 | 해당 플로우 이동 + status='acted' |
| 넛지 닫기 | ✕ 탭 | 소멸 + fatigue 증가 |
| 넛지 피로 | fatigue >= 10 | 미표시 |

### 3-7. 추천 알고리즘 (07_recommendation)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 재방문 | API 호출 | satisfaction >= 80, 공식 적용 |
| 상황별 | scene 필터 추가 | 상황 + satisfaction >= 75 |
| 사분면 | axis 범위 필터 | 복합 쿼리 정상 |
| 권위 | 콜드스타트 | 미슐랭/블루리본 우선 |
| 버블 | 가입 버블 멤버 | satisfaction >= 80, 내 방문 제외 |
| private 버블 | visibility='private' | AI 태그로 변환 |
| 병합 정렬 | 추천 칩 | normalizedScore DESC, 동점 최신 |
| 콜드스타트 | 기록 < 5개 | 권위만 노출 |
| 캐싱 | 30분 TTL | 재호출 시 캐시 사용 |
| AI 태그 | 추천 카드 | rgba(126,174,139,0.15) + --positive |
| 버블 태그 | 추천 카드 | rgba(122,155,174,0.15) + --accent-social |

### 3-8. Discover (08_discover)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 헤더 | 화면 진입 | sticky, "탐색", 검색바, 지역 칩 |
| 지역 칩 | 8개 | 광화문~연남, 단일 선택, active accent |
| 카드 | 목록 렌더 | photo h-140, 뱃지, name+score, meta, external pills |
| 복합 점수 | 정렬 확인 | external*0.4 + nyam*0.3 + log*0.2 + badge*0.1 |
| 무한 스크롤 | 스크롤 | 20개씩 추가 로드 |
| 빈 상태 | 빈 지역 | 검색 아이콘 + 메시지 + CTA |
| ← 홈으로 | 버튼 탭 | 슬라이드 전환 |
| 캐싱 | 1시간 | TTL 확인 |

---

## 4. 모바일 검증 (360px)

```
□ 앱 헤더: 요소 잘림 없음, 로고+bubbles+bell+avatar 한 줄
□ 콘텐츠 탭: 탭+아이콘 버튼 줄바꿈 없음
□ 저장 필터칩: 가로 스크롤 정상
□ 플레이스 카드: 46% 사진 비율 유지, 텍스트 ellipsis
□ 리스트 뷰: 40x40 thumb + 텍스트 잘림 없음
□ 캘린더 뷰: 7열 그리드 셀 비율 유지
□ 필터 패널: 스크롤 가능, 드롭다운 잘림 없음
□ 소팅 드롭다운: 화면 밖 넘침 없음
□ 통계 차트: 축소/스크롤 정상
□ Discover 카드: 16px 좌우 마진, 칩 가로 스크롤
□ FAB: 다른 요소와 겹침 없음
□ 터치 타겟: 모든 버튼/칩/카드 44x44px 이상
```

---

## 5. 디자인 토큰 검증

```
□ bg-white/text-black 하드코딩 없음
grep -r "bg-white\|text-black\|bg-gray\|text-gray" src/ --include="*.tsx" | wc -l
# 결과: 0

□ 디자인 토큰 사용 확인
# 모든 색상이 CSS 변수 또는 Tailwind 토큰 경유

□ 식당 accent → --accent-food (#C17B5E)
□ 와인 accent → --accent-wine (#8B7396)
□ 브랜드 → --brand (#FF6038) — 로고/bubbles/알림dot에만
□ 게이지 색상 → --gauge-1~5 (점수 구간별)
□ 상황 색상 → --scene-* (6종)
```

---

## 6. S1~S4 회귀 테스트 (S6은 Wave 3 병렬이므로 S5 검증 시점에 미완료 가능)

| 스프린트 | 검증 항목 | 방법 |
|---------|----------|------|
| S1 | DB 스키마 무결성 | `pnpm build` 성공 |
| S1 | RLS 정책 | Supabase 대시보드 또는 SQL 확인 |
| S1 | 인증 4종 | 로그인 → 홈 진입 가능 |
| S1 | 디자인 토큰 | 앱 전체 토큰 적용 확인 |
| S2 | 기록 플로우 | 카메라 → 식당 특정 → 저장 |
| S2 | 사분면 평가 | axis_x/y/satisfaction 정상 저장 |
| S3 | 검색/등록 | 식당 검색 → 등록 → 기록 |
| S4 | 식당 상세 | L1~L8 정상 표시 |
| S4 | 와인 상세 | 와인 정보 정상 표시 |
| S4 | 찜 CRUD | 하트 탭 → wishlists INSERT/DELETE |

---

## 7. 보안 검증

```
□ RLS: 홈 레코드 본인 것만 조회 (다른 사용자 기록 미노출)
□ RLS: 추천 API 인증 필수 (비로그인 시 401)
□ RLS: 버블 추천 — 가입 버블 멤버 기록만 접근
□ 키 노출: SUPABASE_SERVICE_ROLE_KEY 클라이언트 미노출
□ SECURITY DEFINER: 함수 사용 없음
□ companions 필드: 절대 외부 노출 안 됨 (API 응답, 버블, 프로필)
□ private 버블: 추천 시 AI 태그로 변환 (버블 존재 비노출)
```

---

## 8. SSOT 정합성 확인

```
□ 코드 ↔ systems/RECOMMENDATION.md: 7종 알고리즘 SQL/공식 일치
□ 코드 ↔ pages/06_HOME.md: 헤더/탭/칩/카드/통계/넛지 모든 스펙 일치
□ 코드 ↔ pages/07_DISCOVER.md: 헤더/칩/카드/정렬/API 스펙 일치
□ 코드 ↔ systems/DESIGN_SYSTEM.md: 컬러/폰트/간격 토큰 일치
□ 코드 ↔ prototype/01_home.html: 시각적 정합성 (레이아웃, 색상, 크기)
```

---

## 9. 스프린트 완료 체크리스트

```
□ 이전 스프린트 기능 회귀 없음 (§6)
□ DECISIONS_LOG에 주요 결정 기록
□ MASTER_TRACKER 갱신 (S5 전체 done)
□ CURRENT_SPRINT 갱신 (S5 완료 + S6 프리뷰)
```
