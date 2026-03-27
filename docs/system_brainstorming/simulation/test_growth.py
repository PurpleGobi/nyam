"""
시뮬레이션 1: 현실적 성장 시뮬레이션 (1년, 일 단위)

현실 파라미터:
- 유저 증가: 초대 기반 바이럴 (기하급수적)
- 리텐션: D1 60%, D7 30%, D30 15%, D90 8% (소비자 앱 현실)
- 활성도: DAU 15-20%, WAU 35%, MAU 50%
- 기록량: 롱테일 분포 (대부분 0, 소수만 다수)

실행: python3 test_growth.py
"""

from __future__ import annotations
import random
import math
from dataclasses import dataclass, field
from collections import Counter, defaultdict
from models import (
    User, Bubble, Record, BubbleRole, Visibility, JoinPolicy,
    RecordQuality, SOCIAL_XP, make_record,
)

random.seed(42)


# ═══════════════════════════════════════════
#  🎛️ 조정 가능한 시나리오 파라미터
# ═══════════════════════════════════════════
# 아래 SCENARIO를 바꿔서 다양한 성장 시나리오를 테스트할 수 있음

SCENARIOS = {
    "보수적": {
        "seed": 200,
        "viral_coeff": 0.3,          # 활성 10명 → 월 3명
        "marketing": {1: 100, 2: 120, 3: 150, 4: 180, 5: 200, 6: 250,
                      7: 300, 8: 350, 9: 400, 10: 450, 11: 500, 12: 600},
        "retention_mult": 1.0,        # 리텐션 커브 배율 (1.0 = 기본)
    },
    "기본": {
        "seed": 500,
        "viral_coeff": 0.5,          # 활성 10명 → 월 5명
        "marketing": {1: 300, 2: 400, 3: 500, 4: 600, 5: 800, 6: 1000,
                      7: 1200, 8: 1500, 9: 1800, 10: 2000, 11: 2500, 12: 3000},
        "retention_mult": 1.0,
    },
    "낙관적": {
        "seed": 1000,
        "viral_coeff": 0.8,          # 활성 10명 → 월 8명 (강한 입소문)
        "marketing": {1: 500, 2: 700, 3: 1000, 4: 1500, 5: 2000, 6: 2500,
                      7: 3000, 8: 4000, 9: 5000, 10: 6000, 11: 7000, 12: 8000},
        "retention_mult": 1.3,        # 리텐션 30% 향상 (제품이 좋을 때)
    },
}

# ▼▼▼ 여기서 시나리오 선택 ▼▼▼
ACTIVE_SCENARIO = "낙관적"
# ▲▲▲

_s = SCENARIOS[ACTIVE_SCENARIO]
SEED_USERS = _s["seed"]
VIRAL_COEFFICIENT = _s["viral_coeff"]
MARKETING_MONTHLY = _s["marketing"]
_retention_mult = _s["retention_mult"]

# 바이럴 가속 (월별 배율 — 입소문 효과 누적)
VIRAL_RAMP_UP = {
    1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9, 6: 1.0,
    7: 1.2, 8: 1.4, 9: 1.6, 10: 1.8, 11: 2.0, 12: 2.2,
}

# 리텐션 커브 (소비자 앱 현실 기반)
_BASE_RETENTION = {
    0: 1.00, 1: 0.55, 3: 0.35, 7: 0.25, 14: 0.18,
    30: 0.12, 60: 0.09, 90: 0.07, 180: 0.05, 365: 0.04,
}
# retention_mult 적용 (단, 1.0을 넘지 않도록)
RETENTION_CURVE = {d: min(r * _retention_mult, 1.0) for d, r in _BASE_RETENTION.items()}

