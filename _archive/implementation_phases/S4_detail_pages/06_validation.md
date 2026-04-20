# S4-T06: S4 검증

> S4 전체 태스크(T01~T05) 완료 후 검증.

---

## 선행 조건

- S4-T01~T05 전체 완료

---

## 1. 기능 검증 체크리스트

### 식당 상세 (T01)

```
□ 히어로 캐러셀: 스와이프 정상, 사진 탭 → 팝업
□ 히어로: 사진 없을 때 fallback 아이콘
□ 히어로: 하트 토글 (찜 추가/해제 — lists 테이블), 공유 버튼
□ 기본정보: 식당명 21px weight 800
□ 기본정보: 가격대 (저가/중간/고가)
□ 기본정보: 지역 cascade (country › city › area › district + AxisLevelBadge)
□ 기본정보: 장르 cascade (대분류 › 소분류 + AxisLevelBadge)
□ 점수 카드: 2슬롯 (내 점수 + 버블)
□ 점수 카드: 미방문 시 내 점수 "—" / "미방문"
□ 점수 카드: 버블 카드 탭 → 확장 패널 토글
□ 버블 모드: BubbleMiniHeader 표시 + 멤버 평가 사분면
□ 확장 패널: 각 버블 행 (아이콘 + 이름 + 인원 + 점수)
□ 뱃지 행: 미슐랭/블루리본/TV 있을 때만
□ 사분면: RatingInput readOnly — avg/recent 모드 전환
□ 사분면: 참조 dots (다른 식당 또는 다른 기록)
□ 기록 타임라인: 날짜 DESC, 상황 칩, 점수, 한줄평, 사진 썸네일
□ 빈 상태: "아직 방문 기록이 없어요" + CTA
□ 버블 기록 섹션: BubbleRecordSection 표시
□ 실용 정보: 주소, 영업시간, 전화, 메뉴 접이식, 외부 링크
□ FAB: 뒤로 + 추가 (기록 플로우 진입)
□ FabActions: 수정/삭제 (기록 있을 때만)
□ 삭제: DeleteConfirmModal + XP 재계산
□ 공유: ShareToBubbleSheet
□ 앱 헤더: AppHeader (공통)
```

### 와인 상세 (T02)

```
□ 히어로 캐러셀: 사진 / 라벨 이미지 / 기록 사진 fallback
□ 히어로: 하트 토글 (lists 테이블), 공유 버튼
□ 기본정보 1행: 와인명 + WineTypeChip + classification/Vivino/RP/WS 외부점수
□ 기본정보 2행: 빈티지 + 생산자
□ 적정가: referencePriceMin~Max 표시 + [추가정보] → 가격 분석 팝업
□ 산지 cascade: Country › Region › Sub-region/Appellation + AxisLevelBadge
□ 품종 칩: Grape 아이콘 + 이름 + 비율% + AxisLevelBadge
□ 와인 스펙: Body | Acidity | Sweet | ABV 인라인 텍스트
□ 서빙 정보: 온도(Thermometer) · 디캔팅(GlassWater) · 음용시기(CalendarRange)
□ 푸드페어링: UtensilsCrossed 아이콘 + 텍스트
□ 테이스팅 노트: italic 따옴표
□ 점수 카드: 2슬롯 accent-wine, "N회 시음"/"미시음"
□ 버블 모드: BubbleMiniHeader + 멤버 사분면
□ 나의 기록: 사분면 (RatingInput readOnly, avg/recent 모드)
□ 나의 기록: 향 프로필 (AromaWheel readOnly, 기록 누적)
□ 나의 기록: 품질 평가 (WineStructureEval, 기록 평균)
□ 기록 히스토리: 카드 리스트 (날짜, 점수, 코멘트, 식당 연결, 사진)
□ 기록 히스토리: 카드 탭 → 수정 모드 진입
□ FAB: 뒤로 + 추가 (variant='wine')
□ FabActions: 수정/공유/삭제 (variant='wine')
□ 가격 분석 팝업: verdict 뱃지 + 요약 + 대안 와인
```

