# 2.11: S2 검증

> S2 전체 태스크(2.1~2.10)의 기능/UI/데이터/아키텍처 통합 검증 + S1 회귀 테스트.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/RATING_ENGINE.md` | §1~§9 전체 (사분면, 만족도, 아로마, 품질평가 BLIC, 페어링, 씬태그, 부가 입력) |
| `systems/DATA_MODEL.md` | lists, records, record_photos 테이블 정의 |
| `systems/DESIGN_SYSTEM.md` | 게이지 색상 채널, 점 비주얼 |
| `pages/05_RECORD_FLOW.md` | §3~§10 (식당/와인 플로우, 성공 화면, 공통 UI, 데이터 저장) |
| `prototype/01_home.html` | screen-rest-record, screen-wine-record, screen-add-success |
| `CLAUDE.md` | 크리티컬 게이트 전체 |

---

## 선행 조건

| 태스크 | 상태 요구 |
|--------|----------|
| 2.1~2.10 | 모든 태스크 `done` |
| S1 전체 | `done` (회귀 대상) |

---

## 검증 카테고리

### 카테고리 1: 빌드 & 정적 분석

```bash
pnpm build          # 에러 0개
pnpm lint           # 경고 0개
```

### 카테고리 2: 클린 아키텍처 (R1~R5)

```bash
# R1: domain은 외부 의존 0
grep -r "from 'react\|from '@supabase\|from 'next" src/domain/

# R2: infrastructure는 domain 인터페이스를 implements
grep -rL "implements" src/infrastructure/repositories/

# R3: application은 infrastructure 직접 사용 금지
grep -r "from '.*infrastructure" src/application/

