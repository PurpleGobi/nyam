#!/usr/bin/env python3
"""
미슐랭 가이드 공식 사이트 크롤러

guide.michelin.com에서 미슐랭 레스토랑 데이터를 수집합니다.
상세 페이지의 JSON-LD (schema.org)에서 구조화 데이터를 추출합니다.

사용법:
    python crawl_michelin.py --country kr/ko              # 한국 전체
    python crawl_michelin.py --country kr/ko --star 3-stars-michelin
    python crawl_michelin.py --dry-run                     # DB 저장 없이 CSV만
"""

import argparse
import csv
import json
import os
import re
import time
from collections import Counter
from datetime import datetime
from playwright.sync_api import sync_playwright, Page
from bs4 import BeautifulSoup
from tqdm import tqdm
from config import (
    BASE_URL, COUNTRIES, STAR_FILTERS,
    REQUEST_DELAY, MAX_SCROLL_ATTEMPTS, HEADLESS,
    SUPABASE_URL, SUPABASE_KEY,
)


def normalize_name(name: str) -> str:
    return re.sub(r'[\s\W]', '', name).lower()


def parse_cards(html: str) -> list[dict]:
    """목록 페이지에서 식당 카드 추출 (이름 + 좌표 + 상세 URL)"""
    soup = BeautifulSoup(html, 'html.parser')
    cards = soup.select('.card__menu')
    results = []

    for card in cards:
        title_el = card.select_one('.card__menu-content--title a')
        if not title_el:
            continue
        name = title_el.get_text(strip=True)
        href = title_el.get('href', '')
        if not name:
            continue

        results.append({
            'name': name,
            'detail_url': BASE_URL + href if href else None,
            'lat': float(card.get('data-lat', 0)) or None,
            'lng': float(card.get('data-lng', 0)) or None,
        })

    return results


def parse_detail_jsonld(html: str) -> dict:
    """상세 페이지 JSON-LD에서 구조화 데이터 추출"""
    soup = BeautifulSoup(html, 'html.parser')
    detail = {}

    # JSON-LD 추출
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.string)
            if data.get('@type') == 'Restaurant':
                # 주소
                addr = data.get('address', {})
                street = addr.get('streetAddress', '')
                locality = addr.get('addressLocality', '')
                postal = addr.get('postalCode', '')
                country = addr.get('addressCountry', '')
                detail['address'] = ', '.join(filter(None, [street, locality, postal, country]))

                # 전화번호
                detail['phone'] = data.get('telephone')

                # 요리 유형
                detail['cuisine'] = data.get('servesCuisine')

                # 설명 (JSON-LD fallback)
                review = data.get('review', {})
                detail['description_jsonld'] = review.get('description', '')

                # 이미지
                detail['image_url'] = data.get('image')

                # 리뷰 날짜 (년도 추정용)
                pub_date = review.get('datePublished', '')
                if pub_date:
                    detail['review_date'] = pub_date

                break
        except:
            pass

    # 가격대 (₩ 기호 개수)
    price_el = soup.select_one('.data-sheet__price, .restaurant-details__header-price')
    if price_el:
        price_text = price_el.get_text(strip=True)
        detail['price_text'] = price_text
        detail['price_level'] = price_text.count('₩') or price_text.count('$') or price_text.count('€')

    # 영업시간
    hours_els = soup.select('.data-sheet__hours li, .restaurant-details__hours li')
    if hours_els:
        hours = []
        for el in hours_els:
            text = el.get_text(strip=True)
            if text:
                hours.append(text)
        detail['hours'] = ' | '.join(hours)

    # 시설/서비스 정보
    facilities = []
    for el in soup.select('.restaurant-details__services li, .data-sheet__services li'):
        text = el.get_text(strip=True)
        if text:
            facilities.append(text)
    if facilities:
        detail['facilities'] = ', '.join(facilities)

    # 설명 — HTML 본문에서 전체 텍스트 추출 (JSON-LD보다 길 수 있음)
    desc_el = soup.select_one(
        '.restaurant-details__description, '
        '.data-sheet__description, '
        '.restaurant-details__content--description, '
        '[class*="editorial-content"] p, '
        '.mikado-editor-content p'
    )
    html_desc = desc_el.get_text(strip=True) if desc_el else ''
    # HTML 본문이 더 길면 그걸 사용, 아니면 JSON-LD fallback
    jsonld_desc = detail.get('description_jsonld', '')
    detail['description'] = html_desc if len(html_desc) > len(jsonld_desc) else jsonld_desc
    detail.pop('description_jsonld', None)

    return detail


