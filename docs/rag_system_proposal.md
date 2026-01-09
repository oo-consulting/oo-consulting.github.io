# RAG 시스템 제안서

## 1. 프로젝트 개요

- FastAPI 기반 RAG 백엔드와 Tomcat UI를 하나의 Docker Compose 스택으로 묶은 프로젝트.
- 문서 임베딩 + LLM 추론을 결합해 도메인 지식 기반 답변을 제공.
- **목표**: 사내 문서/외부 지식을 통합하고 관리자 UI에서 인제스트, 상태 모니터링, 질의를 간편화.

## 2. 기대 효과

- UI/CLI 양방향 인제스트로 지식 최신화 주기를 단축.
- Redis 기반 작업 상태 관리와 헬스체크로 운영 안정성 확보.
- 온라인/오프라인 임베딩 모드, 로컬 LLM(Ollama)로 네트워크 제한 환경 대응.
- 다양한 문서 형식(PDF, DOCX, HWPX, 텍스트, 코드) 지원으로 통합 지식베이스 구축.

## 3. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     사용자 경험 계층                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tomcat UI (rag-ui:8080)                                │   │
│  │  - index.html, app.js, styles.css                       │   │
│  │  - REST API 호출을 통한 질의/인제스트/설정 관리            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   애플리케이션 백엔드 계층                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FastAPI (rag-api:8000)                                 │   │
│  │  - api.py: REST 엔드포인트                              │   │
│  │  - rag_orchestrator.py: LlamaIndex 기반 질의 처리       │   │
│  │  - ingest.py: 문서 수집 파이프라인                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   인프라 및 모델 계층                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ ChromaDB     │ │ Redis        │ │ Ollama               │    │
│  │ (8001)       │ │ (6379)       │ │ (11434)              │    │
│  │ 벡터 저장소   │ │ 작업 상태     │ │ LLM 추론             │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

- Docker Compose: `rag-api`, `rag-ui`, `rag-chroma`, `rag-redis`, `rag-ollama` 컨테이너.
- 볼륨: `data/chroma`, `data/raw`, `data/models`, `data/ollama`로 영속성 확보.

## 4. 주요 기능 요약

### 질의 기능
- Chroma 벡터 검색 후 재순위화(Reranking)를 거쳐 Ollama 추론.
- 출처 인용 정보와 함께 응답 반환.
- 소스 필터링으로 특정 지식 영역만 검색 가능.
- 시스템 프롬프트 동적 변경 지원.

### 인제스트 기능
- **TOPIK 어휘**: 기초 어휘 6,000개 CSV 처리.
- **MDN Web Docs**: GitHub 압축본 다운로드 및 필터링.
- **한국어 사전**: DBpedia + 위키낱말사전 결합.
- **업무 소스/문서**: 로컬 폴더 스캔 및 자동 청킹.

### 문서 관리
- UI에서 수동 문서 입력 가능.
- PDF, DOCX, HWPX 등 다양한 형식 지원.
- Reload Embeddings로 즉시 반영.

## 5. 프론트엔드/운영 화면

- Tomcat 10에서 정적 자산(`frontend/`) 서빙.
- `app.js`가 FastAPI REST API 호출.
- **상태 대시보드**: API, Chroma, Redis, Ollama, GPU 상태 실시간 확인.
- **설정 패널**: 임베딩 모드 전환, 시스템 프롬프트 수정.
- **인제스트 콘솔**: 소스별 작업 시작, 진행 로그 실시간 표시.
- **Chroma 벡터 수**: SSE 스트림을 통한 실시간 업데이트.

## 6. 백엔드 API

### 주요 엔드포인트

