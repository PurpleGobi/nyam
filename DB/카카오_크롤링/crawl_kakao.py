"""
카카오 로컬 API 기반 서울 식당 크롤링 → Supabase restaurants 테이블 직접 저장

사용법:
  python crawl_kakao.py                    # 전체 서울 크롤링 (새로 시작)
  python crawl_kakao.py --resume           # 중단된 곳부터 이어서 (매일 이걸로 실행)
  python crawl_kakao.py --district 강남구   # 특정 구만
  python crawl_kakao.py --dry-run          # DB 저장 없이 테스트
  python crawl_kakao.py --quota 50000      # 일일 API 한도 지정

다음날 이어서 하려면:
  python crawl_kakao.py --resume
  (progress.json에 완료 셀/식당 ID가 저장되어 있어 자동으로 이어서 진행)
"""

import asyncio
import aiohttp
import json
import logging
import math
import os
import sys
import time
import argparse
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

from config import (
    KAKAO_REST_API_KEY, SUPABASE_URL, SUPABASE_KEY,
    KAKAO_CATEGORY_URL, CATEGORY_CODES, PAGE_SIZE, MAX_PAGES,
    REQUEST_DELAY, MAX_CONCURRENT, BATCH_PAUSE, BATCH_SIZE,
    CELL_RADIUS, GRID_OVERLAP, MAX_RESULTS_PER_CELL,
    SEOUL_BOUNDS, SEOUL_DISTRICTS,
    PROGRESS_FILE, LOG_FILE,
    KAKAO_TO_GENRE, DAILY_LIMIT,
)

# ──────────────────────────────────────────────
# 로깅 설정
# ──────────────────────────────────────────────
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 데이터 구조
# ──────────────────────────────────────────────
@dataclass
class GridCell:
    """격자 셀"""
    lat: float
    lng: float
    radius: int  # 미터


@dataclass
class DenseCell:
    """밀집 셀 기록"""
    lat: float
    lng: float
    radius: int
    total_count: int
    pageable_count: int
    collected: int  # 실제 수집한 수 (distance + accuracy)

    def to_dict(self) -> dict:
        return {
            'lat': self.lat, 'lng': self.lng, 'radius': self.radius,
            'total_count': self.total_count, 'pageable_count': self.pageable_count,
            'collected': self.collected,
            'missed': max(0, self.total_count - self.collected),
        }


@dataclass
class CrawlStats:
    """크롤링 통계"""
    total_cells: int = 0
    completed_cells: int = 0
    skipped_cells: int = 0
    total_restaurants: int = 0
    unique_restaurants: int = 0
    api_calls: int = 0
    subdivided_cells: int = 0
    errors: int = 0
    upserted: int = 0
    quota_limit: int = 0
    dense_cells: list = field(default_factory=list)  # DenseCell 리스트
    start_time: float = field(default_factory=time.time)

    def elapsed(self) -> str:
        mins = (time.time() - self.start_time) / 60
        if mins > 60:
            return f"{mins / 60:.1f}시간"
        return f"{mins:.1f}분"

    def summary(self) -> str:
        remaining = self.total_cells - self.completed_cells - self.skipped_cells
        return (
            f"셀: {self.completed_cells}/{self.total_cells} (남은: {remaining}) | "
            f"식당: {self.unique_restaurants} (총 {self.total_restaurants}) | "
            f"API: {self.api_calls}/{self.quota_limit} | "
            f"DB저장: {self.upserted} | "
            f"세분화: {self.subdivided_cells} | "
            f"에러: {self.errors} | "
            f"경과: {self.elapsed()}"
        )

    @property
    def quota_exhausted(self) -> bool:
        return self.api_calls >= self.quota_limit


# ──────────────────────────────────────────────
# 격자 생성
# ──────────────────────────────────────────────
def meters_to_lat(meters: float) -> float:
    return meters / 111_320


def meters_to_lng(meters: float, lat: float) -> float:
    return meters / (111_320 * math.cos(math.radians(lat)))