def scroll_and_load_all(page: Page) -> str:
    """무한스크롤로 모든 카드 로딩"""
    prev_count = 0
    for _ in range(MAX_SCROLL_ATTEMPTS):
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        page.wait_for_timeout(1500)
        try:
            btn = page.query_selector('.js-restaurant__list_more, .btn-show-more, [class*="show-more"]')
            if btn and btn.is_visible():
                btn.click()
                page.wait_for_timeout(2000)
        except:
            pass
        count = page.evaluate('document.querySelectorAll(".card__menu").length')
        if count == prev_count:
            break
        prev_count = count
    return page.content()


def crawl_listing(page: Page, url: str, desc: str, progress: tqdm) -> list[dict]:
    """목록 페이지 크롤링"""
    progress.set_description(desc)
    try:
        page.goto(url, timeout=30000)
        # JS 렌더링 대기 — networkidle 대신 카드 출현 대기
        try:
            page.wait_for_selector('.card__menu', timeout=10000)
        except:
            pass
        time.sleep(REQUEST_DELAY + 2)
        html = scroll_and_load_all(page)
        results = parse_cards(html)
        progress.update(len(results))
        return results
    except Exception as e:
        progress.write(f'  ✗ {desc}: {e}')
        return []


def crawl_detail(page: Page, url: str) -> dict:
    """상세 페이지 크롤링 → JSON-LD 추출"""
    try:
        page.goto(url, wait_until='networkidle', timeout=20000)
        time.sleep(1)
        html = page.content()
        return parse_detail_jsonld(html)
    except:
        return {}


