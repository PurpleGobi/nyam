#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
블루리본 서베이 크롤러 — 페이지네이션 기반

bluer.co.kr 검색 페이지에서 리본 1~3개 식당 데이터를 수집합니다.
페이지네이션으로 전체 데이터를 가져옵니다. 차단 방지를 위해 딜레이 적용.

사용법:
    python crawl_blueribbon.py                     # 리본 1~3개 전체
    python crawl_blueribbon.py --ribbon 3           # 리본 3개만
    python crawl_blueribbon.py --retry-interval 60  # 차단 시 60분 후 재시도
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from tqdm import tqdm

BASE_URL = 'https://www.bluer.co.kr'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

RIBBON_TYPES = {
    3: 'RIBBON_THREE',
    2: 'RIBBON_TWO',
    1: 'RIBBON_ONE',
}

PAGE_DELAY = 4       # 페이지 간 딜레이 (초)
LOAD_WAIT = 5        # 페이지 로드 대기 (초)
MAX_RETRIES = 10     # 차단 시 최대 재시도
SAVE_INTERVAL = 50   # N개마다 중간 저장


def extract_cards(html: str, ribbon: int) -> list[dict]:
    """HTML에서 식당 카드 데이터 추출"""
    soup = BeautifulSoup(html, 'html.parser')
    cards = soup.select('.restaurant-thumb-item')
    results = []

    for card in cards:
        name_el = card.select_one('h3')
        if not name_el:
            continue

        name = name_el.get_text(strip=True)
        foodtype_els = card.select('.foodtype li')
        foodtype = ', '.join(el.get_text(strip=True) for el in foodtype_els)
        addr_el = card.select_one('.juso-info')
        address = addr_el.get_text(strip=True) if addr_el else ''
        desc_el = card.select_one('.content')
        description = desc_el.get_text(strip=True) if desc_el else ''

        image_url = ''
        bg_el = card.select_one('.bg-cover')
        if bg_el and bg_el.get('style'):
            m = re.search(r"url\(['\"]?([^'\"]+)['\"]?\)", bg_el['style'])
            if m:
                img_path = m.group(1)
                image_url = img_path if img_path.startswith('http') else BASE_URL + img_path

        labels_els = card.select('.label')
        labels = ', '.join(el.get_text(strip=True) for el in labels_els)

        results.append({
            'name': name,
            'ribbon_count': ribbon,
            'foodtype': foodtype,
            'address': address,
            'description': description,
            'image_url': image_url,
            'labels': labels,
        })

    return results


def get_total_and_pages(page) -> tuple[int, int]:
    """현재 페이지에서 총 개수와 페이지 수 파악"""
    text = page.evaluate('document.body.innerText')
    total_match = re.search(r'(\d+)개 찾았습니다', text)
    total = int(total_match.group(1)) if total_match else 0

    # 페이지네이션에서 마지막 페이지 번호 추출
    max_page = page.evaluate('''() => {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return 1;
        const links = pagination.querySelectorAll('li a');
        let max = 1;
        for (const l of links) {
            const num = parseInt(l.innerText.trim(), 10);
            if (!isNaN(num) && num > max) max = num;
        }
        return max;
    }''')

    return total, max_page


def click_page(page, page_num: int, prev_first_name: str) -> bool:
    """페이지네이션에서 특정 페이지 클릭 후 카드 갱신 대기"""
    clicked = page.evaluate(f'''() => {{
        const pagination = document.querySelector('.pagination');
        if (!pagination) return false;
        const lis = pagination.querySelectorAll('li');
        for (const li of lis) {{
            if (li.innerText.trim() === '{page_num}' && !li.classList.contains('active')) {{
                const a = li.querySelector('a');
                if (a) {{ a.click(); return true; }}
            }}
        }}
        return false;
    }}''')
    if not clicked:
        return False

    # 카드가 갱신될 때까지 대기 (최대 10초)
    for _ in range(20):
        time.sleep(0.5)
        new_first = page.evaluate('document.querySelector(".restaurant-thumb-item h3")?.innerText || ""')
        if new_first and new_first != prev_first_name:
            return True

    return True  # 타임아웃이어도 진행


def is_blocked(page) -> bool:
    """차단 여부 확인 (403 등)"""
    text = page.evaluate('document.body.innerText')
    return '403' in text[:200] or 'Forbidden' in text[:200] or '접근이 제한' in text[:500]


def crawl_ribbon(page, ribbon: int, progress: tqdm, existing_names: set) -> list[dict]:
    """특정 리본 등급의 전체 식당 크롤링"""
    ribbon_type = RIBBON_TYPES[ribbon]
    url = f'{BASE_URL}/search?tabMode=single&searchMode=ribbonType&ribbonType={ribbon_type}'

    progress.set_description(f'리본 {ribbon}개 로딩')
    page.goto(url, timeout=30000)
    time.sleep(LOAD_WAIT)

    if is_blocked(page):
        return []

    total, max_page = get_total_and_pages(page)
    progress.write(f'  리본 {ribbon}개: {total}개 / {max_page}페이지')

    all_cards = []

    for pg in range(1, max_page + 1):
        progress.set_description(f'리본 {ribbon}개 p{pg}/{max_page}')

        if pg > 1:
            prev_first = page.evaluate('document.querySelector(".restaurant-thumb-item h3")?.innerText || ""')
            if not click_page(page, pg, prev_first):
                progress.write(f'  ⚠️ 페이지 {pg} 클릭 실패')
                break

            if is_blocked(page):
                progress.write(f'  🚫 차단됨 (페이지 {pg})')
                return all_cards

        html = page.content()
        cards = extract_cards(html, ribbon)

        # 중복 제거
        new_cards = []
        for c in cards:
            if c['name'] not in existing_names:
                existing_names.add(c['name'])
                new_cards.append(c)

        all_cards.extend(new_cards)
        progress.update(len(new_cards))
        progress.write(f'    p{pg}: {len(cards)}개 ({len(new_cards)}개 신규)')

        if pg < max_page:
            time.sleep(PAGE_DELAY)

    return all_cards


