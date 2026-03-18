"""
Run a single test case across pipelines B, C, D and compare against ground truth.
Usage: python compare_all.py [test_index]
  test_index: 0=강남혼밥, 1=성수데이트, 2=종로라멘, 3=홍대친구, 4=여의도비즈니스
"""

import asyncio
import sys
import time
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from config import TEST_CASES
from test_pipeline_b import run_pipeline_b
from test_pipeline_c import run_pipeline_c
from test_pipeline_d import run_pipeline_d
from ground_truth import evaluate_pipeline_result, GROUND_TRUTH

console = Console()


async def main():
    idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    if idx >= len(TEST_CASES):
        console.print(f"[red]Invalid index. Max: {len(TEST_CASES) - 1}[/]")
        return

    tc = TEST_CASES[idx]
    gt = GROUND_TRUTH.get(tc["name"])

    console.print(Panel(
        f"[bold]{tc['name']}[/]\n"
        f"지역: {tc['area']} | 씬: {tc['scene']} | 장르: {tc.get('genre', '-')} | 검색어: {tc.get('query', '-')}\n"
        f"\n[dim]평가 기준: {gt.quality_criteria if gt else 'N/A'}[/]",
        title="Test Case",
    ))

    # Show ground truth
    if gt:
        console.print("\n[bold yellow]Ground Truth (정답셋)[/]")
        console.print(f"  [red]필수[/]: {', '.join(e.name for e in gt.must_include)}")
        console.print(f"  [yellow]권장[/]: {', '.join(e.name for e in gt.good_to_have)}")
        if gt.acceptable:
            console.print(f"  [dim]수용[/]: {', '.join(e.name for e in gt.acceptable)}")
        console.print(f"  [red dim]부적합[/]: {', '.join(gt.bad_examples)}")

    # Run all pipelines
    console.print("\n[dim]Running pipelines...[/]")

    results = {}
    for name, runner in [("B", run_pipeline_b), ("C", run_pipeline_c), ("D", run_pipeline_d)]:
        console.print(f"  [cyan]Pipeline {name}[/] ...", end=" ")
        t0 = time.time()
        try:
            results[name] = await runner(tc)
            ms = int((time.time() - t0) * 1000)
            count = len(results[name]["results"])
            console.print(f"[green]done[/] ({ms}ms, {count} results)")
        except Exception as e:
            console.print(f"[red]error: {e}[/]")
            import traceback
            traceback.print_exc()

    # ── Ground Truth Evaluation ──
    console.print(f"\n[bold]{'='*70}[/]")
    console.print("[bold]Ground Truth Evaluation[/]\n")

    eval_table = Table(title="Pipeline vs Ground Truth", show_lines=True)
    eval_table.add_column("Pipeline", width=10)
    eval_table.add_column("Score", justify="right", width=6, style="bold")
    eval_table.add_column("Time", justify="right", width=8)
    eval_table.add_column("Candidates", justify="right", width=10)
    eval_table.add_column("Tier1 Hit", justify="center", width=10)
    eval_table.add_column("Tier2 Hit", justify="center", width=10)
    eval_table.add_column("Bad", justify="center", width=8)
    eval_table.add_column("Details", max_width=35)

    for name, result in results.items():
        result_names = [ev.name for ev in result["results"]]
        evaluation = evaluate_pipeline_result(tc["name"], result_names)

        score = evaluation["score"]
        score_style = "green bold" if score >= 70 else ("yellow" if score >= 40 else "red")

        tier1 = evaluation["hits"]["tier1"]
        tier2 = evaluation["hits"]["tier2"]
        bad = evaluation["bad_included"]

        eval_table.add_row(
            f"Pipeline {name}",
            f"[{score_style}]{score:.0f}[/]",
            f"{result['total_ms']}ms",
            str(result["candidate_count"]),
            f"{len(tier1)}/{len(gt.must_include) if gt else 0}",
            f"{len(tier2)}/{len(gt.good_to_have) if gt else 0}",
            f"[red]{len(bad)}[/]" if bad else "0",
            evaluation["details"][:35],
        )

    console.print(eval_table)

    # ── Side-by-side Results ──
    console.print(f"\n[bold]Top 5 Results (side by side)[/]\n")

    compare_table = Table(show_lines=True)
    compare_table.add_column("#", width=3)
    for name in results:
        compare_table.add_column(f"Pipeline {name}", min_width=20)
        compare_table.add_column(f"Score", justify="right", width=6)

    for i in range(5):
        row = [str(i + 1)]
        for name in results:
            res_list = results[name]["results"]
            if i < len(res_list):
                ev = res_list[i]
                # Highlight if it's a ground truth hit
                is_hit = False
                if gt:
                    all_gt_names = [e.name for e in gt.must_include + gt.good_to_have]
                    from ground_truth import _find_match, _normalize
                    is_hit = _find_match(ev.name, [_normalize(n) for n in all_gt_names])
                prefix = "[green]" if is_hit else ""
                suffix = "[/]" if is_hit else ""
                row.append(f"{prefix}{ev.name}{suffix}")
                row.append(f"{ev.total_score:.0f}")
            else:
                row.append("-")
                row.append("-")
        compare_table.add_row(*row)

    console.print(compare_table)

    # ── Winner ──
    if results:
        scores = {}
        for name, result in results.items():
            result_names = [ev.name for ev in result["results"]]
            evaluation = evaluate_pipeline_result(tc["name"], result_names)
            scores[name] = evaluation["score"]

        winner = max(scores, key=lambda k: scores[k])
        console.print(f"\n[bold green]Winner: Pipeline {winner} (GT Score: {scores[winner]:.0f})[/]")
        for name, score in sorted(scores.items(), key=lambda x: -x[1]):
            bar = "#" * int(score / 2)
            console.print(f"  {name}: {bar} {score:.0f}")


if __name__ == "__main__":
    asyncio.run(main())
