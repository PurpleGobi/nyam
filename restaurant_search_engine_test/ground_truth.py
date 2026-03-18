"""
Ground Truth: 각 테스트 케이스별 "좋은 추천" 기준.
사람이 직접 선정한 정답 식당 + 평가 기준을 정의한다.
파이프라인 결과와 비교하여 정확도를 측정.
"""

from dataclasses import dataclass


@dataclass
class GroundTruthEntry:
    """정답 식당 하나."""
    name: str
    why: str  # 왜 이 식당이 정답인가
    tier: int  # 1=반드시 포함, 2=포함되면 좋음, 3=나쁘지 않음


@dataclass
class TestCaseGroundTruth:
    """테스트 케이스의 정답셋."""
    case_name: str
    must_include: list[GroundTruthEntry]  # tier 1: 반드시 나와야 하는 식당
    good_to_have: list[GroundTruthEntry]  # tier 2: 나오면 좋은 식당
    acceptable: list[GroundTruthEntry]    # tier 3: 나쁘지 않은 식당
    bad_examples: list[str]               # 나오면 안 되는 식당 (체인점, 부적합 등)
    quality_criteria: str                 # 이 케이스에서 좋은 추천의 기준


# ── Ground Truth Data ───────────────────────────────────
# 형님이 직접 검증/수정해야 할 데이터.
# 일단 일반적으로 알려진 좋은 식당들로 초안을 만들어둠.

GROUND_TRUTH: dict[str, TestCaseGroundTruth] = {
    "강남 혼밥": TestCaseGroundTruth(
        case_name="강남 혼밥",
        must_include=[
            GroundTruthEntry("미정국수0410 강남역점", "혼밥 성지, 바석, 빠른 회전", 1),
            GroundTruthEntry("카츠8 강남점", "돈까스 혼밥 특화, 1인석", 1),
        ],
        good_to_have=[
            GroundTruthEntry("우동명가 다카마쓰", "칼국수/우동, 1인 특화", 2),
            GroundTruthEntry("멘야하나비", "마제소바, 바석 혼밥", 2),
            GroundTruthEntry("하카타분코", "라멘, 칸막이 혼밥석", 2),
            GroundTruthEntry("규카츠 강남점", "규카츠, 1인 세트", 2),
        ],
        acceptable=[
            GroundTruthEntry("마리김밥", "분식, 빠른 식사", 3),
            GroundTruthEntry("포490 강남점", "쌀국수, 1인 적합", 3),
        ],
        bad_examples=[
            "버거킹", "맥도날드", "KFC", "롯데리아",  # 패스트푸드 체인
            "스타벅스", "투썸플레이스",  # 카페
            "고에몬",  # 고급 이자카야 (혼밥 부적합)
        ],
        quality_criteria="바석/1인석이 있는 곳, 빠른 회전, 혼자 앉아도 어색하지 않은 곳. 패스트푸드 체인은 감점.",
    ),

    "성수 데이트": TestCaseGroundTruth(
        case_name="성수 데이트",
        must_include=[
            GroundTruthEntry("온량", "성수 인기 한식, 분위기 좋음", 1),
            GroundTruthEntry("꿉당 성수점", "고기, 세련된 인테리어", 1),
        ],
        good_to_have=[
            GroundTruthEntry("소바식당 성수점", "소바/일식, 조용한 분위기", 2),
            GroundTruthEntry("트라토리아 띠아모", "이탈리안, 데이트 분위기", 2),
            GroundTruthEntry("고든램지 버거", "프리미엄 버거, 화제성", 2),
        ],
        acceptable=[],
        bad_examples=[
            "편의점", "김밥천국", "백다방",
        ],
        quality_criteria="분위기 좋고 2인 테이블 편한 곳. 인스타감성. 예약 가능하면 가점.",
    ),

    "종로 라멘 혼밥": TestCaseGroundTruth(
        case_name="종로 라멘 혼밥",
        must_include=[
            GroundTruthEntry("멘야산다이메", "종로 라멘 맛집, 바석", 1),
        ],
        good_to_have=[
            GroundTruthEntry("이치란라멘", "1인 칸막이 혼밥 특화", 2),
            GroundTruthEntry("하카타분코", "돈코츠 라멘, 혼밥 좋음", 2),
            GroundTruthEntry("멘야코지", "라멘, 1인석", 2),
        ],
        acceptable=[],
        bad_examples=["롯데리아", "맥도날드"],
        quality_criteria="라멘 전문점, 바석/1인석, 종로 접근성. 일반 일식당이 아닌 라멘 특화 가점.",
    ),

    "홍대 친구모임": TestCaseGroundTruth(
        case_name="홍대 친구모임",
        must_include=[
            GroundTruthEntry("연남서식당", "한식, 단체석, 활기찬 분위기", 1),
        ],
        good_to_have=[
            GroundTruthEntry("동경야끼니꾸", "고기, 단체 좋음", 2),
            GroundTruthEntry("홍대 쭈꾸미", "매운맛, 친구모임 인기", 2),
        ],
        acceptable=[],
        bad_examples=["스타벅스", "맥도날드"],
        quality_criteria="4-6인 단체석, 시끌벅적해도 괜찮은 곳, 가성비 좋은 곳.",
    ),

    "여의도 비즈니스": TestCaseGroundTruth(
        case_name="여의도 비즈니스",
        must_include=[
            GroundTruthEntry("무궁화", "서울 미슐랭, 비즈니스 접대", 1),
        ],
        good_to_have=[
            GroundTruthEntry("스시이토", "오마카세, 접대용", 2),
            GroundTruthEntry("르살롱드여의도", "프렌치, 격식", 2),
        ],
        acceptable=[],
        bad_examples=["편의점", "김밥천국", "버거킹"],
        quality_criteria="룸/단체석, 예약 가능, 격식 있는 분위기, 접대에 적합한 곳.",
    ),
}


