"""
Pipeline C: 멀티소스 수집 → LLM 평가
카카오 + 네이버를 동시에 검색하여 후보 풀을 넓힌다.
"""

import asyncio
import time
from rich.console import Console
from rich.table import Table

from config import TEST_CASES
from search_clients import (
    kakao_keyword_search,
    kakao_category_search,
    naver_local_search,
    deduplicate,
)
from genre_classifier import classify_all
from llm_evaluator import evaluate_restaurants

console = Console()


async def run_pipeline_c(test_case: dict) -> dict:
    """Pipeline C: Multi-source search → genre classify → LLM evaluate."""
    area = test_case["area"]
    scene = test_case["scene"]
    genre = test_case.get("genre")
    query = test_case.get("query")
    lat = test_case["lat"]
    lng = test_case["lng"]

    total_start = time.time()
    steps = []

    # ── Step 1: 멀티소스 병렬 검색 ──
    t0 = time.time()

    # Build search queries
    kakao_queries = [f"{area} {scene} 맛집", f"{area} 맛집"]
    naver_queries = [f"{area} {scene} 맛집"]
    if query:
        kakao_queries.insert(0, f"{area} {query}")
        naver_queries.insert(0, f"{area} {query}")
    if genre:
        kakao_queries.append(f"{area} {genre}")

    # Run all searches concurrently
    tasks = []
    for q in kakao_queries:
        tasks.append(kakao_keyword_search(q, lat, lng, radius=2000))
    tasks.append(kakao_category_search(lat, lng, radius=1000))
    for q in naver_queries:
        tasks.append(naver_local_search(q, display=5))

    results_lists = await asyncio.gather(*tasks, return_exceptions=True)

    all_results = []
    kakao_count = 0
    naver_count = 0
    for result in results_lists:
        if isinstance(result, Exception):
            console.print(f"[yellow]  Search error: {result}[/]")
            continue
        for r in result:
            if r.source == "kakao":
                kakao_count += 1
            else:
                naver_count += 1
            all_results.append(r)

    step1_ms = int((time.time() - t0) * 1000)
    steps.append(("멀티소스 검색", f"카카오 {kakao_count} + 네이버 {naver_count} = {len(all_results)}건", step1_ms))

    # ── Step 2: 중복 제거 ──
    t0 = time.time()
    unique = deduplicate(all_results)
    multi_source = [r for r in unique if len(r.sources) > 1]
    step2_ms = int((time.time() - t0) * 1000)
    steps.append(("중복 제거 & 병합", f"{len(all_results)} → {len(unique)}개 (복수출처: {len(multi_source)}개)", step2_ms))

    # ── Step 3: 장르 분류 ──
    t0 = time.time()
    classified = classify_all(unique)
    if genre:
        genre_lower = genre.lower()
        classified = [(r, gc, gl) for r, gc, gl in classified if gc == genre_lower or gc == "other"]
    step3_ms = int((time.time() - t0) * 1000)
    steps.append(("장르 분류", f"{len(classified)}개 (필터: {genre or '전체'})", step3_ms))

    # ── Step 4: LLM 평가 ──
    t0 = time.time()
    evaluations, prompt = await evaluate_restaurants(
        classified[:20], scene, area, query,
    )
    step4_ms = int((time.time() - t0) * 1000)
    steps.append(("LLM 평가", f"{len(evaluations)}개 평가 완료", step4_ms))

    total_ms = int((time.time() - total_start) * 1000)

    return {
        "pipeline": "C",
        "test_case": test_case["name"],
        "steps": steps,
        "results": evaluations[:10],
        "prompt": prompt,
        "total_ms": total_ms,
        "candidate_count": len(unique),
        "multi_source_count": len(multi_source),
    }


def print_result(result: dict):
    console.print(f"\n[bold blue]{'='*60}[/]")
    console.print(f"[bold]Pipeline {result['pipeline']}[/]: {result['test_case']}")
    console.print(f"[dim]Total: {result['total_ms']}ms | Candidates: {result['candidate_count']} | Multi-source: {result.get('multi_source_count', 0)}[/]")

    step_table = Table(title="Pipeline Steps", show_lines=False)
    step_table.add_column("Step", style="cyan")
    step_table.add_column("Detail")
    step_table.add_column("Time", justify="right", style="green")
    for name, detail, ms in result["steps"]:
        step_table.add_row(name, detail, f"{ms}ms")
    console.print(step_table)

    if result["results"]:
        res_table = Table(title=f"Top {len(result['results'])} Results", show_lines=True)
        res_table.add_column("#", width=3)
        res_table.add_column("Name", min_width=15)
        res_table.add_column("Score", justify="right", width=6)
        res_table.add_column("Conf", width=6)
        res_table.add_column("Type", width=8)
        res_table.add_column("Reason", max_width=40)

        for i, ev in enumerate(result["results"]):
            style = "bold" if ev.category == "safe" else ("yellow" if ev.category == "adventure" else "dim")
            res_table.add_row(
                str(i + 1), ev.name, f"{ev.total_score:.0f}",
                ev.confidence, ev.category, ev.reason, style=style,
            )
        console.print(res_table)
    else:
        console.print("[red]No results[/]")


async def main():
    console.print("[bold green]Pipeline C: 멀티소스 검색 → LLM 평가[/]\n")

    for tc in TEST_CASES:
        try:
            result = await run_pipeline_c(tc)
            print_result(result)
        except Exception as e:
            console.print(f"[red]Error on {tc['name']}: {e}[/]")


if __name__ == "__main__":
    asyncio.run(main())
