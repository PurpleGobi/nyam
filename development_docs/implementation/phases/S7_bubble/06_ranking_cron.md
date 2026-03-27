# S7-T6: 버블 랭킹 스냅샷 크론

> 매주 월요일 00:00 UTC 실행 Edge Function. 버블별 식당/와인 랭킹 스냅샷 생성 + 비정규화 필드 갱신.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `systems/DATA_MODEL.md` §4 | bubble_ranking_snapshots 테이블 정의 |
| `pages/08_BUBBLE.md` §12-3 | 랭킹 탭: 포디움(Top 3) + 리스트(4+) + 등락 ▲▼NEW |
| `pages/08_BUBBLE.md` §12-6 | 설정 > 버블 통계 (주간 활성도, 주간 기록 추이) |
| `systems/DATA_MODEL.md` §10 | 비정규화 갱신 전략 (크론 기반) |

---

## 선행 조건

- T7.1 완료: BubbleRankingSnapshot 엔티티, bubbleRepo.insertRankingSnapshots()
- T7.3 완료: 랭킹 탭 (스냅샷 데이터 소비)

---

## 구현 범위

### 파일 목록

| 파일 | 설명 |
|------|------|
| `supabase/functions/weekly-ranking-snapshot/index.ts` | Edge Function 본체 |
| `supabase/migrations/XXX_ranking_cron.sql` | pg_cron 스케줄 등록 |

### 스코프 외

- 일간 비정규화 갱신 크론 (bubble.avg_satisfaction, member.avg_satisfaction 등 → 별도 일간 크론, S8에서)
- 실시간 트리거 기반 카운트 갱신 (INSERT/DELETE 트리거 → S1에서 이미 설정)

---

## 상세 구현 지침

### 1. Edge Function

#### `supabase/functions/weekly-ranking-snapshot/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 매주 월요일 00:00 UTC 실행.
 *
 * 처리 순서:
 * 1. 모든 활성 버블 조회
 * 2. 각 버블에 대해:
 *    a. 지난 주(월~일) 공유된 기록 집계 (bubble_shares → records)
 *    b. target별 평균 만족도 + 기록 수 산출
 *    c. 순위 매기기 (avg_satisfaction DESC, record_count DESC)
 *    d. bubble_ranking_snapshots INSERT
 *    e. bubbles.weekly_record_count / prev_weekly_record_count 갱신
 *    f. bubble_members.weekly_share_count 리셋 (→ 0)
 */

