# S6-T1: XP 계산 엔진 + 활성 XP 크론

> SSOT: `systems/XP_SYSTEM.md`, `systems/DATA_MODEL.md` §3
> 선행: S1 (DB 스키마), S2 (기록 플로우)
> 산출물: domain 엔티티, 순수 계산 서비스, infrastructure 저장소, application hook, Edge Function

---

## 1. Domain 엔티티

### `src/domain/entities/xp.ts`

```typescript
/** 축별 경험치 (user_experiences 테이블) */
export interface UserExperience {
  id: string;
  userId: string;
  axisType: AxisType;
  axisValue: string;        // 'restaurant'|'wine' (category) / '을지로' (area) / '일식' (genre) 등
  totalXp: number;
  level: number;
  updatedAt: string;
}

export type AxisType = 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region';

export type CategoryValue = 'restaurant' | 'wine';

/** XP 이력 (xp_histories 테이블) */
export interface XpHistory {
  id: string;
  userId: string;
  recordId: string | null;
  axisType: AxisType | null;
  axisValue: string | null;
  xpAmount: number;
  reason: XpReason;
  createdAt: string;
}

export type XpReason =
  | 'record_name'          // 이름만 등록 (XP 0)
  | 'record_score'         // +사분면 점수 (+3)
  | 'record_photo'         // +사진 EXIF GPS (+8)
  | 'record_full'          // +풀 기록 (+18)
  | 'detail_axis'          // 세부 축 XP (+5)
  | 'category'             // 카테고리 합산 갱신
  | 'social_share'         // 버블 공유 (+1)
  | 'social_like'          // 좋아요/찜 받음 (+1)
  | 'social_follow'        // 팔로워 획득 (+1)
  | 'social_mutual'        // 맞팔 성사 (+2)
  | 'bonus_onboard'        // 온보딩 완료 (+10)
  | 'bonus_first_record'   // 첫 기록 (+5)
  | 'bonus_first_bubble'   // 첫 버블 생성 (+5)
  | 'bonus_first_share'    // 첫 버블 공유 (+3)
  | 'milestone'            // 마일스톤 달성
  | 'revisit';             // 재방문 기록

/** 레벨 임계값 (level_thresholds 테이블 — 시드 데이터, 인메모리 캐시) */
export interface LevelThreshold {
  level: number;
  requiredXp: number;
  title: string;            // '입문자'|'초보 미식가'|'탐식가'|'미식가'|'식도락 마스터'
  color: string;            // '#7EAE8B'|'#7A9BAE'|'#8B7396'|'#C17B5E'|'#C9A96E'
}

/** 마일스톤 정의 (milestones 테이블) */
export interface Milestone {
  id: string;
  axisType: string;         // 'category'|'area'|'genre'|'wine_variety'|'wine_region'|'global'
  metric: string;           // 'unique_places'|'total_records'|'revisits'|'unique_wines'
  threshold: number;        // 달성 기준값 (10, 20, 30, 50, 100...)
  xpReward: number;         // +25 ~ +50
  label: string;            // "50번째 고유 장소" 등
}

/** 유저 마일스톤 달성 기록 (user_milestones 테이블) */
export interface UserMilestone {
  userId: string;
  milestoneId: string;
  axisValue: string;        // '을지로' 등, global이면 '_global'
  achievedAt: string;
}

/** XP 계산 결과 (서비스에서 반환) */
export interface XpCalculationResult {
  totalXpGain: number;                          // 종합 XP 획득량
  detailAxisGains: DetailAxisGain[];            // 세부 축 XP 획득 목록
  categoryUpdates: CategoryUpdate[];            // 카테고리 XP 갱신 목록
  milestoneAchieved: MilestoneAchievement[];    // 달성된 마일스톤
  levelUps: LevelUpEvent[];                     // 레벨업 이벤트
}

export interface DetailAxisGain {
  axisType: AxisType;
  axisValue: string;
  xp: number;               // 항상 +5
}

export interface CategoryUpdate {
  categoryValue: CategoryValue;
  newTotalXp: number;
}

export interface MilestoneAchievement {
  milestone: Milestone;
  axisValue: string;
}

export interface LevelUpEvent {
  scope: 'total' | 'category' | 'detail';
  axisType?: AxisType;
  axisValue?: string;
  previousLevel: number;
  newLevel: number;
  title: string;
  color: string;
}

/** 레벨 정보 (getLevel 함수 반환 타입) */
export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
}

/** 소셜 XP 일일 카운트 (어뷰징 방지용) */
export interface DailySocialCounts {
  share: number;
  like: number;
  follow: number;
  mutual: number;
  total: number;            // 합산 (상한 10 체크용)
}

/** 소셜 액션 타입 */
export type SocialAction = 'share' | 'like' | 'follow' | 'mutual';

/** 보너스 타입 */
export type BonusType = 'onboard' | 'first_record' | 'first_bubble' | 'first_share';
```