| 카테고리 | 엔드포인트 | 설명 |
| --- | --- | --- |
| 질의 | `POST /rag/query` | 질문 전송, 응답/출처 수신 |
| 상태 | `GET /rag/status` | 시스템 전체 헬스 조회 |
| 인제스트 | `POST /rag/ingest` | 작업 시작 |
| 인제스트 | `GET /rag/ingest` | 최근 작업 상태 |
| 문서 | `GET /rag/documents` | 문서 목록 |
| 문서 | `POST /rag/documents` | 문서 업로드 |
| 설정 | `GET/POST /rag/embed-config` | 임베딩 모드 전환 |
| 설정 | `GET/POST /rag/system-prompt` | 시스템 프롬프트 관리 |
| 모델 | `GET /rag/ollama-models` | Ollama 모델 목록 |

### CLI 동일 엔트리
```bash
python -m app.ingest --source topik_vocab --source korean_dict
```

## 7. 데이터 파이프라인

```
원본 파일 (PDF/DOCX/HWPX/텍스트/코드)
         │
         ▼
    텍스트 추출
         │
         ▼
    청킹 (Chunking)
    - 코드: tree-sitter로 함수/클래스 단위 분할
    - 텍스트: 1200자 기준, 문단/문장 경계 고려
         │
         ▼
    임베딩 (SentenceTransformer)
    - intfloat/multilingual-e5-base
         │
         ▼
    ChromaDB 업서트
    - 증분 업데이트 (변경 감지)
    - 삭제된 파일 자동 제거
```

## 8. 배포 및 운용

### 최초 실행
```bash
docker compose build
docker compose up
```

### 백그라운드 실행
```bash
docker compose up -d
```

### 상태 확인
```bash
curl http://localhost:8000/health
curl http://localhost:8000/rag/status
```

### GPU 환경
- CUDA 12.x, NVIDIA Container Toolkit 필요.
- `docker-compose.yml`의 `deploy.resources` 섹션으로 GPU 전달.
- GPU 미사용 시 해당 섹션 제거.

## 9. 구성/확장 포인트

### 환경 변수 (주요 항목)

| 변수 | 설명 |
| --- | --- |
| `EMBED_MODEL_ALLOW_DOWNLOADS` | 온라인 모델 다운로드 허용 |
| `EMBED_MODEL_LOCAL_PATH` | 오프라인 모델 경로 |
| `INGEST_ALLOW_DOWNLOADS` | 원격 덤프 다운로드 허용 |
| `OLLAMA_MODEL` | 사용할 LLM 모델 |
| `TOP_K` | 반환할 검색 결과 수 |
| `API_ALLOWED_ORIGINS` | CORS 허용 오리진 |
| `RAG_API_BASE_URL` | UI에서 API 호출 URL |

### 새로운 소스 추가

1. `app/` 아래 `{source}_ingest.py` 모듈 작성.
2. `ensure_{source}_corpus()` 함수 구현.
3. `app/ingest.py`에 소스 선택지 추가.
4. `frontend/app.js` 소스 목록에 반영.

### 프록시/다중 도메인
- `API_ALLOWED_ORIGINS`, `RAG_API_BASE_URL`로 설정.

## 10. 도입 제안

### 빠른 PoC
1. `.env` 파일 설정.
2. `docker compose up` 실행.
3. `http://localhost:8080/` 접속하여 UI 확인.

### 사내 문서 연동
- `data/raw/WORK_Source/`: 소스 코드 파일.
- `data/raw/WORK_DOC/`: 업무 문서 (PDF, DOCX, HWPX 지원).
- 보안 구간 내 오프라인 운영 가능.

### 운영 프로세스
1. **정기 인제스트**: 스케줄러 또는 CLI로 주기적 갱신.
2. **헬스 모니터링**: UI 대시보드에서 실시간 상태 확인.
3. **사용자 피드백**: 질의 결과 품질 개선을 위한 프롬프트 튜닝.
4. **모델 업그레이드**: Ollama 모델 교체 및 임베딩 모델 업데이트.

---

*이 제안서는 현재 소스 코드 기준 (2026-01)으로 작성되었습니다.*
