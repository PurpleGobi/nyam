# S7: Bubble System

> P2 코어. 버블 시스템 전체를 한 스프린트에 구현.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `pages/08_BUBBLE.md` | 버블 목록, 상세, 생성, 피드, 랭킹, 멤버, 댓글, 리액션, 데이터 접근 계층 |
| `systems/AUTH.md` | §2 버블 역할(owner/admin/member/follower), §2-3 가입 정책 5종 |
| `systems/XP_SYSTEM.md` | 활성 XP 기반 가입 조건, 소셜 XP 적립 |
| `prototype/04_bubbles.html` | 버블 목록 목업 |
| `prototype/04_bubbles_detail.html` | 버블 상세 목업 (피드/랭킹/멤버/설정) |

---

## 산출물

- [x] 버블 domain 엔티티 + infrastructure (BubbleShareRule, bubble-share-sync 포함)
- [x] 버블 생성/가입/초대 플로우
- [x] 가입 정책 5종 (invite_only/closed/manual_approve/auto_approve/open)
- [x] 버블 상세 (피드/랭킹/멤버 탭)
- [x] 피드 뷰모드 (피드/카드/리스트)
- [x] 댓글 + 리액션 (want/check/fire)
- [x] 버블 역할/권한 시스템 (owner/admin/member/follower)
- [x] 버블 랭킹 스냅샷 크론 (주간 — bubble_ranking_snapshots)
- [x] 자동 공유 규칙 시스템 (share_rule, auto_synced)
- [x] 버블 아이콘 업로드 (uploadBubbleIcon)

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 7.1 | 버블 domain + infrastructure | `01_bubble_domain.md` | S1, S6 완료 |
| 7.2 | 버블 생성/가입/초대 | `02_bubble_create.md` | 7.1 |
| 7.3 | 버블 상세 (피드/랭킹/멤버) | `03_bubble_detail.md` | 7.1 |
| 7.4 | 댓글 + 리액션 | `04_comments_reactions.md` | 7.3 |
| 7.5 | 역할/권한 | `05_roles.md` | 7.1 |
| 7.6 | 랭킹 스냅샷 크론 (주간) | `06_ranking_cron.md` | 7.3 |
| 7.7 | S7 검증 | `07_validation.md` | 전체 |

---

## 데이터 접근 계층 (BUBBLE.md §2)

| 단계 | 역할 | 보이는 것 |
|------|------|----------|
| 탐색 | 비팔로워 | 이름, 설명, 멤버 수, 통계 요약 |
| 팔로우 | follower | + 식당/와인 이름, 평균 점수, 지역 |
| 멤버 | member | + 개별 리뷰, 사진, 팁, 누가 몇 점 |
| 운영 | admin/owner | 전체 + 멤버 관리, 설정 변경 |

---

## 완료 기준

```
☑ 버블 생성 (이름, 아이콘, 설명, 가입 조건, 공개 범위)
☑ 가입 정책 5종 동작 (invite_only/closed/manual_approve/auto_approve/open)
☑ 초대 링크 생성 → 가입 플로우
☑ 경험치 기반 가입 조건 검증 (총 XP / 활성 XP 조합)
☑ 피드 탭: 카드/컴팩트 뷰모드, 필터, 소팅
☑ 랭킹 탭: 주간 Top N + bubble_ranking_snapshots 크론으로 주간 스냅샷 생성 + 등락 ▲▼ 표시
☑ 멤버 탭: 목록, 역할, 초대
☑ 리액션 (want/check/fire) + 댓글 CRUD
☑ 역할별 권한 동작 (owner/admin/member/follower — AUTH.md §2 기준)
☑ content_visibility에 따른 비멤버 데이터 제한 (rating_only/rating_and_comment)
☑ 자동 공유 규칙 시스템 (share_rule JSONB, auto_synced 플래그, bubble-share-sync 서비스)
```
