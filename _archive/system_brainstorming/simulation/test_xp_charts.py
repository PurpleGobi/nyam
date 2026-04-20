"""
시뮬레이션 8: XP/레벨 시각화 차트

1. 유저 유형별 연차별 레벨업 그래프
2. 레벨별 필요 경험치 그래프
3. 행위 편향 유저 유형별 레벨업 비교

실행: python3 test_xp_charts.py
→ REPORTS/ 에 PNG 저장
"""

from __future__ import annotations
import random
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from collections import defaultdict
from datetime import datetime

random.seed(42)

# 한글 폰트
plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")


# ═══════════════════════════════════════════
#  레벨 커브 (test_xp_global.py와 동일)
# ═══════════════════════════════════════════

def build_level_table():
    """레벨별 누적 필요 XP 테이블 생성"""
    thresholds = [(1, 0)]
    cumul = 0
    req = 3
    for lv in range(2, 100):
        cumul += req
        thresholds.append((lv, cumul))
        if lv <= 10:
            req = max(int(req + 1), req + 1)
        elif lv <= 30:
            req = max(int(req * 1.06), req + 1)
        elif lv <= 50:
            req = max(int(req * 1.07), req + 2)
        elif lv <= 70:
            req = max(int(req * 1.08), req + 3)
        elif lv <= 85:
            req = max(int(req * 1.12), req + 5)
        else:
            req = max(int(req * 1.15), req + 10)
    return thresholds


LEVEL_TABLE = build_level_table()


def xp_to_level(xp: int) -> int:
    for lv, needed in reversed(LEVEL_TABLE):
        if xp >= needed:
            return lv
    return 1


def level_to_xp(lv: int) -> int:
    for l, xp in LEVEL_TABLE:
        if l == lv:
            return xp
    return 0


# ═══════════════════════════════════════════
#  XP 상수
# ═══════════════════════════════════════════

XP_RECORD = {"name": 0, "score": 3, "photo": 8, "full": 18}
CATEGORY_XP = 5


# ═══════════════════════════════════════════
#  기본 유저 유형 (등급별)
# ═══════════════════════════════════════════

BASE_TIERS = {
    "좀비": {"monthly_rest": 0, "monthly_wine": 0, "quality": "name", "social_monthly": 0},
    "슬리퍼": {"monthly_rest": 1.5, "monthly_wine": 0, "quality": "score", "social_monthly": 1},
    "캐주얼": {"monthly_rest": 4.5, "monthly_wine": 0.5, "quality": "photo", "social_monthly": 3},
    "활동적": {"monthly_rest": 9, "monthly_wine": 2, "quality": "full", "social_monthly": 8},
    "파워유저": {"monthly_rest": 18, "monthly_wine": 5, "quality": "full", "social_monthly": 15},
}

# 행위 편향 유저 유형
BEHAVIOR_TYPES = {
    "식당러 (식당만)": {
        "monthly_rest": 12, "monthly_wine": 0, "quality": "full", "social_monthly": 5,
        "desc": "와인 안 마심, 식당만 열심히"},
    "와인러 (와인 중심)": {
        "monthly_rest": 3, "monthly_wine": 8, "quality": "full", "social_monthly": 5,
        "desc": "와인바 위주, 식당 가끔"},
    "사진러 (사진 많이)": {
        "monthly_rest": 10, "monthly_wine": 2, "quality": "photo", "social_monthly": 3,
        "desc": "사진은 찍지만 리뷰는 안 씀"},
    "소셜러 (소셜 활발)": {
        "monthly_rest": 5, "monthly_wine": 1, "quality": "score", "social_monthly": 25,
        "desc": "기록은 간단, 공유/좋아요/팔로우 적극적"},
    "기록러 (풀 기록)": {
        "monthly_rest": 8, "monthly_wine": 3, "quality": "full", "social_monthly": 5,
        "desc": "모든 기록을 상세하게"},
    "등록러 (이름만)": {
        "monthly_rest": 20, "monthly_wine": 0, "quality": "name", "social_monthly": 2,
        "desc": "가본 곳 이름만 대량 등록"},
}


# 소셜 XP 단가 (하향 조정)
SOCIAL_XP_PER_EVENT = {
    "like": 1, "bookmark": 1, "follower": 1, "mutual": 2, "share": 1,
}
SOCIAL_DAILY_CAP = 10  # 소셜 XP 합산 일일 상한


