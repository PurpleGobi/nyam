# S3-T08: S3 전체 검증

> S3 전체 기능 검증 + S1/S2 회귀 테스트. 풀플로우 E2E, 클린 아키텍처 R1~R5, 빌드/린트 점검.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| CLAUDE.md | 크리티컬 게이트 | 태스크 완료 검증 항목 (빌드, 린트, R1~R5, SSOT, 목업, 보안, 모바일) |
| CLAUDE.md | 스프린트 완료 추가 | 이전 스프린트 회귀, DECISIONS_LOG, MASTER_TRACKER |
| `pages/01_SEARCH_REGISTER.md` | 전체 | 검색/등록 스펙 정합성 |
| `pages/05_RECORD_FLOW.md` | 전체 | 기록 플로우 스펙 정합성 |
| `systems/XP_SYSTEM.md` | §4-1, §9 | EXIF XP 차등 정합성 |

---

## 선행 조건

- S3-T01~T07 모두 완료

---

## 구현 범위

이 태스크는 코드 작성이 아닌 **검증 실행**이다. 아래 체크리스트를 순서대로 실행하고, 실패 항목은 즉시 수정한 후 재검증한다.

---

## 1. 빌드 & 린트

```bash
# 빌드 검증
pnpm build
# → 에러 0개 확인

# 린트 검증
pnpm lint
# → 경고 0개 확인

# TypeScript strict 위반 검색
grep -rn "as any\|@ts-ignore\|@ts-nocheck" src/ --include="*.ts" --include="*.tsx"
# → 결과 0개 확인

# non-null assertion (!) 남용 검색
grep -rn "[a-zA-Z]![.;,\)]" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".d.ts"
# → 최소화 확인 (정당한 사용만 허용)
```

---

## 2. Clean Architecture R1~R5

```bash
# R1: domain에 외부 의존 없음
grep -rn "from 'react\|from '@supabase\|from 'next\|from '@/infrastructure\|from '@/presentation\|from '@/app" src/domain/ --include="*.ts"
# → 결과 0개

# R2: infrastructure가 domain 인터페이스 implements
grep -rL "implements" src/infrastructure/repositories/ --include="*.ts"
# → 결과 0개 (모든 repo가 implements 사용)

# R3: application이 infrastructure 직접 사용 안 함
grep -rn "from '.*infrastructure\|from '@/infrastructure" src/application/ --include="*.ts" --include="*.tsx"
# → 결과 0개

# R4: presentation이 Supabase/infrastructure 직접 import 안 함
grep -rn "from '@supabase\|from '.*infrastructure\|from '@/infrastructure" src/presentation/ --include="*.ts" --include="*.tsx"
# → 결과 0개

# R5: app/ page.tsx는 Container 렌더링만
# 수동 확인: src/app/(main)/add/page.tsx
```

---

## 3. 보안 검증

```bash
# 서버 전용 키 클라이언트 노출 확인
grep -rn "GEMINI_API_KEY\|KAKAO_REST_API_KEY\|NAVER_CLIENT_ID\|NAVER_CLIENT_SECRET\|GOOGLE_PLACES_API_KEY\|SUPABASE_SERVICE_ROLE_KEY" src/ --include="*.ts" --include="*.tsx" | grep -v "src/app/api" | grep -v "src/infrastructure"
# → 결과 0개 (서버 코드에서만 사용)

# console.log 확인
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx"
# → 결과 0개

# RLS 우회 확인
grep -rn "SECURITY DEFINER\|security definer" supabase/ --include="*.sql"
# → 결과 0개
```

---

## 4. S3 기능 검증 (수동 테스트)

### 4.1 카메라 → AI 인식 → 기록

