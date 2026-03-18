"""
Pipeline E: 스마트 검색 키워드 + 체인 필터 + 강화 프롬프트

개선점:
1. LLM(2.0 Flash, 저비용)으로 씬/장르에 맞는 검색 키워드 5~8개 생성
2. 카카오 검색을 키워드별 + 반경 다양화로 후보 풀 확대
3. 체인/패스트푸드 사전 필터링 (LLM 불필요, 블랙리스트)
4. LLM 평가 프롬프트에 부정 규칙 강화 (체인 감점, 씬 미스매치 감점)
5. 2단계 LLM 호출은 비용 대비 효과 없으므로 1회로 유지
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
    naver_local_search,
    deduplicate,
    Restaurant,
)
from genre_classifier import classify_all
from llm_evaluator import EvaluationResult

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

console = Console()

# ── 체인/패스트푸드 블랙리스트 ──────────────────────
CHAIN_BLACKLIST = {
    # 패스트푸드
    "맥도날드", "버거킹", "롯데리아", "kfc", "파파이스", "맘스터치",
    "노브랜드버거", "쉐이크쉑", "모스버거",
    # 카페 (식당 아님)
    "스타벅스", "투썸플레이스", "이디야", "빽다방", "메가커피",
    "컴포즈커피", "할리스", "탐앤탐스", "커피빈", "폴바셋",
    # 편의점/대형 체인
    "편의점", "cu", "gs25", "세븐일레븐", "이마트24",
    # 제과/베이커리
    "파리바게뜨", "뚜레쥬르", "던킨", "크리스피크림",
    # 프랜차이즈 분식
    "김밥천국", "김가네", "바르다김선생",
}

# 프랜차이즈 패턴 (이름에 포함되면 의심)
CHAIN_PATTERNS = [
    "버거킹", "맥도날드", "KFC", "롯데리아", "맘스터치",
    "스타벅스", "투썸", "이디야", "빽다방", "메가커피",
    "편의점", "파리바게뜨", "뚜레쥬르",
]


def is_chain(name: str) -> bool:
    """체인/패스트푸드인지 판별."""
    normalized = name.replace(" ", "").lower()
    for chain in CHAIN_BLACKLIST:
        if chain in normalized:
            return True
    return False


# ── Step 1: LLM으로 검색 키워드 생성 (2.0 Flash, 저비용) ──

async def generate_search_queries(
    area: str,
    scene: str,
    genre: str | None,
    query: str | None,
) -> list[str]:
    """
    LLM(Gemini 2.0 Flash)으로 카카오 검색에 최적화된 키워드 생성.
    비용: 매우 저렴 (~0.1$/1M tokens), 속도: 1-3초
    """
    prompt = f"""카카오맵 검색에 사용할 검색어를 생성해라.

조건:
- 지역: {area}
- 씬(목적): {scene}
- 장르: {genre or "전체"}
- 사용자 요청: {query or "없음"}

규칙:
1. 카카오맵 키워드 검색에 최적화된 검색어를 6~8개 생성
2. 일반적인 키워드와 구체적인 키워드를 섞어라
3. 씬에 맞는 식당 유형을 구체적으로 포함
4. 프랜차이즈/체인이 아닌 개인 맛집을 찾을 수 있는 키워드
5. 지역명 + 음식 종류 조합이 효과적

예시 (혼밥):
- "강남역 1인 식당"
- "강남역 혼밥 맛집"
- "강남 바 카운터석 식당"
- "강남역 돈까스"
- "강남역 라멘"
- "강남역 국수"

