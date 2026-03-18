"""
Pipeline D: 멀티소스 + 외부 시그널 → LLM 평가 (Full Pipeline)

1. 카카오 + 네이버 병렬 검색
2. 중복 제거 & 병합
3. LLM으로 외부 시그널 수집 (미슐랭, 블루리본, 웨이팅 등)
4. 장르 분류
5. 시그널 포함하여 LLM 최종 평가
"""

import asyncio
import json
import time
from rich.console import Console
from rich.table import Table

from config import TEST_CASES, SCENE_WEIGHTS, DEFAULT_WEIGHTS
from search_clients import (
    kakao_keyword_search,
    kakao_category_search,
    naver_local_search,
    deduplicate,
    Restaurant,
)
from genre_classifier import classify_all
from llm_evaluator import collect_signals_via_llm, EvaluationResult

import google.generativeai as genai
from config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

console = Console()


def build_full_evaluation_prompt(
    restaurants: list[tuple[Restaurant, str, str]],
    signals: dict[str, dict],
    scene: str | None,
    area: str | None,
    query: str | None,
) -> str:
    """Build prompt with real search data + external signals."""
    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)

    restaurant_entries = []
    for r, genre_code, genre_label in restaurants:
        entry = f"[{r.name}]\n"
        entry += f"  장르: {genre_label} | 카테고리: {r.category}\n"
        entry += f"  주소: {r.road_address or r.address}\n"
        if r.distance is not None:
            entry += f"  거리: {r.distance}m\n"
        if len(r.sources) > 1:
            entry += f"  검색 출처: {', '.join(r.sources)} (복수 출처 = 신뢰도↑)\n"

        # Append external signals
        sig = signals.get(r.name, {})
        if sig:
            sig_parts = []
            if sig.get("michelin"):
                sig_parts.append(f"미슐랭: {sig['michelin']}")
            if sig.get("blue_ribbon"):
                sig_parts.append(f"블루리본: {sig['blue_ribbon']}개")
            if sig.get("catch_table_popular"):
                sig_parts.append("캐치테이블 인기")
            if sig.get("waiting_level"):
                sig_parts.append(f"웨이팅: {sig['waiting_level']}")
            if sig.get("avg_price_range"):
                sig_parts.append(f"가격대: {sig['avg_price_range']}")
            if sig.get("notable"):
                sig_parts.append(sig["notable"])
            if sig_parts:
                entry += f"  외부 시그널: {' | '.join(sig_parts)}\n"

        restaurant_entries.append(entry)

    restaurant_text = "\n".join(restaurant_entries)

    context_parts = []
    if query:
        context_parts.append(f'★ 사용자 요청: "{query}"')
    if scene:
        context_parts.append(f"씬: {scene}")
    if area:
        context_parts.append(f"지역: {area}")

    from llm_evaluator import _scene_description

    prompt = f"""[역할]
당신은 한국 외식 큐레이터다.
아래 실제 검색된 식당들을 씬에 맞게 평가하고 순위를 매겨라.

중요: 아래 식당만 평가하라. 새로운 식당을 추가하지 마라.
외부 시그널이 제공된 경우 적극 반영하되, LLM 자체 지식도 활용하라.

────────────────
검색 조건
────────────────
{chr(10).join(context_parts)}

────────────────
평가 대상 식당 ({len(restaurants)}개, 외부 시그널 포함)
────────────────
{restaurant_text}

────────────────
평가 기준과 가중치 (총 100점)
────────────────
- context_fit ({weights['context_fit']}점): {_scene_description(scene)}
- reputation ({weights['reputation']}점): 대중 평판 (별점, 리뷰 수, 플랫폼 간 일관성)
- accessibility ({weights['accessibility']}점): 접근성 (예약, 웨이팅, 방문 난이도)
- authority ({weights['authority']}점): 권위 신호 (미슐랭, 블루리본 등 — 제공된 시그널 반영)
- trend ({weights['trend']}점): 최근성 (최근 후기, SNS 화제성)
- review_trust ({weights['review_trust']}점): 리뷰 신뢰도 (광고성 감점, 실방문 우대)

────────────────
시그널 반영 규칙
────────────────
- 미슐랭 3스타 → authority 95+, 1스타 → 80+, 빕구르망 → 70+
- 블루리본 3개 → authority 85+, 1개 → 65+
- 캐치테이블 인기 → accessibility +10 (예약 수요 높음), reputation +5
- 웨이팅 long/extreme → accessibility -15~-30, 하지만 reputation +5~10 (인기 신호)
- 복수 출처 발견 → review_trust +10

────────────────
출력 형식 (JSON만)
────────────────
{{
  "evaluations": [
    {{
      "name": "식당 이름",
      "scores": {{
        "context_fit": 85,
        "reputation": 70,
        "accessibility": 60,
        "authority": 40,
        "trend": 75,
        "review_trust": 65
      }},
      "totalScore": 72,
      "reason": "씬 맥락 포함 추천 이유 (1문장)",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "confidence": "high",
      "category": "safe"
    }}
  ]
}}

상위 10개만 평가. totalScore 내림차순 정렬."""

    return prompt