def simulate_monthly_xp(tier: dict) -> float:
    """한 달 평균 XP 계산"""
    rest = tier["monthly_rest"]
    wine = tier["monthly_wine"]
    q = tier["quality"]
    social = tier["social_monthly"]

    record_xp = (rest + wine) * XP_RECORD[q]
    # 소셜: 평균 1.2 XP/이벤트, 일 상한 10 → 월 최대 300
    social_xp = min(social * 1.2, SOCIAL_DAILY_CAP * 30)
    return record_xp + social_xp


def simulate_user_progression(tier: dict, months: int) -> list[tuple[int, int, int]]:
    """월별 (month, total_xp, level) 반환"""
    total_xp = 10  # 온보딩 보너스
    progression = [(0, total_xp, xp_to_level(total_xp))]

    for m in range(1, months + 1):
        rest = tier["monthly_rest"]
        wine = tier["monthly_wine"]
        q = tier["quality"]
        social = tier["social_monthly"]

        # 약간의 랜덤성
        n_rest = max(0, int(random.gauss(rest, rest * 0.2)))
        n_wine = max(0, int(random.gauss(wine, wine * 0.3))) if wine > 0 else 0

        # 기록 XP
        monthly_xp = (n_rest + n_wine) * XP_RECORD[q]

        # 소셜 XP (일일 상한 적용: 월 최대 SOCIAL_DAILY_CAP × 30)
        raw_social = int(random.gauss(social * 1.2, social * 0.4))
        capped_social = min(max(0, raw_social), SOCIAL_DAILY_CAP * 30)
        monthly_xp += capped_social

        # 첫 달 보너스
        if m == 1 and (n_rest + n_wine) > 0:
            monthly_xp += 5 + 5 + 3  # 첫기록 + 첫버블 + 첫공유

        total_xp += max(0, monthly_xp)
        progression.append((m, total_xp, xp_to_level(total_xp)))

    return progression


# ═══════════════════════════════════════════
#  차트 1: 레벨별 필요 경험치
# ═══════════════════════════════════════════

def chart_level_curve():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    levels = [lv for lv, xp in LEVEL_TABLE if lv <= 99]
    cumul_xps = [xp for lv, xp in LEVEL_TABLE if lv <= 99]

    # 누적 XP
    ax1.plot(levels, cumul_xps, 'b-', linewidth=2)
    ax1.set_xlabel('레벨')
    ax1.set_ylabel('필요 누적 XP')
    ax1.set_title('레벨별 필요 누적 XP')
    ax1.grid(True, alpha=0.3)
    ax1.set_yscale('log')

    # 주요 포인트 표시
    markers = [(10, '슬리퍼 1년'), (18, '캐주얼 2년'), (30, '활동적 2년'),
               (50, '파워 1.5년'), (72, '파워 2년'), (85, '극파워 5년'), (92, '전설')]
    for lv, label in markers:
        xp = level_to_xp(lv)
        ax1.annotate(f'Lv.{lv}\n({xp:,} XP)', xy=(lv, xp),
                    fontsize=7, ha='center', va='bottom',
                    arrowprops=dict(arrowstyle='->', color='red', lw=0.5),
                    xytext=(lv, xp * 2))

    # 레벨당 필요 XP (구간별)
    per_level = [LEVEL_TABLE[i][1] - LEVEL_TABLE[i-1][1] for i in range(1, len(LEVEL_TABLE))]
    ax2.bar(range(2, len(per_level) + 2), per_level, color='steelblue', alpha=0.7)
    ax2.set_xlabel('레벨')
    ax2.set_ylabel('이 레벨 도달에 필요한 추가 XP')
    ax2.set_title('레벨당 추가 필요 XP')
    ax2.grid(True, alpha=0.3)

    # 구간 색상
    zones = [(2, 10, '#4CAF50', '빠름'), (11, 30, '#FFC107', '보통'),
             (31, 50, '#FF9800', '느림'), (51, 70, '#F44336', '꽤 느림'),
             (71, 99, '#9C27B0', '매우 느림')]
    for start, end, color, label in zones:
        ax2.axvspan(start - 0.5, end + 0.5, alpha=0.1, color=color, label=f'Lv.{start}-{end}: {label}')
    ax2.legend(fontsize=8, loc='upper left')

    plt.tight_layout()
    path = f"REPORTS/chart_level_curve_{TIMESTAMP}.png"
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  저장: {path}")