def generate_grid(bounds: dict, radius: int, overlap: float) -> list[GridCell]:
    """
    경계 내 격자 셀 생성.
    overlap < 2.0이면 원끼리 겹쳐서 빈틈 제거.
    overlap = 2.0이면 원끼리 딱 맞닿음 (모서리 빈틈 발생).
    overlap = sqrt(2) ≈ 1.414이면 모서리까지 완전 커버.
    """
    cells = []
    step_meters = radius * overlap
    step_lat = meters_to_lat(step_meters)
    step_lng = meters_to_lng(step_meters, (bounds['south'] + bounds['north']) / 2)

    lat = bounds['south']
    while lat <= bounds['north']:
        lng = bounds['west']
        while lng <= bounds['east']:
            cells.append(GridCell(lat=round(lat, 6), lng=round(lng, 6), radius=radius))
            lng += step_lng
        lat += step_lat

    return cells


MIN_RADIUS = 5   # 세분화 최소 반경 (미터) — 5m 반경에 45건 초과는 사실상 불가능

def subdivide_cell(cell: GridCell) -> list[GridCell]:
    """
    셀을 4개로 분할: 중심점을 4분할하되 반경은 절반으로 줄임.
    빈틈 방지를 위해 반경은 부모의 70% 유지 (overlap 발생, dedup으로 처리).
    """
    r = max(cell.radius // 2, MIN_RADIUS)
    # 오프셋은 반경의 절반 → 서브셀끼리 겹침 발생 → 빈틈 없음
    offset = cell.radius // 4
    offset_lat = meters_to_lat(offset)
    offset_lng = meters_to_lng(offset, cell.lat)

    return [
        GridCell(cell.lat - offset_lat, cell.lng - offset_lng, r),
        GridCell(cell.lat - offset_lat, cell.lng + offset_lng, r),
        GridCell(cell.lat + offset_lat, cell.lng - offset_lng, r),
        GridCell(cell.lat + offset_lat, cell.lng + offset_lng, r),
    ]


# ──────────────────────────────────────────────
# 카카오 카테고리 → Nyam genre 파싱
# ──────────────────────────────────────────────
def parse_genre(category_name: str) -> Optional[str]:
    if not category_name:
        return None
    parts = [p.strip() for p in category_name.split('>')]
    for part in reversed(parts):
        if part in KAKAO_TO_GENRE:
            return KAKAO_TO_GENRE[part]
    return '기타'


def parse_district(address: str) -> Optional[str]:
    if not address:
        return None
    parts = address.split()
    for part in parts:
        if part.endswith('구') or part.endswith('군'):
            return part
    return None


def parse_area(address: str) -> list[str]:
    if not address:
        return []
    parts = address.split()
    for part in parts:
        if part.endswith('동') or part.endswith('읍') or part.endswith('면') or part.endswith('로') or part.endswith('길'):
            if not (part.endswith('구') or part.endswith('시') or part.endswith('도')):
                return [part]
    return []


# ──────────────────────────────────────────────
# 카카오 API 호출
# ──────────────────────────────────────────────
class KakaoClient:
    def __init__(self, api_key: str, max_concurrent: int = MAX_CONCURRENT):
        self.api_key = api_key
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()
        self.call_count = 0

    async def _throttle(self):
        async with self._lock:
            now = time.time()
            wait = REQUEST_DELAY - (now - self.last_request_time)
            if wait > 0:
                await asyncio.sleep(wait)
            self.last_request_time = time.time()

    async def search_category(
        self, session: aiohttp.ClientSession,
        lat: float, lng: float, radius: int, page: int = 1,
        sort: str = 'distance', category: str = 'FD6',
    ) -> dict:
        async with self.semaphore:
            await self._throttle()

            params = {
                'category_group_code': category,
                'x': str(lng), 'y': str(lat),
                'radius': str(radius), 'page': str(page),
                'size': str(PAGE_SIZE), 'sort': sort,
            }
            headers = {'Authorization': f'KakaoAK {self.api_key}'}

            try:
                async with session.get(
                    KAKAO_CATEGORY_URL, params=params, headers=headers,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    self.call_count += 1

                    if resp.status == 429:
                        logger.warning("Rate limited! 120초 대기...")
                        await asyncio.sleep(120)
                        return await self.search_category(session, lat, lng, radius, page)

                    if resp.status != 200:
                        text = await resp.text()
                        logger.error(f"API 에러 {resp.status}: {text[:200]}")
                        return {'documents': [], 'meta': {'total_count': 0, 'is_end': True}}

                    return await resp.json()

            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                logger.error(f"요청 실패 ({lat},{lng} p{page}): {e}")
                return {'documents': [], 'meta': {'total_count': 0, 'is_end': True}}


# ──────────────────────────────────────────────
# 셀 크롤링
# ──────────────────────────────────────────────
async def crawl_cell(
    client: KakaoClient, session: aiohttp.ClientSession,
    cell: GridCell, stats: CrawlStats, seen_ids: set,
) -> list[dict]:
    restaurants = []

    if stats.quota_exhausted:
        return restaurants

    def collect_docs(documents: list):
        for doc in documents:
            r = transform_document(doc)
            if r and r['kakao_id'] not in seen_ids:
                seen_ids.add(r['kakao_id'])
                restaurants.append(r)
                stats.unique_restaurants += 1
            stats.total_restaurants += 1

    # 모든 카테고리 순회 (FD6 + CE7)
    for cat in CATEGORY_CODES:
        if stats.quota_exhausted:
            break
        await _crawl_cell_category(client, session, cell, stats, seen_ids, restaurants, collect_docs, cat)

    return restaurants


async def _crawl_cell_category(
    client: KakaoClient, session: aiohttp.ClientSession,
    cell: GridCell, stats: CrawlStats, seen_ids: set,
    restaurants: list, collect_docs, category: str,
):
    """하나의 카테고리에 대해 셀 크롤링 (세분화 + jitter 포함)"""
    data = await client.search_category(session, cell.lat, cell.lng, cell.radius, page=1, category=category)
    stats.api_calls += 1

    meta = data.get('meta', {})
    total = meta.get('total_count', 0)
    pageable = meta.get('pageable_count', 0)
    docs = data.get('documents', [])

    # 세분화
    if total > MAX_RESULTS_PER_CELL and cell.radius > MIN_RADIUS:
        stats.subdivided_cells += 1
        subcells = subdivide_cell(cell)
        for subcell in subcells:
            if stats.quota_exhausted:
                break
            await _crawl_cell_category(client, session, subcell, stats, seen_ids, restaurants, collect_docs, category)
        return

    is_dense = total > MAX_RESULTS_PER_CELL
    collected_before = len(restaurants)

    collect_docs(docs)

    # 나머지 페이지
    is_end = meta.get('is_end', True)
    page = 2
    while not is_end and page <= MAX_PAGES and not stats.quota_exhausted:
        data = await client.search_category(session, cell.lat, cell.lng, cell.radius, page=page, category=category)
        stats.api_calls += 1
        collect_docs(data.get('documents', []))
        is_end = data.get('meta', {}).get('is_end', True)
        page += 1

    # 밀집 셀: jitter
    if is_dense and not stats.quota_exhausted:
        jitter_offsets = [
            (0.00005, 0), (-0.00005, 0),
            (0, 0.00006), (0, -0.00006),
        ]
        for dlat, dlng in jitter_offsets:
            if stats.quota_exhausted:
                break
            jlat = cell.lat + dlat
            jlng = cell.lng + dlng
            jdata = await client.search_category(session, jlat, jlng, cell.radius, page=1, category=category)
            stats.api_calls += 1
            collect_docs(jdata.get('documents', []))

            j_end = jdata.get('meta', {}).get('is_end', True)
            jp = 2
            while not j_end and jp <= MAX_PAGES and not stats.quota_exhausted:
                jdata = await client.search_category(session, jlat, jlng, cell.radius, page=jp, category=category)
                stats.api_calls += 1
                collect_docs(jdata.get('documents', []))
                j_end = jdata.get('meta', {}).get('is_end', True)
                jp += 1

    if is_dense:
        collected_now = len(restaurants) - collected_before
        dc = DenseCell(
            lat=cell.lat, lng=cell.lng, radius=cell.radius,
            total_count=total, pageable_count=pageable, collected=collected_now,
        )
        stats.dense_cells.append(dc)
        logger.info(f"  [밀집] ({cell.lat},{cell.lng}) r={cell.radius}m cat={category} total={total} 수집={collected_now} 누락추정≈{dc.to_dict()['missed']}")


def transform_document(doc: dict) -> Optional[dict]:
    kakao_id = doc.get('id')
    if not kakao_id:
        return None

    name = doc.get('place_name', '').strip()
    if not name:
        return None

    address = doc.get('road_address_name') or doc.get('address_name') or ''
    old_address = doc.get('address_name') or ''

    lat = float(doc.get('y', 0))
    lng = float(doc.get('x', 0))
    if lat == 0 or lng == 0:
        return None

    phone = doc.get('phone', '').strip() or None
    category_name = doc.get('category_name', '')
    place_url = doc.get('place_url', '')

    return {
        'kakao_id': kakao_id,
        'name': name,
        'address': address,
        'country': '한국',
        'city': '서울',
        'district': parse_district(old_address),
        'area': parse_area(old_address),
        'lat': lat,
        'lng': lng,
        'genre': parse_genre(category_name),
        'phone': phone,
        'kakao_map_url': place_url,
        'external_id_kakao': kakao_id,
        'data_source': 'crawled',
        'last_crawled_at': datetime.now(timezone.utc).isoformat(),
    }


# ──────────────────────────────────────────────
# Supabase 저장
# ──────────────────────────────────────────────
async def upsert_to_supabase(
    session: aiohttp.ClientSession,
    restaurants: list[dict],
    stats: CrawlStats,
    dry_run: bool = False,
) -> int:
    if not restaurants or dry_run:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/rpc/upsert_crawled_restaurants"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }

    batch_size = 100
    upserted = 0

    for i in range(0, len(restaurants), batch_size):
        batch = restaurants[i:i + batch_size]
        payload = {'items': batch}

        try:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status in (200, 204):
                    upserted += len(batch)
                    stats.upserted += len(batch)
                else:
                    text = await resp.text()
                    logger.error(f"Supabase upsert 실패 ({resp.status}): {text[:300]}")
                    stats.errors += 1
                    # fallback: 개별 upsert
                    for item in batch:
                        count = await upsert_single(session, item, stats)
                        upserted += count
        except Exception as e:
            logger.error(f"Supabase 배치 upsert 예외: {e}")
            stats.errors += 1

    return upserted


async def upsert_single(
    session: aiohttp.ClientSession, restaurant: dict, stats: CrawlStats,
) -> int:
    url = f"{SUPABASE_URL}/rest/v1/restaurants"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }

    row = {
        'name': restaurant['name'], 'address': restaurant['address'],
        'country': restaurant['country'], 'city': restaurant['city'],
        'district': restaurant['district'], 'area': restaurant['area'],
        'lat': restaurant['lat'], 'lng': restaurant['lng'],
        'genre': restaurant['genre'], 'phone': restaurant['phone'],
        'kakao_map_url': restaurant['kakao_map_url'],
        'external_id_kakao': restaurant['external_id_kakao'],
        'data_source': restaurant['data_source'],
        'last_crawled_at': restaurant['last_crawled_at'],
    }

    try:
        check_url = f"{SUPABASE_URL}/rest/v1/restaurants?external_id_kakao=eq.{restaurant['kakao_id']}&select=id"
        async with session.get(check_url, headers=headers) as resp:
            existing = await resp.json() if resp.status == 200 else []

        if existing:
            rid = existing[0]['id']
            update_url = f"{SUPABASE_URL}/rest/v1/restaurants?id=eq.{rid}"
            row.pop('data_source', None)
            async with session.patch(update_url, json=row, headers=headers) as resp:
                if resp.status in (200, 204):
                    return 1
                text = await resp.text()
                logger.error(f"UPDATE 실패 {restaurant['name']}: {text[:200]}")
                return 0
        else:
            async with session.post(url, json=row, headers=headers) as resp:
                if resp.status in (200, 201, 204):
                    stats.upserted += 1
                    return 1
                text = await resp.text()
                logger.error(f"INSERT 실패 {restaurant['name']}: {text[:200]}")
                return 0
    except Exception as e:
        logger.error(f"단건 upsert 예외 {restaurant['name']}: {e}")
        return 0


# ──────────────────────────────────────────────
# 진행 상황 관리
# ──────────────────────────────────────────────
class ProgressTracker:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.completed_cells: set[str] = set()
        self.seen_kakao_ids: set[str] = set()
        self.run_history: list[dict] = []
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

    def cell_key(self, cell: GridCell) -> str:
        return f"{cell.lat},{cell.lng},{cell.radius}"

    def is_done(self, cell: GridCell) -> bool:
        return self.cell_key(cell) in self.completed_cells

    def mark_done(self, cell: GridCell):
        self.completed_cells.add(self.cell_key(cell))

    def save(self, stats: Optional[CrawlStats] = None):
        data = {
            'completed_cells': list(self.completed_cells),
            'seen_kakao_ids': list(self.seen_kakao_ids),
            'saved_at': datetime.now(timezone.utc).isoformat(),
            'run_history': self.run_history,
        }
        if stats:
            data['last_stats'] = {
                'total_cells': stats.total_cells,
                'completed_cells': stats.completed_cells,
                'unique_restaurants': stats.unique_restaurants,
                'api_calls': stats.api_calls,
                'upserted': stats.upserted,
                'errors': stats.errors,
            }
            # 밀집 셀 별도 파일 저장
            if stats.dense_cells:
                dense_path = os.path.join(os.path.dirname(self.filepath), 'dense_cells.json')
                dense_data = {
                    'saved_at': datetime.now(timezone.utc).isoformat(),
                    'total': len(stats.dense_cells),
                    'with_missed': sum(1 for dc in stats.dense_cells if dc.to_dict()['missed'] > 0),
                    'cells': [dc.to_dict() for dc in stats.dense_cells],
                }
                with open(dense_path, 'w', encoding='utf-8') as f:
                    json.dump(dense_data, f, ensure_ascii=False, indent=2)
        with open(self.filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self):
        if not os.path.exists(self.filepath):
            logger.info("진행 파일 없음 — 처음부터 시작")
            return
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.completed_cells = set(data.get('completed_cells', []))
            self.seen_kakao_ids = set(data.get('seen_kakao_ids', []))
            self.run_history = data.get('run_history', [])

            last = data.get('last_stats', {})
            logger.info(
                f"진행 상황 로드: 완료 셀 {len(self.completed_cells)}개, "
                f"식당 {len(self.seen_kakao_ids)}개, "
                f"이전 DB저장 {last.get('upserted', '?')}건"
            )
        except Exception as e:
            logger.warning(f"진행 상황 로드 실패: {e}")

    def add_run_record(self, stats: CrawlStats, reason: str):
        self.run_history.append({
            'date': datetime.now(timezone.utc).isoformat(),
            'reason': reason,
            'api_calls': stats.api_calls,
            'new_restaurants': stats.unique_restaurants,
            'upserted': stats.upserted,
            'elapsed': stats.elapsed(),
            'total_seen': len(self.seen_kakao_ids),
        })


# ──────────────────────────────────────────────
# 메인 크롤러
# ──────────────────────────────────────────────
async def crawl_seoul(
    district: Optional[str] = None,
    resume: bool = False,
    dry_run: bool = False,
    quota: int = DAILY_LIMIT,
):
    if not KAKAO_REST_API_KEY:
        logger.error("KAKAO_REST_API_KEY가 설정되지 않았습니다!")
        return
    if not dry_run and (not SUPABASE_URL or not SUPABASE_KEY):
        logger.error("SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다!")
        return

    # 격자 생성 (overlap 적용)
    cells = generate_grid(SEOUL_BOUNDS, CELL_RADIUS, GRID_OVERLAP)
    logger.info(f"서울 격자: {len(cells)}개 셀 (반경 {CELL_RADIUS}m, overlap {GRID_OVERLAP}x)")

    # 특정 구 필터
    if district:
        if district not in SEOUL_DISTRICTS:
            logger.error(f"알 수 없는 구: {district}. 가능: {list(SEOUL_DISTRICTS.keys())}")
            return
        center = SEOUL_DISTRICTS[district]
        cells = [
            c for c in cells
            if abs(c.lat - center[0]) < 0.03 and abs(c.lng - center[1]) < 0.03
        ]
        logger.info(f"{district} 필터: {len(cells)}개 셀")

    # 진행 상황
    tracker = ProgressTracker(PROGRESS_FILE)
    if resume:
        tracker.load()

    stats = CrawlStats(total_cells=len(cells), quota_limit=quota)

    # 이미 완료된 셀 카운트
    already_done = sum(1 for c in cells if tracker.is_done(c))
    stats.skipped_cells = already_done
    stats.completed_cells = already_done

    remaining = len(cells) - already_done
    logger.info(f"크롤링 시작 {'(DRY RUN) ' if dry_run else ''}")
    logger.info(f"  전체 셀: {len(cells)} | 이미 완료: {already_done} | 남은: {remaining}")
    logger.info(f"  이미 수집된 식당 ID: {len(tracker.seen_kakao_ids)}개")
    logger.info(f"  일일 API 한도: {quota:,}건")
    logger.info(f"  설정: radius={CELL_RADIUS}m, delay={REQUEST_DELAY}s, concurrent={MAX_CONCURRENT}")

    if remaining == 0:
        logger.info("모든 셀 완료! 추가 크롤링 불필요.")
        return

    kakao_client = KakaoClient(KAKAO_REST_API_KEY)

    async with aiohttp.ClientSession() as session:
        buffer: list[dict] = []

        for cell in cells:
            if tracker.is_done(cell):
                continue

            # 일일 한도 체크
            if stats.quota_exhausted:
                logger.warning(f"일일 API 한도 {quota:,}건 도달! 크롤링 중단.")
                logger.info("내일 'python crawl_kakao.py --resume'로 이어서 실행하세요.")
                break

            try:
                results = await crawl_cell(kakao_client, session, cell, stats, tracker.seen_kakao_ids)
                buffer.extend(results)
            except Exception as e:
                logger.error(f"셀 크롤링 실패 ({cell.lat},{cell.lng}): {e}")
                stats.errors += 1

            tracker.mark_done(cell)
            stats.completed_cells += 1

            # 주기적 DB 저장
            if len(buffer) >= 100:
                await upsert_to_supabase(session, buffer, stats, dry_run)
                buffer.clear()

            # 주기적 진행 저장 + 로그
            if (stats.completed_cells - stats.skipped_cells) % 100 == 0 and stats.completed_cells > stats.skipped_cells:
                tracker.save(stats)
                logger.info(f"[진행] {stats.summary()}")

            # Rate limit pause
            if kakao_client.call_count % BATCH_SIZE == 0 and kakao_client.call_count > 0 and not stats.quota_exhausted:
                logger.info(f"[일시정지] {BATCH_PAUSE}초 쉬기 (API 호출 {stats.api_calls}건)")
                await asyncio.sleep(BATCH_PAUSE)

        # 남은 버퍼 저장
        if buffer:
            await upsert_to_supabase(session, buffer, stats, dry_run)

    # 완료/중단 판정
    if stats.quota_exhausted:
        reason = f"일일 한도 도달 ({quota:,}건)"
    else:
        reason = "전체 완료"

    tracker.add_run_record(stats, reason)
    tracker.save(stats)

    logger.info("=" * 60)
    logger.info(f"크롤링 {'중단' if stats.quota_exhausted else '완료'}! ({reason})")
    logger.info(f"최종: {stats.summary()}")
    logger.info(f"총 수집 식당 ID: {len(tracker.seen_kakao_ids):,}개")
    if stats.quota_exhausted:
        remaining_cells = stats.total_cells - stats.completed_cells
        logger.info(f"남은 셀: {remaining_cells}개 — 내일 --resume로 이어서 실행")
    logger.info("=" * 60)


# ──────────────────────────────────────────────
# 엔트리포인트
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='카카오 로컬 API 서울 식당 크롤링')
    parser.add_argument('--district', type=str, help='특정 구만 크롤링 (예: 강남구)')
    parser.add_argument('--resume', action='store_true', help='중단된 곳부터 이어서')
    parser.add_argument('--dry-run', action='store_true', help='DB 저장 없이 테스트')
    parser.add_argument('--quota', type=int, default=DAILY_LIMIT, help=f'일일 API 한도 (기본: {DAILY_LIMIT:,})')
    args = parser.parse_args()

    asyncio.run(crawl_seoul(
        district=args.district,
        resume=args.resume,
        dry_run=args.dry_run,
        quota=args.quota,
    ))


if __name__ == '__main__':
    main()