### 기록 상세 (T03)

```
□ 헤더: glassmorphism, 고정, 스크롤 시 대상명 표시
□ 대상명: 식당=var(--text), 와인=var(--accent-wine)
□ 대상명 탭 → 상세 페이지
□ 방문일 + 상황 태그 칩 (있을 때만)
□ S1 미니 사분면: 이 기록 점 불투명, 다른 기록 30% opacity
□ S1 미니 사분면: checked 상태 (axis null) → "평가하기" 빈 상태
□ S2 만족도: 숫자 2.5rem bold + 게이지 바 (5단계 색상)
□ S3 아로마: 와인만, aromaRegions 있을 때만, 휠 + 라벨 칩
□ S3 구조 평가: complexity/finish/balance 값 있으면 요약 표시
□ S4 한줄평: comment 있을 때만, italic
□ S5 사진: 가로 스크롤, 탭→풀스크린 모달
□ S5 풀스크린: 스와이프, 핀치 줌, [x] 닫기
□ S6 페어링: 와인만, 칩 accent-wine-light
□ S7 메뉴/팁: 식당만, 둘 다 없으면 숨김
□ S8 실용 정보: 가격, 동반자(비공개), 방문일, 연결 아이템
□ S9 경험치: XP 이력 표시, 없으면 숨김
□ S10 수정: → 기록 플로우 pre-fill 진입
□ S10 삭제: 확인 모달 → hard delete + XP 재계산 → router.back()
□ S10 버블 공유: 숨김 (S8까지)
```

### 찜 CRUD (T04)

```
□ 식당 상세 히어로 하트: 탭 → 찜 추가 (heart filled, #FF6038)
□ 재탭 → 찜 해제 (heart outline, white)
□ 와인 상세 히어로 하트: 동일 동작
□ lists INSERT: status='wishlist', RecordRepository 경유
□ lists DELETE: 해제 시 정상 삭제 (deleteList)
□ 낙관적 업데이트: UI 즉시 반영, 실패 시 롤백
□ 페이지 새로고침 후 찜 상태 유지
```

### 상세↔기록 플로우 (T05)

```
□ 식당 상세 FAB(+) → 기록 플로우 → 사분면 직행 (검색 스킵)
□ 와인 상세 FAB(+) → 기록 플로우 → 사분면 직행
□ 재방문: 이전 기록 참조 점 표시 (opacity 0.3, pointer-events none)
□ 기록 저장 후 → 상세 페이지 복귀 (새 기록 타임라인 반영)
□ 기록 상세 → 수정 → pre-fill → 저장 → 기록 상세 복귀
□ 기록 상세 → 대상명 탭 → 상세 → 뒤로 → 기록 상세
□ 홈 카드 → 상세 → FAB(+) → 기록 → 상세 (전체 순환)
□ URL 파라미터 (target_id, target_type, edit, from) 정상 전달
```

---

## 2. 크리티컬 게이트

```
□ pnpm build          에러 없음
□ pnpm lint           경고 0개
□ TypeScript          any/as any/@ts-ignore/! 0개
□ R1                  domain에 React/Supabase/Next import 없음
□ R2                  infrastructure가 domain 인터페이스 implements
□ R3                  application이 infrastructure 직접 사용 안 함
□ R4                  presentation에서 Supabase/infrastructure import 없음
□ R5                  app/page.tsx는 Container 렌더링만
□ SSOT 정합성         코드가 pages/02,03,04 + systems/*.md 스펙 일치
□ 목업 정합성         UI가 prototype/02_detail_restaurant.html, 02_detail_wine.html과 일치
□ 보안                RLS 우회 없음, 키 노출 없음
□ 모바일              360px에서 레이아웃 깨짐 없음
```

---

## 3. R1~R5 검증 명령

