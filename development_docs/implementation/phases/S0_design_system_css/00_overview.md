# S0: 디자인 시스템 CSS 기반 구축

> DESIGN_SYSTEM.md에 정의된 모든 공통 UI 클래스를 globals.css에 실제 정의하고,
> 기존 컴포넌트의 인라인 스타일을 공통 클래스로 마이그레이션한다.

---

## 배경

현재 상태:
- DESIGN_SYSTEM.md에 30종+ 공통 UI 컴포넌트/클래스가 정의됨
- globals.css에는 **디자인 토큰(CSS 변수)만** 존재, 컴포넌트 클래스는 **0개**
- 221개 컴포넌트에서 인라인 스타일 1,304건 — 동일 값이 여러 파일에 중복 하드코딩
- 프로토타입 HTML에서는 `.nyam-dropdown`, `.fab-back` 등 클래스를 사용하지만 코드에서 미반영

---

## SSOT 출처

| 문서 | 역할 |
|------|------|
| `systems/DESIGN_SYSTEM.md` | 컴포넌트 클래스 정의 (최상위 SSOT) |
| `prototype/*.html` | 클래스 사용 레퍼런스 |

---

## 태스크 구조

| 태스크 | 내용 | 파일 |
|--------|------|------|
| **T1** | globals.css 공통 클래스 정의 | `01_globals_css.md` |
| **T2** | 페이지별 컴포넌트-클래스 매핑 + 마이그레이션 | `02_page_component_map.md` |

---

## 구현 원칙

1. **DESIGN_SYSTEM.md가 SSOT** — CSS 값은 문서 기준, 임의 변경 금지
2. **토큰 우선** — `border-radius: 12px` 대신 `var(--r-md)`, `box-shadow` 대신 `var(--shadow-lg)` 등
3. **다크모드 동시 정의** — 모든 클래스에 `[data-theme="dark"]` 오버라이드 포함
4. **점진적 마이그레이션** — globals.css 정의 후 페이지 단위로 인라인 → 클래스 교체
5. **기존 동작 보존** — 스타일 변경만, 컴포넌트 구조/로직은 건드리지 않음