# ═══════════════════════════════════════════
#  차트 2: 유저 등급별 연차별 레벨업
# ═══════════════════════════════════════════

def chart_tier_progression():
    fig, ax = plt.subplots(figsize=(14, 8))

    colors = {'좀비': '#9E9E9E', '슬리퍼': '#78909C', '캐주얼': '#4CAF50',
              '활동적': '#FF9800', '파워유저': '#F44336'}
    months = 48  # 4년

    for tier_name, tier in BASE_TIERS.items():
        if tier_name == "좀비":
            continue  # Lv.3에서 안 움직임
        prog = simulate_user_progression(tier, months)
        ms = [p[0] for p in prog]
        lvs = [p[2] for p in prog]
        ax.plot(ms, lvs, '-', color=colors[tier_name], linewidth=2.5, label=tier_name, marker='o',
                markevery=6, markersize=4)

        # 연차 표시
        for year in [1, 2, 3, 4]:
            m = year * 12
            if m < len(prog):
                lv = prog[m][2]
                ax.annotate(f'Lv.{lv}', xy=(m, lv), fontsize=8, fontweight='bold',
                           color=colors[tier_name], ha='left', va='bottom')

    # 가이드라인
    ax.axhline(y=10, color='gray', linestyle='--', alpha=0.3, linewidth=0.5)
    ax.axhline(y=30, color='gray', linestyle='--', alpha=0.3, linewidth=0.5)
    ax.axhline(y=50, color='gray', linestyle='--', alpha=0.3, linewidth=0.5)
    ax.axhline(y=70, color='gray', linestyle='--', alpha=0.3, linewidth=0.5)
    ax.axhline(y=90, color='gray', linestyle='--', alpha=0.3, linewidth=0.5)

    # 연차 구분선
    for y in [12, 24, 36, 48]:
        ax.axvline(x=y, color='lightgray', linestyle=':', alpha=0.5)
        ax.text(y, 2, f'{y//12}년', ha='center', fontsize=9, color='gray')

    ax.set_xlabel('개월')
    ax.set_ylabel('레벨')
    ax.set_title('유저 등급별 레벨 성장 곡선 (4년)')
    ax.set_xlim(0, months)
    ax.set_ylim(0, 99)
    ax.legend(loc='upper left', fontsize=10)
    ax.grid(True, alpha=0.2)

    plt.tight_layout()
    path = f"REPORTS/chart_tier_progression_{TIMESTAMP}.png"
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  저장: {path}")


# ═══════════════════════════════════════════
#  차트 3: 행위 편향 유저별 레벨업 비교
# ═══════════════════════════════════════════

def chart_behavior_progression():
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 12))

    colors = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#795548']
    months = 36  # 3년

    # 레벨 성장 곡선
    for i, (name, tier) in enumerate(BEHAVIOR_TYPES.items()):
        prog = simulate_user_progression(tier, months)
        ms = [p[0] for p in prog]
        lvs = [p[2] for p in prog]
        ax1.plot(ms, lvs, '-', color=colors[i], linewidth=2, label=name, marker='o',
                markevery=6, markersize=3)

        # 1년, 2년 표시
        for year in [1, 2, 3]:
            m = year * 12
            if m < len(prog):
                lv = prog[m][2]
                ax1.annotate(f'{lv}', xy=(m, lv), fontsize=7, fontweight='bold',
                           color=colors[i])

    for y in [12, 24, 36]:
        ax1.axvline(x=y, color='lightgray', linestyle=':', alpha=0.5)
        ax1.text(y, 2, f'{y//12}년', ha='center', fontsize=9, color='gray')

    ax1.set_xlabel('개월')
    ax1.set_ylabel('레벨')
    ax1.set_title('행위 편향 유저별 레벨 성장 비교 (3년)')
    ax1.set_xlim(0, months)
    ax1.set_ylim(0, 85)
    ax1.legend(loc='upper left', fontsize=9)
    ax1.grid(True, alpha=0.2)

    # XP 소스 분석 (스택 바 차트)
    type_names = []
    xp_record = []
    xp_social = []
    xp_total_vals = []

    for name, tier in BEHAVIOR_TYPES.items():
        monthly_rec = (tier["monthly_rest"] + tier["monthly_wine"]) * XP_RECORD[tier["quality"]]
        monthly_soc = tier["social_monthly"] * 1.5
        type_names.append(name.split('(')[0].strip())
        xp_record.append(monthly_rec)
        xp_social.append(monthly_soc)
        xp_total_vals.append(monthly_rec + monthly_soc)

    x = np.arange(len(type_names))
    width = 0.6

    bars1 = ax2.bar(x, xp_record, width, label='기록 XP', color='#2196F3', alpha=0.8)
    bars2 = ax2.bar(x, xp_social, width, bottom=xp_record, label='소셜 XP', color='#FF9800', alpha=0.8)

    # 비율 표시
    for i, (rec, soc, total) in enumerate(zip(xp_record, xp_social, xp_total_vals)):
        if total > 0:
            rec_pct = rec / total * 100
            ax2.text(i, total + 2, f'{total:.0f} XP/월\n(기록 {rec_pct:.0f}%)',
                    ha='center', fontsize=8)

    ax2.set_xlabel('유저 유형')
    ax2.set_ylabel('월간 XP')
    ax2.set_title('행위 편향 유저별 월간 XP 구성')
    ax2.set_xticks(x)
    ax2.set_xticklabels(type_names, fontsize=9)
    ax2.legend()
    ax2.grid(True, alpha=0.2, axis='y')

    plt.tight_layout()
    path = f"REPORTS/chart_behavior_progression_{TIMESTAMP}.png"
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  저장: {path}")


