## Commands

```bash
pnpm dev          # localhost:7911
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint
```


## Clean Architecture (절대 규칙)

### 계층 구조

```
┌──────────────────────────────────────────────────────┐
│                  app/ (Entry Point)                   │
│            페이지 라우팅만, 로직 없음                    │
├──────────────────────────────────────────────────────┤
│               presentation/ (UI Layer)                │
│         components, containers, UI hooks              │
│            ↓ 의존 (application 호출)                   │
├──────────────────────────────────────────────────────┤
│              application/ (Use Case Layer)             │
│           hooks, useCases, DTOs                        │
│            ↓ 의존 (domain 인터페이스 사용)               │
├──────────────────────────────────────────────────────┤
│                 domain/ (Core Layer)                   │
│      entities, repository interfaces, services        │
│            ✗ 외부 의존성 없음 (순수)                     │
├──────────────────────────────────────────────────────┤
│             infrastructure/ (Infra Layer)              │
│        repository 구현, API 클라이언트, 외부 서비스       │
│            ↑ domain 인터페이스 구현                      │
└──────────────────────────────────────────────────────┘
```

**의존성 방향**: `app → presentation → application → domain ← infrastructure`

### 핵심 규칙 (절대 위반 금지)

| 규칙 | 설명 |
|------|------|
| **R1** | domain은 어떤 레이어에도 의존 금지. React, API 클라이언트 import 불가 |
| **R2** | infrastructure는 domain 인터페이스를 구현 |
| **R3** | application은 domain 인터페이스에만 의존. 구현체 직접 사용 금지 |
| **R4** | presentation은 application hooks만 사용. API 직접 호출 금지 |
| **R5** | app/은 라우팅만. page.tsx는 Container 렌더링만 (loading.tsx, error.tsx는 Next.js 컨벤션이므로 예외) |

### 폴더 구조

```
app/                              # Next.js App Router (라우팅만)
├── page.tsx                      # Container 렌더링만
├── layout.tsx                    # Provider + 구조적 wrapper
└── api/                          # API Routes

presentation/                     # UI Layer
├── components/
│   ├── ui/                       # shadcn 기본 UI
│   ├── layout/                   # 레이아웃 컴포넌트
│   └── [feature]/                # 기능별 순수 UI 컴포넌트
├── containers/                   # Container (hook 호출 + 조합)
└── hooks/                        # UI 상태 hook (useModal, useTabs)

application/                      # Use Case Layer
├── hooks/                        # 데이터/비즈니스 로직 hook
└── useCases/                     # Use Case 로직

domain/                           # Core Layer (순수, 의존성 없음)
├── entities/                     # 엔티티 타입
├── repositories/                 # 인터페이스만
└── services/                     # 도메인 서비스

infrastructure/                   # Infra Layer
├── repositories/                 # Repository 구현체
└── api/                          # API 클라이언트

shared/                           # 공유 유틸리티
├── utils/
└── constants/
```

---

## Component vs Container 패턴

| 구분 | 역할 | 위치 | 규칙 |
|------|------|------|------|
| **Component** | 순수 UI, props만 받음 | `presentation/components/` | 비즈니스 로직 금지, application hook 금지 |
| **Container** | hook 호출, 상태 관리, Component 조합 | `presentation/containers/` | 시각적 스타일링 금지, 구조적 레이아웃만 |

**Component 내 허용되는 React hook**: `useState`, `useEffect`, `useRef` 등 순수 UI 인터랙션 목적만 허용 (토글, hover, 애니메이션 등). application hook은 금지.

**Container에서 허용되는 것**:
- `flex`, `gap-*`, `grid`, `justify-between` 등 구조적 레이아웃 클래스
- 간단한 인라인 빈 상태, 로딩 Skeleton (1~2회 사용이면 별도 컴포넌트 불필요)

### 코드 예시

```typescript
// ❌ 잘못된 코드 - Component에서 API 직접 호출
// presentation/components/cron/CronList.tsx
import { gatewayClient } from '@/infrastructure/api/gateway-client'
export function CronList() {
  const [data, setData] = useState(null)
  useEffect(() => { gatewayClient.getCrons().then(setData) }, [])
}

// ✅ 올바른 코드
// presentation/containers/CronListContainer.tsx
import { useCron } from '@/application/hooks/use-cron'
import { CronList } from '@/presentation/components/cron/CronList'

export function CronListContainer() {
  const { data, isLoading, error } = useCron()
  if (isLoading) return <LoadingState />
  return <CronList jobs={data} />
}

// presentation/components/cron/CronList.tsx
import type { CronJob } from '@/domain/entities/cron'
interface CronListProps { jobs: CronJob[] }
export function CronList({ jobs }: CronListProps) {
  return jobs.map(job => <CronCard key={job.id} job={job} />)
}
```

---

## 과도한 추상화 방지 (YAGNI)

- 동일 패턴 **3회 이상** 반복 → 컴포넌트 추출
- 1~2회 사용 인라인 코드 → 그대로 유지
- 프레임워크 컨벤션 파일을 감싸기만 하는 Container → 만들지 않음

---

## 개발 순서

```
1. domain/entities/*.ts         → 타입 정의
2. domain/repositories/*.ts     → 인터페이스 정의
3. application/hooks/*.ts       → hook 구현 (또는 stub)
4. presentation/components/*    → 순수 UI 구현
5. presentation/containers/*    → Container 조합
6. app/*/page.tsx               → Container 렌더링
7. infrastructure/*             → API 연동
```

---

## 품질 기준

- TypeScript strict, `any` 사용 금지
- ESLint 경고 0개
- API 키/토큰 UI에서 마스킹 처리
- 파일 저장 전 확인 모달 필수