```bash
# R1: domain에 외부 의존 없음
grep -r "from 'react\|from '@supabase\|from 'next\|from '.*infrastructure\|from '.*presentation\|from '.*app/" src/domain/

# R2: infrastructure가 implements 사용
grep -rL "implements" src/infrastructure/repositories/

# R3: application이 infrastructure 직접 사용 안 함
grep -r "from '.*infrastructure" src/application/

# R4: presentation에서 Supabase/infrastructure import 없음
grep -r "from '@supabase\|from '.*infrastructure" src/presentation/

# TypeScript 안전성
grep -rn "as any\|@ts-ignore\|@ts-expect-error" src/
grep -rn "console\.log" src/
```

---

## 4. 모바일 검증 (360px)

```
□ 히어로 캐러셀: 전폭, 224px 높이
□ 점수 카드 2슬롯: 균등 분할
□ 타임라인: 세로선 + dot + 텍스트 잘리지 않음
□ 사분면(RatingInput): 반응형 렌더링
□ FAB: 좌하단/우하단 위치, 터치 타겟 44×44px
□ 앱 헤더: 정상 렌더링
□ 와인 기본정보: 외부점수/가격 오버플로우 없음
□ 품종/산지 칩: flex-wrap 정상
□ 아로마 휠: 터치 반응 정상
□ 풀스크린 모달: 전체 화면 커버
□ 버블 확장 패널: 스크롤 가능
□ 가격 분석 팝업: 모바일 최적화
```

---

## 5. S1/S2/S3 회귀 검증

```
□ S1 Auth: 로그인/로그아웃 정상
□ S1 디자인 토큰: 게이지 색상, 씬 태그 색상 정상 적용
□ S2 기록 생성: 사분면 + 만족도 + 상황태그 정상
□ S2 아로마/구조/페어링: 와인 기록 정상
□ S3 검색: 식당/와인 검색 정상
□ S3 카메라: 촬영 → OCR → 검색 연결 정상
□ S3 등록: 신규 식당/와인 등록 정상
□ S3 풀플로우: 카메라 → 검색 → 등록 → 기록 → 완료 정상
□ lists RLS: 다른 유저의 찜/목록 접근 불가
□ records RLS: 다른 유저의 기록 접근 불가 (기록 상세)
```

---

## 6. 데이터 정합성 검증

```
□ nyam 점수: DB nyam_score 값 직접 표시 (프론트 계산 없음)
□ 내 점수: records AVG(satisfaction) = 점수 카드 표시값
□ 방문 횟수: records COUNT = "N회 방문" 표시
□ 최근 방문일: records MAX(visit_date) = 섹션 메타 표시
□ 사분면 ref dots: 다른 식당/와인의 평균 좌표와 일치
□ 찜 상태: lists 테이블 status='wishlist' 존재 = UI 하트 상태
□ XP 이력: xp_histories 합계 = Section 9 표시 XP
□ 기록 삭제 후: XP 차감 + user_experiences 레벨 재계산 정상
□ 기록 삭제 후: 남은 기록 수 토스트 표시
```

---

## 7. 성능 검증

```
□ 상세 페이지 초기 로드: < 2초 (3G)
□ 캐러셀 스와이프: 끊김 없음 (60fps)
□ 풀스크린 모달: 전환 끊김 없음
□ 사분면 렌더링: dot 12개 이하에서 끊김 없음
□ 타임라인: 기록 20개까지 스크롤 정상
□ 찜 토글: 응답 < 500ms (낙관적 업데이트로 UI 즉시)
□ 기록 삭제: 응답 < 2초 (XP 재계산 포함)
```

---

## 8. 접근성 검증

```
□ 이미지 alt 텍스트: 캐러셀 사진, 썸네일, 사분면 dot
□ 터치 타겟: 모든 탭 가능 요소 최소 44×44px
□ 색상 대비: 텍스트/배경 WCAG AA 준수
□ 키보드: Tab으로 주요 요소 접근 가능
□ 스크린 리더: 점수 카드, 뱃지, 타임라인 의미 전달
```
