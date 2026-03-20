# DESIGN_SYSTEM — 디자인 시스템

> affects: 모든 페이지
> 비주얼 레퍼런스: `prototype/00_design_system.html`
> 아이콘: Lucide (https://lucide.dev)

---

## 디자인 철학

**"조용한 개인 컬렉션"** — 비밀일기장처럼, 내 과거의 식도락 흔적을 차분히 감상하는 공간.

| 원칙 | 설명 |
|------|------|
| **70/25/5** | 70% 뉴트럴 서피스 + 25% 보조 뉴트럴 + 5% 액센트 |
| **종이 같은 따뜻함** | 순백(#fff) 대신 크림(#F8F6F3) 기본 배경 |
| **그림자 절제** | 카드는 border만, shadow는 바텀시트/토스트에만 |
| **여백이 콘텐츠** | 카드 간 12px+, 카드 내 16px+ 패딩 |
| **사진이 주인공** | UI는 조용한 프레임 |
| **색은 데이터에만** | 게이지, 선택 상태, 태그에만 색 사용 |
| **재사용 우선** | 페이지별 특화 없이 요소 조합으로 모든 화면 구성 |

---

## 1. 컬러 토큰

### Brand (Primary Color)
```css
--brand: #FF6038;   /* 로고 전용 — 유일하게 선명한 색. 로고, 앱 아이콘에만 사용 */
```
> 앱 전체에서 유일하게 절제하지 않는 색. 로고 폰트(Comfortaa 700)와 함께 사용.
> 버튼, 카드, 게이지 등 UI 요소에는 사용 금지 — 그쪽은 `--accent-food`/`--accent-wine` 사용.

### Surface
```css
--bg:          #F8F6F3;   /* 따뜻한 크림 (기본 배경) */
--bg-card:     #FEFCFA;   /* 웜 화이트 (카드) */
--bg-elevated: #FFFFFF;   /* 바텀시트, 모달 */
--bg-page:     #EFECE7;   /* 디바이스 프레임 밖 배경 */
```

### Text
```css
--text:      #3D3833;   /* 따뜻한 차콜 (본문) */
--text-sub:  #8C8580;   /* 보조 텍스트 */
--text-hint: #B5AFA8;   /* 플레이스홀더, 힌트 */
```
> 순흑(#000, #111) 사용 금지. 항상 따뜻한 차콜 계열.

### Border
```css
--border:      #E8E4DF;   /* 기본 보더 */
--border-bold: #D4CFC8;   /* 포커스, 강조 보더 */
```

### Accent — Restaurant (절제된 테라코타)
```css
--accent-food:       #C17B5E;   /* 액센트 */
--accent-food-light: #F5EDE8;   /* 배경용 */
--accent-food-dim:   #E8D5CB;   /* 태그/보더 배경 */
```

### Accent — Wine (절제된 모브)
```css
--accent-wine:       #8B7396;   /* 액센트 */
--accent-wine-light: #F0ECF3;   /* 배경용 */
--accent-wine-dim:   #DDD5E3;   /* 태그/보더 배경 */
```

### Accent — Social/Bubble (절제된 슬레이트)
```css
--accent-social:       #7A9BAE;
--accent-social-light: #EDF2F5;
```

### Semantic (절제된 톤)
```css
--positive: #7EAE8B;   /* 성공, 확인 */
--caution:  #C9A96E;   /* 경고, 찜 */
--negative: #B87272;   /* 에러, 삭제 */
```

### 만족도 게이지 색상 (식당·와인 공통)

기존 식당(red→blue) / 와인(purple gradient) 이원화 → **공통 자연색 5단계로 통일**.

| 범위 | 이름 | Hex | 느낌 |
|------|------|-----|------|
| 1~30 | 웜그레이 | `#C4B5A8` | 낮은 만족 |
| 31~50 | 머스타드 | `#C9A96E` | 보통 이하 |
| 51~70 | 샌드 | `#B8A078` | 보통 |
| 71~85 | 세이지 | `#7EAE8B` | 좋음 |
| 86~100 | 슬레이트 | `#7A9BAE` | 최고 |

### 상황 태그 색상 (식당·와인 공통)

| 태그 | 값 | 색상 |
|------|-----|------|
| 혼밥/혼술 | `solo` | `#7A9BAE` (슬레이트) |
| 데이트 | `romantic` | `#B8879B` (더스티 로즈) |
| 친구/모임 | `friends` | `#7EAE8B` (세이지) |
| 가족 | `family` | `#C9A96E` (머스타드) |
| 회식/접대 | `business` | `#8B7396` (모브) |
| 술자리 | `drinks` | `#B87272` (로즈우드) |

### 와인 타입 칩

| 타입 | 배경 | 텍스트 |
|------|------|--------|
| 레드 | `#FAF0F0` | `#B87272` |
| 화이트 | `#FBF8F1` | `#C9A96E` |
| 로제 | `#F8F0F4` | `#B8879B` |
| 오렌지 | `#F5F0EA` | `#B8A078` |
| 스파클링 | `#EDF2F5` | `#7A9BAE` |

---

## 2. 타이포그래피

| 용도 | 크기 | Weight | 용례 |
|------|------|--------|------|
| Display | 36px | 800 | 만족도 큰 숫자 |
| H1 | 22px | 700 | 페이지 제목, 온보딩 헤더 |
| H2 | 17px | 600 | 섹션 제목, 식당/와인명 |
| Body | 15px | 400 | 본문 |
| Sub | 13px | 400 | 메타 정보, 보조 텍스트 |
| Caption | 11px | 400 | 날짜, 출처, 힌트 |

**폰트**: Pretendard Variable → Apple SD Gothic Neo → Noto Sans KR
**색상**: 항상 `--text` (#3D3833) 기본. 보조는 `--text-sub`, 힌트는 `--text-hint`.

---

## 3. 아이콘

**라이브러리**: Lucide (https://lucide.dev)
**기본 크기**: 24px
**색상**: 컨텍스트에 따라 토큰 사용

| 용도 | 아이콘 | 색상 |
|------|--------|------|
| 식당 | `utensils` | `--accent-food` |
| 와인 | `wine` | `--accent-wine` |
| 사진 | `camera` | `--text-sub` |
| 검색 | `search` | `--text-sub` |
| 찜 | `heart` | `--caution` |
| 평점 | `star` | `--caution` |
| 뒤로 | `chevron-left` | `--text` |
| 닫기 | `x` | `--text-hint` |
| 추가 | `plus` | `--text` |
| 확인 | `check` | `--positive` |
| 위치 | `map-pin` | `--accent-food` |
| 공유 | `share-2` | `--text-sub` |
| 알림 | `bell` | `--text-sub` |
| 홈 | `home` | 탭 상태에 따라 |
| 탐색 | `compass` | 탭 상태에 따라 |
| 버블 | `message-circle` | 탭 상태에 따라 |
| 프로필 | `user` | 탭 상태에 따라 |

---

## 4. Border Radius

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--r-xs` | 6px | 태그, 칩, 체크박스 |
| `--r-sm` | 8px | 버튼, 뱃지 |
| `--r-md` | 12px | 인풋, 카드 아이콘 |
| `--r-lg` | 16px | 카드 |
| `--r-xl` | 20px | 바텀시트 상단 |
| `--r-full` | 50px | CTA pill 버튼, 이전 버튼 |

---

## 5. Shadow

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(61,56,51,0.04)` | 거의 사용 안 함 |
| `--shadow-md` | `0 2px 8px rgba(61,56,51,0.06)` | 필요시 카드 |
| `--shadow-lg` | `0 4px 20px rgba(61,56,51,0.08)` | 토스트 |
| `--shadow-sheet` | `0 -4px 24px rgba(61,56,51,0.1)` | 바텀시트 |

> 카드는 기본적으로 shadow 없이 border만 사용. 그림자는 절제.

---

## 6. 재사용 컴포넌트

페이지별 특화 없이 **요소 단위**로 정의. 조합으로 모든 화면 구성.

### 버튼

| 종류 | 스타일 | 용도 |
|------|--------|------|
| **Primary CTA** | pill, `--accent-food` 또는 `--accent-wine`, white text | 다음, 시작하기 |
| **Ghost Back** | pill, `--bg` + `--border`, `--text` | ← 이전 |
| **Skip** | 밑줄 텍스트, `--text-hint` | 건너뛰기 |
| **Card Action** | flex, `--r-sm`, `--border`, `--text-sub` | 가봤음, 가보고싶음, 맞아요 |
| **Search Submit** | `--r-md`, `--accent-wine`, white | 찾기 |
| **Social Login** | full-width, `--r-md`, 플랫폼별 색상 | 카카오/구글/애플 |

### 카드

| 상태 | 보더 | 배경 |
|------|------|------|
| 기본 | `--border` | `--bg-card` |
| 식당 방문 | `--accent-food-dim` | `--accent-food-light` |
| 와인 확인 | `--accent-wine-dim` | `--accent-wine-light` |
| 찜 | `--caution` | `#FBF8F1` |

카드 구조:
```
card-top:    [icon 44x44] [name + meta]
card-actions: [버튼] [버튼]              ← 기본 상태
card-gauge:   [gauge bar] [× 닫기]       ← 가봤음/맞아요 후 교체
```

### 만족도 게이지

- 높이: 32px, `--r-full`, `--bg` 배경 + `--border` 테두리
- 라벨: 14px, 700, white, 중앙
- 좌우 힌트: "별로" / "최고" (10px, `--text-hint`)
- 색상: 5단계 공통 (Section 1 참조)

### 필터 탭

- 밑줄 탭 스타일 (pill 아님)
- 비활성: 13px, 500, `--text-hint`
- 활성: 13px, 700, 액센트색 + 하단 2px 밑줄
- 식당 컨텍스트: `--accent-food` / 와인 컨텍스트: `--accent-wine`

### 인풋

- `--r-md`, `--border`, `--bg` 배경
- placeholder: `--text-hint`
- focus: `--border-bold`
- 14px 본문

### 바텀시트

- `--bg-elevated` (순백), `--r-xl` 상단, `--shadow-sheet`
- 핸들: 36×4px, `--border`, 중앙
- 내부: 인풋 + 찾기 버튼 + 결과 리스트

### 온보딩 네비게이션

한 줄 바: `[← 이전] [건너뛰기] [다음 →]`
```
.ob-nav {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px 28px;  /* 하단 홈 인디케이터 여백 */
  background: linear-gradient(transparent 0%, var(--bg) 20%);
}
```
- 이전: `.btn-back` (Ghost pill)
- 건너뛰기: `.btn-skip` (밑줄 텍스트, 중앙)
- 다음: `.btn-primary` (테마색 pill)

### 인트로 선택 카드

- `--r-lg`, 탭 토글
- 선택: 테마색 보더 + light 배경 + 체크 아이콘 (accent색 bg, white ✓)
- 해제: `--border` + `--bg-card` + 회색 빈 체크

### 빈 상태

- 중앙 정렬, Lucide 아이콘 (28px, `--text-hint`)
- 제목: 14px 600 `--text-sub`
- 설명: 12px `--text-hint`

### 토스트

- `--text` 배경, `--bg` 텍스트
- `--r-md`, 13px 600
- 하단 100px, 중앙, 2초 후 fade out

### 로딩

- Lucide `search` 아이콘, pulse 애니메이션
- 13px `--text-sub` 텍스트
- 카드 내부에 표시 (별도 오버레이 없음)

---

## 7. 만족도 ↔ 사분면 점 크기

| 만족도 | 점 지름(px) |
|--------|-----------|
| 1~20 | 12~16 |
| 21~40 | 17~22 |
| 41~60 | 23~30 |
| 61~80 | 31~40 |
| 81~100 | 41~54 |

---

## 8. 레벨 뱃지 색상

절제된 톤의 뱃지:

| 레벨 | 색상 |
|------|------|
| Lv.1 | — (뱃지 없음) |
| Lv.2~3 | `--positive` (#7EAE8B) |
| Lv.4~5 | `--accent-social` (#7A9BAE) |
| Lv.6~7 | `--accent-wine` (#8B7396) |
| Lv.8~9 | `--accent-food` (#C17B5E) |
| Lv.10 | `--caution` (#C9A96E) |

---

## 9. 다크모드

| 라이트 토큰 | 다크 값 | 설명 |
|------------|---------|------|
| `--bg` | `#1E1C1A` | 따뜻한 다크 (순흑 아님) |
| `--bg-card` | `#2A2725` | 카드 |
| `--bg-elevated` | `#333029` | 시트, 모달 |
| `--text` | `#E0DDD9` | 웜 화이트 (순백 아님) |
| `--text-sub` | `#9C9690` | |
| `--text-hint` | `#6B6560` | |
| `--border` | `#3A3632` | |

> 다크모드에서도 따뜻한 톤 유지. 쿨그레이 금지.
> 모든 하드코딩 색상 금지 — 반드시 CSS 변수 토큰 사용.