---

## 2. Domain Repository 인터페이스

### `src/domain/repositories/xp-repository.ts`

```typescript
import type {
  UserExperience, XpHistory, LevelThreshold, Milestone,
  UserMilestone, AxisType, DailySocialCounts, BonusType,
} from '@/domain/entities/xp';

export interface XpRepository {
  // ── 경험치 조회 ──
  getUserExperiences(userId: string): Promise<UserExperience[]>;
  getUserExperiencesByAxisType(userId: string, axisType: AxisType): Promise<UserExperience[]>;
  getUserExperience(userId: string, axisType: AxisType, axisValue: string): Promise<UserExperience | null>;

  // ── 종합 XP 조회 ──
  getUserTotalXp(userId: string): Promise<number>;

  // ── 경험치 갱신 ──
  upsertUserExperience(userId: string, axisType: AxisType, axisValue: string, xpDelta: number, newLevel: number): Promise<UserExperience>;
  updateUserTotalXp(userId: string, xpDelta: number): Promise<void>;

  // ── XP 이력 ──
  getRecentXpHistories(userId: string, limit: number): Promise<XpHistory[]>;
  getHistoriesByRecord(recordId: string): Promise<XpHistory[]>;
  createXpHistory(history: Omit<XpHistory, 'id' | 'createdAt'>): Promise<XpHistory>;
  deleteByRecordId(recordId: string): Promise<void>;

  // ── 레벨 테이블 ──
  getLevelThresholds(): Promise<LevelThreshold[]>;

  // ── 마일스톤 ──
  getMilestonesByAxisType(axisType: string): Promise<Milestone[]>;
  getNextMilestone(axisType: string, metric: string, currentCount: number): Promise<Milestone | null>;
  getUserMilestones(userId: string): Promise<UserMilestone[]>;
  hasAchievedMilestone(userId: string, milestoneId: string, axisValue: string): Promise<boolean>;
  createUserMilestone(userId: string, milestoneId: string, axisValue: string): Promise<UserMilestone>;

  // ── 어뷰징 방지 ──
  getDailySocialCounts(userId: string, date: string): Promise<DailySocialCounts>;
  getDailyRecordCount(userId: string, date: string): Promise<number>;
  getLastScoreDate(userId: string, targetId: string): Promise<string | null>;

  // ── 보너스 ──
  hasBonusBeenGranted(userId: string, bonusType: BonusType): Promise<boolean>;

  // ── 기록 XP 저장 ──
  updateRecordQualityXp(recordId: string, xp: number): Promise<void>;

  // ── 통계 조회 (프로필용) ──
  getUniqueCount(userId: string, axisType: AxisType, axisValue: string): Promise<number>;
  getTotalRecordCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number>;
  getRevisitCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number>;
  getXpBreakdownByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<Record<string, number>>;
}
```

---

## 3. Domain 서비스 (순수 함수, 외부 의존 0)

### `src/domain/services/xp-calculator.ts`

> **R1 준수**: React, Supabase, Next.js import 절대 금지. 순수 TypeScript만.

