# RAG 시스템 고도화 제안서 (To-Be)

## 개요

현재 RAG 시스템을 분석한 결과, 기본적인 문서 검색 및 LLM 기반 답변 생성 기능이 잘 구현되어 있습니다. 본 제안서는 시스템을 **엔터프라이즈급 지식 플랫폼**으로 발전시키기 위한 단계별 고도화 방안을 제시합니다.

---

## Phase 1: PostgreSQL + pgvector 마이그레이션 (2~3주)

### Phase 1 상세 계획 (진행 전)

| 순서 | 항목 | 설명 | 산출물 | AI 지시 프롬프트 |
| --- | --- | --- | --- | --- |
| 1 | 목표/범위 정합화 | Phase 1의 핵심 목표, 범위 경계, 제외 항목을 합의하고 성공 기준을 정의합니다. | 목표/범위 정의서, 성공 기준 목록 | Phase 1 범위와 성공 기준을 간결한 체크리스트로 정리해줘. 제외 범위도 명시해줘. |
| 2 | 데이터 현황 진단 | ChromaDB 데이터 규모, 문서 유형, 메타데이터 품질, 임베딩 차원 등 현 상태를 정리합니다. | 데이터 인벤토리, 품질 진단 요약 | 현재 데이터 인벤토리를 정리하고 품질 이슈를 분류해줘. |
| 3 | 스키마/인덱스 설계 | pgvector 테이블, 메타데이터 컬럼, FTS 구성, 인덱스 전략을 설계합니다. | 스키마 설계서, 인덱스 설계서 | pgvector 기반 스키마 설계안과 인덱스 전략을 표로 작성해줘. |
| 4 | 마이그레이션 전략 수립 | 전환 방식(일괄/점진), 컷오버 기준, 롤백 조건을 정의합니다. | 전환 전략 문서, 롤백 시나리오 | 마이그레이션 전환/롤백 전략을 단계별로 정리해줘. |
| 5 | 인제스트 파이프라인 기준화 | 청킹 규칙, 임베딩 모델 버전, 메타데이터 규격을 확정합니다. | 인제스트 기준서, 메타데이터 규격 | 인제스트 기준과 메타데이터 스키마를 정리해줘. |
| 6 | 성능/정합성 검증 계획 | 검색 품질, 속도, 데이터 정합성 검증 항목과 측정 방법을 정의합니다. | 검증 체크리스트, 기준 지표 | 마이그레이션 전후 비교를 위한 검증 항목과 지표를 만들어줘. |
| 7 | 운영/보안 고려사항 정리 | 백업/복구, 접근 권한, 로그 보존 정책을 사전 정의합니다. | 운영 정책 초안, 보안 요구사항 | PostgreSQL 운영/보안 정책 초안을 작성해줘. |

### 1.1 PostgreSQL + pgvector 도입

**현황**: ChromaDB 기반 벡터 검색  
**개선**: PostgreSQL + pgvector로 전환 (벡터/키워드/메타데이터 통합)

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 청크 테이블
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(768),
    content_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', content)
    ) STORED,
    source_type VARCHAR(50) NOT NULL
);
```

### 1.2 ChromaDB 데이터 폐기 및 재인제스트

**현황**: ChromaDB에 기존 임베딩 저장  
**개선**: ChromaDB 제거 후 PostgreSQL로 전체 재인제스트

```
1. PostgreSQL 배포 및 스키마 생성
2. 인제스트/검색 코드 PostgreSQL로 전환
3. 기존 ChromaDB 데이터 삭제
4. 전체 데이터 재인제스트
5. ChromaDB 컨테이너 제거
```

**기대효과**: 데이터 정합성 확보, 운영 복잡도 감소, 엔터프라이즈급 백업/복구 지원

---

## Phase 2: 하이브리드 검색 구현 (1~2주)

### Phase 2 상세 계획 (진행 전)

| 순서 | 항목 | 설명 | 산출물 | AI 지시 프롬프트 |
| --- | --- | --- | --- | --- |
| 1 | 목표/성공지표 정의 | 하이브리드 검색의 품질 지표와 목표 개선폭을 정의합니다. | KPI 정의서, 기준 점수 | 하이브리드 검색 목표와 KPI를 정리해줘. |
| 2 | 검색 파이프라인 설계 | 벡터/키워드 검색 흐름, 조합 방식(RRF 등)을 설계합니다. | 검색 파이프라인 설계서 | 하이브리드 검색 파이프라인을 단계별로 설명해줘. |
| 3 | 가중치/랭킹 전략 수립 | 가중치 초기값, 튜닝 방법, 평가 루틴을 정의합니다. | 랭킹 전략 문서, 튜닝 가이드 | 가중치/랭킹 튜닝 전략을 정리해줘. |
| 4 | 쿼리 확장 정책 정의 | 확장 기준, 금지어, 언어 처리 규칙을 정리합니다. | 쿼리 확장 정책 | 쿼리 확장 정책과 예외 케이스를 정리해줘. |
| 5 | 테스트셋/벤치마크 준비 | 대표 질의셋, 정답 문서, 평가 방법을 구성합니다. | 테스트셋 정의서, 평가 기준 | 하이브리드 검색 평가용 테스트셋 구성안을 작성해줘. |
| 6 | 운영 모니터링 계획 | 검색 품질/지연시간 모니터링 지표와 알림 기준을 정의합니다. | 모니터링 지표 목록, 알림 기준 | 운영 모니터링 지표와 알림 기준을 정리해줘. |

### 2.1 하이브리드 검색 (pgvector + tsvector)

**현황**: 벡터 유사도 검색 단독 사용  
**개선**: 벡터 검색 + 전문 검색 결합 (RRF)

```python
# 제안 구현 방향
class HybridRetriever:
    def search(self, query: str):
        vector_results = self.pgvector_search(query_embedding)
        keyword_results = self.fulltext_search(query)
        return self.reciprocal_rank_fusion(vector_results, keyword_results)