# R4: presentation은 Supabase/infrastructure 직접 금지
grep -r "from '@supabase\|from '.*infrastructure" src/presentation/
```

### 카테고리 3: 사분면 + 만족도 (2.2, 2.3)

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| 3-1 | 식당 사분면 축 라벨 | X축: "맛,음식 완성도 →", Y축: "경험 만족도 →" |
| 3-2 | 와인 사분면 축 라벨 | X축: "구조 · 완성도 →", Y축: "즐거움 · 감성 →" |
| 3-3 | 사분면 터치 → 좌표 저장 | axis_x, axis_y: 0~100 범위 |
| 3-4 | 만족도 자동 계산 | satisfaction = (x + y) / 2, 독립 드래그 아님 |
| 3-5 | 현재 점 크기 | 고정 20px (DOT_SIZE) |
| 3-6 | 게이지 색상 | 채널별 (food/experience/total/wine-total) 정확 |
| 3-7 | 사분면 라벨 4분면 | restaurant/wine 별 올바른 텍스트 |
| 3-8 | 참조 점 | opacity 0.3, 겹침 순환 |
| 3-9 | readOnly/hideDot 모드 | 정상 동작 |

### 카테고리 4: 아로마 + 품질평가 + 페어링 (2.4, 2.5, 2.6)

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| 4-1 | 아로마 16섹터 3링 렌더링 | Ring1: 9섹터, Ring2: 4섹터, Ring3: 3섹터 |
| 4-2 | 섹터 탭 → active 토글 | 선택/해제 정확히 동작 |
| 4-3 | 드래그 연속 칠하기 | 드래그 경로의 모든 섹터 활성화 |
| 4-4 | 아로마 저장 구조 | aromaPrimary/aromaSecondary/aromaTertiary 배열 분류 정확 |
| 4-5 | 품질평가 BLIC 4 슬라이더 | 균형, 여운, 강도, 복합성 순서 |
| 4-6 | 여운 초 환산 | 슬라이더 값 → "X초+" 형태로 표시 |
| 4-7 | 강도 슬라이더 | 연한/희미 → 보통 → 강렬/집중 마크 |
| 4-8 | auto_score 자동산출 | `clamp(1, 100, 50 + complexityBonus + finish×0.1 + balance×0.15)` |
| 4-9 | 페어링 8카테고리 그리드 | 8개 셀 전부 표시 |
| 4-10 | 페어링 복수 선택 | 다중 선택 가능, 토글 동작 |

### 카테고리 5: 씬태그 + 사진 + 부가 입력 (2.7, 2.8)

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| 5-1 | 씬태그 6종 렌더링 | 혼밥, 데이트, 친구, 가족, 회식, 술자리 |
| 5-2 | 씬태그 단일 선택 | 마지막 선택만 활성화 |
| 5-3 | 동행자 추가/삭제 | companions 배열 업데이트, 비공개 |
| 5-4 | 사진 업로드 → Storage | 800px webp, quality 0.7 |
| 5-5 | record_photos 저장 | record_id, url, order_index, is_public |
| 5-6 | 사진 없이 저장 | 에러 없음 |

### 카테고리 6: 기록 플로우 + 인프라 (2.9, 2.10)

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| 6-1 | 식당 기록 저장 | lists upsert (visited) + records INSERT 성공 |
| 6-2 | 와인 기록 저장 | lists upsert (tasted) + records INSERT 성공 |
| 6-3 | 2-테이블 구조 | listId FK 올바르게 연결 |
| 6-4 | 찜 → 방문 승격 | wishlist → visited/tasted 자동 |
| 6-5 | Phase 1 필수 미충족 | 저장 버튼 비활성화 |
| 6-6 | 성공 화면 | food/wine 테마 분기 |
| 6-7 | 매핑 완전성 | 모든 필드 snake_case ↔ camelCase |
| 6-8 | DI 등록 | shared/di/container.ts에 recordRepo |
| 6-9 | useRecordsWithTarget | records + 대상 메타데이터 JOIN 동작 |

### 카테고리 7: S1 회귀 테스트

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| 7-1 | 소셜 로그인 4종 | 동작 유지 |
| 7-2 | 디자인 토큰 | 하드코딩 없음 |
| 7-3 | 360px 뷰포트 | S1 + S2 화면 레이아웃 정상 |
| 7-4 | RLS 정책 | 기존 테이블 활성화 유지 |

---

## 최종 합격 기준

### 빌드

- [ ] `pnpm build` 에러 0개
- [ ] `pnpm lint` 경고 0개

### 클린 아키텍처

- [ ] R1~R5 모두 통과

### 사분면

- [ ] 식당: 음식 퀄리티(X) × 경험 가치(Y) 축 라벨 정확
- [ ] 와인: 구조·완성도(X) × 즐거움·감성(Y) 축 라벨 정확
- [ ] 만족도 = (x + y) / 2 자동 계산
- [ ] 점 크기 고정 20px

### 아로마

- [ ] 16섹터 3링 렌더링 (9+4+3)
- [ ] aromaPrimary/aromaSecondary/aromaTertiary 배열 저장

### 품질평가 BLIC

- [ ] 균형 / 여운 / 강도 / 복합성: 4 슬라이더 0~100
- [ ] auto_score 자동산출 정확

### 페어링

- [ ] 8카테고리 그리드 + 복수 선택

### 씬태그 + 동행자

- [ ] 6종 단일 선택
- [ ] 동행자 비공개

### 사진

- [ ] 800px webp, quality 0.7
- [ ] isPublic 필드 포함

### 기록 플로우

- [ ] lists upsert + records INSERT 시퀀스
- [ ] 성공 화면: food/wine 테마 분기
- [ ] 저장 바: sticky + safe area

### 인프라

- [ ] 2-테이블 구조 (lists + records) 정상 동작
- [ ] 매핑 완전성 (intensity, privateNote, aromaPrimary/Secondary/Tertiary 포함)

### SSOT 정합성

- [ ] 코드가 RATING_ENGINE.md 스펙과 일치
- [ ] 코드가 DATA_MODEL.md 테이블과 일치
- [ ] UI가 prototype 목업과 일치

### 모바일

- [ ] 360px 뷰포트에서 모든 S2 화면 레이아웃 정상

### S1 회귀

- [ ] 소셜 로그인 4종 동작 유지
- [ ] 디자인 토큰 적용 유지
- [ ] RLS 정책 유지
