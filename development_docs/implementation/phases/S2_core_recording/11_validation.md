# 2.11: S2 검증

> S2 전체 태스크(2.1~2.10)의 기능/UI/데이터/아키텍처 통합 검증 + S1 회귀 테스트.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/RATING_ENGINE.md` | §1~§9 전체 (사분면, 만족도, 아로마, 구조평가, 페어링, 씬태그, 부가 입력) |
| `systems/DATA_MODEL.md` | records, record_photos, wishlists 테이블 정의 |
| `systems/DESIGN_SYSTEM.md` | §1 게이지 색상, §8 점 비주얼, §15 Circle Rating, §15b Glow |
| `pages/05_RECORD_FLOW.md` | §3~§10 (식당/와인 플로우, 성공 화면, 공통 UI, 데이터 저장) |
| `prototype/01_home.html` | screen-rest-record, screen-wine-record, screen-add-success |
| `prototype/00_design_system.html` | §15, §15b |
| `implementation/shared/CLEAN_ARCH_PATTERN.md` | R1~R5 검증 명령어 |
| `CLAUDE.md` | 크리티컬 게이트 전체 |

---

## 선행 조건

| 태스크 | 상태 요구 |
|--------|----------|
| 2.1~2.10 | 모든 태스크 `done` |
| S1 전체 | `done` (회귀 대상) |

---

## 구현 범위

이 태스크는 코드를 생성하지 않는다. S2에서 만든 모든 코드의 통합 검증만 수행한다.

검증 실패 시 해당 태스크로 돌아가 즉시 수정한다. 수정 없이 다음 스프린트(S3)로 진행하지 않는다.

---

## 상세 구현 지침

검증은 아래 7개 카테고리를 순서대로 실행한다. 각 카테고리 내 항목은 독립적이므로 병렬 검증 가능.

### 카테고리 1: 빌드 & 정적 분석

```bash
# 1-1. 빌드
pnpm build
# 기대: 에러 0개

# 1-2. 린트
pnpm lint
# 기대: 경고 0개

# 1-3. TypeScript strict 위반
grep -rn "as any\|@ts-ignore\|@ts-expect-error" src/
# 기대: 결과 없음 (infrastructure 어댑터의 Supabase 타입 캐스트 제외)

# 1-4. any 타입 사용
grep -rn ": any\b" src/domain/ src/application/ src/presentation/
# 기대: 결과 없음

# 1-5. non-null assertion (!) 남용
grep -rn "\!\\." src/domain/ src/application/ src/presentation/
# 기대: 결과 없음 (또는 정당한 사유 주석 포함)

# 1-6. console.log
grep -rn "console\\.log" src/
# 기대: 결과 없음
```

### 카테고리 2: 클린 아키텍처 (R1~R5)

```bash
# R1: domain은 외부 의존 0
grep -r "from 'react\|from '@supabase\|from 'next" src/domain/
# 기대: 결과 없음

# R2: infrastructure는 domain 인터페이스를 implements
grep -rL "implements" src/infrastructure/repositories/
# 기대: 모든 파일이 implements 키워드 포함 → 빈 결과

# R3: application은 infrastructure 직접 사용 금지
grep -r "from '.*infrastructure" src/application/
# 기대: 결과 없음

# R4: presentation은 Supabase/infrastructure 직접 금지
grep -r "from '@supabase\|from '.*infrastructure" src/presentation/
# 기대: 결과 없음

