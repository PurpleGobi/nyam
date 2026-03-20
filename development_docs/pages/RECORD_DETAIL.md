# RECORD_DETAIL — 기록 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM
> affects: HOME, RESTAURANT_DETAIL, WINE_DETAIL
> route: /records/[id]

---

## 1. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←]                          [⋯]    │  헤더
│                                      │
│ 스시코우지                            │  식당/와인명 (H2, semibold)
│ 2026.03.19 · 데이트                   │  방문일 + 상황 태그 칩
│                                      │
│ ── 사분면 ──────────────────────     │  Section 1: 미니 사분면
│ ┌──────────────────────────────────┐ │
│ │       포멀                        │ │
│ │        |  ◉92                    │ │  이 기록 = 강조 점
│ │ 저렴 ──┼── 고가                   │ │  다른 기록 = 반투명(30%)
│ │   ○    |                         │ │
│ │       캐주얼                      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 만족도 ─────────────────────     │  Section 2: 점수
│        92                            │  Display 2.5rem, bold
│   ━━━━━━━━━━━━━ (컬러 바)            │  만족도 색상 매핑
│                                      │
│ ── 향 팔레트 (와인만) ────────────    │  Section 3: 아로마
│ ┌──────────────────────────────────┐ │
│ │     [원형 향 팔레트]              │ │  선택 영역 하이라이트
│ │     블랙베리, 자두, 오크           │ │  aroma_labels 표시
│ └──────────────────────────────────┘ │
│                                      │
│ ── 한줄평 ─────────────────────     │  Section 4 (있을 때만)
│ "분위기 최고, 코스 구성도 훌륭"       │
│                                      │
│ ── 사진 ──────────────────────      │  Section 5 (있을 때만)
│ [사진1] [사진2] [사진3]  →           │  가로 스크롤, 탭→풀스크린
│                                      │
│ ── 메뉴/팁 ───────────────────      │  Section 6 (있을 때만)
│ 추천 메뉴: [A코스] [런치세트]         │  태그 칩
│ 팁: "예약 필수, 런치 가성비 좋음"     │
│                                      │
│ ── 실용 정보 ─────────────────      │  Section 7
│ 💰 ₩15,000 (1인)                    │
│ 👥 @닉네임1, @닉네임2                │
│ 📅 2026.03.19                       │
│                                      │
│ ── 경험치 ────────────────────      │  Section 8
│ 을지로 +18 XP (Lv.4)                │
│ 일식 +12 XP (Lv.3)                  │
│                                      │
│ ── 액션 ──────────────────────      │  Section 9
│ [수정하기]  [삭제하기]                │
│ [버블에 공유 (P2)]                   │
│                                      │
│                          [h-20 여백] │
└──────────────────────────────────────┘
```

---

## 2. 섹션별 상세

### 헤더
- [←] 뒤로가기 (이전 페이지)
- [⋯] 더보기 메뉴: 수정, 삭제, 공유(P2)
- 스크롤 시: 고정 헤더 + 식당/와인명 (backdrop-blur)

### 식당/와인명 + 방문 정보
- 식당/와인명: H2 (1.563rem, semibold, neutral-800)
- 방문일: Small (0.875rem, neutral-500)
- 상황 태그: 칩 형태, 태그별 색상 (DATA_MODEL §6 참조)
- 와인인 경우: 와인명 + 생산자 + 빈티지 (있으면)

### Section 1: 미니 사분면
- 높이: h-48 (192px)
- **이 기록의 점**: 불투명, 만족도 색상 fill, 테두리 = 상황 태그 색상
- **같은 대상의 다른 기록**: 반투명(30%), 동일 색상 규칙
- 식당: X축 = 가격(저렴↔고가), Y축 = 분위기(캐주얼↔포멀)
- 와인: X축 = 산미(낮음↔높음), Y축 = 바디(라이트↔풀)
- 점 크기 = 만족도 (1~100 → 12~54px)
- 기록 1개뿐이면 점 하나만 표시

### Section 2: 만족도 점수
- 숫자: Display 2.5rem, bold
- 컬러 바: 만족도 색상 매핑 (DESIGN_SYSTEM 참조)
  - 1~30: 레드 계열 → 86~100: 블루 계열
- 바 너비 = 만족도 %

### Section 3: 향 팔레트 (와인 기록만)
- `aroma_regions`이 있을 때만 표시
- 원형 향 팔레트: 선택된 섹터 하이라이트, 미선택 = neutral-100
- 하단에 `aroma_labels` 텍스트 나열 (칩 형태)
- 복합성(complexity), 여운(finish), 균형(balance) 값 있으면 추가 표시:
  ```
  복합성: ●●○ (2차)  여운: 42%  균형: 85%
  ```

### Section 4: 한줄평
- `comment` 필드 있을 때만 표시
- Body (1rem, neutral-700), italic 스타일
- 최대 200자 (records.comment VARCHAR(200))

### Section 5: 사진
- `record_photos` 있을 때만 표시
- 가로 스크롤, `order_index` 순
- 각 사진: `rounded-lg`, h-48 (192px)
- 탭 → 풀스크린 모달 (좌우 스와이프, 핀치 줌)
- 사진 없으면 섹션 숨김

### Section 6: 메뉴 태그 / 팁
- `menu_tags` 있을 때: 태그 칩 (`rounded-full bg-neutral-100 px-3 py-1`)
- `tips` 있을 때: Small (0.875rem, neutral-600)
- 둘 다 없으면 섹션 숨김

### Section 7: 실용 정보
- 가격 (`price`): 원화 포맷, 없으면 "-"
- 함께 간 사람 (`companions`): @ 형태로 나열
- 방문일 (`visit_date`): YYYY.MM.DD
- 와인 기록의 경우: 구매처/장소 (`linked_restaurant_id` → 식당명 링크)
- 모두 없으면 방문일만 표시

### Section 8: 경험치
- 이 기록으로 적립된 XP (xp_history에서 record_id로 조회)
- 각 축별 표시: `{axis_value} +{xp_amount} XP (Lv.{level})`
- 레벨 색상: level_thresholds.color 적용

### Section 9: 액션
- **[수정하기]**: Secondary 버튼. 탭 → 기록 플로우 (RECORD_FLOW) 진입, 기존 데이터 pre-fill
  - 사분면 위치, 만족도, 상황 태그, 확장 필드 모두 pre-fill
  - 수정 후 저장 시 records UPDATE + XP 재계산
- **[삭제하기]**: Destructive 버튼 (text-red-500)
  - 탭 → 확인 모달: "이 기록을 삭제하시겠습니까? 경험치가 차감됩니다."
  - 확인 시: soft delete (status → 'deleted' 또는 deleted_at 설정)
  - XP 재계산: xp_history에서 해당 record_id 관련 XP 차감
  - 삭제 후 → 이전 페이지로 이동
- **[버블에 공유]**: Phase 2. Phase 1에서는 숨김

---

## 3. 빈 상태 패턴

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 사분면 | axis_x/y NULL (온보딩 기록) | "사분면 평가를 추가해보세요" + [평가하기] |
| 향 팔레트 | 와인 아닌 경우 or aroma_regions NULL | 섹션 숨김 |
| 한줄평 | comment NULL | 섹션 숨김 |
| 사진 | record_photos 0개 | 섹션 숨김 |
| 메뉴/팁 | menu_tags + tips 모두 NULL | 섹션 숨김 |
| 실용 정보 | price + companions NULL | 방문일만 표시 |
| 경험치 | xp_history 0건 | 섹션 숨김 |

---

## 4. 인터랙션

- 스크롤 시: 고정 헤더 (backdrop-blur) + 식당/와인명
- 사진 탭: 풀스크린 모달 (좌우 스와이프, 핀치 줌, [×] 닫기)
- 사분면 탭: 해당 식당/와인 상세 페이지로 이동
- 식당/와인명 탭: 상세 페이지 (/restaurants/[id] 또는 /wines/[id])
- 삭제 확인 모달: `AlertDialog` (200ms ease-in-out)
- 연결된 식당 탭 (와인 기록): /restaurants/[linked_restaurant_id]

---

## 5. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 기록 기본정보 | records | 실시간 |
| 사진 | record_photos | 실시간 |
| 식당/와인 정보 | restaurants / wines | 캐시 (2주) |
| 사분면 좌표 | records.axis_x/y + 동일 target records | 실시간 |
| 향 팔레트 | records.aroma_regions/labels | 실시간 |
| 경험치 | xp_history + user_experience | 실시간 |

---

## 6. Phase 구분

### Phase 1
- Section 1~9 전체 (버블 공유 버튼 제외)
- 수정, 삭제 기능
- 홈 타임라인, 식당/와인 상세에서 기록 탭 시 진입

### Phase 2
- [버블에 공유] 버튼 활성화
- 공유 시: 버블 선택 바텀시트 → bubble_shares INSERT
- 공유된 기록에는 버블 아이콘 표시

---

## 7. 라우팅

```
/records/[id]
  ← 홈 타임라인 기록 카드 탭
  ← 식당 상세 Layer 5 기록 카드 탭
  ← 와인 상세 기록 카드 탭
  → /restaurants/[id] (식당명 탭)
  → /wines/[id] (와인명 탭)
  → RECORD_FLOW (수정하기)
```