# 활성도 등급 (일간 행동 확률)
# 유저는 가입 시 성향이 결정되고, 활성도는 매일 확률적으로 결정
USER_ENGAGEMENT_TIERS = {
    "좀비":     {"ratio": 0.40, "daily_active_prob": 0.02, "record_prob": 0.01, "quality_weights": {
        RecordQuality.NAME_ONLY: 0.6, RecordQuality.WITH_SCORE: 0.3, RecordQuality.WITH_PHOTO: 0.08, RecordQuality.FULL: 0.02}},
    "슬리퍼":   {"ratio": 0.25, "daily_active_prob": 0.08, "record_prob": 0.04, "quality_weights": {
        RecordQuality.NAME_ONLY: 0.3, RecordQuality.WITH_SCORE: 0.35, RecordQuality.WITH_PHOTO: 0.25, RecordQuality.FULL: 0.1}},
    "캐주얼":   {"ratio": 0.20, "daily_active_prob": 0.20, "record_prob": 0.12, "quality_weights": {
        RecordQuality.NAME_ONLY: 0.15, RecordQuality.WITH_SCORE: 0.25, RecordQuality.WITH_PHOTO: 0.35, RecordQuality.FULL: 0.25}},
    "활동적":   {"ratio": 0.10, "daily_active_prob": 0.45, "record_prob": 0.25, "quality_weights": {
        RecordQuality.NAME_ONLY: 0.05, RecordQuality.WITH_SCORE: 0.15, RecordQuality.WITH_PHOTO: 0.40, RecordQuality.FULL: 0.40}},
    "파워유저": {"ratio": 0.05, "daily_active_prob": 0.75, "record_prob": 0.50, "quality_weights": {
        RecordQuality.NAME_ONLY: 0.02, RecordQuality.WITH_SCORE: 0.08, RecordQuality.WITH_PHOTO: 0.30, RecordQuality.FULL: 0.60}},
}

# 버블/소셜 행동 확률 (활성인 날에)
SOCIAL_PROBS = {
    "bubble_create": 0.005,       # 0.5%/일 (활성일)
    "bubble_follow": 0.03,        # 3%
    "bubble_join_attempt": 0.02,  # 2%
    "personal_follow": 0.01,      # 1%
    "share_to_bubble": 0.3,       # 기록 시 30% 확률로 공유
    "like_give": 0.05,            # 5% 확률로 좋아요
}


# ═══════════════════════════════════════════
#  시뮬레이션 엔진
# ═══════════════════════════════════════════

@dataclass
class SimUser:
    user: User
    tier: str
    signup_day: int
    churned: bool = False
    churn_day: int = -1
    last_active_day: int = -1

    @property
    def tier_config(self):
        return USER_ENGAGEMENT_TIERS[self.tier]


def interpolate_retention(day: int) -> float:
    """리텐션 커브 보간"""
    keys = sorted(RETENTION_CURVE.keys())
    for i in range(len(keys) - 1):
        if keys[i] <= day <= keys[i + 1]:
            d0, d1 = keys[i], keys[i + 1]
            r0, r1 = RETENTION_CURVE[d0], RETENTION_CURVE[d1]
            t = (day - d0) / (d1 - d0)
            return r0 + (r1 - r0) * t
    return RETENTION_CURVE[keys[-1]]


def pick_tier() -> str:
    r = random.random()
    cumulative = 0
    for name, config in USER_ENGAGEMENT_TIERS.items():
        cumulative += config["ratio"]
        if r <= cumulative:
            return name
    return "좀비"


def pick_quality(tier_config: dict) -> RecordQuality:
    r = random.random()
    cumulative = 0
    for quality, weight in tier_config["quality_weights"].items():
        cumulative += weight
        if r <= cumulative:
            return quality
    return RecordQuality.WITH_SCORE