# R5: app/은 Container 렌더링만
# 수동 확인: src/app/(main)/record/page.tsx → RecordFlowContainer만 import + 렌더링
```

### 카테고리 3: 사분면 + 만족도 (2.2, 2.3)

| # | 검증 항목 | 검증 방법 | 합격 기준 |
|---|----------|----------|----------|
| 3-1 | 식당 사분면 축 라벨 | 화면 확인 | X축: "저렴 ↔ 고가", Y축: "캐주얼 ↔ 포멀" |
| 3-2 | 와인 사분면 축 라벨 | 화면 확인 | X축: "산미 낮음 ↔ 높음", Y축: "Light Body ↔ Full Body" |
| 3-3 | 사분면 터치 → 좌표 저장 | 여러 위치 탭 후 값 확인 | axis_x, axis_y: 0~100 범위, 소수점 2자리 |
| 3-4 | 사분면 드래그 → 위치 이동 | 점 드래그 후 값 확인 | 실시간 X%/Y% 갱신 |
| 3-5 | 만족도 드래그 → 크기 변경 | 점 위에서 상하 드래그 | 크기 변경, 위치 변경 없음 (독립 제스처) |
| 3-6 | 위치 이동과 만족도 제스처 분리 | 연속 조작 | 위치 드래그 중 만족도 안 바뀜, 만족도 드래그 중 위치 안 바뀜 |
| 3-7 | Circle Rating 크기 범위 | 만족도 1 → 100 | 28px → 120px 연속 변화 |
| 3-8 | 게이지 색상 5단계 | 만족도 구간별 | 0-20: #C4B5A8, 21-40: #B0ADA4, 41-60: #9FA5A3, 61-80: #889DAB, 81-100: #7A9BAE |
| 3-9 | Glow 효과 | 점 크기 확인 | `box-shadow: 0 0 {size×0.3}px {fillColor}80` |
| 3-10 | 만족도 범위 제한 | 경계값 테스트 | 1 미만 불가, 100 초과 불가 |
| 3-11 | 10점 단위 햅틱 | 드래그 중 | 10, 20, 30... 90, 100 지날 때 햅틱 피드백 |
| 3-12 | 50% 중심선 햅틱 | 위치 드래그 중 | X축/Y축 50% 지날 때 햅틱 피드백 |
| 3-13 | 참조 점 표시 | 기존 기록 있을 때 | opacity 0.3, pointer-events: none, 이름 라벨 표시 |
| 3-14 | 수치 칩 실시간 갱신 | 드래그 중 | 사분면 아래 "가격 XX 분위기 XX 만족도 XX" 실시간 변경 |
| 3-15 | 숫자 표시 | 원 내부 | weight 800, color #fff, font-size = 지름 × 0.3 |

### 카테고리 4: 아로마 + 구조평가 + 페어링 (2.4, 2.5, 2.6)

| # | 검증 항목 | 검증 방법 | 합격 기준 |
|---|----------|----------|----------|
| 4-1 | 아로마 15섹터 3링 렌더링 | 화면 확인 | Ring1: 8섹터, Ring2: 4섹터, Ring3: 3섹터 |
| 4-2 | 섹터 탭 → active 토글 | 각 섹터 탭 | 선택/해제 정확히 동작 |
| 4-3 | 드래그 연속 칠하기 | 인접 섹터 드래그 | 드래그 경로의 모든 섹터 활성화 |
| 4-4 | 섹터별 고유 색상 | 15개 섹터 전부 | RATING_ENGINE §8 색상표와 일치 |
| 4-5 | aroma_labels 자동 추출 | 선택 후 값 확인 | 선택된 섹터 이름이 배열에 저장 |
| 4-6 | aroma_color 가중평균 | 복수 섹터 선택 후 | 선택 섹터 hex의 가중 평균 계산 정확 |
| 4-7 | AI pre-select 표시 | AI 감지 시 | "AI 감지" 뱃지 + sparkles 아이콘 (10x10, `--wine` 색상) |
| 4-8 | 구조평가 3 슬라이더 | 화면 확인 | 복합성, 여운, 균형 각각 0~100 범위 |
| 4-9 | 여운 초 환산 | 슬라이더 조작 | 슬라이더 값 → "X초+" 형태로 표시 |
| 4-10 | 여운 라벨 | 슬라이더 양끝 | "짧음(<3초)" ↔ "긴(10초+)" |
| 4-11 | 균형 중간값 의미 | 슬라이더 50 | "조화" 위치 |
| 4-12 | auto_score 자동산출 | 구조평가 입력 후 | `clamp(1, 100, 50 + complexityBonus + finish×0.1 + balance×0.15)` |
| 4-13 | complexityBonus 결정 | activeRingCount 기반 | 1링→0, 2링→+7, 3링→+15 |
| 4-14 | 수동 만족도 우선 | 사용자가 직접 조정 | autoScore 재계산 중단, satisfaction ≠ autoScore 가능 |
| 4-15 | auto_score vs satisfaction 독립 저장 | DB 확인 | records.auto_score ≠ records.satisfaction (수동 조정 시) |
| 4-16 | 페어링 8카테고리 그리드 | 화면 확인 | 적색육, 백색육, 어패류, 치즈·유제품, 채소·곡물, 매운·발효, 디저트·과일, 샤퀴트리·견과 |
| 4-17 | 페어링 복수 선택 | 여러 개 탭 | 다중 선택 가능, 토글 동작 |
| 4-18 | 페어링 AI pre-select | AI 추천 시 | "AI 추천" 뱃지 표시, 사전 선택 상태 |
| 4-19 | 페어링 직접 입력 | 텍스트 입력 | pairing_categories에 추가 저장 |
| 4-20 | 구조평가 선택 생략 | 스킵 후 저장 | complexity, finish, balance 모두 NULL, auto_score NULL |

### 카테고리 5: 씬태그 + 사진 + 부가 입력 (2.7, 2.8)

| # | 검증 항목 | 검증 방법 | 합격 기준 |
|---|----------|----------|----------|
| 5-1 | 씬태그 6종 렌더링 | 식당 기록 화면 | 혼밥, 데이트, 친구, 가족, 회식, 술자리 |
| 5-2 | 씬태그 단일 선택 | 2개 연속 탭 | 마지막 선택만 활성화 (이전 해제) |
| 5-3 | 씬태그 DB 값 | 저장 후 확인 | scene: 'solo' \| 'romantic' \| 'friends' \| 'family' \| 'business' \| 'drinks' |
| 5-4 | 씬태그 AI 추천 | AI 추천 시 | pre-select + "AI 추천" 뱃지 |
| 5-5 | 와인 기록에 씬태그 없음 | 와인 기록 화면 | SceneTagSelector 미렌더링 |
| 5-6 | 한줄 코멘트 200자 제한 | 201자 입력 시도 | 200자에서 잘림 또는 입력 불가 |
| 5-7 | 동행자 추가/삭제 | 추가 → 삭제 | companions 배열 업데이트, companion_count 동기화 |
| 5-8 | 동행자 비공개 | 저장 후 | companions는 본인만 열람 (RLS + API) |
| 5-9 | 가격 입력 (식당: 1인) | 숫자 입력 | total_price INT 저장 |
| 5-10 | 가격 입력 (와인: 병) | 숫자 입력 | purchase_price INT 저장 |
| 5-11 | 사진 촬영 → Storage 업로드 | 촬영 후 확인 | Supabase Storage에 파일 존재, public URL 생성 |
| 5-12 | 사진 → record_photos 저장 | 저장 후 DB 확인 | record_id FK, url 유효, order_index 순서 |
| 5-13 | 사진 없이 저장 | 사진 미첨부 | record_photos 0행, 에러 없음 |
| 5-14 | 와인 연결 (식당 기록) | 와인 연결 후 저장 | linked_wine_id UUID 저장 |
| 5-15 | 식당 연결 (와인 기록) | 식당 연결 후 저장 | linked_restaurant_id UUID 저장 |
| 5-16 | 연결 해제 | ✕ 버튼 | linked_wine_id / linked_restaurant_id NULL |

### 카테고리 6: 기록 플로우 + 인프라 (2.9, 2.10)

| # | 검증 항목 | 검증 방법 | 합격 기준 |
|---|----------|----------|----------|
| 6-1 | 식당 기록 저장 | 전체 플로우 실행 | records INSERT 성공, 모든 필드 정확 |
| 6-2 | 와인 기록 저장 | 전체 플로우 실행 | records INSERT 성공, 와인 전용 필드 포함 |
| 6-3 | status = 'rated' | 카메라/FAB 경로 | DB 확인 |
| 6-4 | wine_status = 'tasted' | 와인 기록 | DB 확인 |
| 6-5 | Phase 1 필수 항목 미충족 | 빈 폼에서 저장 | 저장 버튼 비활성화 |
| 6-6 | Phase 1 필수 + Phase 2 비어 있음 | 필수만 채우고 저장 | 저장 성공, Phase 2 필드 NULL |
| 6-7 | Phase 2 부가 정보 추후 업데이트 | 저장 후 수정 | update() 성공, 필드 갱신 |
| 6-8 | 성공 화면 표시 | 저장 후 | step: 'success' 전환, 대상명/메타 정확 |
| 6-9 | 성공 화면 food 테마 | 식당 기록 후 | check 아이콘 `--accent-food`, Primary 버튼 `--accent-food` |
| 6-10 | 성공 화면 wine 테마 | 와인 기록 후 | check 아이콘 `--accent-wine`, Primary 버튼 `--accent-wine` |
| 6-11 | "내용 추가하기" 버튼 | 탭 | 상세 페이지로 이동 |
| 6-12 | "한 곳 더 추가" 버튼 | 탭 | 폼 리셋 (step: 'form') |
| 6-13 | "홈으로" 버튼 | 탭 | `/`로 이동 |
| 6-14 | record_photos CASCADE | record 삭제 후 | record_photos 자동 삭제 |
| 6-15 | wishlists 자동 업데이트 | 찜 있는 대상 기록 | is_visited = true |
| 6-16 | wishlists 없을 때 | 찜 없는 대상 기록 | 에러 없음 (무시) |
| 6-17 | record-nav 뒤로 | ← 탭 | router.back() |
| 6-18 | record-nav 닫기 | ✕ 탭 | 플로우 종료 → 홈 |
| 6-19 | 저장 바 sticky | 스크롤 | 항상 하단 고정 |
| 6-20 | 저장 바 safe area | iPhone X+ | 하단 안전 영역 포함 |
| 6-21 | mapDbToRecord 완전성 | 코드 리뷰 | records 테이블 모든 컬럼 매핑 (누락 없음) |
| 6-22 | mapRecordToDb 완전성 | 코드 리뷰 | CreateRecordInput 모든 필드 매핑 (누락 없음) |
| 6-23 | DI 등록 | shared/di/container.ts | recordRepository 인스턴스 export, 타입 RecordRepository |

### 카테고리 7: S1 회귀 테스트

| # | 검증 항목 | 검증 방법 | 합격 기준 |
|---|----------|----------|----------|
| 7-1 | 카카오 로그인 | 로그인/로그아웃 | 동작 유지 |
| 7-2 | 구글 로그인 | 로그인/로그아웃 | 동작 유지 |
| 7-3 | 애플 로그인 | 로그인/로그아웃 | 동작 유지 |
| 7-4 | 네이버 로그인 | 로그인/로그아웃 | 동작 유지 |
| 7-5 | 디자인 토큰 | 전체 화면 | 하드코딩 색상 없음, `--accent-food`/`--accent-wine`/`--brand` 분리 유지 |
| 7-6 | 360px 뷰포트 | Chrome DevTools | S1 화면 + S2 화면 모두 레이아웃 깨짐 없음 |
| 7-7 | 다크모드 | 토글 후 | S1/S2 화면 모두 정상 (bg-white, text-black 하드코딩 없음) |
| 7-8 | S1 RLS 정책 | Supabase 확인 | 기존 테이블 RLS 활성화 유지 |

---

## 목업 매핑

이 태스크는 코드를 생성하지 않는다. 목업 매핑은 해당 없음.

검증 시 아래 목업과 실제 구현을 1:1 비교한다:

| 목업 화면 | 비교 대상 | 핵심 확인 포인트 |
|----------|----------|-----------------|
| `screen-rest-record` | 식당 기록 화면 | 섹션 순서, 라벨 텍스트, 칩 스타일, 사분면 레이아웃 |
| `screen-wine-record` | 와인 기록 화면 | 아로마 휠 배치, 구조평가 슬라이더, 페어링 그리드 |
| `screen-add-success` | 성공 화면 | 체크 아이콘, 3 버튼 레이아웃, food/wine 테마 분기 |
| `00_design_system.html §15` | 사분면 점 비주얼 | 크기 매핑, 게이지 색상, 참조 점 opacity |
| `00_design_system.html §15b` | Circle Rating | 28px~120px, glow 레벨, 숫자 스타일 |

---

## 데이터 흐름

검증 시 확인하는 전체 데이터 흐름:

```
[사용자 입력]
    │
    ├── 사분면 드래그 → axisX (0~100), axisY (0~100)
    ├── 만족도 드래그 → satisfaction (1~100)
    ├── 씬태그 탭 → scene ('solo'|'romantic'|...)
    ├── 아로마 탭/드래그 → aromaRegions (JSONB), aromaLabels (TEXT[]), aromaColor (VARCHAR 7)
    ├── 구조평가 슬라이더 → complexity (INT), finish (DECIMAL), balance (DECIMAL)
    ├── 페어링 탭 → pairingCategories (TEXT[])
    ├── 코멘트 → comment (VARCHAR 200)
    ├── 동행자 → companions (TEXT[]), companionCount (INT)
    ├── 가격 → totalPrice (INT) 또는 purchasePrice (INT)
    ├── 연결 → linkedWineId (UUID) 또는 linkedRestaurantId (UUID)
    └── 사진 → photoUrls (string[])
    │
    ▼
