"""LLM-based restaurant evaluation using Gemini."""

from __future__ import annotations

import json
import google.generativeai as genai
from dataclasses import dataclass
from config import GEMINI_API_KEY, SCENE_WEIGHTS, DEFAULT_WEIGHTS
from search_clients import Restaurant

genai.configure(api_key=GEMINI_API_KEY)


@dataclass
class EvaluationResult:
    """Single restaurant evaluation."""
    name: str
    total_score: float
    scores: dict[str, float]  # category -> score (0-100)
    reason: str
    strengths: list[str]
    weaknesses: list[str]
    confidence: str  # high, medium, low
    category: str  # safe, adventure, uncertain


def build_evaluation_prompt(
    restaurants: list[tuple[Restaurant, str, str]],  # (restaurant, genre_code, genre_label)
    scene: str | None,
    area: str | None,
    query: str | None,
) -> str:
    """
    Build LLM evaluation prompt.
    Key difference from Pipeline A: we give the LLM REAL restaurants to evaluate,
    instead of asking it to generate names (which causes hallucination).
    """
    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)

    # Build restaurant list for LLM
    restaurant_list = []
    for r, genre_code, genre_label in restaurants:
        info = f"- {r.name} | 장르: {genre_label} | 카테고리: {r.category}"
        if r.address:
            info += f" | 주소: {r.road_address or r.address}"
        if r.distance is not None:
            info += f" | 거리: {r.distance}m"
        if r.rating:
            info += f" | 별점: {r.rating}"
        if r.review_count:
            info += f" | 리뷰: {r.review_count}건"
        if len(r.sources) > 1:
            info += f" | 복수 출처: {', '.join(r.sources)}"
        restaurant_list.append(info)

    restaurant_text = "\n".join(restaurant_list)

    context_parts = []
    if query:
        context_parts.append(f'사용자 요청: "{query}"')
    if scene:
        context_parts.append(f"씬: {scene}")
    if area:
        context_parts.append(f"지역: {area}")

    prompt = f"""[역할]
당신은 한국 식당 평가 전문가다.
아래에 주어진 실제 식당 목록을 평가하고 순위를 매겨라.

중요: 아래 식당들은 지도 API에서 실제로 검색된 식당이다. 새로운 식당을 추가하지 마라.
주어진 식당만 평가하라.

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
- context_fit ({weights['context_fit']}점): 씬 적합성. {_scene_description(scene)}
- reputation ({weights['reputation']}점): 대중 평판. 네이버/카카오/구글 별점, 리뷰 수, 플랫폼 간 일관성
- accessibility ({weights['accessibility']}점): 접근성. 예약 가능, 웨이팅 시간, 방문 난이도
- authority ({weights['authority']}점): 권위 신호. 미슐랭, 블루리본, 식신, 캐치테이블 인기
- trend ({weights['trend']}점): 최근성. 최근 3개월 후기, 신규 오픈, SNS 화제성
- review_trust ({weights['review_trust']}점): 리뷰 신뢰도. 광고성 감점, 실방문 후기 우대

────────────────
평가 원칙
────────────────
1) 각 항목을 0-100으로 채점 후, 가중치를 곱해 총점 산출
2) 정보가 부족하면 보수적으로 채점 (50점 기준)
3) 광고/협찬 리뷰가 의심되면 reputation, review_trust 감점
4) 웨이팅이 과도하면 accessibility 감점하되, 인기 신호로 reputation 가점
5) 복수 출처에서 발견된 식당은 신뢰도 가점

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
      "reason": "추천 이유 (1문장, 씬 맥락 포함)",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "confidence": "high",
      "category": "safe"
    }}
  ]
}}

category: "safe"(안전픽), "adventure"(모험픽), "uncertain"(정보부족)
confidence: "high", "medium", "low"

상위 10개만 평가하라. totalScore 내림차순으로 정렬."""

    return prompt


def _scene_description(scene: str | None) -> str:
    descriptions = {
        "혼밥": "1인석/바석, 빠른 회전, 대기 스트레스 낮음, 혼자 편한 분위기",
        "데이트": "분위기, 소음도, 2인 테이블, 동선, 예약 안정성",
        "비즈니스": "단체석/룸, 예약 편의성, 격식",
        "친구모임": "활기찬 분위기, 다양한 메뉴, 가성비",
        "가족": "주차, 아이 동반, 메뉴 폭, 편안한 좌석",
        "술자리": "늦은 영업, 안주력, 2차 연계, 대화 가능",
    }
    return descriptions.get(scene or "", "일반적인 식사 적합성")


async def evaluate_restaurants(
    restaurants: list[tuple[Restaurant, str, str]],
    scene: str | None,
    area: str | None,
    query: str | None,
) -> tuple[list[EvaluationResult], str]:
    """
    LLM으로 식당 평가. 프롬프트와 결과를 함께 반환.
    Returns (results, prompt_text).
    """
    prompt = build_evaluation_prompt(restaurants, scene, area, query)

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    response = await model.generate_content_async(prompt)
    raw = response.text

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        import re
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            data = json.loads(match.group())
        else:
            return [], prompt

    evaluations = data.get("evaluations", [])
    weights = SCENE_WEIGHTS.get(scene or "", DEFAULT_WEIGHTS)

    results = []
    for ev in evaluations:
        scores = ev.get("scores", {})

        # Recalculate total score with our weights (don't trust LLM arithmetic)
        total = 0
        for key, weight in weights.items():
            score = scores.get(key, 50)
            total += score * weight / 100

        results.append(EvaluationResult(
            name=ev.get("name", ""),
            total_score=round(total, 1),
            scores=scores,
            reason=ev.get("reason", ""),
            strengths=ev.get("strengths", []),
            weaknesses=ev.get("weaknesses", []),
            confidence=ev.get("confidence", "low"),
            category=ev.get("category", "uncertain"),
        ))

    # Sort by our calculated score
    results.sort(key=lambda r: r.total_score, reverse=True)
    return results, prompt


async def collect_signals_via_llm(
    restaurants: list[Restaurant],
    area: str | None,
) -> dict[str, dict]:
    """
    LLM에게 식당들의 외부 시그널(미슐랭, 블루리본, 평판 등)을 물어본다.
    API가 없는 정보를 LLM 지식으로 보충.
    """
    names = [r.name for r in restaurants[:20]]
    names_text = "\n".join(f"- {name}" for name in names)

    prompt = f"""아래 식당들에 대해 알고 있는 외부 평가 정보를 정리해줘.
모르는 건 null로 표시. 추측하지 말 것.

지역: {area or "서울"}

식당 목록:
{names_text}

JSON 형식으로 응답:
{{
  "signals": {{
    "식당이름": {{
      "michelin": null | "3star" | "2star" | "1star" | "bib",
      "blue_ribbon": null | 1 | 2 | 3,
      "catch_table_popular": null | true | false,
      "waiting_level": null | "none" | "short" | "long" | "extreme",
      "avg_price_range": null | "~1만" | "1~2만" | "2~3만" | "3~5만" | "5만+",
      "notable": null | "특이사항 메모"
    }}
  }}
}}"""

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    response = await model.generate_content_async(prompt)

    try:
        data = json.loads(response.text)
        return data.get("signals", {})
    except (json.JSONDecodeError, AttributeError):
        return {}