# ═══════════════════════════════════════════
#  차트 4: 행위별 XP 효율 비교
# ═══════════════════════════════════════════

def chart_xp_efficiency():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))

    # 왼쪽: 행위별 XP (단일 행동)
    actions = ['이름등록', '+ 점수', '+ 사진\n(EXIF)', '+ 풀기록', '버블공유', '좋아요\n받음', '팔로워\n획득', '맞팔\n성사']
    xps = [1, 3, 10, 15, 1, 1, 2, 3]
    bar_colors = ['#E0E0E0', '#BBDEFB', '#42A5F5', '#1565C0', '#A5D6A7', '#A5D6A7', '#FFE082', '#FFE082']

    bars = ax1.barh(actions, xps, color=bar_colors, edgecolor='white', height=0.6)
    for bar, xp in zip(bars, xps):
        ax1.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
                f'+{xp} XP', va='center', fontsize=10, fontweight='bold')

    ax1.set_xlabel('XP')
    ax1.set_title('행위별 XP 부여')
    ax1.set_xlim(0, 20)
    ax1.grid(True, alpha=0.2, axis='x')

    # 오른쪽: 같은 노력(1시간) 대비 XP 효율
    # 가정: 이름등록 1분, 점수 2분, 사진기록 5분, 풀기록 8분, 소셜 1분
    scenarios = ['이름등록\n(60개/시간)', '점수만\n(30개/시간)', '사진+점수\n(12개/시간)', '풀기록\n(8개/시간)', '소셜활동\n(60건/시간)']
    hourly_xp = [60 * 1, 30 * 3, 12 * 10, 8 * 15, 60 * 1.5]
    efficiency_colors = ['#E0E0E0', '#BBDEFB', '#42A5F5', '#1565C0', '#FFE082']

    bars2 = ax2.bar(scenarios, hourly_xp, color=efficiency_colors, edgecolor='white', width=0.6)
    for bar, xp in zip(bars2, hourly_xp):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                f'{xp:.0f} XP', ha='center', fontsize=10, fontweight='bold')

    ax2.set_ylabel('시간당 XP')
    ax2.set_title('같은 시간 투자 시 XP 효율')
    ax2.grid(True, alpha=0.2, axis='y')

    # 검증 기록 표시
    ax2.annotate('← 검증 0%\n  (어뷰징)', xy=(0, 60), fontsize=8, color='red', ha='center')
    ax2.annotate('검증 100% →', xy=(3, 120), fontsize=8, color='blue', ha='center')

    plt.tight_layout()
    path = f"REPORTS/chart_xp_efficiency_{TIMESTAMP}.png"
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  저장: {path}")


# ═══════════════════════════════════════════
#  차트 5: 종합 대시보드
# ═══════════════════════════════════════════