```
□ FAB(+) 탭 → 현재 탭(식당)에 따라 카메라 화면 진입
□ 촬영 버튼 → 카메라 실행 (모바일)
□ 앨범에서 추가 → 갤러리 열림
□ 촬영/선택 → AI 인식 로딩 표시
□ 식당 인식 성공 (확실한 매칭) → 바로 기록 화면 (AI pre-fill 데이터 확인)
□ 식당 인식 성공 (다수 후보) → 후보 목록 표시 → 선택 → 기록 화면
□ 식당 인식 실패 (NOT_FOOD) → "음식 사진을 선택해주세요" 에러
□ 식당 인식 실패 (후보 0) → 검색 화면 폴백
□ 와인 라벨 촬영 → OCR 인식 → 확인 화면 (WineConfirmCard)
□ "맞아요" → 기록 화면 (OCR 데이터 pre-fill)
□ "다른 와인이에요" → 카메라로 돌아감
□ 와인 라벨 인식 실패 → "와인을 찾지 못했어요" → 검색/등록 옵션
□ 와인 진열장 모드 → 여러 와인 목록 인식
□ 와인 영수증 모드 → 구매 목록 인식
```

### 4.2 검색 → 자동완성 → 결과

```
□ "목록에서 추가" 탭 → 검색 화면 진입
□ 검색 전: 근처 식당 목록 표시 (GPS 기반)
□ 1자 입력 → 아무 동작 없음 (2자 미만)
□ 2자 이상 입력 → 300ms debounce 후 자동완성
□ fuzzy matching: "스시 코우지" = "스시코우지" 매칭 확인
□ fuzzy matching: "스시코우지점" → "스시코우지" 매칭 (접미사 무시)
□ 검색 결과: "기록 있음" 뱃지 (accent-food/accent-wine)
□ "기록 있음" 항목 선택 → 토스트 "다녀온 적 있어요" → 상세 페이지 이동
□ 새 항목 선택 → 성공 화면 (status='checked')
□ 와인 검색: 와인명, 생산자 모두 검색 가능
□ 와인 검색: 빈티지별 별도 표시 (같은 와인 다른 빈티지)
□ 검색 결과 없음 → "직접 등록하기" 표시
```

### 4.3 외부 API 연동

```
□ 식당 검색: Nyam DB 결과 < 5개 → 외부 API 호출
□ 카카오 로컬 API 정상 응답
□ 네이버 지역 검색 API 정상 응답
□ 구글 Places API 정상 응답
□ 외부 API 1개 실패 → 나머지 결과는 정상 표시
□ 외부 API 전체 실패 → Nyam DB 결과만 표시 + "직접 등록하기"
□ 외부 결과 선택 → restaurants 테이블 자동 INSERT
□ 중복 제거: 같은 이름 식당 Nyam DB + 외부 동시 표시 안 함
□ 정렬: Nyam DB 우선 → 거리순
```

### 4.4 EXIF GPS 검증

```
□ GPS 있는 사진 → GPS 좌표 추출 성공
□ GPS 없는 사진 → has_exif_gps=false, is_exif_verified=false
□ GPS 200m 이내 → is_exif_verified=true
□ GPS 200m 초과 → is_exif_verified=false (사진 XP 정상, 배지 없음)
□ 1개월+ 사진 → "N개월 전 사진이네요" 경고
□ XP 결정: name_only=0, score_only=3, photo(verified)=8, full=18
```

### 4.5 신규 등록

```
□ 식당 등록: 가게명 입력 (필수)
□ 식당 등록: 주소, 장르 (선택)
□ 와인 등록: 와인명 (필수) + 타입 (필수)
□ 와인 등록: 생산자, 빈티지, 산지, 국가 (선택)
□ OCR 결과 → 등록 폼 pre-fill (와인명, 생산자, 빈티지)
□ 검색어 → 등록 폼 name pre-fill
□ 중복 체크: 같은 이름 존재 → 기존 ID 반환
□ 등록 후 → 기록 화면 연결 (target_id = 새 ID)
```

### 4.6 풀플로우 E2E

```
□ 카메라 풀플로우: FAB→카메라→AI→기록→저장→성공 (status='rated')
□ 검색 풀플로우: FAB→검색→선택→성공 (status='checked')
□ 상세 FAB 풀플로우: 상세→FAB→기록→저장→성공 (status='rated', 참조점 표시)
□ 성공 화면: "내용 추가하기" → 상세 페이지
□ 성공 화면: "한 곳 더 추가" → 플로우 재시작
□ 성공 화면: "홈으로" → 홈 화면
□ 뒤로 가기: 각 단계에서 이전 단계로 복원
□ 닫기(X): 플로우 전체 종료 → 이전 화면
□ 식당 테마: --accent-food 색상 일관
□ 와인 테마: --accent-wine 색상 일관
```

