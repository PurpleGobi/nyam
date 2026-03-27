# 9.4: 빌드 + 성능 최적화

> 프로덕션 빌드 성공 + LCP < 3s(3G) + 번들 < 500KB + 콘솔 에러 0을 달성한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `CLAUDE.md` | 크리티컬 게이트 (pnpm build, pnpm lint, TypeScript strict) |
| `CLAUDE.md` | 기술 스택 (Next.js App Router, Tailwind, shadcn/ui) |

---

## 선행 조건

- 9.3: 전체 플로우 검증 완료 (기능적 결함 0)

---

## 구현 범위

### 1. 빌드 성공 확인

```bash
# 에러 0 필수
pnpm build
# 빌드 결과에서 각 라우트별 번들 크기 확인
# .next/analyze/ 또는 빌드 출력 확인
```

**빌드 실패 시 즉시 수정 항목:**

| 에러 유형 | 대처 |
|----------|------|
| TypeScript 에러 | domain/entities 수정 또는 infrastructure에서 변환 |
| Import 에러 | 절대 경로 `@/` 확인, 순환 참조 해소 |
| Supabase 타입 에러 | `supabase gen types` 재생성 |
| 빌드 경고 | 경고도 0으로 해소 (unused import, unused variable 등) |

### 2. Lint 확인

```bash
# 경고 0개 유지
pnpm lint
```

| Lint 규칙 | 검증 |
|----------|------|
| `no-console` | console.log 0개 |
| `no-unused-vars` | 미사용 변수 0개 |
| `@typescript-eslint/no-explicit-any` | any 타입 0개 |
| `react-hooks/exhaustive-deps` | deps 누락 0개 |

### 3. TypeScript Strict 검증

```bash
# 아래 패턴이 코드에 0개여야 함 (infrastructure adapter 제외)
grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "infrastructure/"
grep -r "@ts-ignore" src/ --include="*.ts" --include="*.tsx"
grep -r "@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
# ! non-null assertion은 최소화 (infrastructure adapter에서만 허용)
grep -r "\!\\." src/ --include="*.ts" --include="*.tsx" | grep -v "infrastructure/" | grep -v "node_modules/"
```

---

## 성능 목표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **LCP** | < 3s (Fast 3G), < 1s (WiFi) | Lighthouse, Chrome DevTools |
| **FID/INP** | < 200ms | Lighthouse |
| **CLS** | < 0.1 | Lighthouse |
| **Initial Bundle** | < 500KB (gzipped) | `next build` 출력 |
| **Total Bundle** | < 2MB (gzipped) | `next build` 출력 |
| **First Load JS** | 각 라우트 < 200KB | `next build` 출력 |
| **콘솔 에러** | 0개 | Chrome DevTools Console |
| **콘솔 경고** | 0개 | Chrome DevTools Console |

---

## 최적화 항목

### 4. next/image 적용

```typescript
// 모든 <img> 태그를 next/image로 교체
import Image from 'next/image';

// 적용 대상:
// - 식당 상세 히어로 캐러셀
// - 와인 상세 히어로 + 라벨 썸네일
// - 기록 사진 갤러리
// - 홈 카드 뷰 사진
// - 프로필 아바타
// - 버블 피드 기록 사진

// 설정:
// - format: WebP 자동 변환
// - loading: lazy (기본)
// - sizes: 반응형 (360px~393px 기준)
// - placeholder: blur (중요 이미지) 또는 empty
```

**이미지 최적화 체크리스트:**

```
□ 모든 <img> → next/image 교체 완료
□ WebP 포맷 자동 변환 확인
□ lazy loading 기본 적용
□ 히어로 이미지는 priority={true} (LCP 개선)
□ width/height 또는 fill 속성 명시 (CLS 방지)
□ Supabase Storage 이미지 URL에 next/image loader 설정
```

### 5. Dynamic Import (코드 스플리팅)

무거운 컴포넌트를 dynamic import로 분리:

```typescript
import dynamic from 'next/dynamic';

// 캘린더 뷰 (FullCalendar 등)
const CalendarView = dynamic(
  () => import('@/presentation/components/home/calendar-view'),
  { loading: () => <CalendarSkeleton /> }
);

// 지도 뷰 (카카오맵)
const MapView = dynamic(
  () => import('@/presentation/components/home/map-view'),
  { ssr: false, loading: () => <MapSkeleton /> }
);

// 통계 패널 (차트 라이브러리)
const StatsPanel = dynamic(
  () => import('@/presentation/components/home/stats-panel'),
  { loading: () => <StatsSkeleton /> }
);

// 아로마 휠 (와인 기록 전용)
const AromaWheel = dynamic(
  () => import('@/presentation/components/record/aroma-wheel'),
  { loading: () => <AromaWheelSkeleton /> }
);

// 버블 탐색 바텀시트
const BubbleExplorePopup = dynamic(
  () => import('@/presentation/components/onboarding/bubble-explore-popup'),
  { loading: () => null }
);
```