[presentation/containers/record-flow-container.tsx]
    │
    ├── 입력 검증 (Phase 1 필수 확인)
    └── useCreateRecord(recordRepository).createRecord(input)
    │
    ▼
[application/hooks/use-create-record.ts]
    │
    ├── 입력값 유효성 검증 (validateRecordInput)
    ├── repository.create(input) ──→ INSERT records
    └── repository.markWishlistVisited() ──→ UPDATE wishlists
    │
    ▼
[presentation/containers/record-flow-container.tsx] (DEC-007)
    │
    ├── usePhotoUpload.uploadAll() ──→ Supabase Storage upload
    └── photoRepo.savePhotos() ──→ INSERT record_photos (실패 시 record 유지)
    │
    ▼
[infrastructure/repositories/supabase-record-repository.ts]
    │
    ├── mapRecordToDb(input) ──→ camelCase → snake_case
    ├── supabase.from('records').insert() ──→ PostgreSQL
    ├── supabase.from('record_photos').insert() ──→ PostgreSQL
    ├── supabase.from('wishlists').update() ──→ PostgreSQL
    └── mapDbToRecord(data) ──→ snake_case → camelCase
    │
    ▼
[DB 검증]
    │
    ├── records: 모든 필드 정확 저장
    ├── record_photos: FK, URL, order_index 정확
    ├── wishlists: is_visited = true (있으면)
    └── RLS: 본인 기록만 접근 가능
