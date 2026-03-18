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
            GroundTruthEntry("카츠왕", "돈까스 혼밥, 바석", 2),
            GroundTruthEntry("봄카츠", "돈까스, 1인 적합", 2),
            GroundTruthEntry("츠케도", "츠케멘, 혼밥 특화", 2),
            GroundTruthEntry("야기카레", "카레, 1인석 혼밥", 2),
            GroundTruthEntry("콩뿌리", "콩국수/한식, 혼밥 좋음", 2),
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
            GroundTruthEntry("스케줄 성수", "성수 인기 카페/레스토랑, 데이트 분위기", 2),
            GroundTruthEntry("루루피피글루글루", "성수 감성 맛집, 데이트 인기", 2),
            GroundTruthEntry("까사아지오", "이탈리안, 성수 데이트 명소", 2),
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
            GroundTruthEntry("야젠", "종로 라멘, 혼밥 좋음", 2),
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
            GroundTruthEntry("오복솥뚜껑", "솥뚜껑삼겹살, 단체 좋음", 2),
            GroundTruthEntry("홍대닭갈비", "닭갈비, 친구모임 인기", 2),
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
            GroundTruthEntry("자연한우", "한우, 비즈니스 접대 적합", 2),
            GroundTruthEntry("아루히 니와", "일식, 격식 있는 분위기", 2),
            GroundTruthEntry("풍성", "한정식, 접대용 단체석", 2),
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

    # Check hits with rank tracking
    tier1_hits = []
    tier1_misses = []
    for entry in gt.must_include:
        rank = _find_rank(entry.name, result_normalized)
        if rank is not None:
            tier1_hits.append({"name": entry.name, "rank": rank})
        else:
            tier1_misses.append(entry.name)

    tier2_hits = []
    for entry in gt.good_to_have:
        rank = _find_rank(entry.name, result_normalized)
        if rank is not None:
            tier2_hits.append({"name": entry.name, "rank": rank})

    tier3_hits = []
    for entry in gt.acceptable:
        rank = _find_rank(entry.name, result_normalized)
        if rank is not None:
            tier3_hits.append({"name": entry.name, "rank": rank})

    # Check bad examples with rank tracking
    bad_included = []
    for bad in gt.bad_examples:
        rank = _find_rank(bad, result_normalized)
        if rank is not None:
            bad_included.append({"name": bad, "rank": rank})

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

    # Rank bonus: Tier1/Tier2 in Top 3 → +5, in Top 5 → +3
    rank_bonus = 0
    for hit in tier1_hits:
        if hit["rank"] <= 3:
            rank_bonus += 5
        elif hit["rank"] <= 5:
            rank_bonus += 3
    for hit in tier2_hits:
        if hit["rank"] <= 3:
            rank_bonus += 3
        elif hit["rank"] <= 5:
            rank_bonus += 2

    # Bad penalty: -5점 per bad, extra penalty if in Top positions
    bad_penalty = 0
    for bad in bad_included:
        bad_penalty += 5  # base penalty
        if bad["rank"] <= 3:
            bad_penalty += 15  # Top 3 extra penalty
        elif bad["rank"] <= 5:
            bad_penalty += 10  # Top 5 extra penalty

    # Result count bonus (5개 이상이면 가점)
    count_bonus = min(10, len(result_names) * 2)

    # Diversity bonus (다양한 장르면 가점) - 10점
    diversity_bonus = 10 if len(result_names) >= 5 else 5

    total = max(0, min(100,
        tier1_score + tier2_score + tier3_score
        + rank_bonus + count_bonus + diversity_bonus
        - bad_penalty
    ))

    # Format hit names for output
    tier1_hit_names = [h["name"] for h in tier1_hits]
    tier2_hit_names = [h["name"] for h in tier2_hits]
    tier3_hit_names = [h["name"] for h in tier3_hits]
    bad_included_names = [b["name"] for b in bad_included]

    details = []
    details.append(f"Tier1 적중: {len(tier1_hits)}/{tier1_total} ({tier1_score:.0f}점)")
    details.append(f"Tier2 적중: {len(tier2_hits)}/{tier2_total} ({tier2_score:.0f}점)")
    if rank_bonus > 0:
        details.append(f"순위 보너스: +{rank_bonus}점")
    if tier1_misses:
        details.append(f"Tier1 누락: {', '.join(tier1_misses)}")
    if bad_included:
        details.append(f"부적합 포함: {', '.join(bad_included_names)} (-{bad_penalty}점)")

    return {
        "score": total,
        "hits": {
            "tier1": tier1_hit_names,
            "tier2": tier2_hit_names,
            "tier3": tier3_hit_names,
        },
        "misses": {
            "tier1": tier1_misses,
        },
        "bad_included": bad_included_names,
        "details": " | ".join(details),
    }


def _normalize(name: str) -> str:
    import re
    name = re.sub(r"\s+", "", name)
    name = re.sub(r"[^가-힣a-zA-Z0-9]", "", name)
    return name.lower()


def _fuzzy_match(target_norm: str, candidate_norm: str) -> bool:
    """두 정규화된 이름이 같은 식당을 가리키는지 판별.

    규칙:
    1. 포함 관계 (한쪽이 다른 쪽에 포함)
    2. 핵심 부분 매칭: 짧은 쪽의 50% 이상이 긴 쪽에 포함되어야 함
       (3글자 매칭은 "성수점" 같은 접미사 false positive가 심함)
    """
    if target_norm in candidate_norm or candidate_norm in target_norm:
        return True

    # 핵심 부분 매칭: 최소 4글자 이상, 짧은 쪽 길이의 50% 이상
    shorter = target_norm if len(target_norm) < len(candidate_norm) else candidate_norm
    longer = candidate_norm if len(target_norm) < len(candidate_norm) else target_norm
    min_match_len = max(4, len(shorter) // 2)

    if len(shorter) >= min_match_len:
        for length in range(len(shorter), min_match_len - 1, -1):
            for i in range(len(shorter) - length + 1):
                if shorter[i:i+length] in longer:
                    return True
    return False


def _find_rank(target: str, normalized_list: list[str]) -> int | None:
    """Find the 1-based rank of target in the result list. None if not found."""
    target_norm = _normalize(target)
    for idx, n in enumerate(normalized_list):
        if _fuzzy_match(target_norm, n):
            return idx + 1
    return None


def _find_match(target: str, normalized_list: list[str]) -> bool:
    """Fuzzy match: target in any of the normalized names."""
    target_norm = _normalize(target)
    for n in normalized_list:
        if _fuzzy_match(target_norm, n):
            return True
    return False
