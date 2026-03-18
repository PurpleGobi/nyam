"""
Pipeline G: "사람처럼 검색하기"
크로스플랫폼 검증 + 평판 시그널 + LLM 큐레이션

리서치 기반 변경점:
1. "맛집" 키워드 최소화 → 구체적 메뉴명/노포/현지인 키워드
2. 구글 Places 검색 추가 → 별점 + 리뷰 수 수집 (광고 청정 구역)
3. 크로스플랫폼 신뢰도 스코어링 (구글+카카오+네이버 교차 검증)
4. 외부 평판 시그널 LLM 수집 (미슐랭, 블루리본, TV, 노포, 전문점 등)
5. 시그널 통합 사전 랭킹 (7가지 시그널 가중치)
6. LLM 평가에 수집된 시그널 전부 주입 → 정확한 채점
"""

import asyncio
import json
import time
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

from config import TEST_CASES, SCENE_WEIGHTS, DEFAULT_WEIGHTS, GEMINI_API_KEY
from search_clients import (
    kakao_keyword_search,
    kakao_category_grid_search,
    naver_local_search,
    google_places_search,
    deduplicate,
    Restaurant,
)
from genre_classifier import classify_all
from llm_evaluator import EvaluationResult
from test_pipeline_e import is_chain

import google.generativeai as genai
from keyword_templates_g import generate_queries_g

genai.configure(api_key=GEMINI_API_KEY)

console = Console()


# ── Phase 3: 외부 평판 시그널 수집 (LLM) ──────────────────

@dataclass
class ReputationSignal:
    """식당 하나의 외부 평판 시그널."""
    michelin: str | None = None          # "1star", "2star", "3star", "bib", None
    blue_ribbon: int | None = None       # 0, 1, 2, 3
    tv_shows: list[str] | None = None    # ["수요미식회", "줄서는식당"]
    catch_table: bool | None = None      # 캐치테이블 등록 여부
    waiting_level: str | None = None     # "none", "short", "long", "extreme"
    estimated_years: int | None = None   # 추정 영업 기간 (년)
    is_specialty: bool | None = None     # 전문점 여부 (메뉴 3개 이하)
    sns_buzz: str | None = None          # "high", "medium", "low"
    owner_philosophy: bool | None = None # 사장님 철학/스토리
    price_range: str | None = None       # "~1만", "1~2만", "2~3만", "3~5만", "5만+"
    notable: str | None = None           # 특이사항 메모


async def collect_reputation_signals(
    restaurants: list[Restaurant],
    area: str | None,
) -> dict[str, ReputationSignal]:
    """LLM(Gemini 2.0 Flash)으로 식당들의 외부 평판 시그널 수집.

    사람이 블로그/인스타/유튜브를 뒤지는 행동을 LLM 지식으로 대체.
    비용: ~$0.01/요청 (Gemini 2.0 Flash)
    """
    names = [r.name for r in restaurants[:25]]
    names_text = "\n".join(f"- {name}" for name in names)

    prompt = f"""아래 식당들에 대해 알고 있는 평판 정보를 정리해라.
모르는 항목은 반드시 null로. 추측하지 말 것. 확실한 정보만.

지역: {area or "서울"}

식당 목록:
{names_text}

JSON 형식으로 응답:
{{
  "signals": {{
    "식당이름": {{
      "michelin": null,
      "blue_ribbon": null,
      "tv_shows": null,
      "catch_table": null,
      "waiting_level": null,
      "estimated_years": null,
      "is_specialty": null,
      "sns_buzz": null,
      "owner_philosophy": null,
      "price_range": null,
      "notable": null
    }}
  }}
}}

필드 설명:
- michelin: "3star"|"2star"|"1star"|"bib" 또는 null
- blue_ribbon: 블루리본 서베이 리본 수 (0~3) 또는 null
- tv_shows: 출연 TV 프로그램 이름 목록 또는 null (예: ["수요미식회", "줄서는식당"])
- catch_table: 캐치테이블/예약 앱에 등록되어 있는지 (true/false/null)
- waiting_level: 평소 대기 수준 "none"|"short"|"long"|"extreme" 또는 null
- estimated_years: 추정 영업 기간 (년 단위, 정수) 또는 null
- is_specialty: 전문점 여부 (메인 메뉴 3개 이하) true/false 또는 null
- sns_buzz: SNS(인스타/유튜브) 화제성 "high"|"medium"|"low" 또는 null
- owner_philosophy: 사장님 철학/스토리가 알려진 곳인지 true/false 또는 null
- price_range: "~1만"|"1~2만"|"2~3만"|"3~5만"|"5만+" 또는 null
- notable: 기타 특이사항 한 줄 메모 또는 null"""

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    try:
        response = await model.generate_content_async(prompt)
        data = json.loads(response.text)
        signals_raw = data.get("signals", {})

        result = {}
        for name, sig in signals_raw.items():
            result[name] = ReputationSignal(
                michelin=sig.get("michelin"),
                blue_ribbon=sig.get("blue_ribbon"),
                tv_shows=sig.get("tv_shows"),
                catch_table=sig.get("catch_table"),
                waiting_level=sig.get("waiting_level"),
                estimated_years=sig.get("estimated_years"),
                is_specialty=sig.get("is_specialty"),
                sns_buzz=sig.get("sns_buzz"),
                owner_philosophy=sig.get("owner_philosophy"),
                price_range=sig.get("price_range"),
                notable=sig.get("notable"),
            )
        return result
    except Exception as e:
        console.print(f"  [dim red]시그널 수집 실패: {e}[/]")
        return {}


