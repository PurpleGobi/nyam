"""T10: 스케일 & 속도 테스트"""

from __future__ import annotations

import os
import time
from datetime import datetime

from cf_models import Category
from cf_data_generator import generate_all
from cf_engine import CFEngine


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _header(title: str) -> str:
    return f"\n{'='*60}\n  {title}\n{'='*60}\n"


# ─── T10-A: 단건 예측 속도 ───

def test_t10a_single_prediction(report: list[str]):
    report.append(_header("T10-A: 단건 예측 속도"))

    for n_users, label in [(100, "100명"), (500, "500명"), (1000, "1,000명")]:
        data = generate_all(n_users=n_users, seed=42)
        engine = CFEngine(data)
        test_user = data.clean_users()[0]

        # 워밍업
        restaurants = data.restaurants[:5]
        for r in restaurants:
            engine.predict(test_user.id, r.id, Category.RESTAURANT)
        engine.clear_cache()

        # 측정: 20건 예측
        times = []
        test_items = data.restaurants[:20]
        for item in test_items:
            start = time.perf_counter()
            engine.predict(test_user.id, item.id, Category.RESTAURANT)
            elapsed = (time.perf_counter() - start) * 1000  # ms
            times.append(elapsed)

        avg_ms = sum(times) / len(times)
        max_ms = max(times)
        report.append(f"  {label}: 평균 {avg_ms:.1f}ms, 최대 {max_ms:.1f}ms (목표: <100ms)")


# ─── T10-B: 목록 페이지 속도 ───

def test_t10b_list_prediction(report: list[str]):
    report.append(_header("T10-B: 목록 페이지 속도 (20건)"))

    for n_users, label in [(100, "100명"), (500, "500명"), (1000, "1,000명")]:
        data = generate_all(n_users=n_users, seed=42)
        engine = CFEngine(data)
        test_user = data.clean_users()[0]
        test_items = data.restaurants[:20]

        # 직렬 20건
        start = time.perf_counter()
        for item in test_items:
            engine.predict(test_user.id, item.id, Category.RESTAURANT)
        serial_ms = (time.perf_counter() - start) * 1000

        report.append(f"  {label}: 직렬 20건 = {serial_ms:.1f}ms (목표: <500ms)")


# ─── T10-C: 캐시 효과 ───

def test_t10c_cache_effect(report: list[str]):
    report.append(_header("T10-C: 적합도 캐시 효과"))

    data = generate_all(n_users=100, seed=42)
    engine = CFEngine(data)
    test_user = data.clean_users()[0]
    test_items = data.restaurants[:20]

    # 캐시 없이
    engine.clear_cache()
    start = time.perf_counter()
    for item in test_items:
        engine.predict(test_user.id, item.id, Category.RESTAURANT)
    cold_ms = (time.perf_counter() - start) * 1000

    # 캐시 있는 상태에서 재실행
    start = time.perf_counter()
    for item in test_items:
        engine.predict(test_user.id, item.id, Category.RESTAURANT)
    warm_ms = (time.perf_counter() - start) * 1000

    report.append(f"  캐시 cold: {cold_ms:.1f}ms")
    report.append(f"  캐시 warm: {warm_ms:.1f}ms")
    if cold_ms > 0:
        speedup = cold_ms / warm_ms if warm_ms > 0 else float('inf')
        report.append(f"  → 캐시 효과: {speedup:.1f}x 빨라짐")

    # 캐시 메모리 사용량 추정
    cache_size = len(engine._sim_cache)
    report.append(f"  캐시 엔트리 수: {cache_size}")


# ─── T10-D: 사전 계산 시뮬레이션 ───

def test_t10d_precompute(report: list[str]):
    report.append(_header("T10-D: 사전 계산 전략 비교"))

    for n_users in [100, 500, 1000]:
        n_pairs = n_users * (n_users - 1) // 2
        # 적합도 매트릭스 사전 계산 시간 추정
        data = generate_all(n_users=min(n_users, 200), seed=42)
        engine = CFEngine(data)

        # 100쌍 샘플 측정
        users = data.clean_users()[:50]
        start = time.perf_counter()
        count = 0
        for i in range(len(users)):
            for j in range(i + 1, len(users)):
                engine.similarity(users[i].id, users[j].id, Category.RESTAURANT)
                count += 1
                if count >= 100:
                    break
            if count >= 100:
                break
        elapsed = time.perf_counter() - start
        per_pair = elapsed / count * 1000  # ms

        estimated_total = per_pair * n_pairs / 1000  # sec
        report.append(f"\n  {n_users}명 ({n_pairs:,} 쌍):")
        report.append(f"    쌍당 적합도 계산: {per_pair:.2f}ms")
        report.append(f"    전체 매트릭스 추정: {estimated_total:.1f}초")
        report.append(f"    저장 공간: ~{n_pairs * 24 / 1024:.0f}KB (쌍당 24bytes)")


def main():
    report: list[str] = []
    report.append(f"Nyam CF 시뮬레이션 — T10: 스케일 & 속도 테스트")
    report.append(f"실행: {_timestamp()}")

    test_t10a_single_prediction(report)
    test_t10b_list_prediction(report)
    test_t10c_cache_effect(report)
    test_t10d_precompute(report)

    output = "\n".join(report)
    print(output)

    os.makedirs("REPORTS", exist_ok=True)
    filename = f"REPORTS/test_cf_scale_{_timestamp()}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n→ 저장: {filename}")


if __name__ == "__main__":
    main()