def evaluate_pipeline_result(
    case_name: str,
    result_names: list[str],
) -> dict:
    """
    파이프라인 결과를 정답셋과 비교하여 점수 산출.

    Returns:
        {
            "score": float (0-100),
            "hits": {"tier1": [...], "tier2": [...], "tier3": [...]},
            "misses": {"tier1": [...], "tier2": [...]},
            "bad_included": [...],
            "details": str,
        }
    """
    gt = GROUND_TRUTH.get(case_name)
    if not gt:
        return {"score": 0, "details": f"No ground truth for {case_name}"}

    result_normalized = [_normalize(n) for n in result_names]

    # Check hits
    tier1_hits = []
    tier1_misses = []
    for entry in gt.must_include:
        if _find_match(entry.name, result_normalized):
            tier1_hits.append(entry.name)
        else:
            tier1_misses.append(entry.name)

    tier2_hits = []
    for entry in gt.good_to_have:
        if _find_match(entry.name, result_normalized):
            tier2_hits.append(entry.name)

    tier3_hits = []
    for entry in gt.acceptable:
        if _find_match(entry.name, result_normalized):
            tier3_hits.append(entry.name)

    # Check bad examples
    bad_included = []
    for bad in gt.bad_examples:
        if _find_match(bad, result_normalized):
            bad_included.append(bad)

    # Score calculation
    # Tier 1: 40점 (필수)
    tier1_total = len(gt.must_include)
    tier1_score = (len(tier1_hits) / tier1_total * 40) if tier1_total > 0 else 40

    # Tier 2: 30점 (권장)
    tier2_total = len(gt.good_to_have)
    tier2_score = (len(tier2_hits) / tier2_total * 30) if tier2_total > 0 else 15

    # Tier 3: 10점 (수용)
    tier3_total = len(gt.acceptable)
    tier3_score = (len(tier3_hits) / tier3_total * 10) if tier3_total > 0 else 5

    # Bad penalty: -5점 per bad
    bad_penalty = len(bad_included) * 5

    # Result count bonus (5개 이상이면 가점)
    count_bonus = min(10, len(result_names) * 2)

    # Diversity bonus (다양한 장르면 가점) - 10점
    diversity_bonus = 10 if len(result_names) >= 5 else 5

    total = max(0, min(100,
        tier1_score + tier2_score + tier3_score + count_bonus + diversity_bonus - bad_penalty
    ))

    details = []
    details.append(f"Tier1 적중: {len(tier1_hits)}/{tier1_total} ({tier1_score:.0f}점)")
    details.append(f"Tier2 적중: {len(tier2_hits)}/{tier2_total} ({tier2_score:.0f}점)")
    if tier1_misses:
        details.append(f"Tier1 누락: {', '.join(tier1_misses)}")
    if bad_included:
        details.append(f"부적합 포함: {', '.join(bad_included)} (-{bad_penalty}점)")

    return {
        "score": total,
        "hits": {
            "tier1": tier1_hits,
            "tier2": tier2_hits,
            "tier3": tier3_hits,
        },
        "misses": {
            "tier1": tier1_misses,
        },
        "bad_included": bad_included,
        "details": " | ".join(details),
    }


def _normalize(name: str) -> str:
    import re
    name = re.sub(r"\s+", "", name)
    name = re.sub(r"[^가-힣a-zA-Z0-9]", "", name)
    return name.lower()


def _find_match(target: str, normalized_list: list[str]) -> bool:
    """Fuzzy match: target in any of the normalized names."""
    target_norm = _normalize(target)
    for n in normalized_list:
        if target_norm in n or n in target_norm:
            return True
        # 3-char substring
        shorter = target_norm if len(target_norm) < len(n) else n
        longer = n if len(target_norm) < len(n) else target_norm
        if len(shorter) >= 3:
            for i in range(len(shorter) - 2):
                if shorter[i:i+3] in longer:
                    return True
    return False
