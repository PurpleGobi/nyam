"""
Pipeline F: 템플릿 키워드(LLM 0) + 체인 필터 + 사전 랭킹 + 강화 프롬프트

Pipeline E와 동일하되, 키워드 생성을 LLM 대신 템플릿으로 대체.
- LLM 호출: 1회 (평가만)
- 키워드 생성: 0ms, 비용 0
- 체인 필터 + 사전 랭킹 + 씬별 부정 규칙은 E와 동일
- 후보 상한 30개: 사전 랭킹으로 LLM에 보내는 후보를 30개로 제한
"""

import asyncio
import json
import time
from rich.console import Console
from rich.table import Table

from config import TEST_CASES, SCENE_WEIGHTS, DEFAULT_WEIGHTS, GEMINI_API_KEY
from search_clients import (
    kakao_keyword_search,
    kakao_category_search,
    kakao_category_grid_search,
    naver_local_search,
    deduplicate,
    Restaurant,
)
from genre_classifier import classify_all
from llm_evaluator import EvaluationResult
from keyword_templates import generate_queries
from test_pipeline_e import (
    is_chain,
    build_enhanced_prompt,
)

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

console = Console()


async def run_pipeline_f(test_case: dict) -> dict:
    area = test_case["area"]
    scene = test_case["scene"]
    genre = test_case.get("genre")
    query = test_case.get("query")
    lat = test_case["lat"]
    lng = test_case["lng"]

    total_start = time.time()
    steps = []

    # ── Step 1: 템플릿 키워드 생성 (LLM 불필요) ──
    t0 = time.time()
    all_queries = generate_queries(area, scene, genre, query)
    step1_ms = int((time.time() - t0) * 1000)
    steps.append(("키워드 템플릿", f"{len(all_queries)}개: {all_queries[:3]}...", step1_ms))

    # ── Step 2: 키워드 검색(주력) + 그리드 검색(교차 검증) ──
    t0 = time.time()

    # [주력] 씬 맞춤 키워드 검색
    keyword_tasks = []
    for q in all_queries:
        keyword_tasks.append(kakao_keyword_search(q, lat, lng, radius=2000))
    # 네이버 교차 검증 (core 1개)
    keyword_tasks.append(naver_local_search(all_queries[0], display=5))

    # [보조] 좌표 기반 카테고리 검색 (교차 출현 확인용)
    grid_task = kakao_category_grid_search(lat, lng, radius=500, grid_step=0.004, grid_size=1)

    # 병렬 실행
    keyword_results_lists, grid_results = await asyncio.gather(
        asyncio.gather(*keyword_tasks, return_exceptions=True),
        grid_task,
    )

    # 키워드 결과 수집
    keyword_results = []
    for result in keyword_results_lists:
        if isinstance(result, list):
            keyword_results.extend(result)

    # 그리드 결과에서 이름 집합 추출 (교차 검증용)
    grid_names = {r.name for r in grid_results}

    # 키워드 결과가 주력, 그리드에도 있으면 sources에 반영됨
    all_results = keyword_results + grid_results

    step2_ms = int((time.time() - t0) * 1000)
    steps.append(("키워드+그리드 검색", f"키워드 {len(keyword_results)}건 + 그리드 {len(grid_results)}건", step2_ms))

    # ── Step 3: 중복 제거 + 체인 필터 ──
    t0 = time.time()
    # 키워드 결과 이름 집합 (씬 관련성 높음)
    keyword_names = {r.name for r in keyword_results}

    unique = deduplicate(all_results)
    before_filter = len(unique)
    filtered = [r for r in unique if not is_chain(r.name)]
    chain_removed = before_filter - len(filtered)

    # 키워드 검색에서 나온 식당인지 표시 (사전 랭킹에서 사용)
    keyword_hit_names = set()
    for r in filtered:
        if r.name in keyword_names:
            keyword_hit_names.add(r.name)

    multi_source = [r for r in filtered if len(r.sources) > 1]
    step3_ms = int((time.time() - t0) * 1000)
    steps.append(("중복 제거 + 체인 필터", f"{len(filtered)}개 (체인 {chain_removed}개 제거, 키워드 {len(keyword_hit_names)}개, 복수출처 {len(multi_source)}개)", step3_ms))

    # ── Step 4: 장르 분류 + 사전 랭킹 ──
    t0 = time.time()
    classified = classify_all(filtered)
    if genre:
        genre_lower = genre.lower()
        classified = [(r, gc, gl) for r, gc, gl in classified if gc == genre_lower or gc == "other"]

    # 사전 랭킹 우선순위: 맛집 시그널 > 씬 적합도
    # (할루시네이션 X → 지역 O → 맛집 > 씬)
    CANDIDATE_CAP = 20

    def pre_rank_score(item: tuple) -> float:
        r, gc, gl = item
        score = 0.0

        # [최중요] 키워드 검색에서 나온 식당 = 씬 관련성 확보
        if r.name in keyword_hit_names:
            score += 30

        # [중요] 복수 출처 = 실제 맛집 시그널
        score += len(r.sources) * 25

        # [중요] 리뷰/평점 = 맛집 품질 시그널
        if r.rating and r.rating > 0:
            score += r.rating * 5  # 4.5점 → 22.5
        if r.review_count and r.review_count > 0:
            score += min(15, r.review_count / 5)  # 100건 → 15

        # [보조] 거리 가점
        if r.distance is not None:
            score += max(0, 20 - r.distance / 100)

        # [보조] 씬 키워드 매칭 (가점이지만 맛집 시그널보다 낮음)
        text = f"{r.category or ''} {r.name}".lower()
        scene_keywords = {
            "혼밥": ["국수", "라멘", "우동", "돈까스", "카레", "덮밥", "1인", "소바"],
            "데이트": ["이탈리", "프렌치", "파스타", "와인", "레스토랑", "비스트로", "다이닝"],
            "비즈니스": ["한정식", "일식", "오마카세", "프렌치", "코스", "스시"],
            "친구모임": ["고기", "구이", "삼겹", "치킨", "닭갈비", "솥뚜껑"],
            "가족": ["한식", "중식", "뷔페", "갈비", "한정식"],
            "술자리": ["호프", "포차", "이자카야", "바", "술집"],
        }
        for kw in scene_keywords.get(scene or "", []):
            if kw in text:
                score += 5
                break

        return score

    # 사전 랭킹 점수 계산 후 정렬
    scored = [(item, pre_rank_score(item)) for item in classified]
    scored.sort(key=lambda x: x[1], reverse=True)

    # 디버그: GT 식당이 후보에 있는지 확인
    from ground_truth import GROUND_TRUTH, _normalize, _fuzzy_match
    gt = GROUND_TRUTH.get(test_case["name"])
    if gt:
        gt_names = [e.name for e in gt.must_include + gt.good_to_have]
        for gt_name in gt_names:
            gt_norm = _normalize(gt_name)
            found = False
            for rank, (item, s) in enumerate(scored, 1):
                r = item[0]
                r_norm = _normalize(r.name)
                if _fuzzy_match(gt_norm, r_norm):
                    cap_mark = " [IN]" if rank <= CANDIDATE_CAP else " [OUT]"
                    console.print(f"  [dim]GT '{gt_name}' → #{rank} '{r.name}' (score={s:.0f}){cap_mark}[/]")
                    found = True
                    break
            if not found:
                console.print(f"  [dim red]GT '{gt_name}' → NOT FOUND[/]")

    classified = [item for item, _ in scored[:CANDIDATE_CAP]]
    total_classified = len(scored)
    step4_ms = int((time.time() - t0) * 1000)
    steps.append(("장르 분류 + 사전 랭킹", f"{total_classified}개 → 상위 {len(classified)}개 선별", step4_ms))

    # ── Step 5: LLM 최종 평가 (강화 프롬프트) ──
    t0 = time.time()
    prompt = build_enhanced_prompt(classified[:CANDIDATE_CAP], scene, area, query)

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
    steps.append(("LLM 평가 (2.5 Flash)", f"{len(evaluations)}개 평가", step5_ms))

    total_ms = int((time.time() - total_start) * 1000)

    return {
        "pipeline": "F",
        "test_case": test_case["name"],
        "steps": steps,
        "results": evaluations[:10],
        "prompt": prompt,
        "total_ms": total_ms,
        "candidate_count": len(filtered),
        "chain_removed": chain_removed,
        "multi_source_count": len(multi_source),
    }


