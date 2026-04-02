# WORKLOG.md — Nyam 최근 작업 로그

> 롤링 최대 10개. 오래된 엔트리는 하단부터 삭제.
> 각 엔트리: 영역 | 맥락 | 미완료 | 다음
> 세션 종료 시 반드시 갱신. 새 세션 시작 시 이 파일을 읽고 맥락 파악.

---

### 2026-04-02 #5 — 와인 한줄평 입력칸 분리
- **영역**: presentation/components/record (와인 기록 플로우)
- **맥락**: AI tasting_notes와 사용자 comment가 혼용되던 문제 수정. 입력 필드 분리.
- **미완료**: 없음
- **다음**: 아로마 휠/와인 기록 관련 후속 UI 개선 있으면 진행

### 2026-04-02 #4 — 아로마 휠 텍스트 균일화
- **영역**: presentation/components/record (아로마 휠)
- **맥락**: 모든 링에 '/' 줄바꿈 적용 + 글자 수 기반 동적 폰트 사이즈. 시인성 개선 연속작업.
- **미완료**: 없음
- **다음**: 없음 (아로마 휠 시리즈 완료)

### 2026-04-02 #3 — WSET 기준 아로마 휠 재구조화 + BLIC 품질 평가
- **영역**: domain/entities/aroma, shared/constants/aroma-sectors, migration 041
- **맥락**: WSET 표준 아로마 휠 3링 구조 + 품질 평가(BLIC) 시스템 도입 + AI 자동 채움 파이프라인.
- **미완료**: 없음
- **다음**: 아로마 휠 텍스트 시인성 → 완료됨

### 2026-04-02 #2 — 사분면 ref dot 롱프레스 + 평균/최근 토글
- **영역**: presentation/components/charts/quadrant, application/hooks
- **맥락**: 사분면 차트에서 ref dot 롱프레스 시 해당 기록으로 네비게이션. 평균/최근 토글 추가.
- **미완료**: 없음
- **다음**: 없음

### 2026-04-02 #1 — LLM 중앙 관리 + 와인 기록 파이프라인 리팩토링
- **영역**: shared/constants/llm-config, infrastructure/api/llm, app/api/wines
- **맥락**: LLM 호출을 중앙 설정 파일로 통합. 와인 기록 시 가격 분석 기능 추가.
- **미완료**: 없음
- **다음**: WSET 아로마 휠 작업 → 완료됨