```typescript
import type {
  LevelThreshold, LevelInfo, AxisType, DetailAxisGain, SocialAction,
  DailySocialCounts, Milestone,
} from '@/domain/entities/xp';
import type { DiningRecord } from '@/domain/entities/record';

// ────────────────────────────────────────────
// 1. 기록 XP 산출
// ────────────────────────────────────────────

/**
 * 기록 품질 기반 XP 산출 (종합 XP에 적립).
 * 한 기록당 최고 1개만 적용 (중복 아님).
 *
 * | 기록 수준         | XP  |
 * |-------------------|-----|
 * | 이름만 등록       |  0  |
 * | + 사분면 점수     | +3  |
 * | + 사진 (EXIF GPS) | +8  |
 * | + 풀 기록         | +18 |
 */
export function calculateRecordXp(record: DiningRecord): number {
  const hasScore = record.satisfaction !== null && record.satisfaction !== undefined;
  // XP_SYSTEM.md §4-1: "+사진 (EXIF GPS 검증)" = +8 XP
  // hasExifGps가 true이고 is_exif_verified가 true일 때만 photo 레벨 (+8)
  // 사진이 있지만 GPS 없는 경우: score 레벨 (+3)만 부여
  const hasPhoto = record.hasExifGps === true && record.isExifVerified === true;
  const hasFullReview =
    hasScore &&
    hasPhoto &&
    !!record.comment &&
    record.comment.length > 0 &&
    record.menuTags !== null &&
    record.menuTags !== undefined &&
    record.menuTags.length > 0;

  if (hasFullReview) return 18;
  if (hasPhoto && hasScore) return 8;
  if (hasScore) return 3;
  return 0; // 이름만 등록 → XP 0
}

/**
 * XP reason 문자열 산출.
 */
export function getRecordXpReason(xp: number): 'record_full' | 'record_photo' | 'record_score' | 'record_name' {
  if (xp === 18) return 'record_full';
  if (xp === 8) return 'record_photo';
  if (xp === 3) return 'record_score';
  return 'record_name';
}

// ────────────────────────────────────────────
// 2. 세부 축 XP 산출
// ────────────────────────────────────────────

/**
 * 기록에서 세부 축 XP 산출 (종합 XP에 미포함).
 * 하나의 기록 → 해당 세부 축 2개에 각 +5.
 *
 * 식당 기록: area(지역) + genre(장르)
 * 와인 기록: wine_region(산지) + wine_variety(품종)
 */
export function calculateDetailAxisXp(
  record: DiningRecord,
  restaurantArea?: string | null,
  restaurantGenre?: string | null,
  wineRegion?: string | null,
  wineVariety?: string | null,
): DetailAxisGain[] {
  const gains: DetailAxisGain[] = [];
  const XP_PER_AXIS = 5;

  if (record.targetType === 'restaurant') {
    if (restaurantArea) {
      gains.push({ axisType: 'area', axisValue: restaurantArea, xp: XP_PER_AXIS });
    }
    if (restaurantGenre) {
      gains.push({ axisType: 'genre', axisValue: restaurantGenre, xp: XP_PER_AXIS });
    }
  } else if (record.targetType === 'wine') {
    if (wineRegion) {
      gains.push({ axisType: 'wine_region', axisValue: wineRegion, xp: XP_PER_AXIS });
    }
    if (wineVariety) {
      gains.push({ axisType: 'wine_variety', axisValue: wineVariety, xp: XP_PER_AXIS });
    }
  }

  return gains;
}

/**
 * 세부 축 XP → 카테고리 XP 합산 대상 매핑.
 */
export function getCategoryForAxisType(axisType: AxisType): 'restaurant' | 'wine' | null {
  switch (axisType) {
    case 'area':
    case 'genre':
      return 'restaurant';
    case 'wine_region':
    case 'wine_variety':
      return 'wine';
    case 'category':
      return null;
    default:
      return null;
  }
}

// ────────────────────────────────────────────
// 3. 소셜 XP 산출
// ────────────────────────────────────────────

const SOCIAL_XP_MAP: Record<SocialAction, number> = {
  share: 1,
  like: 1,
  follow: 1,
  mutual: 2,
};

const SOCIAL_DAILY_CAP = 10;

/**
 * 소셜 XP 산출 (일일 상한 10 적용).
 * 상한 초과 시 0 반환.
 */
export function calculateSocialXp(
  action: SocialAction,
  dailyCounts: DailySocialCounts,
): number {
  const baseXp = SOCIAL_XP_MAP[action];

  if (dailyCounts.total + baseXp > SOCIAL_DAILY_CAP) {
    const remaining = SOCIAL_DAILY_CAP - dailyCounts.total;
    return Math.max(0, remaining);
  }

  return baseXp;
}

// ────────────────────────────────────────────
// 4. 보너스 XP 테이블
// ────────────────────────────────────────────

export const BONUS_XP_MAP = {
  onboard: 10,
  first_record: 5,
  first_bubble: 5,
  first_share: 3,
} as const;

// ────────────────────────────────────────────
// 5. 레벨 산출
// ────────────────────────────────────────────

/**
 * XP → 레벨 정보 산출.
 * level_thresholds 배열은 level ASC 정렬 전제.
 *
 * 반환: { level, title, color, currentXp, nextLevelXp, progress }
 */
export function getLevel(
  totalXp: number,
  thresholds: LevelThreshold[],
): LevelInfo {
  let currentLevel = thresholds[0];

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalXp >= thresholds[i].requiredXp) {
      currentLevel = thresholds[i];
      break;
    }
  }

  const nextThreshold = thresholds.find((t) => t.level === currentLevel.level + 1);
  const nextLevelXp = nextThreshold ? nextThreshold.requiredXp : currentLevel.requiredXp;
  const xpInCurrentLevel = totalXp - currentLevel.requiredXp;
  const xpNeededForNext = nextLevelXp - currentLevel.requiredXp;
  const progress = xpNeededForNext > 0 ? Math.min(1, xpInCurrentLevel / xpNeededForNext) : 1;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    color: currentLevel.color,
    currentXp: totalXp,
    nextLevelXp,
    progress,
  };
}

/**
 * 레벨 색상 반환 (레벨 테이블 없이 직접 산출).
 * | 1~3 | #7EAE8B (green) |
 * | 4~5 | #7A9BAE (blue)  |
 * | 6~7 | #8B7396 (purple)|
 * | 8~9 | #C17B5E (primary)|
 * | 10+ | #C9A96E (gold)  |
 */
export function getLevelColor(level: number): string {
  if (level <= 3) return '#7EAE8B';
  if (level <= 5) return '#7A9BAE';
  if (level <= 7) return '#8B7396';
  if (level <= 9) return '#C17B5E';
  return '#C9A96E';
}

/**
 * 레벨 칭호 반환.
 */
export function getLevelTitle(level: number): string {
  if (level <= 3) return '입문자';
  if (level <= 5) return '초보 미식가';
  if (level <= 7) return '탐식가';
  if (level <= 9) return '미식가';
  return '식도락 마스터';
}

// ────────────────────────────────────────────
// 6. 어뷰징 방지 체크 (순수 함수)
// ────────────────────────────────────────────

const DAILY_RECORD_CAP = 20;
const DUPLICATE_RESTAURANT_MONTHS = 6;

/**
 * 하루 기록 상한 체크.
 */
export function isDailyRecordCapReached(dailyCount: number): boolean {
  return dailyCount >= DAILY_RECORD_CAP;
}

/**
 * 같은 식당 점수 6개월 제한 체크.
 * lastScoreDate가 6개월 이내면 true (차단).
 */
export function isDuplicateScoreBlocked(lastScoreDate: string | null): boolean {
  if (!lastScoreDate) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - DUPLICATE_RESTAURANT_MONTHS);
  return new Date(lastScoreDate) > sixMonthsAgo;
}

// ────────────────────────────────────────────
// 7. 마일스톤 체크
// ────────────────────────────────────────────

/**
 * 현재 카운트가 마일스톤 달성 기준을 넘었는지 체크.
 * 이미 달성한 마일스톤은 제외해야 하므로 외부에서 필터링 필요.
 */
export function checkMilestoneReached(
  currentCount: number,
  milestone: Milestone,
): boolean {
  return currentCount >= milestone.threshold;
}

// ────────────────────────────────────────────
// 8. 레벨 커브 생성 유틸 (시드 데이터 생성용)
// ────────────────────────────────────────────

/**
 * 앵커 포인트 간 선형 보간으로 Lv.1~99 전체 XP 테이블 생성.
 * 앵커: XP_SYSTEM.md §5 정의.
 */
const ANCHORS: [number, number][] = [
  [1, 0], [2, 3], [6, 25], [8, 50], [12, 100], [18, 200],
  [30, 500], [62, 3_700], [72, 7_500], [78, 12_000], [81, 16_000],
  [85, 25_000], [92, 50_000], [99, 100_000],
];

export function generateLevelThresholds(): LevelThreshold[] {
  const thresholds: LevelThreshold[] = [];

  for (let lv = 1; lv <= 99; lv++) {
    let xp = 0;
    // 앵커 구간 찾기
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const [lvA, xpA] = ANCHORS[i];
      const [lvB, xpB] = ANCHORS[i + 1];
      if (lv >= lvA && lv <= lvB) {
        // 선형 보간
        const ratio = (lv - lvA) / (lvB - lvA);
        xp = Math.round(xpA + ratio * (xpB - xpA));
        break;
      }
    }

    thresholds.push({
      level: lv,
      requiredXp: xp,
      title: getLevelTitle(lv),
      color: getLevelColor(lv),
    });
  }

  return thresholds;
}

// ────────────────────────────────────────────
// 9. 상수 export
// ────────────────────────────────────────────

export const XP_CONSTANTS = {
  RECORD_NAME: 0,
  RECORD_SCORE: 3,
  RECORD_PHOTO: 8,
  RECORD_FULL: 18,
  DETAIL_AXIS: 5,
  SOCIAL_SHARE: 1,
  SOCIAL_LIKE: 1,
  SOCIAL_FOLLOW: 1,
  SOCIAL_MUTUAL: 2,
  SOCIAL_DAILY_CAP: 10,
  DAILY_RECORD_CAP: 20,
  DUPLICATE_MONTHS: 6,
} as const;
```