JSON만 응답:
{{"queries": ["키워드1", "키워드2", ...]}}"""

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    response = await model.generate_content_async(prompt)
    try:
        data = json.loads(response.text)
        return data.get("queries", [])
    except (json.JSONDecodeError, AttributeError):
        # Fallback: 기본 키워드
        return [f"{area} {scene} 맛집", f"{area} 맛집"]


# ── Step 2: 강화된 LLM 평가 프롬프트 ──────────────

def _scene_description(scene: str | None) -> str:
    descriptions = {
        "혼밥": "1인석/바석, 빠른 회전, 대기 스트레스 낮음, 혼자 편한 분위기",
        "데이트": "분위기, 소음도, 2인 테이블, 동선, 예약 안정성",
        "비즈니스": "단체석/룸, 예약 편의성, 격식, 접대에 적합",
        "친구모임": "4-6인 단체석, 활기찬 분위기, 다양한 메뉴, 가성비",
        "가족": "주차, 아이 동반, 메뉴 폭, 편안한 좌석",
        "술자리": "늦은 영업, 안주력, 2차 연계, 대화 가능",
    }
    return descriptions.get(scene or "", "일반적인 식사 적합성")


def build_enhanced_prompt(
    restaurants: list[tuple[Restaurant, str, str]],
    scene: str | None,
    area: str | None,
    query: str | None,
) -> str:
    """체인 감점 + 씬 부정 규칙이 강화된 프롬프트."""
    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)

    restaurant_list = []
    for r, genre_code, genre_label in restaurants:
        info = f"- {r.name} | 장르: {genre_label} | 카테고리: {r.category}"
        if r.road_address or r.address:
            info += f" | 주소: {r.road_address or r.address}"
        if r.distance is not None:
            info += f" | 거리: {r.distance}m"
        if len(r.sources) > 1:
            info += f" | 복수 출처: {', '.join(r.sources)}"
        restaurant_list.append(info)

    restaurant_text = "\n".join(restaurant_list)

    context_parts = []
    if query:
        context_parts.append(f'★ 사용자 요청: "{query}"')
    if scene:
        context_parts.append(f"씬: {scene}")
    if area:
        context_parts.append(f"지역: {area}")

    # 씬별 부정 규칙
    scene_negative_rules = {
        "혼밥": """- 프랜차이즈 체인(버거킹, 맥도날드, KFC 등)은 context_fit 최대 30점. 혼밥이라고 패스트푸드를 추천하면 안 된다.
- 고급 이자카야/바는 혼밥에 어색할 수 있으므로 context_fit 감점
- 단체 전용 식당(4인 이상 테이블만)은 context_fit 20점 이하""",
        "데이트": """- 프랜차이즈/패스트푸드는 context_fit 최대 20점
- 시끌벅적한 호프집/주점은 데이트에 부적합, context_fit 감점
- 1인 전문점(혼밥집)은 데이트에 부적합""",
        "비즈니스": """- 프랜차이즈/패스트푸드는 context_fit 최대 10점. 접대에 절대 부적합.
- 룸이나 격식이 없는 분식집/포장마차는 context_fit 20점 이하
- 고급 한식, 일식 오마카세, 프렌치/이탈리안이 비즈니스에 적합""",
        "친구모임": """- 1인 전문점(혼밥집, 1인 훠궈 등)은 context_fit 20점 이하
- 4인 이상 단체석이 있는 곳 우대
- 가성비 좋은 곳 우대, 인당 5만원 이상은 감점""",
        "가족": """- 술집/바/이자카야는 가족에 부적합, context_fit 감점
- 주차 가능 여부 중요
- 아이 메뉴가 있거나 소음에 관대한 곳 우대""",
        "술자리": """- 주류를 팔지 않는 곳은 context_fit 최대 20점
- 안주가 다양한 곳 우대
- 조용한 고급 레스토랑은 술자리에 부적합""",
    }

    negative_rules = scene_negative_rules.get(scene or "", "- 특별한 부정 규칙 없음")

    prompt = f"""[역할]
당신은 한국 외식 큐레이터다.
아래 실제 검색된 식당들을 씬에 맞게 평가하고 순위를 매겨라.

중요: 아래 식당만 평가하라. 새로운 식당을 추가하지 마라.
당신의 지식을 활용하여 각 식당의 실제 평판, 특성을 반영하라.

★ 채점 가이드 (각 항목 0-100):
- 각 평가 항목(context_fit, reputation 등)을 0-100으로 독립 채점
- 해당 식당이 유명 맛집이면 해당 항목 70-90점
- 보통 수준이면 50-70점
- 정보 부족하면 50점 (중립)
- 씬에 부적합하거나 명백히 나쁜 경우만 30점 이하
- 항목 간 점수 차이를 두어 순위가 명확히 나오게 하라

────────────────
검색 조건
────────────────
{chr(10).join(context_parts)}

────────────────
평가 대상 식당 ({len(restaurants)}개)
────────────────
{restaurant_text}

