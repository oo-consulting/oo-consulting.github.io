# RAG 시스템 구조 분석

## 1. 개요 (Overview)
현재 RAG (검색 증강 생성) 시스템은 백엔드 API로 **FastAPI**, 핵심 오케스트레이션 프레임워크로 **LlamaIndex**를 사용하여 구축되었습니다. 벡터 저장소로는 **ChromaDB**를, 로컬 LLM 추론을 위해 **Ollama**를 사용합니다. 이 시스템은 다양한 문서 형식(PDF, DOCX, HWPX, 텍스트, 마크다운)을 처리할 수 있으며, 코드 및 특정 데이터셋(예: TOPIK 어휘, MDN, 한국어 사전)에 대한 전문적인 처리 기능을 포함하고 있습니다.

## 2. 주요 구성 요소 (Key Components)

### A. 데이터 수집 계층 (Ingestion Layer) (`app/ingest.py`, `app/chunking.py`)
*   **소스 (Sources):** 다음을 포함한 여러 데이터 소스를 지원합니다:
    *   `work_source`: 업무용 소스 코드 파일 (`data/raw/WORK_Source/`).
    *   `work_doc`: 일반 업무 문서 (`data/raw/WORK_DOC/`).
    *   `topik_vocab`: TOPIK 기초 어휘 6,000개 CSV 데이터셋.
    *   `mdn`: MDN Web Docs GitHub 압축본.
    *   `korean_dict`: DBpedia + 위키낱말사전 결합 한국어 사전.
*   **전처리 (Preprocessing):**
    *   **텍스트 추출:**
        *   PDF: `pypdf` 라이브러리 사용
        *   DOCX: `python-docx` 라이브러리 사용
        *   HWPX: 커스텀 XML 파싱 (ZIP 아카이브 내 section XML 및 PrvText.txt 추출)
        *   텍스트/마크다운: 직접 읽기
    *   **코드 파싱:** `tree-sitter` 및 `tree_sitter_languages`를 사용하여 코드 파일을 파싱하고 함수/클래스를 별도의 블록으로 추출.
    *   **청킹 (Chunking):**
        *   **코드:** 논리적 블록(함수, 클래스) 단위로 분할.
        *   **텍스트:** 기본 1200자 크기 청킹, 문단/문장 경계 고려.
*   **임베딩 (Embedding):**
    *   **SentenceTransformer** (`sentence-transformers`) 사용.
    *   기본 모델: `intfloat/multilingual-e5-base`
    *   로컬 캐시 모델을 사용하는 오프라인 모드 지원.
    *   `EMBED_MODEL_ALLOW_DOWNLOADS` 환경 변수로 온라인/오프라인 모드 전환.

### B. 저장 계층 (Storage Layer)
*   **벡터 저장소:** **ChromaDB** (별도 Docker 서비스로 실행, 포트 8000).
*   **컬렉션:** 기본 컬렉션 이름 `rag` (환경변수 `CHROMA_COLLECTION`으로 설정).
*   **동기화:** `ingest.py`가 증분 업데이트를 처리합니다. 파일 수정 시간과 콘텐츠 해시를 확인하여 변경된 문서만 업데이트하고 삭제된 문서는 제거합니다.
*   **작업 큐:** **Redis**를 사용하여 비동기 인제스트 작업 상태 관리.

### C. 검색 및 생성 계층 (Retrieval & Generation Layer) (`app/rag_orchestrator.py`)
*   **오케스트레이터:** `RAGOrchestrator` 클래스가 파이프라인을 관리합니다.
*   **검색 (Retrieval):**
    *   LlamaIndex의 `VectorStoreIndex` 사용.
    *   **메타데이터 필터** 지원 (`source_type` 필터링 가능).
    *   **재순위화 (Reranking):** `SentenceTransformerRerank` (Cross-Encoder) 사용.
    *   기본 재순위 모델: `cross-encoder/ms-marco-MiniLM-L-6-v2`
    *   설정 가능한 `TOP_K` (기본 5) 및 `RERANKER_TOP_K` (기본 20).
*   **생성 (Generation - LLM):**
    *   **Ollama**를 사용하여 로컬 LLM과 인터페이스.
    *   기본 모델: `qwen2.5:3b-instruct-q4_K_M`
    *   컨텍스트 크기: `OLLAMA_NUM_CTX` (기본 2048, Docker에서 4096)
    *   요청 타임아웃: `OLLAMA_REQUEST_TIMEOUT` (기본 180초)
    *   **프롬프팅:** 커스텀 시스템 프롬프트 지원, 한국어 친절 답변 유도.
*   **응답 처리:**
    *   인용 정보 추출 (소스 파일, 라인 번호, 관련성 점수).
    *   `MIN_RELEVANCE_SCORE` (기본 0.75) 미만일 경우 일반 응답 생성.

## 3. 데이터 흐름 (Data Flow)

1.  **수집 (Ingestion):**
    원본 파일 → 텍스트 추출 (PDF/DOCX/HWPX/텍스트) → 청킹 (텍스트/코드) → 임베딩 (SentenceTransformer) → ChromaDB

2.  **쿼리 (Query):**
    사용자 질문 → 임베딩 → 벡터 검색 (ChromaDB) → 재순위화 (RERANKER_TOP_K → TOP_K) → 상위 K개 노드

3.  **생성 (Generation):**
    상위 K개 노드 + 시스템 프롬프트 + 사용자 질문 → LLM (Ollama) → 최종 답변 + 인용

## 4. 주요 라이브러리 및 의존성

| 카테고리 | 라이브러리 |
| --- | --- |
| 프레임워크 | `fastapi`, `uvicorn`, `llama-index-core` |
| 벡터 DB | `chromadb`, `llama-index-vector-stores-chroma` |
| LLM | `ollama`, `llama-index-llms-ollama` |
| 임베딩 | `sentence-transformers`, `transformers`, `llama-index-embeddings-huggingface` |
| 문서 파서 | `pypdf`, `python-docx`, `openpyxl`, `mwparserfromhell` |
| 코드 파서 | `tree_sitter`, `tree_sitter_languages` |
| 캐시/큐 | `redis`, `httpx` |

## 5. 지원 파일 형식

| 확장자 | 처리 방식 |
| --- | --- |
| `.pdf` | pypdf로 텍스트 추출 |
| `.docx` | python-docx로 텍스트 추출 |
| `.hwpx` | ZIP 내 XML 파싱 또는 PrvText.txt 추출 |
| `.txt`, `.md` | 직접 읽기 |
| `.py`, `.js`, `.ts`, `.java`, `.go`, `.rs` 등 | tree-sitter로 구조적 파싱 |