```

### 2.2 가중치 튜닝

```python
VECTOR_WEIGHT = 0.7
KEYWORD_WEIGHT = 0.3
RRF_K = 60
```

**기대효과**: 고유명사/코드 변수명 정확도 향상, 검색 누락 감소

### 1.2 쿼리 확장 (Query Expansion)

**현황**: 원본 쿼리만 사용  
**개선**: LLM으로 쿼리 재작성 및 확장

```
원본: "API 에러 해결"
확장: ["API 오류 처리 방법", "FastAPI 예외 핸들링", "HTTP 에러 코드 대응"]
```

### 1.3 청킹 전략 고도화

| 현재 | 개선안 |
|------|--------|
| 고정 크기 (1200자) | 의미 단위 청킹 (Semantic Chunking) |
| 단순 문단 분할 | 계층적 청킹 (문서 → 섹션 → 단락) |
| 단일 청크 크기 | 문서 유형별 최적화된 청크 크기 |

---

## Phase 3: LLM 성능 최적화 (2~3주)

### 3.1 모델 업그레이드

| 용도 | 현재 | 권장 |
|------|------|------|
| 일반 질의 | qwen2.5:3b | qwen2.5:7b 또는 llama3.1:8b |
| 코드 분석 | deepseek-coder:6.7b | deepseek-coder-v2:16b |
| 한국어 특화 | - | EEVE-Korean-10.8B |

### 3.2 프롬프트 엔지니어링

```markdown
# 개선된 시스템 프롬프트 구조
1. 역할 정의 (Role Definition)
2. 컨텍스트 활용 지침 (Context Usage)
3. 응답 형식 지정 (Output Format)
4. 인용 규칙 (Citation Rules)
5. 불확실성 표현 (Uncertainty Expression)
```

### 3.3 스트리밍 응답

**현황**: 전체 응답 완료 후 반환  
**개선**: Server-Sent Events로 토큰 단위 스트리밍

---

## Phase 4: 데이터 파이프라인 강화 (3~4주)

### 4.1 실시간 인덱싱

```
현재: 수동 인제스트 → 배치 처리
개선: 파일 변경 감지 → 자동 증분 인덱싱

    [FileWatcher] → [Change Queue] → [Incremental Indexer] → [PostgreSQL]
```

### 4.2 메타데이터 확장

```python
# 현재 메타데이터
{"path": "...", "modified": "...", "source_type": "..."}

# 확장 메타데이터
{
    "path": "...",
    "title": "문서 제목",
    "author": "작성자",
    "created_at": "2026-01-01",
    "updated_at": "2026-01-08",
    "department": "개발팀",
    "tags": ["API", "인증", "보안"],
    "version": "1.2.0",
    "access_level": "internal"
}
```

### 4.3 문서 전처리 파이프라인

```
원본 문서
    ↓
[OCR 처리] → 스캔 PDF, 이미지 텍스트 추출
    ↓
[테이블 추출] → 표 데이터 구조화
    ↓
[이미지 캡션] → 다이어그램/차트 설명 생성
    ↓
[언어 감지] → 다국어 문서 분류
    ↓