Deno.serve(async (req) => {
  // CRON_SECRET 검증 (pg_cron에서 호출 시)
  const authHeader = req.headers.get('Authorization');
  // ... 인증 검증 ...

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 지난 주 범위 계산
  const now = new Date();
  const lastMonday = getLastMonday(now);     // 지난 주 월요일 00:00 UTC
  const lastSunday = getLastSunday(now);     // 지난 주 일요일 23:59:59 UTC
  const periodStart = lastMonday.toISOString().split('T')[0];  // DATE 형식

  // 1. 모든 활성 버블 ID 조회
  const { data: bubbles } = await supabase
    .from('bubbles')
    .select('id')
    .gt('member_count', 0);

  if (!bubbles || bubbles.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  let totalSnapshots = 0;

  for (const bubble of bubbles) {
    // 2. 지난 주 공유 기록 집계
    const snapshots = await generateRankingSnapshots(
      supabase,
      bubble.id,
      lastMonday,
      lastSunday,
      periodStart
    );

    if (snapshots.length > 0) {
      // 3. 스냅샷 INSERT
      const { error } = await supabase
        .from('bubble_ranking_snapshots')
        .upsert(snapshots, {
          onConflict: 'bubble_id,target_id,target_type,period_start'
        });

      if (error) {
        // 에러 로깅 (console.error는 Edge Function에서 Supabase 로그로 전달)
        // 개별 버블 실패 시 다음 버블 진행 (전체 중단 방지)
      }
      totalSnapshots += snapshots.length;
    }

    // 4. bubbles 비정규화 갱신
    await updateBubbleWeeklyStats(supabase, bubble.id, lastMonday, lastSunday);

    // 5. bubble_members.weekly_share_count 리셋
    await resetMemberWeeklyShareCount(supabase, bubble.id);
  }

  return new Response(
    JSON.stringify({ processed: bubbles.length, snapshots: totalSnapshots }),
    { status: 200 }
  );
});
```

### 2. 핵심 SQL 쿼리

#### 랭킹 스냅샷 생성 쿼리

```sql
-- 버블 내 지난 주 공유 기록을 target별로 집계하여 순위 산출
-- TypeScript에서 supabase.rpc() 또는 raw SQL로 실행

WITH weekly_shares AS (
  -- 지난 주(월~일) 해당 버블에 공유된 기록
  SELECT
    bs.bubble_id,
    r.target_id,
    r.target_type,
    r.satisfaction
  FROM bubble_shares bs
  JOIN records r ON r.id = bs.record_id
  WHERE bs.bubble_id = $1                    -- 버블 ID
    AND bs.shared_at >= $2                   -- lastMonday
    AND bs.shared_at < $3                    -- lastSunday + 1day
    AND r.satisfaction IS NOT NULL
    AND r.status = 'rated'
),
target_stats AS (
  -- target별 평균 만족도 + 기록 수
  SELECT
    bubble_id,
    target_id,
    target_type,
    ROUND(AVG(satisfaction), 1) AS avg_satisfaction,
    COUNT(*) AS record_count
  FROM weekly_shares
  GROUP BY bubble_id, target_id, target_type
),
ranked AS (
  -- 순위 매기기 (평균 만족도 DESC, 기록 수 DESC)
  SELECT
    bubble_id,
    target_id,
    target_type,
    avg_satisfaction,
    record_count,
    ROW_NUMBER() OVER (
      PARTITION BY bubble_id, target_type
      ORDER BY avg_satisfaction DESC, record_count DESC
    ) AS rank_position
  FROM target_stats
)
SELECT
  bubble_id,
  target_id,
  target_type,
  $4::DATE AS period_start,           -- 지난 주 월요일 날짜
  rank_position,
  avg_satisfaction,
  record_count
FROM ranked;
```

#### bubbles 주간 통계 갱신

```sql
-- prev_weekly_record_count = 현재 weekly_record_count (지난 주 값 보존)
-- weekly_record_count = 이번 주 새로 공유된 기록 수 (아직 0, 다음 주 크론에서 집계)
-- 실제로는 지난 주 공유 수를 weekly에, 현재 weekly를 prev에 이동

UPDATE bubbles
SET
  prev_weekly_record_count = weekly_record_count,
  weekly_record_count = (
    SELECT COUNT(*)
    FROM bubble_shares bs
    WHERE bs.bubble_id = bubbles.id
      AND bs.shared_at >= $1        -- lastMonday
      AND bs.shared_at < $2         -- lastSunday + 1day
  ),
  updated_at = NOW()
WHERE id = $3;                      -- 버블 ID
```

#### bubble_members 주간 공유 수 리셋

```sql
-- 이번 주 시작이므로 모든 멤버의 weekly_share_count를 0으로 리셋
UPDATE bubble_members
SET weekly_share_count = 0
WHERE bubble_id = $1
  AND status = 'active';
```

### 3. 날짜 헬퍼 함수

```typescript
/**
 * 지난 주 월요일 00:00:00 UTC
 */
function getLastMonday(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  // 이번 주 월요일 = today - (day === 0 ? 6 : day - 1)
  // 지난 주 월요일 = 이번 주 월요일 - 7
  const thisMondayOffset = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - thisMondayOffset - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * 지난 주 일요일 23:59:59.999 UTC
 */
function getLastSunday(now: Date): Date {
  const monday = getLastMonday(now);
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
```

### 4. Delta 계산 (프론트엔드)

`use-bubble-ranking.ts`에서 delta 계산:

```typescript
interface RankingDelta {
  value: number | 'new' | null;
  direction: 'up' | 'down' | 'new' | 'same';
}

function calculateDelta(
  currentRank: number,
  previousSnapshots: BubbleRankingSnapshot[],
  targetId: string,
  targetType: string
): RankingDelta {
  const prev = previousSnapshots.find(
    s => s.targetId === targetId && s.targetType === targetType
  );

  if (!prev) {
    return { value: 'new', direction: 'new' };
  }

  const diff = prev.rankPosition - currentRank;  // 양수 = 순위 상승
  if (diff === 0) {
    return { value: null, direction: 'same' };
  }
  return {
    value: Math.abs(diff),
    direction: diff > 0 ? 'up' : 'down',
  };
}
```

**UI 표시**:

| direction | 표시 | 색상 |
|-----------|------|------|
| up | `▲N` | `text-positive` (#7EAE8B) |
| down | `▼N` | `text-negative` (#B87272) |
| new | `NEW` | `text-text-hint bg-surface-variant rounded px-1 text-xs` |
| same | `─` | `text-text-hint` |

### 5. pg_cron 스케줄 등록

#### `supabase/migrations/XXX_ranking_cron.sql`

```sql
-- pg_cron 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매주 월요일 00:00 UTC에 Edge Function 호출
SELECT cron.schedule(
  'weekly-ranking-snapshot',
  '0 0 * * 1',    -- 매주 월요일 00:00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/weekly-ranking-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 6. 전체 기간 랭킹 (크론 외)

크론은 **주간 스냅샷만** 생성. "전체 기간" 랭킹은 실시간 쿼리로 산출:

```sql
-- 전체 기간 랭킹: bubble_shares + records를 직접 집계
SELECT
  r.target_id,
  r.target_type,
  ROUND(AVG(r.satisfaction), 1) AS avg_satisfaction,
  COUNT(*) AS record_count,
  ROW_NUMBER() OVER (
    PARTITION BY r.target_type
    ORDER BY AVG(r.satisfaction) DESC, COUNT(*) DESC
  ) AS rank_position
FROM bubble_shares bs
JOIN records r ON r.id = bs.record_id
WHERE bs.bubble_id = $1
  AND r.satisfaction IS NOT NULL
  AND r.status = 'rated'
GROUP BY r.target_id, r.target_type;
```

전체 기간 랭킹에서는 delta 표시 없음 (스냅샷 비교 불가).

### 7. 에러 처리

- **개별 버블 실패**: 해당 버블 건너뛰고 다음 진행 (try-catch per bubble)
- **DB 연결 실패**: 전체 실패 → HTTP 500 반환 → pg_cron 재시도 없음 (다음 주 실행)
- **중복 INSERT**: UPSERT (ON CONFLICT DO UPDATE) — 같은 주에 재실행해도 안전
- **빈 버블**: member_count=0인 버블 스킵 (쿼리 조건에서 제외)

---

## 목업 매핑

| 기능 | 데이터 소스 | 프로토타입 참조 |
|------|----------|---------------|
| 포디움 Top 3 + 등락 | bubble_ranking_snapshots (이번 주 vs 지난 주) | `04_bubbles_detail.html` 랭킹 탭 |
| 리스트 4위~ + 등락 | bubble_ranking_snapshots | `04_bubbles_detail.html` 랭킹 탭 |
| 주간 활성도 +N% | bubbles.weekly/prev_weekly_record_count | `04_bubbles_detail.html` 설정 > 통계 |
| 주간 기록 추이 차트 | bubble_shares 일별 집계 (실시간 쿼리) | `04_bubbles_detail.html` 설정 > 차트 |

---

## 데이터 흐름

```
[크론 실행 - 매주 월요일 00:00 UTC]
  pg_cron → Edge Function 호출
    → 모든 활성 버블 조회
    → 각 버블:
      1. 지난 주 bubble_shares + records 집계
      2. target별 AVG(satisfaction), COUNT(*) 산출
      3. ROW_NUMBER() → rank_position
      4. bubble_ranking_snapshots UPSERT
      5. bubbles: prev_weekly = weekly, weekly = 지난 주 공유 수
      6. bubble_members: weekly_share_count = 0

[프론트엔드 랭킹 표시]
  useBubbleRanking(bubbleId, targetType)
    → bubbleRepo.getRankings(bubbleId, { targetType, periodStart: thisWeekMonday })
      → 이번 주 스냅샷 조회
    → bubbleRepo.getPreviousRankings(bubbleId, targetType, lastWeekMonday)
      → 지난 주 스냅샷 조회
    → calculateDelta(currentRank, previousSnapshots)
    → Top 3 → ranking-podium, 4위~ → ranking-list
```

---

## 검증 체크리스트

```
□ Edge Function: supabase/functions/weekly-ranking-snapshot/index.ts 존재
□ 마이그레이션: pg_cron 스케줄 등록 (매주 월요일 00:00)
□ 스냅샷 생성: bubble_ranking_snapshots에 정확한 데이터 INSERT
□ 랭킹 기준: avg_satisfaction DESC → record_count DESC (동점 처리)
□ target_type 분리: restaurant / wine 별도 순위
□ UPSERT: 같은 주 재실행 시 중복 없음
□ Delta 계산: 이번 주 rank - 지난 주 rank → ▲N/▼N/NEW/─
□ bubbles.weekly_record_count / prev_weekly_record_count 갱신
□ bubble_members.weekly_share_count 리셋 (0)
□ 에러 격리: 개별 버블 실패 시 다른 버블 계속 처리
□ 빈 버블 스킵: member_count=0 제외
□ 전체 기간 랭킹: 실시간 쿼리 (크론 의존 없음)
□ 날짜 헬퍼: getLastMonday/getLastSunday UTC 정확
□ SECURITY DEFINER 사용 안 함
□ pnpm build 에러 없음
```