────────────────
평가 기준과 가중치 (총 100점)
────────────────
- context_fit ({weights['context_fit']}점): {_scene_description(scene)}
- reputation ({weights['reputation']}점): 대중 평판 (별점, 리뷰 수, 플랫폼 간 일관성)
- accessibility ({weights['accessibility']}점): 접근성 (예약, 웨이팅, 방문 난이도)
- authority ({weights['authority']}점): 권위 신호 (미슐랭, 블루리본, 매체 선정)
- trend ({weights['trend']}점): 최근성 (최근 후기, SNS 화제성)
- review_trust ({weights['review_trust']}점): 리뷰 신뢰도 (광고성 감점, 실방문 우대)

────────────────
★ 감점 규칙 (필수 적용) ★
────────────────
{negative_rules}

공통 규칙:
- 프랜차이즈 대형 체인(전국 10개 이상 지점)은 authority 감점
- 카페, 베이커리, 편의점은 식당 평가에서 context_fit 감점
- 씬과 맞지 않는 식당은 context_fit 감점
- 복수 출처에서 발견된 식당은 review_trust, reputation 가점
- 유명 맛집/인기 식당은 reputation 70점 이상으로 채점
- ★ 순위가 명확히 나올 만큼 점수 차를 줘라 (1등과 10등 차이 최소 20점)

