# RAG 시스템 문서

이 디렉터리에는 RAG(Retrieval-Augmented Generation) 시스템에 대한 기술 문서가 포함되어 있습니다.

## 📚 문서 목록

| 문서 | 설명 | 대상 독자 |
| --- | --- | --- |
| [rag_system_proposal.md](./rag_system_proposal.md) | 시스템 제안서 및 개요 | 의사결정자, 프로젝트 관리자 |
| [rag_architecture.md](./rag_architecture.md) | 상세 아키텍처 및 API 레퍼런스 | 개발자, 시스템 운영자 |
| [rag_analysis.md](./rag_analysis.md) | 기술 구조 분석 | 개발자, 아키텍트 |
| [tobe_proposal.md](./tobe_proposal.md) | **시스템 고도화 제안서** | 기술 리더, 아키텍트 |

## 🚀 빠른 시작

### 시스템 실행
```bash
docker compose build
docker compose up -d
```

### 접속 URL
- **UI 대시보드**: http://localhost:8080/
- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

## 📋 주요 기능

- ✅ **질의응답**: 문서 기반 한국어 질의응답
- ✅ **다중 소스**: TOPIK 어휘, MDN, 한국어 사전, 업무 문서 지원
- ✅ **다양한 형식**: PDF, DOCX, HWPX, 텍스트, 코드 파일 처리
- ✅ **오프라인 지원**: 로컬 LLM(Ollama) 및 오프라인 임베딩 모드
- ✅ **실시간 모니터링**: 시스템 상태 및 인제스트 진행률 실시간 확인

## 🔧 기술 스택

| 계층 | 기술 |
| --- | --- |
| 프론트엔드 | HTML/CSS/JavaScript (Tomcat 10) |
| 백엔드 API | FastAPI + LlamaIndex |
| 벡터 저장소 | ChromaDB |
| LLM | Ollama (qwen2.5, llama3.1, deepseek-coder) |
| 임베딩 | SentenceTransformer (multilingual-e5-base) |
| 캐시/큐 | Redis |

## 📖 상세 문서

각 문서의 상세 내용:

### [제안서](./rag_system_proposal.md)
- 프로젝트 개요 및 기대 효과
- 전체 아키텍처 다이어그램
- 주요 기능 요약
- 배포 및 운영 가이드
- 도입 제안

### [아키텍처](./rag_architecture.md)
- 서비스 스택 상세 설명
- 볼륨 및 데이터 보존
- 모듈별 기능 설명
- API 엔드포인트 전체 목록
- 데이터 파이프라인 플로우
- 환경 변수 레퍼런스

### [기술 분석](./rag_analysis.md)
- 데이터 수집 계층 상세
- 저장 계층 구조
- 검색 및 생성 메커니즘
- 라이브러리 의존성
- 지원 파일 형식

---

*최종 업데이트: 2026-01*