def save_csv(restaurants: list[dict], output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    path = os.path.join(output_dir, f'michelin_{ts}.csv')

    keys = ['name', 'country_name', 'region_name', 'star_label', 'year',
            'address', 'phone', 'hours', 'cuisine', 'price_text', 'price_level',
            'lat', 'lng', 'description', 'facilities', 'image_url', 'detail_url']

    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
        w.writeheader()
        w.writerows(restaurants)

    print(f'\n✅ CSV: {path} ({len(restaurants)}개)')
    return path


def save_supabase(restaurants: list[dict]):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('⚠️  Supabase 미설정')
        return

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    rows = []
    for r in restaurants:
        star = r.get('star_label', '')
        tier = 'S' if '3스타' in star or '2스타' in star else ('A' if '1스타' in star else 'B')

        rows.append({
            'restaurant_name': r['name'],
            'restaurant_name_norm': normalize_name(r['name']),
            'region': r.get('country_name', ''),
            'area': r.get('region_name', ''),
            'category': 'award',
            'source': 'michelin',
            'prestige_tier': tier,
            'detail': star,
            'year': r.get('year', 2025),
            'source_url': r.get('detail_url'),
            'verified': True if r.get('lat') else False,
            'address': r.get('address'),
            'phone': r.get('phone'),
            'lat': r.get('lat'),
            'lng': r.get('lng'),
        })

    inserted = 0
    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        try:
            client.table('restaurant_accolades').insert(batch).execute()
            inserted += len(batch)
        except Exception as e:
            print(f'  DB error: {e}')

    print(f'✅ DB: {inserted}/{len(rows)}개')


def main():
    parser = argparse.ArgumentParser(description='미슐랭 가이드 크롤러')
    parser.add_argument('--country', type=str, help='국가 코드 (예: kr/ko)')
    parser.add_argument('--star', type=str, help='등급 (예: 3-stars-michelin)')
    parser.add_argument('--dry-run', action='store_true', help='DB 저장 안 함')
    parser.add_argument('--no-detail', action='store_true', help='상세 페이지 건너뜀')
    parser.add_argument('--output', type=str, default='./data')
    parser.add_argument('--no-headless', action='store_true')
    args = parser.parse_args()

    countries = {args.country: COUNTRIES[args.country]} if args.country else COUNTRIES
    stars = {args.star: STAR_FILTERS[args.star]} if args.star else STAR_FILTERS

    total_tasks = sum(len(c['regions']) * len(stars) for c in countries.values())
    print(f'🔍 미슐랭 크롤링: {len(countries)}개국, {len(stars)}등급, {total_tasks}작업')
    print(f'   상세 페이지: {"건너뜀" if args.no_detail else "크롤링"}\n')

    all_restaurants = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.no_headless)
        ctx = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = ctx.new_page()
        progress = tqdm(total=0, desc='목록')

        # Phase 1: 목록 크롤링
        for country_key, country_info in countries.items():
            for region_key, region_name in country_info['regions'].items():
                for star_key, star_label in stars.items():
                    url = f'{BASE_URL}/{country_key}/{region_key}/restaurants/{star_key}'
                    desc = f'{country_info["name"]}/{region_name}/{star_label}'

                    results = crawl_listing(page, url, desc, progress)

                    for r in results:
                        r['country_key'] = country_key
                        r['country_name'] = country_info['name']
                        r['region_key'] = region_key
                        r['region_name'] = region_name
                        r['star_label'] = star_label
                        r['year'] = 2025  # 기본값, 상세 페이지에서 업데이트

                    all_restaurants.extend(results)
                    progress.write(f'  ✓ {desc}: {len(results)}개')

        # 중복 제거
        seen = set()
        unique = []
        for r in all_restaurants:
            key = (normalize_name(r['name']), r.get('country_key'), r.get('star_label'))
            if key not in seen:
                seen.add(key)
                unique.append(r)

        progress.close()
        print(f'\n📋 목록: {len(unique)}개 (중복제거 전 {len(all_restaurants)})')

        # Phase 2: 상세 페이지 크롤링
        if not args.no_detail:
            print(f'\n📄 상세 페이지 크롤링 ({len(unique)}개)...')
            for r in tqdm(unique, desc='상세'):
                if r.get('detail_url'):
                    detail = crawl_detail(page, r['detail_url'])
                    r.update(detail)

                    # 리뷰 날짜에서 년도 추출
                    if detail.get('review_date'):
                        try:
                            r['year'] = int(detail['review_date'][:4])
                        except:
                            pass

        browser.close()

    # 통계
    by_country = Counter(r['country_name'] for r in unique)
    by_star = Counter(r['star_label'] for r in unique)
    has_phone = sum(1 for r in unique if r.get('phone'))
    has_addr = sum(1 for r in unique if r.get('address'))
    has_hours = sum(1 for r in unique if r.get('hours'))

    print(f'\n📊 결과: {len(unique)}개')
    print(f'   전화번호: {has_phone}개, 주소: {has_addr}개, 영업시간: {has_hours}개')
    print('\n국가별:')
    for c, n in by_country.most_common():
        print(f'  {c}: {n}')
    print('\n등급별:')
    for s, n in by_star.most_common():
        print(f'  {s}: {n}')

    save_csv(unique, args.output)

    if not args.dry_run:
        save_supabase(unique)
    else:
        print('\n⏭️  --dry-run')

    print('\n✨ 완료!')


if __name__ == '__main__':
    main()