async def main():
    import sys
    console.print("[bold green]Pipeline F: 템플릿 키워드 + 체인 필터 + 강화 프롬프트[/]\n")

    if len(sys.argv) > 1:
        idx = int(sys.argv[1])
        cases = [TEST_CASES[idx]]
    else:
        cases = TEST_CASES

    for tc in cases:
        try:
            result = await run_pipeline_f(tc)

            console.print(f"\n[bold magenta]{'='*60}[/]")
            console.print(f"[bold]Pipeline {result['pipeline']}[/]: {result['test_case']}")
            console.print(f"[dim]Total: {result['total_ms']}ms | Candidates: {result['candidate_count']} | "
                          f"Chains removed: {result.get('chain_removed', 0)}[/]")

            step_table = Table(title="Pipeline Steps", show_lines=False)
            step_table.add_column("Step", style="cyan")
            step_table.add_column("Detail")
            step_table.add_column("Time", justify="right", style="green")
            for name, detail, ms in result["steps"]:
                step_table.add_row(name, str(detail), f"{ms}ms")
            console.print(step_table)

            if result["results"]:
                res_table = Table(title=f"Top {len(result['results'])} Results", show_lines=True)
                res_table.add_column("#", width=3)
                res_table.add_column("Name", min_width=15)
                res_table.add_column("Score", justify="right", width=6)
                res_table.add_column("Reason", max_width=45)
                for i, ev in enumerate(result["results"]):
                    res_table.add_row(str(i + 1), ev.name, f"{ev.total_score:.0f}", ev.reason)
                console.print(res_table)
        except Exception as e:
            console.print(f"[red]Error on {tc['name']}: {e}[/]")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