def chart_dashboard():
    fig = plt.figure(figsize=(18, 14))

    # 2x2 그리드
    gs = fig.add_gridspec(2, 2, hspace=0.35, wspace=0.3)

    # (0,0) 등급별 4년 레벨 성장
    ax1 = fig.add_subplot(gs[0, 0])
    colors_tier = {'슬리퍼': '#78909C', '캐주얼': '#4CAF50', '활동적': '#FF9800', '파워유저': '#F44336'}
    for tier_name, tier in BASE_TIERS.items():
        if tier_name == "좀비": continue
        prog = simulate_user_progression(tier, 48)
        ax1.plot([p[0] for p in prog], [p[2] for p in prog],
                '-', color=colors_tier[tier_name], linewidth=2, label=tier_name)
    for y in [12, 24, 36, 48]:
        ax1.axvline(x=y, color='lightgray', linestyle=':', alpha=0.3)
    ax1.set_title('등급별 레벨 성장 (4년)')
    ax1.set_xlabel('개월')
    ax1.set_ylabel('레벨')
    ax1.set_ylim(0, 99)
    ax1.legend(fontsize=9)
    ax1.grid(True, alpha=0.2)

    # (0,1) 행위 편향 유저 3년 레벨 성장
    ax2 = fig.add_subplot(gs[0, 1])
    colors_beh = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#795548']
    for i, (name, tier) in enumerate(BEHAVIOR_TYPES.items()):
        prog = simulate_user_progression(tier, 36)
        short = name.split('(')[0].strip()
        ax2.plot([p[0] for p in prog], [p[2] for p in prog],
                '-', color=colors_beh[i], linewidth=2, label=short)
    for y in [12, 24, 36]:
        ax2.axvline(x=y, color='lightgray', linestyle=':', alpha=0.3)
    ax2.set_title('행위 편향 유저별 레벨 (3년)')
    ax2.set_xlabel('개월')
    ax2.set_ylabel('레벨')
    ax2.set_ylim(0, 85)
    ax2.legend(fontsize=8)
    ax2.grid(True, alpha=0.2)

    # (1,0) 레벨별 필요 XP
    ax3 = fig.add_subplot(gs[1, 0])
    per_level = [LEVEL_TABLE[i][1] - LEVEL_TABLE[i-1][1] for i in range(1, min(80, len(LEVEL_TABLE)))]
    zone_colors = []
    for lv in range(2, len(per_level) + 2):
        if lv <= 10: zone_colors.append('#4CAF50')
        elif lv <= 30: zone_colors.append('#FFC107')
        elif lv <= 50: zone_colors.append('#FF9800')
        elif lv <= 70: zone_colors.append('#F44336')
        else: zone_colors.append('#9C27B0')
    ax3.bar(range(2, len(per_level) + 2), per_level, color=zone_colors, alpha=0.7, width=1)
    ax3.set_title('레벨당 추가 필요 XP')
    ax3.set_xlabel('레벨')
    ax3.set_ylabel('추가 XP')
    ax3.grid(True, alpha=0.2)

    # (1,1) 행위별 월간 XP 구성
    ax4 = fig.add_subplot(gs[1, 1])
    type_names = [n.split('(')[0].strip() for n in BEHAVIOR_TYPES.keys()]
    rec_xps = []
    soc_xps = []
    for tier in BEHAVIOR_TYPES.values():
        rec = (tier["monthly_rest"] + tier["monthly_wine"]) * XP_RECORD[tier["quality"]]
        soc = tier["social_monthly"] * 1.5
        rec_xps.append(rec)
        soc_xps.append(soc)

    x = np.arange(len(type_names))
    ax4.barh(x, rec_xps, height=0.5, label='기록 XP', color='#2196F3', alpha=0.8)
    ax4.barh(x, soc_xps, height=0.5, left=rec_xps, label='소셜 XP', color='#FF9800', alpha=0.8)
    ax4.set_yticks(x)
    ax4.set_yticklabels(type_names, fontsize=9)
    ax4.set_title('행위 편향 유저별 월간 XP')
    ax4.set_xlabel('월간 XP')
    ax4.legend(fontsize=9)
    ax4.grid(True, alpha=0.2, axis='x')

    fig.suptitle('Nyam XP 시스템 종합 대시보드', fontsize=16, fontweight='bold', y=0.98)

    path = f"REPORTS/chart_xp_dashboard_{TIMESTAMP}.png"
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  저장: {path}")


