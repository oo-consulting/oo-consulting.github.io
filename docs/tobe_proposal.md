# RAG 시스템 고도화 제안서 (To-Be)

## 개요

현재 RAG 시스템을 분석한 결과, 기본적인 문서 검색 및 LLM 기반 답변 생성 기능이 잘 구현되어 있습니다. 본 제안서는 시스템을 **엔터프라이즈급 지식 플랫폼**으로 발전시키기 위한 단계별 고도화 방안을 제시합니다.

---

## Phase 1: 검색 품질 강화 (1~2개월)

### 1.1 하이브리드 검색 도입

**현황**: 벡터 유사도 검색만 사용  
**개선**: 벡터 검색 + 키워드 검색(BM25) 결합

```python
# 제안 구현 방향
class HybridRetriever:
    def search(self, query: str):
        vector_results = self.vector_search(query)  # 의미 유사도
        keyword_results = self.bm25_search(query)   # 키워드 매칭
        return self.reciprocal_rank_fusion(vector_results, keyword_results)
```

**기대효과**: 고유명사, 코드 변수명 등 정확한 매칭이 필요한 쿼리 정확도 향상

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

## Phase 2: LLM 성능 최적화 (2~3개월)

### 2.1 모델 업그레이드

| 용도 | 현재 | 권장 |
|------|------|------|
| 일반 질의 | qwen2.5:3b | qwen2.5:7b 또는 llama3.1:8b |
| 코드 분석 | deepseek-coder:6.7b | deepseek-coder-v2:16b |
| 한국어 특화 | - | EEVE-Korean-10.8B |

### 2.2 프롬프트 엔지니어링

```markdown
# 개선된 시스템 프롬프트 구조
1. 역할 정의 (Role Definition)
2. 컨텍스트 활용 지침 (Context Usage)
3. 응답 형식 지정 (Output Format)
4. 인용 규칙 (Citation Rules)
5. 불확실성 표현 (Uncertainty Expression)
```

### 2.3 스트리밍 응답

**현황**: 전체 응답 완료 후 반환  
**개선**: Server-Sent Events로 토큰 단위 스트리밍

---

## Phase 3: 데이터 파이프라인 강화 (2~3개월)

### 3.1 실시간 인덱싱

```
현재: 수동 인제스트 → 배치 처리
개선: 파일 변경 감지 → 자동 증분 인덱싱

[FileWatcher] → [Change Queue] → [Incremental Indexer] → [ChromaDB]
```

### 3.2 메타데이터 확장

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

### 3.3 문서 전처리 파이프라인

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

## Phase 4: 사용자 경험 개선 (1~2개월)

### 4.1 대화형 UI

- 멀티턴 대화 지원 (대화 이력 관리)
- 후속 질문 자동 제안
- 답변 피드백 (좋아요/싫어요)
- 소스 하이라이팅

### 4.2 고급 검색 인터페이스

```
[검색창]
├── 필터: 소스 유형 | 날짜 범위 | 부서 | 태그
├── 정렬: 관련도 | 최신순 | 인기순
└── 뷰: 카드 | 리스트 | 타임라인
```

### 4.3 시각화 대시보드

- 지식베이스 통계 (문서 수, 청크 수, 카테고리별 분포)
- 질의 분석 (자주 묻는 질문, 트렌드)
- 시스템 성능 모니터링

---

## Phase 5: 엔터프라이즈 기능 (3~4개월)

### 5.1 접근 제어 (RBAC)

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

### 5.2 감사 로깅

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

### 5.3 API 게이트웨이

- Rate Limiting
- API Key 관리
- 사용량 모니터링
- 버전 관리 (v1, v2)

---

## Phase 6: 고급 RAG 기술 (4~6개월)

### 6.1 Agentic RAG

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

### 6.2 GraphRAG

```
문서 → 엔티티 추출 → 관계 그래프 구축
         ↓
    지식 그래프 (Neo4j)
         ↓
    그래프 검색 + 벡터 검색 결합
```

### 6.3 Corrective RAG (CRAG)

- 검색 결과 품질 자동 평가
- 저품질 결과 시 웹 검색 폴백
- 답변 신뢰도 점수 제공

---

## 기술 스택 업그레이드 로드맵

| 구성요소 | 현재 | Phase 1-2 | Phase 3-6 |
|---------|------|-----------|-----------|
| 벡터DB | ChromaDB | ChromaDB + BM25 | Milvus/Qdrant |
| LLM | Ollama (로컬) | Ollama + vLLM | 분산 추론 클러스터 |
| 캐싱 | Redis | Redis Cluster | Redis + Semantic Cache |
| 검색 | 벡터 검색 | 하이브리드 검색 | GraphRAG |
| 모니터링 | 기본 헬스체크 | Prometheus/Grafana | 전체 관측성 스택 |

---

## 우선순위 및 예상 효과

| 우선순위 | 개선 항목 | 난이도 | 효과 |
|---------|----------|--------|------|
| ⭐⭐⭐ | 하이브리드 검색 | 중 | 검색 정확도 30%↑ |
| ⭐⭐⭐ | 청킹 전략 개선 | 중 | 답변 품질 25%↑ |
| ⭐⭐⭐ | 스트리밍 응답 | 하 | 응답 체감 속도 50%↑ |
| ⭐⭐ | 모델 업그레이드 | 하 | 답변 품질 20%↑ |
| ⭐⭐ | 멀티턴 대화 | 중 | 사용자 만족도 향상 |
| ⭐ | GraphRAG | 상 | 복잡한 질의 처리 |
| ⭐ | 접근 제어 | 중 | 엔터프라이즈 요구 충족 |

---

## 결론

본 고도화 제안은 **6개 Phase**로 구성되며, 각 단계는 독립적으로 진행 가능합니다.

**1단계 권장 사항** (즉시 적용 가능):
1. 하이브리드 검색 (BM25 추가)
2. 스트리밍 응답 구현
3. 청킹 전략 최적화

이를 통해 현재 시스템 대비 **검색 정확도 30% 향상**, **응답 체감 속도 50% 개선**을 기대할 수 있습니다.

---

*작성일: 2026-01-08*  
*버전: 1.0*