```

---

## 검증 체크리스트

아래는 최종 합격 기준이다. 모든 항목이 통과해야 S3 진행 가능.

### 빌드 & 정적 분석

- [ ] `pnpm build` 에러 0개
- [ ] `pnpm lint` 경고 0개
- [ ] TypeScript strict: `any` / `as any` / `@ts-ignore` / `!` 0개 (infrastructure 어댑터 Supabase 타입 캐스트 제외)
- [ ] `console.log` 0개

### 클린 아키텍처 (R1~R5)

- [ ] R1: `grep -r "from 'react\|from '@supabase\|from 'next" src/domain/` → 결과 없음
- [ ] R2: `grep -rL "implements" src/infrastructure/repositories/` → 모든 파일 포함
- [ ] R3: `grep -r "from '.*infrastructure" src/application/` → 결과 없음
- [ ] R4: `grep -r "from '@supabase\|from '.*infrastructure" src/presentation/` → 결과 없음
- [ ] R5: `src/app/(main)/record/page.tsx` → Container 렌더링만

### 사분면 (2.2)

- [ ] 식당: 가격(X) × 분위기(Y) 축 라벨 정확
- [ ] 와인: 산미(X) × 바디(Y) 축 라벨 정확
- [ ] 터치/드래그 → axis_x, axis_y: 0~100 DECIMAL(5,2)
- [ ] 참조 점: opacity 0.3, pointer-events: none

### 만족도 (2.3)

- [ ] Circle Rating: 28px~120px 범위
- [ ] 게이지 색상 5단계: #C4B5A8 / #B0ADA4 / #9FA5A3 / #889DAB / #7A9BAE
- [ ] Glow 효과 3단계
- [ ] 만족도 1~100 범위 제한
- [ ] 10점 단위 햅틱
- [ ] 위치 이동과 만족도 조절이 독립 제스처

### 아로마 (2.4)

- [ ] 15섹터 3링 렌더링 (8+4+3)
- [ ] 탭 토글 + 드래그 연속 칠하기
- [ ] 섹터별 고유 색상 (RATING_ENGINE §8 색상표)
- [ ] aroma_labels[] 자동 추출
- [ ] aroma_color 가중평균 계산

### 구조평가 (2.5)

- [ ] 복합성 / 여운 / 균형: 3 슬라이더 0~100
- [ ] 여운 초 환산 표시
- [ ] auto_score 공식: `clamp(1, 100, 50 + complexityBonus + finish×0.1 + balance×0.15)`
- [ ] 수동 만족도 조정 시 auto_score 독립 저장

### 페어링 (2.6)

- [ ] 8카테고리 그리드 렌더링
- [ ] 복수 선택
- [ ] AI pre-select + "AI 추천" 뱃지
- [ ] 직접 입력 필드

### 씬태그 + 동행자 (2.7)

- [ ] 6종 단일 선택 (solo/romantic/friends/family/business/drinks)
- [ ] AI 추천 pre-select
- [ ] 동행자 추가/삭제
- [ ] 동행자 비공개 (companions = 본인만)

### 사진 (2.8)

- [ ] 촬영/선택 → Supabase Storage 업로드
- [ ] record_photos 테이블 저장 (record_id, url, order_index)
- [ ] 사진 없이 저장 가능

### 기록 플로우 (2.9)

- [ ] Phase 1 필수 미충족 → 저장 버튼 비활성화
- [ ] Phase 1 충족 + Phase 2 비어도 저장 가능
- [ ] 성공 화면: food/wine 테마 분기
- [ ] 3 버튼 동작: 내용 추가 / 한 곳 더 / 홈으로
- [ ] record-nav: 뒤로 + 닫기
- [ ] 저장 바: sticky + safe area

### 인프라 (2.10)

- [ ] records INSERT 모든 필드 정확
- [ ] record_photos INSERT 성공
- [ ] wishlists is_visited 자동 업데이트
- [ ] camelCase ↔ snake_case 매핑 완전성
- [ ] DI 등록: shared/di/container.ts

### SSOT 정합성

- [ ] 코드가 RATING_ENGINE.md 스펙과 일치
- [ ] 코드가 RECORD_FLOW.md(05번 페이지 문서) 스펙과 일치
- [ ] 코드가 DATA_MODEL.md records 테이블과 일치
- [ ] UI가 prototype/01_home.html 목업과 일치
- [ ] UI가 prototype/00_design_system.html §15, §15b와 일치

### 모바일

- [ ] 360px 뷰포트에서 모든 S2 화면 레이아웃 정상
- [ ] 터치 타겟 44x44px 준수

### S1 회귀

- [ ] 소셜 로그인 4종 동작 유지
- [ ] 디자인 토큰 적용 유지 (하드코딩 없음)
- [ ] 360px 레이아웃 유지
- [ ] RLS 정책 유지
