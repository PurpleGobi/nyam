# S8: Social Integration & Follow

> 기존 P1 페이지에 P2 소셜 레이어를 통합. 팔로우 시스템으로 개인 네트워크 확장.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `pages/08_BUBBLE.md` | §2-3 개인 팔로우 접근 계층, 버블 공유 플로우 |
| `pages/02_RESTAURANT_DETAIL.md` | L9 버블 멤버 기록 |
| `pages/03_WINE_DETAIL.md` | L9 버블 멤버 기록 |
| `pages/06_HOME.md` | 팔로잉 서브탭 |
| `pages/10_PROFILE.md` | 버블러 프로필 관련 (팔로워/팔로잉 수, 취향 매칭도) |
| `prototype/04_bubbler_profile.html` | 버블러 프로필 목업 |

---

## 산출물

- [x] 팔로우/맞팔로우 시스템 (팔로우=일방, 맞팔=양방향 풀 액세스)
- [ ] 상세 페이지 L9 (버블 멤버 기록)
- [x] 홈 팔로잉 서브탭 (소스 필터: 전체/버블/맞팔)
- [x] 기록→버블 공유 플로우 (ShareToBubbleSheet + ShareListSheet + ShareRuleEditor)
- [x] 버블러 프로필 페이지 (/users/[id])

---

## 팔로우 접근 계층 (BUBBLE.md §2-3)

| 관계 | 조건 | AccessLevel | 보이는 것 |
|------|------|-------------|----------|
| 비팔로우 | 관계 없음 | `'none'` | 레벨, 기록 수 |
| 일방 팔로우 | XP 불필요 | `'follow'` | + 이름, 태그, 취향, 활동 |
| 맞팔로우 | 상호 팔로우 | `'mutual'` | + 풀 액세스 (picks, 기록, 취향 비교) |

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 8.1 | 팔로우/맞팔로우 | `01_follow.md` | S4, S5, S7 완료 |
| 8.2 | 상세 L9 | `02_detail_l9.md` | 8.1 |
| 8.3 | 홈 소셜 탭 | `03_home_social.md` | 8.1 |
| 8.4 | 기록→버블 공유 | `04_share.md` | S7 완료 |
| 8.5 | 버블러 프로필 | `05_bubbler_profile.md` | 8.1 |
| 8.6 | S8 검증 | `06_validation.md` | 전체 |

---

## 주요 구현 파일

| 레이어 | 파일 |
|--------|------|
| Domain | `entities/follow.ts`, `repositories/follow-repository.ts`, `services/follow-access.ts` |
| Infrastructure | `repositories/supabase-follow-repository.ts` |
| Application | `hooks/use-follow.ts`, `use-follow-list.ts`, `use-following-feed.ts`, `use-share-record.ts`, `use-bubbler-profile.ts`, `use-bubble-records.ts`, `use-social-xp.ts`, `use-user-bubbles.ts` |
| Presentation | `components/follow/follow-button.tsx`, `components/bubbler/*`, `components/home/following-*`, `components/share/*`, `components/bubble/share-*`, `components/detail/bubble-*` |
| Container | `containers/bubbler-profile-container.tsx` |
| Route | `app/(main)/users/[id]/page.tsx` |
| DB | `supabase/migrations/006_social.sql` (follows 테이블 포함) |

---

## 완료 기준

```
□ 팔로우 → 일방 접근 (이름+태그+취향+활동)
□ 맞팔로우 → 풀 액세스 (picks, 기록, 취향 비교)
□ 식당/와인 상세 L9: 버블별 필터 + 멤버 기록 카드 + content_visibility 적용
□ 홈 팔로잉 서브탭: 버블/맞팔 소스 피드, 시간순 정렬
□ 기록→버블 공유: ShareToBubbleSheet + XP 부여 + 프라이버시 검증
□ 버블러 프로필: 접근 레벨 3단계 가시성 + 버블 컨텍스트 카드 + 탭 전환
□ 프라이버시 설정 연동 (privacy_profile, content_visibility 반영)
```