# ═══════════════════════════════════════════
#  텍스트 분석: XP 배분 적절성 평가
# ═══════════════════════════════════════════

def evaluate_xp_balance():
    print(f"\n\n{'='*80}")
    print(f"  📊 XP 배분 적절성 평가")
    print(f"{'='*80}")

    print(f"\n  행위 편향 유저별 1년/2년/3년 도달 레벨:")
    print(f"  {'유형':<15} {'월XP':>6} │ {'1년':>5} {'2년':>5} {'3년':>5} │ {'기록%':>5} {'소셜%':>5} │ 평가")
    print(f"  {'─'*75}")

    for name, tier in BEHAVIOR_TYPES.items():
        short = name.split('(')[0].strip()
        rec = (tier["monthly_rest"] + tier["monthly_wine"]) * XP_RECORD[tier["quality"]]
        soc = tier["social_monthly"] * 1.5
        total_m = rec + soc
        rec_pct = rec / max(total_m, 1) * 100
        soc_pct = soc / max(total_m, 1) * 100

        prog = simulate_user_progression(tier, 36)
        lv_1y = prog[12][2] if len(prog) > 12 else 0
        lv_2y = prog[24][2] if len(prog) > 24 else 0
        lv_3y = prog[36][2] if len(prog) > 36 else 0

        # 평가
        if soc_pct > 50:
            verdict = "⚠️ 소셜 과다 — 기록 없이 레벨업 위험"
        elif rec_pct > 95 and tier["quality"] == "name":
            verdict = "⚠️ 이름만 등록 — XP 효율 낮음 (설계 의도)"
        elif lv_2y < 20 and total_m > 50:
            verdict = "⚠️ 노력 대비 레벨 낮음"
        elif lv_2y > 70:
            verdict = "⚠️ 레벨업 너무 빠름"
        else:
            verdict = "✅ 적절"

        print(
            f"  {short:<15} {total_m:>6.0f} │ Lv.{lv_1y:<3} Lv.{lv_2y:<3} Lv.{lv_3y:<3} │ "
            f"{rec_pct:>4.0f}% {soc_pct:>4.0f}% │ {verdict}"
        )

    print(f"\n  핵심 발견:")
    # 소셜러 분석
    soc_tier = BEHAVIOR_TYPES["소셜러 (소셜 활발)"]
    soc_prog = simulate_user_progression(soc_tier, 24)
    rec_tier = BEHAVIOR_TYPES["기록러 (풀 기록)"]
    rec_prog = simulate_user_progression(rec_tier, 24)

    print(f"    소셜러 2년: Lv.{soc_prog[24][2]} vs 기록러 2년: Lv.{rec_prog[24][2]}")
    if soc_prog[24][2] > rec_prog[24][2]:
        print(f"    🚨 소셜러가 기록러보다 레벨이 높음 — 소셜 XP 하향 필요")
    else:
        print(f"    ✅ 기록러가 소셜러보다 높음 — 기록 중심 설계 유지")

    reg_tier = BEHAVIOR_TYPES["등록러 (이름만)"]
    reg_prog = simulate_user_progression(reg_tier, 24)
    print(f"    등록러 2년: Lv.{reg_prog[24][2]} (이름만 20개/월) vs 기록러 2년: Lv.{rec_prog[24][2]} (풀기록 11개/월)")
    if reg_prog[24][2] > rec_prog[24][2] * 0.6:
        print(f"    🚨 등록러가 기록러의 60% 이상 — 이름등록 XP 하향 고려")
    else:
        print(f"    ✅ 등록러 레벨이 기록러의 절반 이하 — 품질 가중 작동")


# ═══════════════════════════════════════════

def run():
    print("=" * 80)
    print("  Nyam XP 시스템 시각화 차트 생성")
    print("=" * 80)

    print("\n  차트 1: 레벨별 필요 경험치")
    chart_level_curve()

    print("\n  차트 2: 유저 등급별 연차별 레벨업")
    chart_tier_progression()

    print("\n  차트 3: 행위 편향 유저별 레벨업 비교")
    chart_behavior_progression()

    print("\n  차트 4: XP 효율 비교")
    chart_xp_efficiency()

    print("\n  차트 5: 종합 대시보드")
    chart_dashboard()

    evaluate_xp_balance()

    print(f"\n\n  모든 차트가 REPORTS/ 폴더에 저장되었습니다.")


if __name__ == "__main__":
    run()