@dataclass
class RealisticGrowthSim:
    sim_users: list[SimUser] = field(default_factory=list)
    bubbles: list[Bubble] = field(default_factory=list)
    daily_logs: list[dict] = field(default_factory=list)

    # 집계
    total_signups: int = 0
    total_records: int = 0
    total_shares: int = 0

    def _get_active_non_churned(self, day: int) -> list[SimUser]:
        return [su for su in self.sim_users if not su.churned]

    def _get_public_bubbles(self) -> list[Bubble]:
        return [b for b in self.bubbles if b.visibility == Visibility.PUBLIC]

    def signup_users(self, count: int, day: int):
        for _ in range(count):
            tier = pick_tier()
            user = User(nickname=f"u{self.total_signups+1}")
            su = SimUser(user=user, tier=tier, signup_day=day)
            self.sim_users.append(su)
            self.total_signups += 1

    def process_churn(self, day: int):
        """리텐션 커브 기반 이탈 처리"""
        for su in self.sim_users:
            if su.churned:
                continue
            days_since_signup = day - su.signup_day
            if days_since_signup < 1:
                continue

            retention = interpolate_retention(days_since_signup)
            # 매일 소량의 이탈 확률 (누적으로 커브에 수렴)
            # 어제의 리텐션 대비 오늘 리텐션 차이가 이탈 확률
            yesterday_retention = interpolate_retention(days_since_signup - 1)
            if yesterday_retention > 0:
                daily_churn_prob = (yesterday_retention - retention) / yesterday_retention
                if random.random() < daily_churn_prob:
                    su.churned = True
                    su.churn_day = day

    def simulate_day(self, day: int):
        """하루 시뮬레이션"""
        month = day // 30 + 1

        # ─── 1. 신규 유저 유입 ───
        if day == 0:
            new_users = SEED_USERS
        else:
            # 바이럴 유입
            active_count = sum(
                1 for su in self.sim_users
                if not su.churned and su.last_active_day >= day - 7
            )
            ramp = VIRAL_RAMP_UP.get(min(month, 12), 1.6)
            viral_expected = active_count * VIRAL_COEFFICIENT * ramp / 30
            viral_new = max(0, int(random.gauss(viral_expected, max(viral_expected * 0.3, 0.5))))

            # 마케팅/오가닉 유입 (일 단위 환산)
            marketing_monthly = MARKETING_MONTHLY.get(min(month, 12), 600)
            marketing_daily = marketing_monthly / 30
            marketing_new = max(0, int(random.gauss(marketing_daily, marketing_daily * 0.4)))

            new_users = viral_new + marketing_new

        self.signup_users(new_users, day)

        # ─── 2. 이탈 처리 ───
        self.process_churn(day)

        # ─── 3. 활성 유저 행동 ───
        alive = self._get_active_non_churned(day)
        public_bubbles = self._get_public_bubbles()

        day_records = 0
        day_shares = 0
        day_bubble_creates = 0
        day_bubble_follows = 0
        day_joins = 0
        day_personal_follows = 0
        day_mutual = 0
        day_likes = 0
        day_active = 0

        for su in alive:
            tc = su.tier_config

            # 오늘 활성인가?
            if random.random() > tc["daily_active_prob"]:
                continue

            su.last_active_day = day
            day_active += 1

            # 기록 생성
            if random.random() < tc["record_prob"]:
                # 하루에 1~2개 (드물게 3개)
                n = 1 if random.random() < 0.85 else (2 if random.random() < 0.9 else 3)
                for _ in range(n):
                    quality = pick_quality(tc)
                    record = make_record(quality=quality)
                    su.user.add_record(record)
                    day_records += 1
                    self.total_records += 1

                    # 버블 공유
                    if random.random() < SOCIAL_PROBS["share_to_bubble"]:
                        member_bubbles = [
                            bid for bid, role in su.user.bubble_memberships.items()
                            if role in (BubbleRole.OWNER, BubbleRole.ADMIN, BubbleRole.MEMBER)
                        ]
                        if member_bubbles:
                            bid = random.choice(member_bubbles)
                            bubble = next((b for b in self.bubbles if b.id == bid), None)
                            if bubble:
                                bubble.shared_records.append({"user_id": su.user.id, "record_id": record.id})
                                su.user.xp += SOCIAL_XP["bubble_share"]
                                day_shares += 1
                                self.total_shares += 1

            # 버블 생성
            if random.random() < SOCIAL_PROBS["bubble_create"]:
                vis = random.choices(
                    [Visibility.PUBLIC, Visibility.PRIVATE],
                    weights=[0.65, 0.35]
                )[0]
                jp = JoinPolicy.INVITE_ONLY
                if vis == Visibility.PUBLIC:
                    jp = random.choices(
                        [JoinPolicy.CLOSED, JoinPolicy.MANUAL_APPROVE, JoinPolicy.AUTO_APPROVE, JoinPolicy.OPEN],
                        weights=[0.3, 0.3, 0.25, 0.15]
                    )[0]
                bubble = Bubble(
                    name=f"b{len(self.bubbles)+1}",
                    visibility=vis, join_policy=jp,
                    auto_approve_min_verified=random.choice([3, 5, 8, 10]),
                    owner_id=su.user.id,
                )
                bubble.members[su.user.id] = BubbleRole.OWNER
                su.user.bubble_memberships[bubble.id] = BubbleRole.OWNER
                self.bubbles.append(bubble)
                day_bubble_creates += 1

            # 버블 팔로우
            if public_bubbles and random.random() < SOCIAL_PROBS["bubble_follow"]:
                target = random.choice(public_bubbles)
                if su.user.id not in target.members:
                    target.members[su.user.id] = BubbleRole.FOLLOWER
                    target.follower_count += 1
                    su.user.bubble_memberships[target.id] = BubbleRole.FOLLOWER
                    owner_su = next((s for s in self.sim_users if s.user.id == target.owner_id), None)
                    if owner_su and not owner_su.churned:
                        owner_su.user.xp += SOCIAL_XP["follower_gained_bubble"]
                    day_bubble_follows += 1

            # 버블 가입 시도
            if public_bubbles and random.random() < SOCIAL_PROBS["bubble_join_attempt"]:
                target = random.choice(public_bubbles)
                role = target.members.get(su.user.id)
                if role in (None, BubbleRole.FOLLOWER):
                    can, _ = target.can_join(su.user.profile)
                    if can:
                        if target.join_policy == JoinPolicy.MANUAL_APPROVE:
                            if random.random() < 0.4:
                                target.members[su.user.id] = BubbleRole.MEMBER
                                su.user.bubble_memberships[target.id] = BubbleRole.MEMBER
                                day_joins += 1
                        else:
                            target.members[su.user.id] = BubbleRole.MEMBER
                            su.user.bubble_memberships[target.id] = BubbleRole.MEMBER
                            day_joins += 1

            # 개인 팔로우
            if random.random() < SOCIAL_PROBS["personal_follow"]:
                member_bubbles = [
                    bid for bid, role in su.user.bubble_memberships.items()
                    if role in (BubbleRole.OWNER, BubbleRole.ADMIN, BubbleRole.MEMBER)
                ]
                if member_bubbles:
                    bid = random.choice(member_bubbles)
                    bubble = next((b for b in self.bubbles if b.id == bid), None)
                    if bubble:
                        others = [uid for uid, r in bubble.members.items()
                                  if uid != su.user.id and r != BubbleRole.FOLLOWER]
                        if others:
                            tid = random.choice(others)
                            tu = next((s.user for s in self.sim_users if s.user.id == tid), None)
                            if tu and tid not in su.user.following:
                                su.user.following.add(tid)
                                tu.followers.add(su.user.id)
                                day_personal_follows += 1
                                if su.user.is_mutual_follow(tid):
                                    su.user.xp += SOCIAL_XP["mutual_follow"]
                                    tu.xp += SOCIAL_XP["mutual_follow"]
                                    day_mutual += 1
                                else:
                                    tu.xp += SOCIAL_XP["follower_gained_personal"]

            # 좋아요
            if random.random() < SOCIAL_PROBS["like_give"]:
                candidates = [s for s in alive if s.user.id != su.user.id and s.user.records]
                if candidates:
                    lucky = random.choice(candidates)
                    lucky.user.xp += SOCIAL_XP["like_received"]
                    day_likes += 1

        # 로그
        alive_count = sum(1 for su in self.sim_users if not su.churned)
        churned_count = sum(1 for su in self.sim_users if su.churned)

        log = {
            "day": day,
            "month": month,
            "total_signups": self.total_signups,
            "alive": alive_count,
            "churned": churned_count,
            "new_users": new_users,
            "day_active": day_active,
            "day_records": day_records,
            "day_shares": day_shares,
            "day_bubble_creates": day_bubble_creates,
            "day_bubble_follows": day_bubble_follows,
            "day_joins": day_joins,
            "day_personal_follows": day_personal_follows,
            "day_mutual": day_mutual,
            "day_likes": day_likes,
            "total_bubbles": len(self.bubbles),
        }
        self.daily_logs.append(log)
        return log

    # ─── 분석 ───

    def get_alive_users(self) -> list[SimUser]:
        return [su for su in self.sim_users if not su.churned]

    def get_xp_stats(self, users: list[SimUser]) -> dict:
        if not users:
            return {"min": 0, "max": 0, "avg": 0, "median": 0, "p25": 0, "p75": 0, "p90": 0, "p95": 0}
        xps = sorted(su.user.xp for su in users)
        n = len(xps)
        return {
            "min": xps[0], "max": xps[-1],
            "avg": sum(xps) / n,
            "median": xps[n // 2],
            "p25": xps[n // 4],
            "p75": xps[3 * n // 4],
            "p90": xps[int(n * 0.9)],
            "p95": xps[int(n * 0.95)],
        }

    def get_level_distribution(self, users: list[SimUser]) -> dict[int, int]:
        counter = Counter()
        for su in users:
            counter[su.user.level] += 1
        return dict(sorted(counter.items()))

    def get_tier_stats(self, users: list[SimUser]) -> dict:
        stats = {}
        for tier_name in USER_ENGAGEMENT_TIERS:
            tier_users = [su for su in users if su.tier == tier_name]
            if tier_users:
                xps = [su.user.xp for su in tier_users]
                records = [len(su.user.records) for su in tier_users]
                verified = [su.user.verified_count for su in tier_users]
                stats[tier_name] = {
                    "count": len(tier_users),
                    "avg_xp": sum(xps) / len(xps),
                    "avg_level": sum(su.user.level for su in tier_users) / len(tier_users),
                    "avg_records": sum(records) / len(records),
                    "avg_verified": sum(verified) / len(verified),
                    "max_level": max(su.user.level for su in tier_users),
                    "max_xp": max(xps),
                }
        return stats


# ═══════════════════════════════════════════
#  실행
# ═══════════════════════════════════════════

def bar(value: int, max_val: int, width: int = 25) -> str:
    if max_val == 0:
        return ""
    filled = int(value / max_val * width)
    return "█" * filled + "░" * (width - filled)


def run():
    print("=" * 70)
    print(f"  Nyam 현실적 성장 시뮬레이션 — 365일 [{ACTIVE_SCENARIO}]")
    print("=" * 70)
    print(f"\n  🎛️  시나리오: {ACTIVE_SCENARIO}")
    print(f"    시드 유저: {SEED_USERS}")
    print(f"    바이럴 계수: {VIRAL_COEFFICIENT} (활성 10명 → 월 {VIRAL_COEFFICIENT*10:.0f}명)")
    print(f"    마케팅: 월 {MARKETING_MONTHLY[1]}→{MARKETING_MONTHLY[12]}명")
    print(f"    리텐션: D1={RETENTION_CURVE[1]*100:.0f}% D7={RETENTION_CURVE[7]*100:.0f}% D30={RETENTION_CURVE[30]*100:.0f}% D90={RETENTION_CURVE[90]*100:.0f}%")
    print(f"    유저 분포: " + " / ".join(f"{k} {v['ratio']*100:.0f}%" for k, v in USER_ENGAGEMENT_TIERS.items()))

    sim = RealisticGrowthSim()

    # 365일 시뮬레이션
    for day in range(365):
        sim.simulate_day(day)

        # 월말 리포트
        if (day + 1) % 30 == 0:
            month = (day + 1) // 30
            alive = sim.get_alive_users()

            # 최근 7일 활성
            recent_active = sum(1 for su in alive if su.last_active_day >= day - 7)
            # 최근 30일 활성
            monthly_active = sum(1 for su in alive if su.last_active_day >= day - 30)

            # 월간 집계
            month_logs = [l for l in sim.daily_logs if l["month"] == month]
            m_signups = sum(l["new_users"] for l in month_logs)
            m_records = sum(l["day_records"] for l in month_logs)
            m_shares = sum(l["day_shares"] for l in month_logs)
            m_active_avg = sum(l["day_active"] for l in month_logs) / max(len(month_logs), 1)

            xp = sim.get_xp_stats(alive)

            print(f"\n{'─'*70}")
            print(f"  📅 {month}개월차 (D{day+1})")
            print(f"{'─'*70}")
            print(f"  가입 총계: {sim.total_signups:,} | 이번 달 +{m_signups:,}")
            print(f"  잔존: {len(alive):,} ({len(alive)/max(sim.total_signups,1)*100:.1f}%) | 이탈: {sim.total_signups - len(alive):,}")
            print(f"  WAU: {recent_active:,} ({recent_active/max(len(alive),1)*100:.0f}% of 잔존)")
            print(f"  MAU: {monthly_active:,} ({monthly_active/max(len(alive),1)*100:.0f}% of 잔존)")
            print(f"  DAU 평균: {m_active_avg:.0f}")
            print(f"  기록: 월 +{m_records:,} | 누적 {sim.total_records:,} | 공유 누적 {sim.total_shares:,} | 버블 {len(sim.bubbles)}")
            print(f"  XP: p25={xp['p25']} median={xp['median']} p75={xp['p75']} p90={xp['p90']} p95={xp['p95']} max={xp['max']}")

            # 레벨 분포 (요약)
            levels = sim.get_level_distribution(alive)
            lv_groups = {"Lv.1": 0, "Lv.2-3": 0, "Lv.4-6": 0, "Lv.7-10": 0, "Lv.11-20": 0, "Lv.21+": 0}
            for lv, cnt in levels.items():
                if lv == 1: lv_groups["Lv.1"] += cnt
                elif lv <= 3: lv_groups["Lv.2-3"] += cnt
                elif lv <= 6: lv_groups["Lv.4-6"] += cnt
                elif lv <= 10: lv_groups["Lv.7-10"] += cnt
                elif lv <= 20: lv_groups["Lv.11-20"] += cnt
                else: lv_groups["Lv.21+"] += cnt

            max_c = max(lv_groups.values()) if lv_groups else 1
            print(f"  레벨 분포:")
            for group, cnt in lv_groups.items():
                pct = cnt / max(len(alive), 1) * 100
                print(f"    {group:>8}: {bar(cnt, max_c)} {cnt:>5} ({pct:>5.1f}%)")

    # ═══ 최종 리포트 ═══

    print("\n\n" + "=" * 70)
    print("  📊 1년 최종 리포트")
    print("=" * 70)

    alive = sim.get_alive_users()
    all_users = sim.sim_users

    # 퍼널
    print(f"\n  📈 퍼널:")
    print(f"    총 가입: {sim.total_signups:,}")
    print(f"    잔존: {len(alive):,} ({len(alive)/sim.total_signups*100:.1f}%)")
    churned = sim.total_signups - len(alive)
    print(f"    이탈: {churned:,} ({churned/sim.total_signups*100:.1f}%)")
    ever_recorded = sum(1 for su in all_users if len(su.user.records) > 0)
    print(f"    1회 이상 기록: {ever_recorded:,} ({ever_recorded/sim.total_signups*100:.1f}%)")
    ever_bubbled = sum(1 for su in all_users if su.user.bubble_memberships)
    print(f"    버블 참여(팔로우 포함): {ever_bubbled:,} ({ever_bubbled/sim.total_signups*100:.1f}%)")

    # 등급별 통계
    tier_stats = sim.get_tier_stats(alive)
    print(f"\n  등급별 통계 (잔존 유저):")
    print(f"  {'등급':<10} {'인원':>6} {'평균XP':>8} {'평균Lv':>7} {'기록':>6} {'검증':>6} {'최고Lv':>7}")
    print(f"  {'─'*56}")
    for name, s in tier_stats.items():
        print(
            f"  {name:<10} {s['count']:>6} {s['avg_xp']:>8.0f} "
            f"{s['avg_level']:>7.1f} {s['avg_records']:>6.1f} "
            f"{s['avg_verified']:>6.1f} {s['max_level']:>7}"
        )

    # XP 소스 분석
    print(f"\n  XP 소스 분석 (잔존 유저):")
    total_record_xp = sum(sum(r.xp for r in su.user.records) for su in alive)
    total_xp = sum(su.user.xp for su in alive)
    social_xp = total_xp - total_record_xp
    if total_xp > 0:
        print(f"    기록 XP: {total_record_xp:,} ({total_record_xp/total_xp*100:.1f}%)")
        print(f"    소셜 XP: {social_xp:,} ({social_xp/total_xp*100:.1f}%)")
        print(f"    인당 평균: 기록 {total_record_xp/max(len(alive),1):.0f} + 소셜 {social_xp/max(len(alive),1):.0f} = {total_xp/max(len(alive),1):.0f}")

    # 버블 통계
    print(f"\n  버블 통계:")
    if sim.bubbles:
        pub = [b for b in sim.bubbles if b.visibility == Visibility.PUBLIC]
        priv = [b for b in sim.bubbles if b.visibility == Visibility.PRIVATE]
        member_counts = [b.member_count for b in sim.bubbles]
        follower_counts = [b.follower_only_count for b in sim.bubbles]
        print(f"    전체: {len(sim.bubbles)} (공개 {len(pub)}, 비공개 {len(priv)})")
        print(f"    멤버: 평균 {sum(member_counts)/len(member_counts):.1f} | 최대 {max(member_counts)}")
        print(f"    팔로워: 평균 {sum(follower_counts)/len(follower_counts):.1f} | 최대 {max(follower_counts)}")
        print(f"    총 공유 기록: {sum(len(b.shared_records) for b in sim.bubbles):,}")

    # 인플레이션 체크
    print(f"\n  ⚠️  인플레이션 체크:")
    levels = sim.get_level_distribution(alive)
    high_lv = sum(c for lv, c in levels.items() if lv >= 10)
    high_ratio = high_lv / max(len(alive), 1) * 100
    very_high = sum(c for lv, c in levels.items() if lv >= 20)
    very_high_ratio = very_high / max(len(alive), 1) * 100
    max_lv = max(levels.keys()) if levels else 0

    print(f"    Lv.10+ : {high_lv}명 ({high_ratio:.1f}%)")
    print(f"    Lv.20+ : {very_high}명 ({very_high_ratio:.1f}%)")
    print(f"    최고 레벨: Lv.{max_lv}")

    if high_ratio > 15:
        print(f"    🚨 경고: Lv.10+ 비율 15% 초과 — XP 인플레이션")
    elif high_ratio > 8:
        print(f"    ⚠️  주의: Lv.10+ 비율 8% 초과")
    else:
        print(f"    ✅ 정상: 고레벨 분포 적절")

    xp_final = sim.get_xp_stats(alive)
    print(f"\n    XP 분포: min={xp_final['min']} p25={xp_final['p25']} median={xp_final['median']} "
          f"p75={xp_final['p75']} p90={xp_final['p90']} p95={xp_final['p95']} max={xp_final['max']}")

    # 현실 지표 체크
    print(f"\n  📋 현실 지표 체크:")
    recent_active_7d = sum(1 for su in alive if su.last_active_day >= 364 - 7)
    recent_active_30d = sum(1 for su in alive if su.last_active_day >= 364 - 30)
    dau_last_week = sum(l["day_active"] for l in sim.daily_logs[-7:]) / 7

    print(f"    전체 잔존율: {len(alive)/sim.total_signups*100:.1f}%", end="")
    print(f" {'(현실적: 4-8%)' if 3 < len(alive)/sim.total_signups*100 < 10 else ''}")
    print(f"    WAU/잔존: {recent_active_7d/max(len(alive),1)*100:.0f}%", end="")
    print(f" {'(현실적: 30-50%)' if 25 < recent_active_7d/max(len(alive),1)*100 < 55 else ''}")
    print(f"    DAU 평균(최근 7일): {dau_last_week:.0f}")
    print(f"    총 기록: {sim.total_records:,} | 총 공유: {sim.total_shares:,}")

    # 기록 품질 분포
    print(f"\n  📝 총 기록물 품질 분포:")
    quality_counts = Counter()
    for su in sim.sim_users:  # 이탈 유저 포함 (기록은 남아있으므로)
        for r in su.user.records:
            quality_counts[r.quality] += 1
    total_recs = sum(quality_counts.values())
    if total_recs:
        for q in [RecordQuality.NAME_ONLY, RecordQuality.WITH_SCORE, RecordQuality.WITH_PHOTO, RecordQuality.FULL]:
            cnt = quality_counts.get(q, 0)
            pct = cnt / total_recs * 100
            b = bar(cnt, max(quality_counts.values()))
            print(f"    {q.value:<15} {b} {cnt:>6} ({pct:>5.1f}%)")
        verified = sum(1 for su in sim.sim_users for r in su.user.records if r.is_verified)
        print(f"\n    검증됨(EXIF): {verified:,} / {total_recs:,} ({verified/total_recs*100:.1f}%)")

    # 월별 성장 추이 요약
    print(f"\n  📈 월별 성장 추이:")
    print(f"  {'월':>4} {'가입누적':>8} {'잔존':>6} {'WAU':>6} {'DAU평균':>7} {'기록/월':>7} {'기록누적':>8} {'버블':>5}")
    print(f"  {'─'*57}")
    cumulative_records = 0
    for m in range(1, 13):
        month_logs = [l for l in sim.daily_logs if l["month"] == m]
        if not month_logs:
            continue
        last = month_logs[-1]
        m_records = sum(l["day_records"] for l in month_logs)
        cumulative_records += m_records
        m_active_avg = sum(l["day_active"] for l in month_logs) / len(month_logs)
        wau = sum(1 for su in sim.sim_users
                  if not su.churned and su.last_active_day >= last["day"] - 7)
        print(
            f"  {m:>4} {last['total_signups']:>8,} {last['alive']:>6,} "
            f"{wau:>6,} {m_active_avg:>7.0f} {m_records:>7,} "
            f"{cumulative_records:>8,} {last['total_bubbles']:>5}"
        )


if __name__ == "__main__":
    run()