---

## 4. Infrastructure 구현

### `src/infrastructure/repositories/supabase-xp-repository.ts`

```typescript
import type { XpRepository } from '@/domain/repositories/xp-repository';
import type {
  UserExperience, XpHistory, LevelThreshold, Milestone,
  UserMilestone, AxisType, DailySocialCounts, BonusType,
} from '@/domain/entities/xp';
import { createClient } from '@/infrastructure/supabase/client';

export class SupabaseXpRepository implements XpRepository {
  private supabase = createClient();

  // ── 경험치 조회 ──

  async getUserExperiences(userId: string): Promise<UserExperience[]> {
    const { data, error } = await this.supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(mapUserExperience);
  }

  async getUserExperiencesByAxisType(userId: string, axisType: AxisType): Promise<UserExperience[]> {
    const { data, error } = await this.supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId)
      .eq('axis_type', axisType);
    if (error) throw error;
    return (data ?? []).map(mapUserExperience);
  }

  async getUserExperience(userId: string, axisType: AxisType, axisValue: string): Promise<UserExperience | null> {
    const { data, error } = await this.supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId)
      .eq('axis_type', axisType)
      .eq('axis_value', axisValue)
      .maybeSingle();
    if (error) throw error;
    return data ? mapUserExperience(data) : null;
  }

  // ── 경험치 갱신 ──

  async upsertUserExperience(
    userId: string, axisType: AxisType, axisValue: string,
    xpDelta: number, newLevel: number,
  ): Promise<UserExperience> {
    // UPSERT: user_id+axis_type+axis_value 유니크 제약 활용
    const { data, error } = await this.supabase.rpc('upsert_user_experience', {
      p_user_id: userId,
      p_axis_type: axisType,
      p_axis_value: axisValue,
      p_xp_delta: xpDelta,
      p_new_level: newLevel,
    });
    if (error) throw error;
    return mapUserExperience(data);
  }

  async updateUserTotalXp(userId: string, xpDelta: number): Promise<void> {
    const { error } = await this.supabase.rpc('increment_user_total_xp', {
      p_user_id: userId,
      p_xp_delta: xpDelta,
    });
    if (error) throw error;
  }

  // ── XP 이력 ──

  async getRecentXpHistories(userId: string, limit: number): Promise<XpHistory[]> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapXpHistory);
  }

  async createXpHistory(history: Omit<XpHistory, 'id' | 'createdAt'>): Promise<XpHistory> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .insert({
        user_id: history.userId,
        record_id: history.recordId,
        axis_type: history.axisType,
        axis_value: history.axisValue,
        xp_amount: history.xpAmount,
        reason: history.reason,
      })
      .select()
      .single();
    if (error) throw error;
    return mapXpHistory(data);
  }

  // ── 레벨 테이블 ──

  async getLevelThresholds(): Promise<LevelThreshold[]> {
    const { data, error } = await this.supabase
      .from('level_thresholds')
      .select('*')
      .order('level', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapLevelThreshold);
  }

  // ── 마일스톤 ──

  async getMilestonesByAxisType(axisType: string): Promise<Milestone[]> {
    const { data, error } = await this.supabase
      .from('milestones')
      .select('*')
      .eq('axis_type', axisType);
    if (error) throw error;
    return (data ?? []).map(mapMilestone);
  }

  async getNextMilestone(axisType: string, metric: string, currentCount: number): Promise<Milestone | null> {
    const { data, error } = await this.supabase
      .from('milestones')
      .select('*')
      .eq('axis_type', axisType)
      .eq('metric', metric)
      .gt('threshold', currentCount)
      .order('threshold', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapMilestone(data) : null;
  }

  async getUserMilestones(userId: string): Promise<UserMilestone[]> {
    const { data, error } = await this.supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(mapUserMilestone);
  }

  async hasAchievedMilestone(userId: string, milestoneId: string, axisValue: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('user_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('milestone_id', milestoneId)
      .eq('axis_value', axisValue);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async createUserMilestone(userId: string, milestoneId: string, axisValue: string): Promise<UserMilestone> {
    const { data, error } = await this.supabase
      .from('user_milestones')
      .insert({ user_id: userId, milestone_id: milestoneId, axis_value: axisValue })
      .select()
      .single();
    if (error) throw error;
    return mapUserMilestone(data);
  }

  // ── 어뷰징 방지 ──

  async getDailySocialCounts(userId: string, date: string): Promise<DailySocialCounts> {
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;
    const { data, error } = await this.supabase
      .from('xp_histories')
      .select('reason, xp_amount')
      .eq('user_id', userId)
      .in('reason', ['social_share', 'social_like', 'social_follow', 'social_mutual'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
    if (error) throw error;

    const counts: DailySocialCounts = { share: 0, like: 0, follow: 0, mutual: 0, total: 0 };
    for (const row of data ?? []) {
      const xp = row.xp_amount ?? 0;
      if (row.reason === 'social_share') counts.share += xp;
      else if (row.reason === 'social_like') counts.like += xp;
      else if (row.reason === 'social_follow') counts.follow += xp;
      else if (row.reason === 'social_mutual') counts.mutual += xp;
      counts.total += xp;
    }
    return counts;
  }

  async getDailyRecordCount(userId: string, date: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lte('created_at', `${date}T23:59:59Z`);
    if (error) throw error;
    return count ?? 0;
  }

  async getLastScoreDate(userId: string, targetId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('records')
      .select('score_updated_at')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .not('score_updated_at', 'is', null)
      .order('score_updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.score_updated_at ?? null;
  }

  // ── 보너스 ──

  async hasBonusBeenGranted(userId: string, bonusType: BonusType): Promise<boolean> {
    const reasonMap: Record<BonusType, string> = {
      onboard: 'bonus_onboard',
      first_record: 'bonus_first_record',
      first_bubble: 'bonus_first_bubble',
      first_share: 'bonus_first_share',
    };
    const { count, error } = await this.supabase
      .from('xp_histories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reason', reasonMap[bonusType]);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  // ── 통계 조회 ──

  async getUniqueCount(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    // 축 타입에 따라 다른 JOIN 필요 — RPC 함수 사용
    const { data, error } = await this.supabase.rpc('get_unique_count', {
      p_user_id: userId, p_axis_type: axisType, p_axis_value: axisValue,
    });
    if (error) throw error;
    return data ?? 0;
  }

  async getTotalRecordCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_record_count_by_axis', {
      p_user_id: userId, p_axis_type: axisType, p_axis_value: axisValue,
    });
    if (error) throw error;
    return data ?? 0;
  }

  async getRevisitCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_revisit_count_by_axis', {
      p_user_id: userId, p_axis_type: axisType, p_axis_value: axisValue,
    });
    if (error) throw error;
    return data ?? 0;
  }

  async getXpBreakdownByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .select('reason, xp_amount')
      .eq('user_id', userId)
      .eq('axis_type', axisType)
      .eq('axis_value', axisValue);
    if (error) throw error;

    const breakdown: Record<string, number> = {};
    for (const row of data ?? []) {
      const key = row.reason ?? 'unknown';
      breakdown[key] = (breakdown[key] ?? 0) + (row.xp_amount ?? 0);
    }
    return breakdown;
  }
}

// ── 매퍼 ──

function mapUserExperience(row: Record<string, unknown>): UserExperience {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    axisType: row.axis_type as AxisType,
    axisValue: row.axis_value as string,
    totalXp: row.total_xp as number,
    level: row.level as number,
    updatedAt: row.updated_at as string,
  };
}

function mapXpHistory(row: Record<string, unknown>): XpHistory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    recordId: (row.record_id as string) ?? null,
    axisType: (row.axis_type as AxisType) ?? null,
    axisValue: (row.axis_value as string) ?? null,
    xpAmount: row.xp_amount as number,
    reason: row.reason as XpHistory['reason'],
    createdAt: row.created_at as string,
  };
}

function mapLevelThreshold(row: Record<string, unknown>): LevelThreshold {
  return {
    level: row.level as number,
    requiredXp: row.required_xp as number,
    title: row.title as string,
    color: row.color as string,
  };
}

function mapMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    axisType: row.axis_type as string,
    metric: row.metric as string,
    threshold: row.threshold as number,
    xpReward: row.xp_reward as number,
    label: row.label as string,
  };
}

function mapUserMilestone(row: Record<string, unknown>): UserMilestone {
  return {
    userId: row.user_id as string,
    milestoneId: row.milestone_id as string,
    axisValue: row.axis_value as string,
    achievedAt: row.achieved_at as string,
  };
}
```