청킹 & 임베딩
```

---

## Phase 5: 사용자 경험 개선 (2~3주)

### 5.1 대화형 UI

- 멀티턴 대화 지원 (대화 이력 관리)
- 후속 질문 자동 제안
- 답변 피드백 (좋아요/싫어요)
- 소스 하이라이팅

### 5.2 고급 검색 인터페이스

```
[검색창]
├── 필터: 소스 유형 | 날짜 범위 | 부서 | 태그
├── 정렬: 관련도 | 최신순 | 인기순
└── 뷰: 카드 | 리스트 | 타임라인
```

### 5.3 시각화 대시보드

- 지식베이스 통계 (문서 수, 청크 수, 카테고리별 분포)
- 질의 분석 (자주 묻는 질문, 트렌드)
- 시스템 성능 모니터링

---

## Phase 6: 엔터프라이즈 기능 (4~6주)

### 6.1 접근 제어 (RBAC)

```yaml
roles:
  admin:
    - read: all
    - write: all
    - manage: all
  editor:
    - read: all
    - write: [work_doc, work_source]
  viewer:
    - read: [topik_vocab, mdn]
```

### 6.2 감사 로깅

```json
{
  "timestamp": "2026-01-08T22:30:00Z",
  "user": "user@company.com",
  "action": "query",
  "query": "API 인증 방법",
  "sources_accessed": ["work_doc/api_guide.pdf"],
  "response_quality": "helpful"
}
```

### 6.3 API 게이트웨이

- Rate Limiting
- API Key 관리
- 사용량 모니터링
- 버전 관리 (v1, v2)

---

## Phase 7: 고급 RAG 기술 (장기)

### 7.1 Agentic RAG

```
사용자 질문
    ↓
[Query Planner] → 질문 분해 및 검색 전략 수립
    ↓
[Multi-Step Retrieval] → 단계별 검색 및 정보 수집
    ↓
[Answer Synthesizer] → 수집된 정보 종합
    ↓
[Self-Reflection] → 답변 품질 자체 검증
    ↓
최종 응답
```

### 7.2 GraphRAG

```
문서 → 엔티티 추출 → 관계 그래프 구축
         ↓
    지식 그래프 (Neo4j)
         ↓
    그래프 검색 + 벡터 검색 결합
```

### 7.3 Corrective RAG (CRAG)

- 검색 결과 품질 자동 평가
- 저품질 결과 시 웹 검색 폴백
- 답변 신뢰도 점수 제공

---

## 기술 스택 업그레이드 로드맵 (Phase 1~6 기준)

| 구성요소 | 현재 | Phase 1-2 | Phase 3-4 | Phase 5-6 |
|---------|------|-----------|-----------|
| 벡터DB | ChromaDB | PostgreSQL + pgvector | PostgreSQL (파티셔닝) | PostgreSQL 클러스터 |
| LLM | Ollama (로컬) | Ollama (qwen2.5:7b) | Ollama + vLLM | 분산 추론 클러스터 |
| 캐싱 | Redis | Redis | Redis Cluster | Redis + Semantic Cache |
| 검색 | 벡터 검색 | 하이브리드 검색 (pgvector + tsvector) | 쿼리 확장 + 재순위화 | GraphRAG + Agentic |
| 모니터링 | 기본 헬스체크 | Prometheus/Grafana | APM 통합 | 전체 관측성 스택 |
| 보안 | 없음 | 기본 인증 | RBAC | SSO + 감사 로깅 |

---

## 우선순위 및 예상 효과 (Phase 1~6)

| 우선순위 | 개선 항목 | 난이도 | 효과 |
|---------|----------|--------|------|
| ⭐⭐⭐⭐⭐ | PostgreSQL + pgvector 마이그레이션 | 중 | 운영 안정성 + 확장성 확보 |
| ⭐⭐⭐⭐⭐ | 하이브리드 검색 | 중 | 검색 정확도 30%↑ |
| ⭐⭐⭐⭐ | LLM 최적화 | 중 | 답변 품질 20~30%↑ |
| ⭐⭐⭐ | 데이터 파이프라인 강화 | 중 | 최신성/정합성 개선 |
| ⭐⭐⭐ | UX 개선 | 중 | 사용자 만족도 향상 |
| ⭐⭐ | 엔터프라이즈 기능 | 중 | 보안/감사 요구 충족 |

---

## 결론

본 고도화 제안은 **6개 Phase**로 구성되며, 각 단계는 독립적으로 진행 가능합니다.

**1단계 권장 사항** (즉시 적용 가능):
1. PostgreSQL + pgvector 마이그레이션
2. 하이브리드 검색 구현 (pgvector + tsvector)
3. LLM 스트리밍 응답 적용

이를 통해 현재 시스템 대비 **검색 정확도 30% 향상**, **응답 체감 속도 50% 개선**을 기대할 수 있습니다.

---

*작성일: 2026-01-28*  
*버전: 2.0*