---

## 5. UI/UX 검증

```
□ 모바일 360px 뷰포트: 모든 화면 레이아웃 깨짐 없음
□ 터치 타겟: 모든 버튼/탭 영역 44x44px 이상
□ 디자인 토큰: bg-white/text-black 하드코딩 없음
□ 빈 상태: 검색 결과 없음 → 빈 상태 디자인 + "직접 등록" CTA
□ 로딩 상태: AI 인식 중, 검색 중 → 로딩 인디케이터
□ 에러 상태: 네트워크 오류, AI 인식 실패 → 명확한 에러 메시지
□ 아이콘: Lucide 아이콘만 사용 (이모지 사용 금지)
□ 폰트: Pretendard Variable
```

---

## 6. SSOT 정합성

```
□ 검색 결과 항목: SEARCH_REGISTER.md §3 "가게명 볼드 + 장르·위치 서브" 일치
□ 와인 검색 결과: SEARCH_REGISTER.md §6 "와인명+빈티지 볼드 + 타입·산지 서브" 일치
□ 근처 식당: SEARCH_REGISTER.md §3 "아이콘 + 가게명 + 장르·위치 + 거리 + 기록여부" 일치
□ 성공 화면: RECORD_FLOW.md §7 레이아웃 일치
□ record-nav: RECORD_FLOW.md §10 "뒤로(chevron-left) + 타이틀 + 닫기(x)" 일치
□ status 결정: 카메라/상세='rated', 검색='checked' (RECORD_FLOW.md §1)
□ XP 차등: 이름=0, 점수=3, 사진(EXIF)=8, 풀=18 (XP_SYSTEM.md §4-1)
□ EXIF 200m: XP_SYSTEM.md §9 일치
□ OCR 데이터: DATA_MODEL.md records.ocr_data JSONB 구조 일치
□ 카메라 모드: individual/shelf/receipt (DATA_MODEL.md records.camera_mode)
```

---

## 7. S1/S2 회귀 테스트

```
□ 인증: 로그인/로그아웃 정상 (S1)
□ RLS: 비인증 사용자 → API 401 (S1)
□ 디자인 토큰: S1 토큰 사용 정상 (S1)
□ 사분면: 드래그 인터랙션 정상 (S2)
□ 만족도: 상하 드래그 → 크기/색상/숫자 변경 (S2)
□ 아로마 휠: 섹터 탭 → active 토글 (S2)
□ 구조 평가: 슬라이더 3개 동작 (S2)
□ 페어링: 8카테고리 그리드 선택 (S2)
□ 상황 태그: 6종 단일 선택 (S2)
□ 기록 저장: records INSERT 정상 (S2)
□ 사진 첨부: record_photos INSERT 정상 (S2)
```

---

## 8. 스프린트 완료 절차

```
□ MASTER_TRACKER.md: S3 모든 태스크 상태 → done
□ CURRENT_SPRINT.md: S3 완료 기록 + S4 프리뷰
□ DECISIONS_LOG.md: S3 중 주요 결정 기록
  - 예: EXIF 파싱 라이브러리 선택 (piexifjs vs 자체 구현)
  - 예: 외부 API 폴백 전략 (동시 호출 vs 순차)
  - 예: 와인 중복 판정 기준 (이름+빈티지)
□ 이전 스프린트 (S1, S2) 기능 회귀 없음 확인
```

---

## 실패 시 대응

| 실패 유형 | 대응 |
|----------|------|
| pnpm build 에러 | 즉시 수정. 다음 태스크 진행 금지 |
| pnpm lint 경고 | 즉시 수정 (경고 0개 유지) |
| R1~R5 위반 | 코드를 올바른 레이어로 이동 |
| SSOT 불일치 | 코드를 문서에 맞춤 (문서가 틀리면 사용자에게 확인 후 수정) |
| 목업 불일치 | UI를 prototype/*.html에 맞춤 |
| 보안 위반 | 즉시 수정 (키 노출, RLS 우회) |
| 모바일 깨짐 | 360px 기준으로 수정 |
| S1/S2 회귀 | 원인 분석 후 수정. S3 변경이 원인이면 S3 코드 수정 |