# ── Phase 4: 크로스플랫폼 + 시그널 통합 사전 랭킹 ──────────

def _find_signal(name: str, signals: dict[str, ReputationSignal]) -> ReputationSignal | None:
    """이름 퍼지 매칭으로 시그널 찾기."""
    import re
    def norm(s: str) -> str:
        s = re.sub(r"\s+", "", s)
        s = re.sub(r"[^가-힣a-zA-Z0-9]", "", s)
        return s.lower()

    name_n = norm(name)
    for sig_name, sig in signals.items():
        sig_n = norm(sig_name)
        if name_n == sig_n or name_n in sig_n or sig_n in name_n:
            return sig
    return None


def pre_rank_score_g(
    item: tuple,  # (Restaurant, genre_code, genre_label)
    scene: str | None,
    keyword_hit_names: set[str],
    signals: dict[str, ReputationSignal],
) -> float:
    """Pipeline G 사전 랭킹.

    원칙: 키워드 검색에 잡힌 식당 = 관련성 있음 → 최우선.
    구글 별점/리뷰는 품질 시그널로 추가 가점.

    1. 키워드 검색 히트 (30점) — 검색에 잡힘 = 관련성 확보
    2. 크로스플랫폼 출현 (20점)
    3. 구글 별점 × 리뷰 수 (20점)
    4. 거리 (15점)
    5. 장르 매칭 (15점)
    """
    r, gc, gl = item
    score = 0.0

    # 1. 키워드 검색 히트 (30점) — 최우선
    if r.name in keyword_hit_names:
        score += 30

    # 2. 크로스플랫폼 출현 (20점)
    source_count = len(r.sources) if r.sources else 1
    if source_count >= 3:
        score += 20
    elif source_count >= 2:
        score += 12
    else:
        score += 0  # 1개 플랫폼만이면 가점 없음

    # 3. 구글 별점 × 리뷰 수 (20점)
    if r.rating and r.review_count:
        if r.review_count >= 100 and r.rating >= 4.0:
            score += 20
        elif r.review_count >= 30 and r.rating >= 3.8:
            score += 12
        elif r.review_count >= 10:
            score += 5
        elif r.review_count < 10 and r.rating >= 4.8:
            score += 0  # 조작 의심
    elif r.rating and r.rating >= 4.0:
        score += 8

    # 4. 거리 (15점)
    if r.distance is not None:
        score += max(0, 15 - r.distance / 150)

    # 5. 장르 매칭 (15점) — 카테고리/이름에서 장르 키워드 매칭
    text = f"{r.category or ''} {r.name}".lower()
    genre_kws = {
        "혼밥": ["국수", "라멘", "우동", "돈까스", "카레", "덮밥", "소바", "카츠", "백반", "국밥"],
        "데이트": ["이탈리", "프렌치", "파스타", "와인", "레스토랑", "비스트로", "다이닝", "오마카세"],
        "비즈니스": ["한정식", "오마카세", "프렌치", "코스", "스시", "스테이크"],
        "친구모임": ["고기", "구이", "삼겹", "치킨", "닭갈비", "갈비"],
        "가족": ["한식", "중식", "뷔페", "갈비", "한정식", "국밥"],
        "술자리": ["호프", "포차", "이자카야", "바", "술집"],
    }
    for kw in genre_kws.get(scene or "", []):
        if kw in text:
            score += 15
            break

    return score