---

## 5. Application Hook

### `src/application/hooks/use-xp-calculation.ts`

```typescript
'use client'

import { useCallback } from 'react';
import type { DiningRecord } from '@/domain/entities/record';
import type { XpCalculationResult, LevelThreshold, DetailAxisGain } from '@/domain/entities/xp';
import {
  calculateRecordXp, getRecordXpReason, calculateDetailAxisXp,
  getCategoryForAxisType, getLevel, isDuplicateScoreBlocked,
  isDailyRecordCapReached, checkMilestoneReached, BONUS_XP_MAP,
} from '@/domain/services/xp-calculator';
import { xpRepo } from '@/shared/di/container';
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format';

/**
 * XP 계산 + 적립 오케스트레이션 hook.
 *
 * 기록 저장 시 호출 순서:
 * 0. 일일 기록 상한 체크
 * 1. 기록 품질 → XP 산출
 * 2. 같은 식당/와인 점수 6개월 제한 체크
 * 2.5. record_quality_xp 저장
 * 2.6. 수정 모드 차액 산출
 * 3. 종합 XP 적립 (차액만)
 * 3.5. 첫 기록 보너스
 * 4. 세부 축 XP 적립 (신규만 — 수정 시 이미 적립됨)
 * 5. 카테고리 XP 갱신 (세부 축 합산)
 * 6. 마일스톤 체크
 * 7. 종합 레벨 체크 → 레벨업 알림
 */
export function useXpCalculation() {
  const processRecordXp = useCallback(async (
    userId: string,
    record: DiningRecord,
    restaurantArea: string | null,
    restaurantGenre: string | null,
    wineRegion: string | null,
    wineVariety: string | null,
    thresholds: LevelThreshold[],
    /** 수정 모드: 이전에 부여된 record_quality_xp. 차액만 적립. */
    previousRecordXp?: number,
  ): Promise<XpCalculationResult> => {
    const isEdit = previousRecordXp !== undefined;
    const result: XpCalculationResult = { ... };

    // Step 0: 일일 기록 상한 체크 (신규만)
    if (!isEdit) {
      const today = todayInTz(detectBrowserTimezone());
      const dailyCount = await xpRepo.getDailyRecordCount(userId, today);
      if (isDailyRecordCapReached(dailyCount)) return result;
    }

    // Step 1~2: 기록 품질 → XP 산출 + 중복 체크
    let recordXp = calculateRecordXp(record);
    if (recordXp >= 3) {
      const lastScore = await xpRepo.getLastScoreDate(userId, record.targetId);
      if (isDuplicateScoreBlocked(lastScore)) recordXp = Math.max(0, recordXp - 3);
    }

    // Step 2.5: record_quality_xp 저장
    await xpRepo.updateRecordQualityXp(record.id, recordXp);

    // Step 2.6: 수정 모드 차액 산출
    const xpDelta = isEdit ? recordXp - previousRecordXp : recordXp;
    const reason = getRecordXpReason(recordXp);

    // Step 3: 종합 XP 적립 (차액만)
    if (xpDelta > 0) { ... }

    // Step 3.5: 첫 기록 보너스 (recordXp > 0일 때 hasBonusBeenGranted 체크)
    if (recordXp > 0) {
      const hasFirstRecord = await xpRepo.hasBonusBeenGranted(userId, 'first_record');
      if (!hasFirstRecord) { /* BONUS_XP_MAP.first_record 적립 */ }
    }

    // Step 4: 세부 축 XP 적립 (신규만 — isEdit면 스킵)
    // Step 5: 카테고리 XP 갱신
    // Step 6: 마일스톤 체크
    // Step 7: 종합 레벨 체크 → 호출측에서 레벨업 알림 생성
    return result;
  }, []);

  return { processRecordXp };
}
```