**Dynamic Import 대상 목록:**

| 컴포넌트 | 예상 크기 | 로드 시점 | SSR |
|----------|----------|----------|-----|
| CalendarView | ~80KB | 캘린더 뷰 전환 시 | O |
| MapView (카카오맵) | ~150KB | 지도 뷰 토글 시 | X |
| StatsPanel | ~60KB | 통계 토글 시 | O |
| AromaWheel | ~40KB | 와인 기록 플로우 진입 시 | O |
| NotionFilter | ~30KB | 필터 드로어 열기 시 | O |
| BubbleExplorePopup | ~15KB | 탐색 카드 탭 시 | O |

### 6. 라우트별 코드 스플리팅

Next.js App Router는 자동 라우트 코드 스플리팅을 제공하나, 확인 필요:

```
각 라우트의 First Load JS가 200KB 미만인지 검증:
/                        ← 홈 (가장 무거운 페이지)
/onboarding              ← 온보딩
/restaurants/[id]        ← 식당 상세
/wines/[id]              ← 와인 상세
/records/[id]            ← 기록 상세
/profile                 ← 프로필
/bubbles                 ← 버블 목록
/bubbles/[id]            ← 버블 상세
/settings                ← 설정
```

### 7. 폰트 최적화

```typescript
// next/font를 사용한 Pretendard Variable 로딩
import localFont from 'next/font/local';

const pretendard = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  display: 'swap',           // FOUT 허용 (LCP 개선)
  preload: true,
  variable: '--font-pretendard',
});

// Comfortaa (로고 전용) — google font
import { Comfortaa } from 'next/font/google';

const comfortaa = Comfortaa({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-comfortaa',
  weight: ['700'],            // 로고에서 700만 사용
});
```

### 8. 미사용 의존성 제거

```bash
# 의존성 분석
npx depcheck

# 번들 분석
ANALYZE=true pnpm build
# 또는
npx @next/bundle-analyzer
```

**확인 대상:**

```
□ 미사용 npm 패키지 제거
□ 미사용 shadcn/ui 컴포넌트 제거하지 않음 (tree-shaking으로 자동 제외)
□ 중복 의존성 확인 (lodash vs lodash-es 등)
□ devDependencies가 프로덕션 번들에 포함되지 않음
```

### 9. Tree Shaking 검증

```bash
# lucide-react: named import만 사용하는지 확인
# ❌ import * as Icons from 'lucide-react'
# ✅ import { Home, Users, ChevronRight } from 'lucide-react'
grep -r "import \* as.*lucide" src/ --include="*.tsx"
# 결과 0개여야 함

# barrel export 패턴 확인 (tree-shaking 방해)
# shared/constants/index.ts 등에서 전체 re-export 피하기
```

### 10. 콘솔 에러/경고 0

```
확인 페이지 목록 (모든 라우트):
□ / (홈)
□ /onboarding
□ /restaurants/[id] (시드 데이터)
□ /wines/[id]
□ /records/[id]
□ /profile
□ /bubbles
□ /bubbles/[id]
□ /settings
□ /users/[id] (버블러 프로필)

각 페이지에서:
□ Console 탭 에러 0개
□ Console 탭 경고 0개
□ Network 탭 실패 요청 0개 (4xx, 5xx)
□ React 개발 모드 경고 0개
```

---

## Lighthouse 감사 목표

| 카테고리 | 목표 점수 |
|----------|----------|
| Performance | >= 80 (Mobile), >= 90 (Desktop) |
| Accessibility | >= 90 |
| Best Practices | >= 90 |
| SEO | >= 80 |

**측정 조건:**

```
- 기기: Mobile (Moto G Power)
- 네트워크: Simulated Slow 4G
- CPU: 4x slowdown
- 3회 측정 후 중간값
```

---

## 캐싱 전략

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },  // Supabase Storage
    ],
    formats: ['image/webp'],
  },
  headers: async () => [
    {
      source: '/fonts/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};
```

---

## 검증 체크리스트

```
□ pnpm build 에러 0
□ pnpm lint 경고 0
□ TypeScript: any/as any/@ts-ignore/! = 0 (infrastructure adapter 제외)
□ LCP < 3s (Fast 3G), < 1s (WiFi) — 홈, 상세 페이지
□ FID/INP < 200ms
□ CLS < 0.1
□ Initial Bundle < 500KB (gzipped)
□ Total Bundle < 2MB (gzipped)
□ 각 라우트 First Load JS < 200KB
□ 모든 <img> → next/image 교체
□ WebP 자동 변환 확인
□ 히어로 이미지 priority={true}
□ Dynamic import: 지도/캘린더/통계/아로마 휠
□ Pretendard preload + swap
□ Comfortaa weight:700 only
□ 미사용 의존성 제거
□ lucide-react named import only
□ 콘솔 에러 0, 경고 0 (모든 라우트)
□ Network 실패 요청 0
□ Lighthouse Performance >= 80 (Mobile)
□ Lighthouse Accessibility >= 90
```
