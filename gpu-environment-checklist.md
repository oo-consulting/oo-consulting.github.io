# GTX 1660 Ti용 GPU 환경 점검표

이 문서는 CUDA를 사용하는 PyTorch 기반의 Ollama, LangChain, FastAPI 워크로드를
Windows 환경에서 구성할 때 확인해야 할 항목을 정리한 체크리스트입니다.

## 1. 드라이버 및 CUDA 런타임

- **현재 드라이버**: `nvidia-smi` 결과에서 확인된 `581.57` (CUDA 런타임 13.0).
- **권장 조치**: 581.xx Game Ready/Studio 드라이버는 CUDA 12.x 툴킷과 호환됩니다.
  PyTorch 공식 휠은 CUDA 12.x까지만 제공되므로 개발 도구가 필요하다면
  CUDA **12.1 또는 12.4** 툴킷을 설치하세요.
- 툴킷 설치 후 `nvidia-smi`와 `nvcc --version`을 다시 실행해 런타임과 컴파일러
  버전이 일치하는지 확인합니다.

## 2. cuDNN 정렬

1. 설치한 CUDA 12.x 툴킷 버전에 맞는 cuDNN 패키지를 다운로드합니다.
2. 다음과 같이 cuDNN 헤더와 라이브러리를 CUDA 폴더에 복사합니다.
   ```powershell
   copy cudnn\bin\*.dll "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\bin"
   copy cudnn\include\cudnn*.h "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\include"
   copy cudnn\lib\*.lib "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\lib\x64"
   ```
3. 복사가 끝나면 Windows를 재부팅해 새 DLL이 정상적으로 로드되도록 합니다.

## 3. Python 3.10 이상 가상환경

Ollama/LangChain 전용 가상환경을 생성하거나 업데이트합니다.

```powershell
py -3.10 -m venv %USERPROFILE%\.venvs\ollama-env
%USERPROFILE%\.venvs\ollama-env\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn[standard] langchain langchain-community ollama
```

## 4. PyTorch 설치 및 검증

CUDA 12.x 빌드의 PyTorch를 설치하고 GPU 인식 여부를 확인합니다.

```powershell
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
python - <<'PY'
import torch
print(torch.__version__)
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))
PY
```

`torch.cuda.is_available()`이 `True`를 출력하고 디바이스 이름이
`NVIDIA GeForce GTX 1660 Ti`로 표시되면 LangChain/Ollama 작업을 진행할 준비가
된 것입니다.

## 5. 리소스 모니터링

개발 중에는 다음 명령으로 자원을 수시로 확인하세요.

- `nvidia-smi --loop=5` : GPU 사용량과 메모리를 주기적으로 확인
- `Get-ComputerInfo | Select-Object CsTotalPhysicalMemory` : 물리 메모리가
  16 GB 수준으로 유지되는지 확인
- `Get-PSDrive` : 모델 캐시가 저장된 드라이브의 여유 공간 확인

`HF_HOME`, `TRANSFORMERS_CACHE`, `OLLAMA_MODELS` 등의 환경 변수를 활용해
대용량 모델 다운로드 위치를 여유 공간이 넉넉한 드라이브로 변경하는 것을
권장합니다.
