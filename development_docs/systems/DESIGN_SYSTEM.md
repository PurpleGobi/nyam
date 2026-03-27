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

## 0. Brand & 로고

### nyam 로고
```css
.logo {
  font-family: 'Comfortaa', cursive;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6038, #8B7396);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

| 용도 | 크기 | letter-spacing |
|------|------|----------------|
| 로그인 / 스플래시 | 42px | -1px |
| 앱 헤더 | 22px | -0.5px |

**다크모드**: `linear-gradient(135deg, #FF8060, #B8A0C8)` — 밝기 보정

> 로고는 식당 오렌지(#FF6038) → 와인 모브(#8B7396) 그라데이션.
> `--brand: #FF6038` 사용처는 Section 1 Brand 참조. 일반 UI 요소에는 사용 금지.

---

## 1. 컬러 토큰

### Brand (Primary Color)
```css
--brand: #FF6038;   /* 브랜드 전용 — 유일하게 선명한 색 */
```
> 앱 전체에서 유일하게 절제하지 않는 색. 사용처를 엄격히 제한:
> - 로고 그라데이션, 앱 아이콘
> - 헤더 "bubbles" 텍스트 링크
> - 알림 미읽음 dot
> - 버튼, 카드, 게이지 등 **일반 UI 요소에는 사용 금지** — 그쪽은 `--accent-food`/`--accent-wine` 사용.

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

**Worst → Best 5단계 색상**. 점수 구간별 색상 매핑.

```css
--gauge-worst: #C4B5A8;  /* 시맨틱 별칭: 최저 */
--gauge-best:  #7A9BAE;  /* 시맨틱 별칭: 최고 */
--gauge-1: #C4B5A8;   /* 0~20:  웜그레이 */
--gauge-2: #B0ADA4;   /* 21~40: 쿨그레이 */
--gauge-3: #9FA5A3;   /* 41~60: 세이지 */
--gauge-4: #889DAB;   /* 61~80: 스틸블루 */
--gauge-5: #7A9BAE;   /* 81~100: 슬레이트 */
```

| 점수 | CSS 변수 | 색상 | 느낌 |
|------|----------|------|------|
| 0~20 | `--gauge-1` | `#C4B5A8` | 웜그레이 |
| 21~40 | `--gauge-2` | `#B0ADA4` | 쿨그레이 |
| 41~60 | `--gauge-3` | `#9FA5A3` | 세이지 |
| 61~80 | `--gauge-4` | `#889DAB` | 스틸블루 |
| 81~100 | `--gauge-5` | `#7A9BAE` | 슬레이트 |

- JS에서 점수 → 구간 매핑 → 해당 색상 적용
- 사분면 점, 게이지 바, 카드 인라인 점수 표시, Circle Rating에 공통 적용
- Glow(box-shadow)도 동일 색상 50% 투명도 사용

### 상황 태그 색상 (식당·와인 공통)

```css
--scene-solo:     #7A9BAE;   /* 혼밥/혼술 */
--scene-romantic: #B8879B;   /* 데이트 */
--scene-friends:  #7EAE8B;   /* 친구/모임 */
--scene-family:   #C9A96E;   /* 가족 */
--scene-business: #8B7396;   /* 회식/접대 */
--scene-drinks:   #B87272;   /* 술자리 */
```

| 태그 | 값 | CSS 변수 | 색상 |
|------|-----|----------|------|
| 혼밥/혼술 | `solo` | `--scene-solo` | `#7A9BAE` (슬레이트) |
| 데이트 | `romantic` | `--scene-romantic` | `#B8879B` (더스티 로즈) |
| 친구/모임 | `friends` | `--scene-friends` | `#7EAE8B` (세이지) |
| 가족 | `family` | `--scene-family` | `#C9A96E` (머스타드) |
| 회식/접대 | `business` | `--scene-business` | `#8B7396` (모브) |
| 술자리 | `drinks` | `--scene-drinks` | `#B87272` (로즈우드) |

> `.scene-tag` 스타일: 11px, 600, `--r-xs`, **white 텍스트** + 해당 색상 배경.
> `.tag-chip` 변형 (타임라인 인라인): 10px, 600, `border-radius: 20px`, padding `2px 8px`, white 텍스트.

**와인 전용 상황 태그** (`.tag-chip` 변형):

| 태그 | 값 | 색상 매핑 |
|------|-----|----------|
| 페어링 | `pairing` | `--caution` (#C9A96E) |
| 모임 | `gathering` | `--scene-friends` (#7EAE8B) |
| 선물 | `gift` | `--scene-business` (#8B7396) |
| 시음 | `tasting` | `--scene-drinks` (#B87272) |
| 디캔팅 | `decanting` | `#A0896C` (웜 브라운) |

### 와인 타입 칩

`.wine-chip`: 11px, 500, `--r-xs`, padding `2px 8px`

| 타입 | 배경 | 텍스트 | 보더 (기본: `--border`) |
|------|------|--------|------------------------|
| 레드 | `#FAF0F0` | `#B87272` | 기본 |
| 화이트 | `#FBF8F1` | `#C9A96E` | 기본 |
| 로제 | `#F8F0F4` | `#B8879B` | 기본 |
| 오렌지 | `#F5F0EA` | `#B8A078` | 기본 |
| 스파클링 | `#EDF2F5` | `#7A9BAE` | 기본 |
| 주정강화 | `#F5F0F0` | `#8B6B5E` | `#DDD0C8` |
| 디저트 | `#FDF8F0` | `#C9A96E` | `#E8E0C8` |

---

## 2. 타이포그래피

| 용도 | 크기 | Weight | letter-spacing | 용례 |
|------|------|--------|---------------|------|
| Display | 36px | 800 | -1px | 만족도 큰 숫자 |
| H1 | 22px | 700 | -0.3px | 페이지 제목, 온보딩 헤더 |
| H2 | 17px | 600 | — | 섹션 제목, 식당/와인명 |
| Body | 15px | 400 | — | 본문 |
| Sub | 13px | 400 | — | 메타 정보, 보조 텍스트 |
| Caption | 11px | 400 | — | 날짜, 출처, 힌트 |

**폰트 CSS 변수**:
```css
--font: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
```
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
| 앞으로 | `chevron-right` | `--text` |
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
| 필터 | `sliders-horizontal` | `--text-hint` (기본) / `--accent-food` (활성) |
| 정렬 | `arrow-up-down` | `--text-hint` (기본) / `--accent-food` (활성) |
| 설정 | `settings` | `--text-sub` |
| 트로피 | `trophy` | `--caution` (레벨/뱃지) |
| 포도 | `grape` | 뱃지 컨텍스트별 |
| TV | `tv` | `--brand` (뱃지) |
| 수상 | `award` | 뱃지 컨텍스트별 |

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

## 6. 스페이싱 토큰

```css
--s-2: 2px;   --s-4: 4px;   --s-6: 6px;   --s-8: 8px;
--s-10: 10px; --s-12: 12px; --s-16: 16px; --s-20: 20px;
--s-24: 24px; --s-32: 32px; --s-40: 40px; --s-48: 48px;
```

---

## 7. 재사용 컴포넌트

페이지별 특화 없이 **요소 단위**로 정의. 조합으로 모든 화면 구성.

### 버튼

| 종류 | 스타일 | 용도 |
|------|--------|------|
| **Primary CTA** | pill, `--accent-food` 또는 `--accent-wine`, white text | 다음, 시작하기 |
| **Primary 비활성** | pill, `--border` 배경, `--text-hint` 텍스트 | 조건 미충족 CTA |
| **Ghost Back** | pill, `--bg` + `--border`, `--text` | ← 이전 |
| **Skip** | 밑줄 텍스트, `--text-hint` | 건너뛰기 |
| **Card Action** | flex, `--r-sm`, `--border`, `--text-sub` | 가봤음, 가보고싶음, 맞아요 |
| **Card Action 활성 (식당)** | `--accent-food` 배경, white 텍스트 | 가봤음 선택 |
| **Card Action 활성 (와인)** | `--accent-wine` 배경, white 텍스트 | 맞아요 선택 |
| **Card Action 활성 (찜)** | `--caution` 배경, white 텍스트 | 가보고싶음 선택 |
| **Search Submit** | `--r-md`, `--accent-wine`, white | 찾기 |
| **Social Login** | full-width, `--r-md`, 플랫폼별 색상 | 카카오/구글/네이버/애플 |

**소셜 로그인 색상**:
- 카카오: bg `#FEE500`, text `#3C1E1E`
- Google: bg `--bg-elevated`, text `--text`, border `--border`
- 네이버: bg `#03C75A`, text `#fff`
- Apple: bg `#1D1D1F`, text `#fff`

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
- 라벨: 14px, 700, white, 중앙, `text-shadow: 0 1px 2px rgba(0,0,0,0.15)`
- 좌우 힌트: "별로" / "최고" (10px, `--text-hint`)
- 색상: 5단계 공통 (Section 1 참조)

### Circle Rating (원형 크기조절 평가)

터치(클릭) 후 상하 드래그로 점수 조절. 크기·색상·glow가 점수에 연동. 온보딩·기록 플로우에서 사용.

| 속성 | 값 |
|------|-----|
| 크기 범위 | 28px (점수 0) → 120px (점수 100) |
| 색상 매핑 | 만족도 게이지와 동일 5단계 (`--gauge-1`~`--gauge-5`) |
| Glow | `box-shadow: 0 0 {size*0.3}px {fillColor}80` — fill과 동일 색상, 50% 투명도 |
| 폰트 | weight 800, color #fff, 크기는 원 지름의 30% (최소 12px) |

**인터랙션**:
1. 원 위에서 터치/클릭 시작
2. 상하 드래그로 점수 조절 (위=증가, 아래=감소)
3. 원 밖으로 나가도 드래그 유지 (pointerup까지)
4. 크기·색상·glow·숫자 실시간 변경

**JS 구현 참조**:
```js
const GAUGE = [
  { max: 20, color: '#C4B5A8' },
  { max: 40, color: '#B0ADA4' },
  { max: 60, color: '#9FA5A3' },
  { max: 80, color: '#889DAB' },
  { max:100, color: '#7A9BAE' },
];

function getGaugeColor(score) {
  return (GAUGE.find(g => score <= g.max) || GAUGE[4]).color;
}

function applyRating(circle, score) {
  const s = Math.max(0, Math.min(100, score));
  const size = 28 + (s / 100) * 92; // 28→120px
  const color = getGaugeColor(s);
  const glow = size * 0.3;
  const fontSize = Math.max(12, size * 0.3);
  circle.style.width = size + 'px';
  circle.style.height = size + 'px';
  circle.style.background = color;
  circle.style.boxShadow = `0 0 ${glow}px ${color}80`;
  circle.style.fontSize = fontSize + 'px';
  circle.textContent = Math.round(s);
}
```

### 태그/뱃지

범용 인라인 태그. 카드 메타 영역, 검색 결과 등에서 사용.

```css
.tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 500; padding: 3px 8px;
  border-radius: var(--r-xs); background: var(--bg); color: var(--text-sub);
  border: 1px solid var(--border);
}
.tag.food { background: var(--accent-food-light); color: var(--accent-food); border-color: var(--accent-food-dim); }
.tag.wine { background: var(--accent-wine-light); color: var(--accent-wine); border-color: var(--accent-wine-dim); }
```

| 변형 | 배경 | 텍스트 | 보더 |
|------|------|--------|------|
| 기본 | `--bg` | `--text-sub` | `--border` |
| `.food` | `--accent-food-light` | `--accent-food` | `--accent-food-dim` |
| `.wine` | `--accent-wine-light` | `--accent-wine` | `--accent-wine-dim` |

### 필터 탭

- 밑줄 탭 스타일 (pill 아님)
- 비활성: 13px, 500, `--text-hint`
- 활성: 13px, 700, 액센트색 + 하단 2px 밑줄
- 식당 컨텍스트: `--accent-food` / 와인 컨텍스트: `--accent-wine`

### 필터/소트/검색 시스템

필터·소팅·검색 세 버튼이 나란히 배치되며, **상호 배타** (하나만 열림).

#### 아이콘 버튼 (공통)

| 속성 | 값 |
|------|-----|
| 크기 | 32×32px 터치 영역 |
| 스타일 | 배경/보더 없음, `--text-hint` |
| 활성 상태 | `--accent-food` |

| 버튼 | 아이콘 | 동작 |
|------|--------|------|
| 필터 | `sliders-horizontal` 18px | Notion 스타일 필터 패널 토글 |
| 소팅 | `arrow-up-down` 18px | 소팅 드롭다운 토글 |
| 검색 | `search` 18px | 검색 입력 드롭다운 토글 |

#### Notion 스타일 필터 패널

| 속성 | 값 |
|------|-----|
| 컨테이너 | `ds-filter-drawer`, 접기/펼치기 (`max-height` 애니메이션, 0→260px) |
| 규칙 행 | `flex`, `gap: 6px`, 12px 폰트 |
| 접속사 | Where (첫 행) / And·Or (이후 행, 클릭으로 토글) |
| 속성 드롭다운 | `nyam-select` 컴팩트 사이즈 (12px, 6px radius) |
| 값 드롭다운 | 속성에 따라 옵션 순환 |
| 제거 | `✕` 버튼, hint 색상, active 시 negative |
| 추가 | `+ 필터 추가` 드롭다운 (필터 추가 / 필터 그룹 추가) |
| 적용 | HOME 식당/와인 탭, BUBBLE 탐색 |

#### 필터칩 관리

| 기능 | 설명 |
|------|------|
| 칩 추가 | 필터 조건 설정 시 하단 "필터칩 추가" 바 표시 → 이름 입력 → 저장 |
| 칩 적용 | 저장된 칩 클릭 → 해당 필터 조건 즉시 적용 |
| 칩 수정 | 기존 칩 클릭 → 필터 패널에 조건 로드 → "수정 저장" 모드 |
| 칩 삭제 | 필터 패널 열린 상태에서 칩 우상단 ✕ 버튼 표시 |
| 기본 칩 | home.html의 식당/와인, bubbles.html의 버블/버블러 필터칩은 이 시스템으로 생성된 default 칩 |

**필터칩 스타일**:
- pill 형태 (border-radius 100px), `--border` 보더, `--bg` 배경
- 11px, 600, `--text-sub`
- 활성: `--accent-food` 배경+보더, white 텍스트
- 가로 스크롤 가능 (`overflow-x: auto`, 스크롤바 숨김)

#### 소팅 드롭다운

| 속성 | 값 |
|------|-----|
| 위치 | 절대 위치, 우측 정렬 |
| 스타일 | `border-radius: 12px`, `box-shadow: 0 8px 28px rgba(0,0,0,0.12)` |
| 항목 스타일 | `nyam-dropdown-item` 재사용 |
| 기본 옵션 | 최신순, 점수 높은순, 점수 낮은순, 이름순, 방문 많은순 |

#### 검색 드롭다운

| 속성 | 값 |
|------|-----|
| 위치 | 절대 위치, 우측 정렬, 폭 50% |
| 스타일 | `border-radius: 12px`, `box-shadow: 0 8px 28px` |
| 입력 | textarea 자동 확장 (줄바꿈 시 높이 증가), 14px |
| 아이콘 | `search` 16px (왼쪽) + `x` 14px 클리어 버튼 (오른쪽, 입력 시 표시) |
| placeholder | "식당·와인 이름으로 검색" |

### Dropdown Select

범용 드롭다운 선택 컴포넌트. 정렬, 필터 값, 설정 등 다양한 곳에서 재사용.

```
.nyam-select-wrap > .nyam-select + .nyam-dropdown
```

| 속성 | 값 |
|------|-----|
| 트리거 | `padding: 7px 12px`, `border-radius: 10px`, `--border`, `--bg-card` |
| 폰트 | 13px, 500, `--text` |
| 화살표 | `chevron-down` 16px, `--text-hint`, 열림 시 180° 회전 |
| 드롭다운 | `--bg-elevated`, `border-radius: 12px`, `box-shadow: 0 8px 28px rgba(0,0,0,0.12)`, padding 4px |
| 항목 | `padding: 9px 12px`, `border-radius: 8px`, 13px, hover 시 `--bg` 배경 |
| 선택 상태 | accent 색상 텍스트, font-weight 600 |
| 외부 클릭 | 자동 닫기 |

**변형**:
- `.wine` — 와인 accent (퍼플 포커스/선택 색상)
- `.inline` — 설정 페이지용 컴팩트 (12px, 8px radius, `--bg` 배경)
- `.item-desc` — 옵션 아래 설명 텍스트 (11px, `--text-hint`)
- `.nyam-dropdown-divider` — 옵션 간 구분선 (1px, `--border`)

### 보기 순환 버튼 (view-cycle)

탭 헤더 오른쪽에 위치. 클릭 시 보기 모드를 순환 전환 (상세 → 컴팩트 → 캘린더 등).

| 속성 | 값 |
|------|-----|
| CSS 클래스 | `view-cycle-btn` |
| 크기 | 34×34px |
| 모서리 | `--r-sm` (8px) |
| 배경 | 없음 (active 시 `--bg-page`) |
| 아이콘 | 18×18px SVG, `--text-sub` |
| 용도 | HOME 식당/와인 탭, BUBBLE 상세 탭 |

### 컴팩트 리스트 아이템

간단 보기 모드에서 사용하는 한 줄짜리 아이템. 순위 + 썸네일 + 정보 + 점수.

```
┌──────────────────────────────┐
│ 1  [40×40] 식당/와인명     92  │
│           메타 정보            │
└──────────────────────────────┘
```

| 속성 | 값 |
|------|-----|
| 컨테이너 | `compact-item`, `flex`, `align-items: center`, `gap: 10px`, padding `10px 0` |
| 구분선 | `border-bottom: 1px solid --border` (마지막 제외) |
| 순위 | `compact-rank`, 13px bold, 18px 고정 폭, 중앙 정렬 |
| 순위 1~3 | accent 색상 (식당: `--accent-food`, 와인: `--accent-wine`) |
| 순위 4+ | `--text-hint` |
| 썸네일 | `compact-thumb`, 40×40, `border-radius: 10px` |
| 식당 썸네일 | gradient 배경 (사진 대체) |
| 와인 썸네일 | 어두운 gradient + 와인병 SVG 아이콘 (stroke: `rgba(255,255,255,0.3)`) |
| 이름 | `compact-name`, 14px, 600, `--text`, `text-overflow: ellipsis` |
| 메타 | `compact-meta`, 11px, `--text-hint`, 1줄 (장르 · 지역 · 태그) |
| 점수 | `compact-score`, 18px, 800, 우측 정렬, 32px 최소 폭 |
| 점수 색상 | 식당: `--accent-food` / 와인: `--accent-wine` |
| 미평가 | 14px, 600, `--text-hint`, `—` 표시 |
| 최대 표시 | 제한 없음 (전체 데이터) |

### 고정 헤더 (top-fixed)

모든 페이지 상단 고정 헤더. 글래스모피즘 항상 적용 (스크롤 토글 없음).

```css
.top-fixed {
  position: absolute; top: 0; left: 0; right: 0; z-index: 90;
  background: rgba(248,246,243,0.55);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 1px 12px rgba(0,0,0,0.08);
}
```

| 속성 | 값 |
|------|-----|
| 위치 | `position: absolute; top: 0; left: 0; right: 0;` |
| z-index | 90 |
| 배경 (라이트) | `rgba(248,246,243,0.55)` |
| 배경 (다크) | `rgba(30,28,26,0.88)`, `saturate(1.2)` |
| 블러 | `backdrop-filter: blur(20px) saturate(1.5)` |
| 그림자 | `0 1px 12px rgba(0,0,0,0.08)` |
| 높이 | status-bar 44px + app-header ~36px = 총 ~80px |

#### 헤더 유형: 메인 헤더 vs 내부 페이지 헤더

**메인 헤더** — 최상위 페이지(홈, 버블 목록, 프로필)에서 사용:
```
[nyam 로고]                    [bubbles] [🔔] [아바타]
```

**내부 페이지 헤더** — 하위 페이지(상세, 설정 등)에서 사용:
```
[← 이전페이지명]              [bubbles] [🔔] [아바타]
```

| 속성 | 메인 헤더 | 내부 페이지 헤더 |
|------|----------|----------------|
| 왼쪽 | nyam 로고 (Comfortaa 22px, 그라데이션) | `chevron-left` 22px + 이전 페이지명 16px/600 |
| 오른쪽 | bubbles + 알림 + 아바타 | 동일 (+ 페이지별 액션 버튼 가능) |
| 글래스모피즘 | 동일 적용 | 동일 적용 |
| CSS 클래스 | `.top-fixed` + `.app-header` | `.top-fixed` + `.app-header` + `.inner-back-btn` |

#### 오른쪽 영역 구성

| 요소 | 스타일 |
|------|--------|
| bubbles 버튼 | Comfortaa 13px, 700, `#FF6038`, 텍스트 버튼 (배경 없음) |
| 알림 벨 | `bell` 20px, 34×34 터치 영역, 미읽음 시 우상단 7px 빨간 dot (`--brand` + 1.5px `--bg` 보더) |
| 아바타 | 30×30 원형, `--accent-food` 배경, white 이니셜 (12px, 700) |
| 아바타 메뉴 | 클릭 시 드롭다운 (프로필, 설정), `--bg-elevated`, `border-radius: 12px`, `box-shadow` |

#### 내부 페이지 back 버튼

```css
.inner-back-btn {
  display: flex; align-items: center; gap: 2px;
  background: none; border: none; cursor: pointer;
  padding: 4px 0; color: var(--text);
}
.inner-back-btn svg { width: 22px; height: 22px; color: var(--text-sub); }
.inner-back-btn span { font-size: 16px; font-weight: 600; line-height: 1; }
.inner-back-btn:active { opacity: 0.6; }
```

**규칙:**
- 항상 **직전 페이지명**만 표시 (최상위 페이지명이 아님)
  - 예: 버블 → 직장 맛집 → 설정 → 설정 헤더에는 "직장 맛집" 표시
- 페이지별 액션 버튼(저장, 초대, 만들기 등)은 `header-right`에 bubbles 버튼 앞에 배치

**내부 페이지 목록:**

| 페이지 | 이전 페이지명 | 구현 파일 |
|--------|-------------|----------|
| 버블 상세 | 버블 | 04_bubbles_detail |
| 버블 만들기 | 버블 | 04_bubbles (screen-bubble-create) |
| 버블 설정 | {버블명} | 04_bubbles_detail |
| 버블러 프로필 | 버블명 | 04_bubbler_profile |
| 프로필 공유 (Wrapped) | 프로필 | 03_profile |
| 버블 목록 (프로필 내) | 프로필 | 03_profile |
| 알림 | 프로필 | 06_notifications |
| 설정 | 프로필 | 05_settings |
| 식당 상세 | fab-back만 (히어로 카루셀) | 02_detail_restaurant |
| 와인 상세 | fab-back만 (히어로 카루셀) | 02_detail_wine |

### Floating Back Button (fab-back)

모든 페이지에서 사용하는 하단 좌측 고정 뒤로가기 버튼.

```css
.fab-back {
  position: absolute;
  bottom: 28px; left: 16px; z-index: 85;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(248,246,243,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text);
  transition: transform 0.15s;
}
.fab-back:active { transform: scale(0.9); }
```

| 속성 | 값 |
|------|-----|
| 아이콘 | lucide `chevron-left` 22px |
| 적용 | 온보딩 포함 모든 페이지 |

### Floating Forward Button (fab-forward)

하단 우측 고정 CTA 진행 버튼. 온보딩·기록 플로우에서 사용.

```css
.fab-forward {
  position: absolute;
  bottom: 28px; right: 16px; z-index: 85;
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent-food);
  border: none;
  box-shadow: 0 3px 16px rgba(193,123,94,0.4);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
  transition: transform 0.15s;
}
.fab-forward:active { transform: scale(0.9); }
.fab-forward.wine {
  background: var(--accent-wine);
  box-shadow: 0 3px 16px rgba(139,115,150,0.4);
}
```

| 속성 | 값 |
|------|-----|
| 아이콘 | lucide `chevron-right` 22px, white |
| 식당 | `--accent-food` 배경 + 테라코타 glow |
| 와인 | `--accent-wine` 배경 + 모브 glow |

### Floating Add Button (fab-add)

fab-back과 동일한 글래스모피즘 스타일의 기록 추가 버튼. 하단 우측 고정.

| 속성 | 값 |
|------|-----|
| CSS 클래스 | `fab-add` |
| 크기 | 44×44px 원형 (fab-back과 동일) |
| 위치 | `position: absolute; bottom: 28px; right: 16px;` |
| 배경 | `rgba(248,246,243,0.88)` + `backdrop-filter: blur(12px)` |
| 테두리 | `1px solid var(--border)` |
| 그림자 | `0 2px 12px rgba(0,0,0,0.12)` |
| 아이콘 | lucide `plus` 22px, `color: var(--text)` |
| 터치 | `transform: scale(0.9)` on active |
| z-index | 85 |
| 적용 페이지 | HOME, DETAIL, PROFILE, BUBBLE — 모든 페이지 |
| 동작 — 홈 | 현재 탭(식당/와인)에 따라 기록 플로우 진입 |
| 동작 — 상세 | 해당 식당/와인 선택 스킵 → 바로 사분면 평가 |
| 동작 — 프로필/버블 | 새 기록 추가 (홈과 동일) |

### 토글 스위치

설정 페이지 등에서 ON/OFF 전환에 사용.

```css
.toggle {
  width: 44px; height: 26px;
  border-radius: 13px;
  background: var(--border-bold);
  border: none; cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.toggle::after {
  content: ''; position: absolute;
  top: 2px; left: 2px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: left 0.2s;
}
.toggle.on { background: var(--accent-food); }
.toggle.on::after { left: 20px; }
```

| 상태 | 배경 | 원 위치 |
|------|------|---------|
| OFF | `--border-bold` | left: 2px |
| ON | `--accent-food` | left: 20px |

### 세그먼트 컨트롤

프라이버시 설정 등에서 2~3개 옵션 중 택1.

```css
.prv-segment {
  display: flex; gap: 4px;
  background: var(--bg-page); border-radius: 10px;
  padding: 3px;
}
.prv-segment-btn {
  flex: 1; padding: 8px 4px;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  background: transparent; color: var(--text-sub);
  cursor: pointer; transition: all 0.2s;
}
.prv-segment-btn.active {
  background: var(--bg-elevated);
  color: var(--text); font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
```

### 인풋

- `--r-md`, `--border`, `--bg` 배경
- placeholder: `--text-hint`
- focus: `--border-bold`
- 14px 본문

### 바텀시트

- `--bg-elevated` (순백), `--r-xl` 상단 (`20px 20px 0 0`), `--shadow-sheet`
- 핸들: 36×4px, `--border-bold`, 중앙, `margin: 10px auto 6px`
- max-height: 75%, overflow-y: auto
- 애니메이션: `transform: translateY(100%)` → `translateY(0)`, `0.3s cubic-bezier(0.32, 0.72, 0, 1)`
- 오버레이: `rgba(0,0,0,0.35)`, z-index 20
- 시트: z-index 30
- 내부: 용도에 따라 다양 (인풋+찾기, 옵션 카드+라디오, 정보 리스트 등)

### 알림 드롭다운

헤더 벨 아이콘 클릭 시 표시. 모든 페이지에서 재사용.

| 속성 | 값 |
|------|-----|
| 위치 | `top: 90px; right: 16px;` 절대 위치 |
| 크기 | width 300px, max-height 400px |
| 배경 | `--bg-elevated` |
| 모서리 | 14px |
| 그림자 | `0 6px 24px rgba(0,0,0,0.1)` |
| z-index | 200 |
| 오버레이 | `rgba(0,0,0,0.15)` + `blur(4px)`, z-index 190 |
| 애니메이션 | `scale(0.94) translateY(-6px)` → `scale(1) translateY(0)`, 0.16s |

**헤더**: 14px/700 제목 + "모두 읽음" 버튼 (11px, `--text-hint`)

**알림 아이템**:
- flex, gap 10px, padding `11px 14px`
- 아이콘: 20px 컨테이너, 16px SVG
- 타입별 아이콘 색상:
  - `type-level`: `--caution` (trophy)
  - `type-bubble`: `--accent-food` (circle-dot)
  - `type-social`: `--accent-social` (user-plus)
  - `type-success`: `--positive` (circle-check)
- 제목: 13px/500 (미읽음: 600)
- 본문: 12px, `--text-sub`
- 시간: 11px, `--text-hint`
- 미읽음 dot: 6px, `--brand`

**액션 버튼** (팔로우 요청 등):
- 수락: 다크 배경, white, `3px 10px`, 6px radius
- 거절: transparent, `--text-hint`, 1px `--border`

**푸터**: 12px/500, `--accent-social`, 중앙 정렬

### 넛지 카드

홈 등에서 사용자 행동 유도용. 닫기(dismiss) 가능.

```css
.nudge-card {
  margin: 14px 16px 0; padding: 12px 14px;
  border-radius: 14px; background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex; gap: 12px; align-items: center;
  position: relative;
}
```

| 속성 | 값 |
|------|-----|
| 사진 | 48×48px, gradient 배경, `border-radius: 10px` |
| 제목 | 13px/700, `--text` |
| 설명 | 11px, `--text-hint` |
| 버튼 | flex gap 6px, 11px/600, `--r-xs` |
| 확인 버튼 | `--accent-food` 배경, white |
| 무시 버튼 | `--bg` 배경, `--text-sub`, border |
| 닫기 | 우상단 `x` 16px, `--text-hint` |

### 넛지 스트립

넛지 카드의 축소 변형. 한 줄로 표시, 접기/펼치기 가능.

| 속성 | 값 |
|------|-----|
| 패딩 | `10px 16px` |
| 배경 | `--accent-food-light` |
| max-height | 60px (접힘 시 0) |
| 아이콘 | 28×28 square, `--accent-food` 배경, white 아이콘 |
| 텍스트 | 13px/500, `--text` |
| 액션 | 12px/700, `rgba(193,123,94,0.12)` 배경 |

### 뱃지 pill

식당/와인 상세 페이지에서 외부 평가 표시.

```css
.badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 600; line-height: 1.2;
  padding: 3px 9px; border-radius: 20px;
}
```

**식당 뱃지**:

| 뱃지 | 배경 | 텍스트 | 보더 | 아이콘 |
|------|------|--------|------|--------|
| 미슐랭 | `#FDF6EC` | `#B8860B` | `#E8DDCA` | `star` 10px |
| 블루리본 | `#EDF2FB` | `#4A6FA5` | `#D0DCF0` | `award` 10px |
| TV 출연 | `#FFF3F0` | `--brand` | `#F0D8D0` | `tv` 10px |

**와인 뱃지**:

| 뱃지 | 배경 | 텍스트 | 보더 | 아이콘 |
|------|------|--------|------|--------|
| Wine Class | `--accent-wine-light` | `--accent-wine` | `#DDD6E3` | `award` 10px |
| Vivino | `#FBF0F0` | `#9B2335` | `#E8D0D0` | `grape` 10px |
| Wine Spectator | `#F5F0E8` | `#8B7355` | `#E0D8C8` | `trophy` 10px |

### 스텝 프로그래스 바

온보딩 등 다단계 플로우에서 진행 상태 표시.

| 속성 | 값 |
|------|-----|
| 레이아웃 | flex, gap 6px |
| 개별 바 | flex: 1, height 3px, `border-radius: 2px` |
| 미완료 | `--border` 배경 |
| 현재 | `--accent-food` 배경 |
| 완료 | `--accent-food` 배경, opacity 0.45 |

### 온보딩 네비게이션

fab-back (좌측) + fab-forward (우측) 조합으로 처리. 건너뛰기는 별도 텍스트 링크.

### 인트로 선택 카드

- `--r-lg`, **border 1.5px**, 탭 토글
- 선택: 테마색 1.5px 보더 + light 배경 + 체크 아이콘 22×22 (accent색 bg, `--r-xs`, white ✓)
- 해제: `--border` 1.5px + `--bg-card` + 회색 빈 체크 (`--border` bg)

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

## 8. 만족도 ↔ 사분면 점 크기

| 만족도 | 점 지름(px) |
|--------|-----------|
| 1~20 | 12~16 |
| 21~40 | 17~22 |
| 41~60 | 23~30 |
| 61~80 | 31~40 |
| 81~100 | 41~54 |

---

## 9. 레벨 색상

절제된 톤의 레벨 표시:

| 레벨 | 색상 |
|------|------|
| Lv.1~3 | `--positive` (#7EAE8B) |
| Lv.4~5 | `--accent-social` (#7A9BAE) |
| Lv.6~7 | `--accent-wine` (#8B7396) |
| Lv.8~9 | `--accent-food` (#C17B5E) |
| Lv.10 | `--caution` (#C9A96E) |

---

## 10. 다크모드

### Surface & Text
| 라이트 토큰 | 다크 값 | 설명 |
|------------|---------|------|
| `--bg` | `#1E1C1A` | 따뜻한 다크 (순흑 아님) |
| `--bg-card` | `#2A2725` | 카드 |
| `--bg-elevated` | `#333029` | 시트, 모달 |
| `--bg-page` | `#141210` | 페이지 밖 배경 |
| `--text` | `#E0DDD9` | 웜 화이트 (순백 아님) |
| `--text-sub` | `#9C9690` | |
| `--text-hint` | `#6B6560` | |
| `--border` | `#3A3632` | |
| `--border-bold` | `#4A4640` | |

### Accent Light 오버라이드
| 토큰 | 다크 값 |
|------|---------|
| `--accent-food-light` | `#3A2A22` |
| `--accent-wine-light` | `#2E2533` |
| `--accent-social-light` | `#1E2A30` |

### 카드 상태 다크모드
| 상태 | 배경 | 보더 |
|------|------|------|
| 식당 방문 | `--accent-food-light` | `#5A4030` |
| 와인 확인 | `--accent-wine-light` | `#4A3555` |
| 찜 | `#2E2A1E` | `#5A4A2A` |

### 글래스모피즘 & 오버레이 다크모드
```css
/* 헤더 */
[data-theme="dark"] .top-fixed {
  background: rgba(30,28,26,0.88);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: 0 1px 12px rgba(0,0,0,0.25);
}

/* FAB 버튼 */
[data-theme="dark"] .fab-back,
[data-theme="dark"] .fab-add {
  background: rgba(42,39,37,0.92);
  border-color: var(--border-bold);
}

/* 드롭다운 (nyam-dropdown, sort, search, avatar-menu 등) */
[data-theme="dark"] .nyam-dropdown,
[data-theme="dark"] .avatar-menu,
[data-theme="dark"] .ds-sort-dropdown,
[data-theme="dark"] .ds-search-dropdown {
  background: var(--bg-elevated);
  border-color: var(--border-bold);
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}

/* 알림 드롭다운 */
[data-theme="dark"] .notif-dropdown {
  background: var(--bg-elevated);
  border-color: var(--border-bold);
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
}
```

> 다크모드에서도 따뜻한 톤 유지. 쿨그레이 금지.
> 모든 하드코딩 색상 금지 — 반드시 CSS 변수 토큰 사용.