### `src/application/hooks/use-xp-award.ts`

> `useXpCalculation`의 `processRecordXp`를 감싸서 로딩 상태를 관리하고,
> 레벨업 시 `notificationRepo.createNotification`으로 알림을 생성하는 진입점.

```typescript
'use client'

import { useState, useCallback } from 'react';
import type { DiningRecord } from '@/domain/entities/record';
import type { XpCalculationResult, LevelThreshold } from '@/domain/entities/xp';
import { useXpCalculation } from '@/application/hooks/use-xp-calculation';
import { notificationRepo } from '@/shared/di/container';

export function useXpAward() {
  const [isLoading, setIsLoading] = useState(false);
  const { processRecordXp } = useXpCalculation();

  const awardXp = useCallback(async (
    userId: string, record: DiningRecord,
    restaurantArea: string | null, restaurantGenre: string | null,
    wineRegion: string | null, wineVariety: string | null,
    thresholds: LevelThreshold[],
    previousRecordXp?: number,
  ): Promise<XpCalculationResult | null> => {
    setIsLoading(true);
    try {
      const result = await processRecordXp(...);
      // 레벨업 시 알림 생성
      if (result) {
        for (const levelUp of result.levelUps) {
          await notificationRepo.createNotification({
            userId, type: 'level_up',
            title: '레벨 업!',
            body: `${scopeLabel} Lv.${levelUp.newLevel} ${levelUp.title} 달성!`,
            actionStatus: null, actorId: null,
            targetType: null, targetId: null, bubbleId: null,
          });
        }
      }
      return result;
    } finally { setIsLoading(false); }
  }, [processRecordXp]);

  return { awardXp, isLoading };
}
```

