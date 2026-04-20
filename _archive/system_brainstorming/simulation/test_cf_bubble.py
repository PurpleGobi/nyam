"""T7: 버블 점수 맥락 효과 + T9-F: 버블 내 오염 격리"""

from __future__ import annotations

import os
from datetime import datetime

import numpy as np

from cf_models import Category, PollutionType
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


# ─── T7: 버블 점수 맥락 효과 ───

def test_t7_bubble_context(report: list[str]):
    report.append(_header("T7: 버블 점수 맥락 효과"))

    data = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    engine = CFEngine(data)

    for bubble in data.bubbles:
        report.append(f"\n--- 버블: {bubble.name} ({bubble.context}, {len(bubble.member_ids)}명) ---")

        # 버블 멤버 중 clean 유저
        member_set = set(bubble.member_ids)
        clean_members = [u for u in data.clean_users() if u.id in member_set]

        if len(clean_members) < 3:
            report.append("  (멤버 부족)")
            continue

        # 멤버들의 holdout 기록으로 비교
        global_preds = []
        bubble_preds = []

        for user in clean_members:
            holdout = [r for r in data.records
                       if r.user_id == user.id and r.is_holdout and r.category == Category.RESTAURANT]
            for rec in holdout:
                g_pred = engine.predict(rec.user_id, rec.item_id, rec.category)
                b_pred = engine.predict_bubble(rec.user_id, rec.item_id, rec.category, bubble.member_ids)
                if g_pred:
                    global_preds.append((rec.score, g_pred))
                if b_pred:
                    bubble_preds.append((rec.score, b_pred))

        g_mae = engine.mae(global_preds)
        b_mae = engine.mae(bubble_preds)

        report.append(f"  글로벌 MAE_sat: {g_mae['mae_sat']:.3f} (n={g_mae['n']})")
        report.append(f"  버블  MAE_sat:  {b_mae['mae_sat']:.3f} (n={b_mae['n']})")

        if g_mae['mae_sat'] > 0 and b_mae['mae_sat'] > 0:
            diff = b_mae['mae_sat'] - g_mae['mae_sat']
            report.append(f"  → 차이: {diff:+.3f} ({'버블이 더 정확' if diff < 0 else '글로벌이 더 정확'})")

    # 멤버 수별 버블 점수 유의미성
    report.append(f"\n--- 버블 최소 멤버 수 탐색 ---")
    data2 = generate_all(n_users=100, holdout_ratio=0.2, seed=42)
    engine2 = CFEngine(data2)
    all_users = data2.clean_users()

    for min_members in [3, 5, 8, 10, 15]:
        # 랜덤 버블 시뮬레이션
        import random
        rng = random.Random(42)
        mini_bubble = rng.sample([u.id for u in all_users], min(min_members, len(all_users)))

        preds = []
        test_users = [u for u in all_users if u.id in set(mini_bubble)][:5]
        for user in test_users:
            holdout = [r for r in data2.records
                       if r.user_id == user.id and r.is_holdout and r.category == Category.RESTAURANT]
            for rec in holdout:
                pred = engine2.predict_bubble(rec.user_id, rec.item_id, rec.category, mini_bubble)
                if pred:
                    preds.append((rec.score, pred))

        mae = engine2.mae(preds)
        report.append(f"  {min_members}명 버블: MAE_sat={mae['mae_sat']:.3f} (n={mae['n']})")


# ─── T9-F: 버블 내 오염 격리 ───

def test_t9f_bubble_pollution(report: list[str]):
    report.append(_header("T9-F: 버블 내 오염 격리"))

    target_ids = [f"R{i:03d}" for i in range(3)]
    config = [(PollutionType.AD_BOOST, 5, target_ids)]
    data = generate_all(n_users=100, pollution_config=config, seed=42)
    engine = CFEngine(data)

    # 버블에 오염 유저 섞기
    polluted_ids = [u.id for u in data.polluted_users()]
    clean_bubble_members = data.bubbles[0].member_ids[:15]  # 기존 15명
    polluted_bubble = clean_bubble_members + polluted_ids[:3]  # + 오염 3명

    test_user = data.clean_users()[0]

    report.append(f"테스트 버블: {len(clean_bubble_members)}명 정직 + 3명 오염")

    for tid in target_ids:
        report.append(f"\n  식당 {tid}:")
        g_pred = engine.predict(test_user.id, tid, Category.RESTAURANT)
        b_clean = engine.predict_bubble(test_user.id, tid, Category.RESTAURANT, clean_bubble_members)
        b_polluted = engine.predict_bubble(test_user.id, tid, Category.RESTAURANT, polluted_bubble)

        if g_pred:
            report.append(f"    글로벌 Nyam: {g_pred.predicted_satisfaction:.2f}")
        if b_clean:
            report.append(f"    정직 버블:   {b_clean.predicted_satisfaction:.2f}")
        if b_polluted:
            report.append(f"    오염 버블:   {b_polluted.predicted_satisfaction:.2f}")
        if b_clean and b_polluted:
            damage = abs(b_polluted.predicted_satisfaction - b_clean.predicted_satisfaction)
            report.append(f"    → 오염 피해: {damage:.3f}")

    # 소규모 버블 (5명 중 1명 오염)
    report.append(f"\n--- 소규모 버블 (5명 중 1명 오염) ---")
    small_clean = data.clean_users()[:4]
    small_polluted = [data.polluted_users()[0]]
    small_bubble_clean = [u.id for u in small_clean]
    small_bubble_mixed = small_bubble_clean + [small_polluted[0].id]

    for tid in target_ids[:2]:
        b_c = engine.predict_bubble(test_user.id, tid, Category.RESTAURANT, small_bubble_clean)
        b_m = engine.predict_bubble(test_user.id, tid, Category.RESTAURANT, small_bubble_mixed)
        if b_c and b_m:
            damage = abs(b_m.predicted_satisfaction - b_c.predicted_satisfaction)
            report.append(f"  {tid}: 정직={b_c.predicted_satisfaction:.2f}, 혼합={b_m.predicted_satisfaction:.2f}, 피해={damage:.3f}")


def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T7: 버블 맥락 + T9-F: 버블 오염 격리")
    report.append(f"실행: {_timestamp()}")

    test_t7_bubble_context(report)
    test_t9f_bubble_pollution(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_bubble_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