async def run_pipeline_d(test_case: dict) -> dict:
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
    kakao_queries = [f"{area} {scene} 맛집", f"{area} 맛집"]
    naver_queries = [f"{area} {scene} 맛집"]
    if query:
        kakao_queries.insert(0, f"{area} {query}")
        naver_queries.insert(0, f"{area} {query}")
    if genre:
        kakao_queries.append(f"{area} {genre}")

    tasks = []
    for q in kakao_queries:
        tasks.append(kakao_keyword_search(q, lat, lng, radius=2000))
    tasks.append(kakao_category_search(lat, lng, radius=1000))
    for q in naver_queries:
        tasks.append(naver_local_search(q, display=5))

    results_lists = await asyncio.gather(*tasks, return_exceptions=True)
    all_results = []
    for result in results_lists:
        if isinstance(result, Exception):
            continue
        all_results.extend(result)

    step1_ms = int((time.time() - t0) * 1000)
    steps.append(("멀티소스 검색", f"{len(all_results)}건", step1_ms))

    # ── Step 2: 중복 제거 ──
    t0 = time.time()
    unique = deduplicate(all_results)
    multi_source = [r for r in unique if len(r.sources) > 1]
    step2_ms = int((time.time() - t0) * 1000)
    steps.append(("중복 제거", f"{len(unique)}개 (복수출처: {len(multi_source)}개)", step2_ms))

    # ── Step 3: 장르 분류 ──
    t0 = time.time()
    classified = classify_all(unique)
    if genre:
        genre_lower = genre.lower()
        classified = [(r, gc, gl) for r, gc, gl in classified if gc == genre_lower or gc == "other"]
    step3_ms = int((time.time() - t0) * 1000)
    steps.append(("장르 분류", f"{len(classified)}개", step3_ms))

    # ── Step 4: 외부 시그널 수집 (LLM) ──
    t0 = time.time()
    top_candidates = [r for r, _, _ in classified[:20]]
    signals = await collect_signals_via_llm(top_candidates, area)
    signal_count = sum(1 for s in signals.values() if any(v is not None for v in s.values()))
    step4_ms = int((time.time() - t0) * 1000)
    steps.append(("외부 시그널 수집", f"{signal_count}/{len(signals)}개 시그널 보유", step4_ms))

    # ── Step 5: LLM 최종 평가 (시그널 포함) ──
    t0 = time.time()
    prompt = build_full_evaluation_prompt(classified[:20], signals, scene, area, query)

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    response = await model.generate_content_async(prompt)
    raw = response.text

    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)
    evaluations = []
    try:
        data = json.loads(raw)
        for ev in data.get("evaluations", []):
            scores = ev.get("scores", {})
            total = sum(scores.get(k, 50) * w / 100 for k, w in weights.items())
            evaluations.append(EvaluationResult(
                name=ev.get("name", ""),
                total_score=round(total, 1),
                scores=scores,
                reason=ev.get("reason", ""),
                strengths=ev.get("strengths", []),
                weaknesses=ev.get("weaknesses", []),
                confidence=ev.get("confidence", "low"),
                category=ev.get("category", "uncertain"),
            ))
    except json.JSONDecodeError:
        pass

    evaluations.sort(key=lambda r: r.total_score, reverse=True)
    step5_ms = int((time.time() - t0) * 1000)
    steps.append(("LLM 최종 평가", f"{len(evaluations)}개 평가 완료", step5_ms))

    total_ms = int((time.time() - total_start) * 1000)

    return {
        "pipeline": "D",
        "test_case": test_case["name"],
        "steps": steps,
        "results": evaluations[:10],
        "prompt": prompt,
        "signals": signals,
        "total_ms": total_ms,
        "candidate_count": len(unique),
        "multi_source_count": len(multi_source),
    }


def print_result(result: dict):
    console.print(f"\n[bold magenta]{'='*60}[/]")
    console.print(f"[bold]Pipeline {result['pipeline']}[/]: {result['test_case']}")
    console.print(f"[dim]Total: {result['total_ms']}ms | Candidates: {result['candidate_count']} | Multi-source: {result.get('multi_source_count', 0)}[/]")

    step_table = Table(title="Pipeline Steps", show_lines=False)
    step_table.add_column("Step", style="cyan")
    step_table.add_column("Detail")
    step_table.add_column("Time", justify="right", style="green")
    for name, detail, ms in result["steps"]:
        step_table.add_row(name, detail, f"{ms}ms")
    console.print(step_table)

    # Signals summary
    if result.get("signals"):
        sig_table = Table(title="External Signals", show_lines=False)
        sig_table.add_column("Name", min_width=15)
        sig_table.add_column("Michelin")
        sig_table.add_column("Blue Ribbon")
        sig_table.add_column("Waiting")
        sig_table.add_column("Price")
        sig_table.add_column("Notable")
        for name, sig in list(result["signals"].items())[:10]:
            sig_table.add_row(
                name,
                str(sig.get("michelin") or "-"),
                str(sig.get("blue_ribbon") or "-"),
                str(sig.get("waiting_level") or "-"),
                str(sig.get("avg_price_range") or "-"),
                str(sig.get("notable") or "-"),
            )
        console.print(sig_table)

    if result["results"]:
        res_table = Table(title=f"Top {len(result['results'])} Results", show_lines=True)
        res_table.add_column("#", width=3)
        res_table.add_column("Name", min_width=15)
        res_table.add_column("Score", justify="right", width=6)
        res_table.add_column("Conf", width=6)
        res_table.add_column("Type", width=8)
        res_table.add_column("Reason", max_width=40)
        res_table.add_column("Strengths", max_width=30)

        for i, ev in enumerate(result["results"]):
            style = "bold" if ev.category == "safe" else ("yellow" if ev.category == "adventure" else "dim")
            res_table.add_row(
                str(i + 1), ev.name, f"{ev.total_score:.0f}",
                ev.confidence, ev.category, ev.reason,
                ", ".join(ev.strengths[:2]) if ev.strengths else "-",
                style=style,
            )
        console.print(res_table)


async def main():
    console.print("[bold green]Pipeline D: 멀티소스 + 외부 시그널 → LLM 평가[/]\n")

    for tc in TEST_CASES:
        try:
            result = await run_pipeline_d(tc)
            print_result(result)
        except Exception as e:
            console.print(f"[red]Error on {tc['name']}: {e}[/]")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