### `src/application/hooks/use-xp.ts`

> XP 조회 전용 hook — 경험치, 레벨, 최근 이력을 로드 (useState/useEffect 기반).

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react';
import type { UserExperience, XpHistory, LevelThreshold, LevelInfo } from '@/domain/entities/xp';
import { getLevel } from '@/domain/services/xp-calculator';
import { xpRepo } from '@/shared/di/container';

export function useXp(userId: string | null) {
  // Promise.all로 getUserExperiences, getLevelThresholds, getRecentXpHistories(20), getUserTotalXp 병렬 로드
  // getLevel(totalXp, thresholds) → levelInfo 산출
  // refetch 콜백 제공
  return { experiences, recentXp, thresholds, totalXp, levelInfo, isLoading, refetch };
}
```

---

## 6. DI 등록

### `src/shared/di/container.ts` (추가)

```typescript
import { SupabaseXpRepository } from '@/infrastructure/repositories/supabase-xp-repository';
import type { XpRepository } from '@/domain/repositories/xp-repository';

export const xpRepo: XpRepository = new SupabaseXpRepository();
```

---

## 7. 활성 XP 크론 (Edge Function)

### `supabase/functions/refresh-active-xp/index.ts`

> Supabase Edge Function. 매일 1회 실행 (예: 04:00 KST).
> 활성 XP = 최근 6개월 기록 XP만 합산 (소셜/보너스 미포함).

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  // Authorization 헤더 검증 (Supabase cron secret)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 활성 XP 갱신 SQL
  // active_xp = 최근 6개월 기록의 record_quality_xp 합산
  // active_verified = 최근 6개월 검증 기록 수
  const { error } = await supabase.rpc('refresh_active_xp');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 필요한 DB 함수 (마이그레이션)

```sql
-- refresh_active_xp: 크론에서 호출. 전체 유저의 active_xp/active_verified 갱신.
CREATE OR REPLACE FUNCTION refresh_active_xp()
RETURNS void AS $$
BEGIN
  UPDATE users SET
    active_xp = COALESCE((
      SELECT SUM(record_quality_xp) FROM records
      WHERE records.user_id = users.id
        AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    active_verified = COALESCE((
      SELECT COUNT(*) FROM records
      WHERE records.user_id = users.id
        AND records.is_exif_verified = true
        AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- increment_user_total_xp: 원자적 XP 증가
CREATE OR REPLACE FUNCTION increment_user_total_xp(p_user_id UUID, p_xp_delta INT)
RETURNS void AS $$
BEGIN
  UPDATE users SET total_xp = total_xp + p_xp_delta, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- upsert_user_experience: 축별 경험치 upsert
CREATE OR REPLACE FUNCTION upsert_user_experience(
  p_user_id UUID, p_axis_type TEXT, p_axis_value TEXT,
  p_xp_delta INT, p_new_level INT
)
RETURNS user_experiences AS $$
DECLARE
  result user_experiences;
BEGIN
  INSERT INTO user_experiences (user_id, axis_type, axis_value, total_xp, level)
  VALUES (p_user_id, p_axis_type, p_axis_value, p_xp_delta, p_new_level)
  ON CONFLICT (user_id, axis_type, axis_value) DO UPDATE SET
    total_xp = user_experiences.total_xp + p_xp_delta,
    level = p_new_level,
    updated_at = NOW()
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

---

## 8. XP 적립 전체 플로우 (시퀀스)

```
기록 저장 (RecordRepository.create)
  │
  ├─ 1. calculateRecordXp(record) → xp (0/3/8/18)
  ├─ 2. isDailyRecordCapReached? → 차단이면 return
  ├─ 3. isDuplicateScoreBlocked? → 차단이면 xp=0
  ├─ 4. updateUserTotalXp(userId, xp) → users.total_xp += xp
  ├─ 5. createXpHistory(reason=record_*)
  │
  ├─ 6. calculateDetailAxisXp → [{area,+5}, {genre,+5}]
  │   ├─ upsertUserExperience(area, +5, newLevel)
  │   ├─ upsertUserExperience(genre, +5, newLevel)
  │   └─ createXpHistory(reason=detail_axis) x2
  │
  ├─ 7. 카테고리 갱신: upsertUserExperience(category, 'restaurant', +10, newLevel)
  │
  ├─ 8. 마일스톤 체크 → 달성 시:
  │   ├─ createUserMilestone
  │   ├─ updateUserTotalXp(userId, milestone.xpReward)
  │   └─ createXpHistory(reason=milestone)
  │
  └─ 9. 레벨업 체크 → 알림 생성 (notifications INSERT)
```

---

## 9. 레벨 테이블 시드 데이터

`level_thresholds` INSERT는 `generateLevelThresholds()` 함수 출력을 기반으로 마이그레이션 파일에서 일괄 삽입.

주요 앵커 포인트 검증:

| 레벨 | 필요 XP | 검증 |
|------|---------|------|
| Lv.1 | 0 | 가입 직후 |
| Lv.2 | 3 | 첫 기록 (score) |
| Lv.6 | 25 | 슬리퍼 1년 |
| Lv.12 | 100 | 캐주얼 1년 |
| Lv.30 | 500 | 활동적 2년 |
| Lv.62 | 3,700 | 파워유저 1년 |
| Lv.72 | 7,500 | 파워유저 2년 |
| Lv.99 | 100,000 | 전설 |

---

## 10. 파일 체크리스트

| 파일 | 레이어 | 설명 |
|------|--------|------|
| `src/domain/entities/xp.ts` | domain | 엔티티 + 타입 정의 |
| `src/domain/repositories/xp-repository.ts` | domain | 저장소 인터페이스 |
| `src/domain/services/xp-calculator.ts` | domain | 순수 계산 함수 (R1 준수) |
| `src/infrastructure/repositories/supabase-xp-repository.ts` | infrastructure | Supabase 구현체 (R2 준수) |
| `src/application/hooks/use-xp-calculation.ts` | application | XP 오케스트레이션 hook |
| `src/shared/di/container.ts` | shared | DI 등록 (추가) |
| `supabase/functions/refresh-active-xp/index.ts` | infrastructure | Edge Function 크론 |
| `supabase/migrations/XXX_xp_functions.sql` | infrastructure | DB 함수 3개 |