# ── Phase 5: LLM 최종 평가 (강화된 입력) ──────────────────

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


def build_enriched_prompt(
    restaurants: list[tuple[Restaurant, str, str]],
    scene: str | None,
    area: str | None,
    query: str | None,
    signals: dict[str, ReputationSignal],
) -> str:
    """Pipeline G 프롬프트: 수집된 시그널 전부 주입."""
    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)

    restaurant_list = []
    for r, genre_code, genre_label in restaurants:
        info = f"- {r.name} | 장르: {genre_label} | 카테고리: {r.category}"
        if r.road_address or r.address:
            info += f" | 주소: {r.road_address or r.address}"
        if r.distance is not None:
            info += f" | 거리: {r.distance}m"

        # 구글 별점/리뷰 (핵심 시그널)
        if r.rating:
            info += f" | 구글 {r.rating}★"
            if r.review_count:
                info += f" ({r.review_count}건)"

        # 크로스플랫폼 출처 수
        if r.sources and len(r.sources) > 1:
            info += f" | {len(r.sources)}개 플랫폼 출현({', '.join(r.sources)})"

        # 수집된 시그널
        sig = _find_signal(r.name, signals)
        if sig:
            sig_parts = []
            if sig.michelin:
                sig_parts.append(f"미슐랭 {sig.michelin}")
            if sig.blue_ribbon:
                sig_parts.append(f"블루리본 {sig.blue_ribbon}개")
            if sig.tv_shows:
                sig_parts.append(f"TV: {', '.join(sig.tv_shows)}")
            if sig.estimated_years and sig.estimated_years >= 5:
                sig_parts.append(f"노포 {sig.estimated_years}년")
            if sig.is_specialty:
                sig_parts.append("전문점")
            if sig.catch_table:
                sig_parts.append("캐치테이블")
            if sig.waiting_level:
                sig_parts.append(f"웨이팅: {sig.waiting_level}")
            if sig.sns_buzz:
                sig_parts.append(f"SNS: {sig.sns_buzz}")
            if sig.owner_philosophy:
                sig_parts.append("사장님 철학")
            if sig.price_range:
                sig_parts.append(f"{sig.price_range}원대")
            if sig.notable:
                sig_parts.append(sig.notable)
            if sig_parts:
                info += f" | {' / '.join(sig_parts)}"

        restaurant_list.append(info)

    restaurant_text = "\n".join(restaurant_list)

    context_parts = []
    if query:
        context_parts.append(f'★ 사용자 요청: "{query}"')
    if scene:
        context_parts.append(f"씬: {scene}")
    if area:
        context_parts.append(f"지역: {area}")

    # 씬별 부정 규칙 (Pipeline E에서 가져옴)
    scene_negative_rules = {
        "혼밥": """- 프랜차이즈 체인은 context_fit 최대 30점
- 고급 이자카야/바는 혼밥에 어색할 수 있으므로 context_fit 감점
- 단체 전용 식당은 context_fit 20점 이하""",
        "데이트": """- 프랜차이즈/패스트푸드는 context_fit 최대 20점
- 시끌벅적한 호프집/주점은 데이트에 부적합
- 1인 전문점은 데이트에 부적합""",
        "비즈니스": """- 프랜차이즈/패스트푸드는 context_fit 최대 10점
- 분식집/포장마차는 context_fit 20점 이하
- 고급 한식, 일식 오마카세, 프렌치/이탈리안이 적합""",
        "친구모임": """- 1인 전문점은 context_fit 20점 이하
- 4인 이상 단체석이 있는 곳 우대
- 인당 5만원 이상은 감점""",
        "가족": """- 술집/바/이자카야는 가족에 부적합
- 주차 가능 여부 중요
- 아이 메뉴가 있거나 소음에 관대한 곳 우대""",
        "술자리": """- 주류를 팔지 않는 곳은 context_fit 최대 20점
- 안주가 다양한 곳 우대""",
    }
    negative_rules = scene_negative_rules.get(scene or "", "- 특별한 부정 규칙 없음")

    prompt = f"""[역할]
당신은 한국 외식 큐레이터다.
아래 실제 검색된 식당들을 씬에 맞게 평가하고 순위를 매겨라.

중요: 아래 식당만 평가하라. 새로운 식당을 추가하지 마라.

★ 2단계 평가를 수행하라:
1단계) 각 식당에 대해 네가 알고 있는 정보를 활용하라:
  - 미슐랭/블루리본 인증 여부
  - TV 프로그램(수요미식회, 줄서는식당, 백종원 등) 출연 여부
  - 캐치테이블/예약 앱 등록 여부
  - 추정 영업 기간 (노포 여부)
  - 전문점 여부 (메인 메뉴 3개 이하)
  - SNS 화제성, 사장님 철학/스토리
2단계) 위 정보 + 제공된 실제 데이터(구글 별점, 리뷰 수 등)를 종합하여 채점하라.

★ 채점 가이드 (각 항목 0-100):
- 구글 별점 4.0+ & 리뷰 100+ → reputation 70점 이상
- 미슐랭/블루리본 인증 → authority 80점 이상
- TV 프로그램 출연 → trend/authority 가점
- 노포 (5년+) → reputation, review_trust 가점
- 전문점 (메뉴 3개 이하) → context_fit 가점 (특히 혼밥)
- 3개 플랫폼 출현 → reputation, review_trust 가점
- 리뷰 적은데 별점 극단적 → review_trust 감점 (조작 의심)

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
- reputation ({weights['reputation']}점): 대중 평판 (구글 별점, 리뷰 수, 플랫폼 간 일관성)
- accessibility ({weights['accessibility']}점): 접근성 (예약, 웨이팅, 방문 난이도)
- authority ({weights['authority']}점): 권위 신호 (미슐랭, 블루리본, TV 출연)
- trend ({weights['trend']}점): 최근성 (SNS 화제성, 최근 후기)
- review_trust ({weights['review_trust']}점): 리뷰 신뢰도 (크로스플랫폼 검증, 광고성 감점)

────────────────
★ 감점 규칙 (필수 적용) ★
────────────────
{negative_rules}

공통 규칙:
- 프랜차이즈 대형 체인은 authority 감점
- 카페, 베이커리, 편의점은 context_fit 감점
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


# ── Pipeline G Main ──────────────────────────────────────

async def run_pipeline_g(test_case: dict) -> dict:
    area = test_case["area"]
    scene = test_case["scene"]
    genre = test_case.get("genre")
    query = test_case.get("query")
    lat = test_case["lat"]
    lng = test_case["lng"]

    total_start = time.time()
    steps = []

    # ═══ Phase 1: 후보 수집 ═══

    # Step 1: 키워드 생성 (G 버전)
    t0 = time.time()
    all_queries = generate_queries_g(area, scene, genre, query)
    step1_ms = int((time.time() - t0) * 1000)
    steps.append(("키워드 생성 (G)", f"{len(all_queries)}개: {all_queries[:3]}...", step1_ms))

    # Step 2: 멀티플랫폼 병렬 검색
    t0 = time.time()

    # [A] 카카오 키워드 검색
    kakao_tasks = [kakao_keyword_search(q, lat, lng, radius=2000) for q in all_queries]
    # [B] 카카오 그리드 카테고리 검색
    grid_task = kakao_category_grid_search(lat, lng, radius=500, grid_step=0.004, grid_size=1)
    # [C] 구글 Places 검색 (핵심 쿼리 2-3개만)
    google_queries = all_queries[:3]
    google_tasks = [google_places_search(q, lat, lng, radius=2000) for q in google_queries]
    # [D] 네이버 검색 (core 1개)
    naver_task = naver_local_search(all_queries[0], display=5)

    # 전부 병렬 실행
    all_tasks = kakao_tasks + google_tasks + [grid_task, naver_task]
    results_list = await asyncio.gather(*all_tasks, return_exceptions=True)

    kakao_results = []
    google_results = []
    grid_results = []
    naver_results = []

    kakao_count = len(kakao_tasks)
    google_count = len(google_tasks)

    for i, result in enumerate(results_list):
        if isinstance(result, Exception):
            continue
        if i < kakao_count:
            kakao_results.extend(result)
        elif i < kakao_count + google_count:
            google_results.extend(result)
        elif i == kakao_count + google_count:
            grid_results = result
        else:
            naver_results = result

    all_results = kakao_results + google_results + grid_results + naver_results
    keyword_names = {r.name for r in kakao_results}

    step2_ms = int((time.time() - t0) * 1000)
    steps.append(("멀티플랫폼 검색", f"카카오 {len(kakao_results)} + 구글 {len(google_results)} + 그리드 {len(grid_results)} + 네이버 {len(naver_results)}", step2_ms))

    # ═══ Phase 2: 거르기 ═══

    # Step 3: 중복 제거 + 체인 필터
    t0 = time.time()
    unique = deduplicate(all_results)
    before_filter = len(unique)
    filtered = [r for r in unique if not is_chain(r.name)]
    chain_removed = before_filter - len(filtered)

    # 크로스플랫폼 출현 통계
    multi_source = [r for r in filtered if r.sources and len(r.sources) > 1]
    has_google_rating = [r for r in filtered if r.rating is not None]

    step3_ms = int((time.time() - t0) * 1000)
    steps.append(("중복 제거 + 체인 필터", f"{len(filtered)}개 (체인 {chain_removed}개 제거, 복수출처 {len(multi_source)}개, 구글별점 {len(has_google_rating)}개)", step3_ms))

    # ═══ Phase 3: 사전 랭킹 ═══

    # Step 4: 장르 분류 + 크로스플랫폼 사전 랭킹
    t0 = time.time()
    classified = classify_all(filtered)
    if genre:
        genre_lower = genre.lower()
        classified = [(r, gc, gl) for r, gc, gl in classified if gc == genre_lower or gc == "other"]

    CANDIDATE_CAP = 20
    no_signals: dict[str, ReputationSignal] = {}
    scored = [(item, pre_rank_score_g(item, scene, keyword_names, no_signals)) for item in classified]
    scored.sort(key=lambda x: x[1], reverse=True)

    # GT 디버그
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
                    rating_str = f" 구글{r.rating}★({r.review_count}건)" if r.rating else ""
                    console.print(f"  [dim]GT '{gt_name}' → #{rank} '{r.name}' (pre={s:.0f}{rating_str}){cap_mark}[/]")
                    found = True
                    break
            if not found:
                console.print(f"  [dim red]GT '{gt_name}' → NOT FOUND[/]")

    classified_top = [item for item, _ in scored[:CANDIDATE_CAP]]
    step4_ms = int((time.time() - t0) * 1000)
    steps.append(("크로스플랫폼 사전 랭킹", f"{len(scored)}개 → 상위 {len(classified_top)}개", step4_ms))

    # ═══ Phase 4: LLM 최종 평가 (시그널 수집 통합) ═══

    # Step 5: LLM 평가 (구글 별점/리뷰 주입 + LLM 자체 지식으로 시그널 반영)
    t0 = time.time()
    no_signals: dict[str, ReputationSignal] = {}
    prompt = build_enriched_prompt(classified_top, scene, area, query, no_signals)

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
    steps.append(("LLM 평가 (1회, 시그널 통합)", f"{len(evaluations)}개 평가", step5_ms))

    total_ms = int((time.time() - total_start) * 1000)

    return {
        "pipeline": "G",
        "test_case": test_case["name"],
        "steps": steps,
        "results": evaluations[:10],
        "prompt": prompt,
        "total_ms": total_ms,
        "candidate_count": len(filtered),
        "chain_removed": chain_removed,
        "multi_source_count": len(multi_source),
        "google_rated_count": len(has_google_rating),
    }


async def main():
    import sys
    console.print("[bold green]Pipeline G: 사람처럼 검색하기 (크로스플랫폼 + 시그널 + LLM)[/]\n")

    if len(sys.argv) > 1:
        idx = int(sys.argv[1])
        cases = [TEST_CASES[idx]]
    else:
        cases = TEST_CASES

    for tc in cases:
        try:
            result = await run_pipeline_g(tc)

            console.print(f"\n[bold magenta]{'='*60}[/]")
            console.print(f"[bold]Pipeline {result['pipeline']}[/]: {result['test_case']}")
            console.print(f"[dim]Total: {result['total_ms']}ms | Candidates: {result['candidate_count']} | "
                          f"Chains removed: {result.get('chain_removed', 0)} | "
                          f"Multi-source: {result.get('multi_source_count', 0)} | "
                          f"Google rated: {result.get('google_rated_count', 0)}[/]")

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
                res_table.add_column("Type", width=10)
                res_table.add_column("Reason", max_width=45)
                for i, ev in enumerate(result["results"]):
                    style = "bold" if ev.category == "safe" else ("yellow" if ev.category == "adventure" else "dim")
                    res_table.add_row(str(i + 1), ev.name, f"{ev.total_score:.0f}",
                                      ev.confidence, ev.category, ev.reason, style=style)
                console.print(res_table)
        except Exception as e:
            console.print(f"[red]Error on {tc['name']}: {e}[/]")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