────────────────
출력 형식 (JSON만)
────────────────
{{
  "evaluations": [
    {{
      "name": "식당 이름 (입력과 정확히 동일하게)",
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


# ── Pipeline E Main ───────────────────────────────

async def run_pipeline_e(test_case: dict) -> dict:
    area = test_case["area"]
    scene = test_case["scene"]
    genre = test_case.get("genre")
    query = test_case.get("query")
    lat = test_case["lat"]
    lng = test_case["lng"]

    total_start = time.time()
    steps = []

    # ── Step 1: LLM 검색 키워드 생성 (2.0 Flash) ──
    t0 = time.time()
    smart_queries = await generate_search_queries(area, scene, genre, query)
    step1_ms = int((time.time() - t0) * 1000)
    steps.append(("키워드 생성 (2.0 Flash)", f"{len(smart_queries)}개: {smart_queries[:3]}...", step1_ms))

    # ── Step 2: 다양한 검색 실행 ──
    t0 = time.time()

    # 기본 키워드도 추가
    base_queries = [f"{area} {scene} 맛집", f"{area} 맛집"]
    if query:
        base_queries.insert(0, f"{area} {query}")
    if genre:
        base_queries.append(f"{area} {genre}")

    all_queries = list(dict.fromkeys(smart_queries + base_queries))  # 중복 제거

    # 카카오: 키워드별 검색 (반경 2km) + 카테고리 검색
    tasks = []
    for q in all_queries:
        tasks.append(kakao_keyword_search(q, lat, lng, radius=2000))
    # 반경 확대 검색 (3km) 추가 - 주요 키워드만
    for q in all_queries[:3]:
        tasks.append(kakao_keyword_search(q, lat, lng, radius=3000, page=1, size=15))
    # 카테고리 검색 (1km, 2km)
    tasks.append(kakao_category_search(lat, lng, radius=1000))
    tasks.append(kakao_category_search(lat, lng, radius=2000))
    # 네이버 (있으면)
    for q in all_queries[:4]:
        tasks.append(naver_local_search(q, display=5))

    results_lists = await asyncio.gather(*tasks, return_exceptions=True)
    all_results = []
    for result in results_lists:
        if isinstance(result, Exception):
            continue
        all_results.extend(result)

    step2_ms = int((time.time() - t0) * 1000)
    steps.append(("다양한 검색", f"{len(all_results)}건 (쿼리 {len(all_queries)}개)", step2_ms))

    # ── Step 3: 중복 제거 + 체인 필터 ──
    t0 = time.time()
    unique = deduplicate(all_results)
    before_filter = len(unique)

    # 체인/패스트푸드 제거
    filtered = [r for r in unique if not is_chain(r.name)]
    chain_removed = before_filter - len(filtered)

    multi_source = [r for r in filtered if len(r.sources) > 1]
    step3_ms = int((time.time() - t0) * 1000)
    steps.append(("중복 제거 + 체인 필터", f"{len(filtered)}개 (체인 {chain_removed}개 제거, 복수출처 {len(multi_source)}개)", step3_ms))

    # ── Step 4: 장르 분류 + 사전 랭킹 ──
    t0 = time.time()
    classified = classify_all(filtered)
    if genre:
        genre_lower = genre.lower()
        classified = [(r, gc, gl) for r, gc, gl in classified if gc == genre_lower or gc == "other"]

    # 사전 랭킹: LLM에 보내기 전에 유망한 후보를 상위에 배치
    def pre_rank_score(item: tuple) -> float:
        r, gc, gl = item
        score = 0.0
        # 복수 출처에서 발견된 식당 → 신뢰도 높음
        score += len(r.sources) * 20
        # 거리가 가까울수록 가점 (있는 경우)
        if r.distance is not None:
            score += max(0, 30 - r.distance / 100)  # 1km 이내면 ~20점
        # 카테고리에 씬 관련 키워드가 있으면 가점
        cat = (r.category or "").lower()
        scene_keywords = {
            "혼밥": ["국수", "라멘", "우동", "돈까스", "카레", "덮밥", "분식", "1인"],
            "데이트": ["이탈리", "프랑스", "프렌치", "파스타", "와인", "레스토랑", "비스트로"],
            "비즈니스": ["한정식", "일식", "오마카세", "프렌치", "이탈리", "코스"],
            "친구모임": ["고기", "구이", "삼겹", "치킨", "호프", "포차"],
            "가족": ["한식", "중식", "뷔페", "갈비"],
            "술자리": ["호프", "포차", "이자카야", "바", "술집"],
        }
        for kw in scene_keywords.get(scene or "", []):
            if kw in cat or kw in r.name.lower():
                score += 10
                break
        # 리뷰/평점이 있으면 가점
        if r.rating and r.rating > 0:
            score += r.rating * 3
        if r.review_count and r.review_count > 0:
            score += min(10, r.review_count / 10)
        return score

    classified.sort(key=pre_rank_score, reverse=True)
    step4_ms = int((time.time() - t0) * 1000)
    steps.append(("장르 분류 + 사전 랭킹", f"{len(classified)}개", step4_ms))

    # ── Step 5: LLM 최종 평가 (강화 프롬프트, 2.5 Flash) ──
    t0 = time.time()
    prompt = build_enhanced_prompt(classified[:20], scene, area, query)

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
        "pipeline": "E",
        "test_case": test_case["name"],
        "steps": steps,
        "results": evaluations[:10],
        "prompt": prompt,
        "smart_queries": smart_queries,
        "total_ms": total_ms,
        "candidate_count": len(filtered),
        "chain_removed": chain_removed,
        "multi_source_count": len(multi_source),
    }


def print_result(result: dict):
    console.print(f"\n[bold magenta]{'='*60}[/]")
    console.print(f"[bold]Pipeline {result['pipeline']}[/]: {result['test_case']}")
    console.print(f"[dim]Total: {result['total_ms']}ms | Candidates: {result['candidate_count']} | "
                  f"Chains removed: {result.get('chain_removed', 0)} | Multi-source: {result.get('multi_source_count', 0)}[/]")

    if result.get("smart_queries"):
        console.print(f"\n[cyan]생성된 검색 키워드:[/]")
        for q in result["smart_queries"]:
            console.print(f"  - {q}")

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
        res_table.add_column("Conf", width=6)
        res_table.add_column("Type", width=8)
        res_table.add_column("Reason", max_width=40)

        for i, ev in enumerate(result["results"]):
            style = "bold" if ev.category == "safe" else ("yellow" if ev.category == "adventure" else "dim")
            res_table.add_row(
                str(i + 1), ev.name, f"{ev.total_score:.0f}",
                ev.confidence, ev.category, ev.reason,
                style=style,
            )
        console.print(res_table)


async def main():
    import sys
    console.print("[bold green]Pipeline E: 스마트 키워드 + 체인 필터 + 강화 프롬프트[/]\n")

    if len(sys.argv) > 1:
        idx = int(sys.argv[1])
        cases = [TEST_CASES[idx]]
    else:
        cases = TEST_CASES

    for tc in cases:
        try:
            result = await run_pipeline_e(tc)
            print_result(result)
        except Exception as e:
            console.print(f"[red]Error on {tc['name']}: {e}[/]")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