def parse_address(address: str) -> dict:
    """주소에서 시/도, 구/군 추출"""
    parts = address.split()
    city = parts[0].replace('특별시', '').replace('광역시', '').replace('특별자치도', '').replace('특별자치시', '') if parts else ''
    district = ''
    for p in parts:
        if re.match(r'.+[구군]$', p) and len(p) >= 2:
            district = p
            break
    return {'city': city, 'district': district}


def save_csv(restaurants: list[dict], output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    path = os.path.join(output_dir, f'blueribbon_{ts}.csv')

    keys = [
        'name', 'ribbon_count', 'foodtype', 'address', 'city', 'district',
        'description', 'image_url', 'labels',
    ]

    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
        w.writeheader()
        w.writerows(restaurants)

    print(f'\n✅ CSV: {path} ({len(restaurants)}개)')
    return path


def save_progress(restaurants: list[dict], output_dir: str):
    """중간 저장 (JSON)"""
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, 'blueribbon_progress.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)


def load_progress(output_dir: str) -> list[dict]:
    """이전 진행 상황 로드"""
    path = os.path.join(output_dir, 'blueribbon_progress.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def main():
    parser = argparse.ArgumentParser(description='블루리본 서베이 크롤러')
    parser.add_argument('--ribbon', type=int, choices=[1, 2, 3], help='특정 리본만 크롤링')
    parser.add_argument('--retry-interval', type=int, default=60, help='차단 시 재시도 간격 (분)')
    parser.add_argument('--output', default='./data', help='출력 디렉토리')
    parser.add_argument('--resume', action='store_true', help='이전 진행 이어서')
    args = parser.parse_args()

    ribbons = [args.ribbon] if args.ribbon else [3, 2, 1]

    # 이전 진행 로드
    all_restaurants = load_progress(args.output) if args.resume else []
    existing_names = {r['name'] for r in all_restaurants}
    done_ribbons = {r['ribbon_count'] for r in all_restaurants}

    if all_restaurants:
        print(f'📂 이전 진행 로드: {len(all_restaurants)}개')
        rc = {}
        for r in all_restaurants:
            rc[r['ribbon_count']] = rc.get(r['ribbon_count'], 0) + 1
        for k, v in sorted(rc.items(), reverse=True):
            print(f'  리본 {k}개: {v}')

    retry_count = 0

    while retry_count <= MAX_RETRIES:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(user_agent=UA, viewport={'width': 1280, 'height': 800})
                page = context.new_page()

                progress = tqdm(total=0, desc='크롤링')
                blocked = False

                for ribbon in ribbons:
                    # 이미 완료된 리본은 스킵 (resume 모드)
                    if args.resume and ribbon in done_ribbons:
                        progress.write(f'  리본 {ribbon}개: 이미 완료 (스킵)')
                        continue

                    cards = crawl_ribbon(page, ribbon, progress, existing_names)

                    if not cards and is_blocked(page):
                        blocked = True
                        progress.write(f'\n🚫 차단 감지! {args.retry_interval}분 후 재시도...')
                        break

                    all_restaurants.extend(cards)

                    # 주소 파싱
                    for r in cards:
                        parsed = parse_address(r['address'])
                        r['city'] = parsed['city']
                        r['district'] = parsed['district']

                    # 중간 저장
                    save_progress(all_restaurants, args.output)
                    progress.write(f'  💾 중간 저장: {len(all_restaurants)}개')

                progress.close()
                browser.close()

                if not blocked:
                    break  # 정상 완료

        except Exception as e:
            print(f'\n❌ 에러: {e}')
            save_progress(all_restaurants, args.output)

        # 차단/에러 시 대기 후 재시도
        retry_count += 1
        if retry_count <= MAX_RETRIES:
            wait_min = args.retry_interval
            print(f'\n⏳ {wait_min}분 대기 후 재시도... ({retry_count}/{MAX_RETRIES})')
            save_progress(all_restaurants, args.output)
            time.sleep(wait_min * 60)
            args.resume = True  # 재시도 시 이어서
            all_restaurants = load_progress(args.output)
            existing_names = {r['name'] for r in all_restaurants}
            done_ribbons = set()  # 차단된 리본은 다시 시도

    # 최종 결과
    print(f'\n📊 최종 결과: {len(all_restaurants)}개')
    from collections import Counter
    rc = Counter(r['ribbon_count'] for r in all_restaurants)
    for ribbon, count in sorted(rc.items(), reverse=True):
        print(f'  리본 {ribbon}개: {count}')

    # CSV 저장
    save_csv(all_restaurants, args.output)

    print('\n✨ 완료!')


if __name__ == '__main__':
    main()
