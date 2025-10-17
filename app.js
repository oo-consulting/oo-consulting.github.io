/* 데모 UI에서 OCR 업로드 흐름과 진행 표시, 결과 렌더링을 총괄 */
// 여러 이벤트 핸들러에서 재사용하도록 자주 쓰는 DOM 요소를 캐싱
const uploadForm = document.getElementById("uploadForm");
const responseBox = document.getElementById("responseBox");
const rateLabel = document.getElementById("rateLabel");
const engineSelect = document.getElementById("engineSelect");
const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
const progressIndicator = document.getElementById("progressIndicator");
const progressText = progressIndicator?.querySelector('.progress-text');
const progressPercent = progressIndicator?.querySelector('.progress-percent');
const engineMetric = document.getElementById("engineMetric");
const engineLabel = document.getElementById("engineLabel");
const ensembleSummary = document.getElementById("ensembleSummary");
const ensembleList = document.getElementById("ensembleList");
const fileInput = document.getElementById("fileInput");

// 진행 상태 논리를 인디케이터 클래스 이름으로 매핑
const PROGRESS_STATE_CLASSES = {
    active: 'is-active',
    complete: 'is-complete',
    error: 'is-error',
};

// 백엔드 식별자를 보기 쉬운 엔진 라벨로 매핑
const ENGINE_DISPLAY_NAMES = {
    easyocr: 'EasyOCR',
    easy: 'EasyOCR',
    tesseract: 'Tesseract',
    tess: 'Tesseract',
};

// API가 반환한 변형 메타데이터를 사람이 읽기 쉬운 라벨로 변환
const VARIANT_LABELS = {
    enhanced: '고급 전처리',
    accurate_enhanced: '고급 전처리 (정밀)',
    fast_preprocessed: '빠른 전처리',
    fast_render: '빠른 렌더링',
    accurate_render: '고해상도 렌더링',
    original: '원본 이미지',
    default: '기본',
};
// 가짜 진행률 루프 상한을 설정해 완료 전환이 자연스럽도록 제한
const PROGRESS_ACTIVE_LIMIT = 94;

let progressTimer = null;
let currentProgress = 0;

// 인식률 입력을 서식화된 백분율 문자열로 정규화
const formatRate = (value) => {
    let numeric;
    if (typeof value === "number") {
        numeric = value;
    } else if (typeof value === "string") {
        numeric = Number(value);
    } else {
        numeric = NaN;
    }

    if (!Number.isFinite(numeric)) {
        return "0";
    }

    const formatted = Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(2);
    return formatted;
};

// 엔진 ID를 지표 카드에 표시할 수 있는 라벨로 변환
const getEngineDisplayName = (engineId) => {
    if (!engineId) {
        return '알 수 없음';
    }
    const normalized = String(engineId).toLowerCase();
    return ENGINE_DISPLAY_NAMES[normalized] || engineId;
};

// API 변형 이름을 현지화된 텍스트로 치환
const getVariantDisplayName = (variantName) => {
    if (!variantName) {
        return VARIANT_LABELS.default;
    }
    return VARIANT_LABELS[variantName] || variantName;
};

// 새로운 요청 전 엔진 관련 UI 요소를 숨김
const resetEngineDisplay = () => {
    if (engineMetric) {
        engineMetric.hidden = true;
    }
    if (engineLabel) {
        engineLabel.textContent = '';
    }
    if (ensembleList) {
        ensembleList.innerHTML = '';
    }
    if (ensembleSummary) {
        ensembleSummary.hidden = true;
    }
};

// 제출 전에 지표, 진행률, 응답 표시를 초기화
const resetResponseState = () => {
    stopProgressLoop();
    currentProgress = 0;
    resetEngineDisplay();
    if (progressIndicator) {
        const classNames = Object.values(PROGRESS_STATE_CLASSES);
        classNames.forEach((name) => progressIndicator.classList.remove(name));
        progressIndicator.hidden = true;
        progressIndicator.setAttribute('aria-hidden', 'true');
        progressIndicator.style.setProperty('--progress-percent', '0');
    }
    if (progressPercent) {
        progressPercent.textContent = '0%';
    }
    if (progressText) {
        progressText.textContent = '요청 처리 중...';
    }
    setRateLabel(0);
    if (responseBox) {
        responseBox.textContent = '대기 중';
    }
};

// 메타데이터가 도착하면 엔진/변형 배지를 갱신
const setEngineMetric = (engineId, variant) => {
    if (!engineMetric || !engineLabel) return;
    if (!engineId) {
        engineMetric.hidden = true;
        engineLabel.textContent = '';
        return;
    }
    const displayName = getEngineDisplayName(engineId);
    if (variant) {
        engineLabel.textContent = `${displayName} · ${getVariantDisplayName(variant)}`;
    } else {
        engineLabel.textContent = displayName;
    }
    engineMetric.hidden = false;
};

// 앙상블 구성원의 점수에서 백분율 문자열을 계산
const extractScorePercent = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return 0;
    }
    const direct = entry.score_percent ?? entry.scorePercent;
    if (typeof direct === 'number' || typeof direct === 'string') {
        const numeric = Number(direct);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    if (typeof entry.score === 'number' || typeof entry.score === 'string') {
        const numeric = Number(entry.score) * 100;
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    return 0;
};

// 구조화된 앙상블 메타데이터를 렌더링하고 현재 모드를 강조
const renderEnsembleSummary = (entries, mode) => {
    if (!ensembleSummary || !ensembleList) return;

    ensembleList.innerHTML = '';
    ensembleSummary.hidden = true;

    if (mode !== 'accurate' || !Array.isArray(entries) || entries.length === 0) {
        return;
    }

    const normalizedMap = new Map();
    entries.forEach((item) => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const engine = item.engine;
        if (!engine) {
            return;
        }
        const scorePercent = extractScorePercent(item);
        const entryData = {
            engine,
            scorePercent,
            variant: item.variant,
            warning: item.warning,
            error: item.error,
            variants: Array.isArray(item.variants) ? item.variants : null,
        };
        const existing = normalizedMap.get(engine);
        if (!existing || scorePercent > existing.scorePercent) {
            normalizedMap.set(engine, entryData);
        }
    });

    const normalized = Array.from(normalizedMap.values());
    if (normalized.length === 0) {
        return;
    }

    normalized.sort((a, b) => b.scorePercent - a.scorePercent);

    normalized.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'ensemble-card';
        if (!item.error && index === 0) {
            card.dataset.best = 'true';
        }

        const engineName = document.createElement('span');
        engineName.className = 'ensemble-engine';
        engineName.textContent = getEngineDisplayName(item.engine);
        card.appendChild(engineName);

        const score = document.createElement('span');
        score.className = 'ensemble-score';
        score.textContent = item.error ? '오류' : `${formatRate(item.scorePercent)}%`;
        card.appendChild(score);

        const meta = document.createElement('div');
        meta.className = 'ensemble-meta';

        const variantBadge = document.createElement('span');
        variantBadge.className = 'ensemble-badge';
        variantBadge.textContent = getVariantDisplayName(item.variant);
        meta.appendChild(variantBadge);

        if (item.error) {
            const errorBadge = document.createElement('span');
            errorBadge.className = 'ensemble-badge error';
            errorBadge.textContent = '실패';
            meta.appendChild(errorBadge);
        } else if (index === 0) {
            const bestBadge = document.createElement('span');
            bestBadge.className = 'ensemble-badge';
            bestBadge.textContent = '최고 점수';
            meta.appendChild(bestBadge);
        } else {
            const candidateBadge = document.createElement('span');
            candidateBadge.className = 'ensemble-badge';
            candidateBadge.textContent = '후보';
            meta.appendChild(candidateBadge);
        }

        if (item.warning) {
            const warningBadge = document.createElement('span');
            warningBadge.className = 'ensemble-badge warning';
            warningBadge.textContent = '경고';
            meta.appendChild(warningBadge);
        }

        if (meta.childElementCount > 0) {
            card.appendChild(meta);
        }

        if (Array.isArray(item.variants) && item.variants.length > 0) {
            const variantsContainer = document.createElement('div');
            variantsContainer.className = 'ensemble-variants';

            item.variants.forEach((variantDetail) => {
                if (!variantDetail || typeof variantDetail !== 'object') {
                    return;
                }
                const variantRow = document.createElement('div');
                variantRow.className = 'variant-row';
                if (variantDetail.variant === item.variant) {
                    variantRow.classList.add('best');
                }

                const label = document.createElement('span');
                label.className = 'variant-label';
                label.textContent = getVariantDisplayName(variantDetail.variant);
                variantRow.appendChild(label);

                const value = document.createElement('span');
                value.className = 'variant-score';
                if (variantDetail.error) {
                    value.textContent = '오류';
                } else {
                    value.textContent = `${formatRate(variantDetail.score_percent ?? 0)}%`;
                }
                variantRow.appendChild(value);

                variantsContainer.appendChild(variantRow);
            });

            if (variantsContainer.childElementCount > 0) {
                card.appendChild(variantsContainer);
            }
        }

        ensembleList.appendChild(card);
    });

    ensembleSummary.hidden = false;
};

// 인식률 지표를 대시보드 카드에 반영
const setRateLabel = (value) => {
    if (!rateLabel) return;
    const formatted = formatRate(value);
    rateLabel.textContent = `${formatted}%`;
};

// DOM 설정 또는 페이지 위치에서 API 엔드포인트를 결정
const resolveApiUrl = () => {
    const formConfigured = uploadForm?.dataset?.apiUrl;
    if (formConfigured && typeof formConfigured === "string") {
        return formConfigured.replace(/\/$/, "");
    }

    if (window.__OCR_API_URL__ && typeof window.__OCR_API_URL__ === "string") {
        return window.__OCR_API_URL__.replace(/\/$/, "");
    }

    const origin = window.location.origin;
    if (origin && origin.startsWith("http")) {
        return `${origin.replace(/\/$/, "")}/api/ocr/analyze`;
    }

    return "http://localhost:8080/api/ocr/analyze";
};

// 타임스탬프 쿼리 파라미터를 추가해 POST 응답 캐싱을 방지
const applyCacheBust = (baseUrl) => {
    const stamp = Date.now().toString();
    try {
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set('_', stamp);
        return url.toString();
    } catch (error) {
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}_=${stamp}`;
    }
};

// 인위적 진행률 타이머를 중단해 불필요한 업데이트를 방지
const stopProgressLoop = () => {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
};

// 진행 인디케이터의 CSS 변수와 표시 텍스트를 동기화
const updateProgressValue = (value) => {
    currentProgress = Math.max(0, Math.min(100, value));
    if (progressIndicator) {
        progressIndicator.style.setProperty('--progress-percent', currentProgress.toString());
    }
    if (progressPercent) {
        progressPercent.textContent = `${Math.round(currentProgress)}%`;
    }
};

// 결과를 기다리는 동안 완만한 가짜 진행률 애니메이션을 실행
const startProgressLoop = () => {
    stopProgressLoop();
    updateProgressValue(2);
    progressTimer = window.setInterval(() => {
        let step;
        if (currentProgress < 25) {
            step = 7;
        } else if (currentProgress < 55) {
            step = 5;
        } else if (currentProgress < 75) {
            step = 3;
        } else if (currentProgress < 90) {
            step = 1.5;
        } else {
            step = 0.5;
        }

        const nextValue = Math.min(currentProgress + step, PROGRESS_ACTIVE_LIMIT);
        updateProgressValue(nextValue);

        if (nextValue >= PROGRESS_ACTIVE_LIMIT) {
            stopProgressLoop();
        }
    }, 650);
};

// 인디케이터에 상태별 메시지를 적용해 활성/완료/오류를 전환
const setProgressState = (state, message) => {
    if (!progressIndicator) return;
    const classNames = Object.values(PROGRESS_STATE_CLASSES);
    classNames.forEach((name) => progressIndicator.classList.remove(name));

    const className = PROGRESS_STATE_CLASSES[state];
    if (className) {
        progressIndicator.classList.add(className);
    }

    if (progressText && typeof message === 'string') {
        progressText.textContent = message;
    }

    if (state === 'active') {
        updateProgressValue(0);
        startProgressLoop();
    } else if (state === 'complete') {
        stopProgressLoop();
        updateProgressValue(100);
    } else if (state === 'error') {
        stopProgressLoop();
        updateProgressValue(100);
    }

    progressIndicator.hidden = false;
    progressIndicator.setAttribute('aria-hidden', 'false');
};

const API_URL = resolveApiUrl();

// 빠른 모드일 때만 엔진 선택을 허용
const updateEngineState = () => {
    const fastSelected = modeInputs.some((input) => input.checked && input.value === "fast");
    if (!engineSelect) return;
    if (fastSelected) {
        engineSelect.disabled = false;
    } else {
        engineSelect.disabled = true;
        engineSelect.value = "";
    }
};

// 현재 모드 선택과 엔진 드롭다운 활성 상태를 동기화
modeInputs.forEach((input) => input.addEventListener("change", updateEngineState));
updateEngineState();

// 파일을 새로 선택하면 이전 출력이 남지 않도록 초기화
if (fileInput) {
    fileInput.addEventListener('change', () => {
        resetResponseState();
    });
}

// 파일 제출을 처리하며 요청 수명 주기와 UI 상태를 조율
uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(uploadForm);
    const selectedMode = (formData.get("mode") || "fast").toString();
    if (engineSelect?.disabled) {
        formData.delete("engine");
    } else if (engineSelect) {
        const selectedEngine = (engineSelect.value || "").trim();
        if (selectedEngine) {
            formData.set("engine", selectedEngine);
        } else {
            formData.delete("engine");
        }
    }

    resetEngineDisplay();
    responseBox.textContent = "요청 처리 중...";
    setProgressState('active', '분석을 진행하는 중입니다...');
    setRateLabel(0);

    try {
        const requestUrl = applyCacheBust(API_URL);
        const result = await fetch(requestUrl, {
            method: "POST",
            body: formData,
            cache: "no-store",
            headers: {
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`요청 실패: ${result.status} ${result.statusText}\n${errorText}`.trim());
        }

        const json = await result.json();
        const rate = typeof json.recognition_rate_percent !== "undefined"
            ? json.recognition_rate_percent
            : json?.metadata?.recognition_rate_percent;
        setRateLabel(rate);
        setEngineMetric(json.engine, json.variant || json?.metadata?.variant);
        renderEnsembleSummary(json?.metadata?.ensemble, selectedMode);
        responseBox.textContent = JSON.stringify(json, null, 2);
        setProgressState('complete', '분석이 완료되었습니다. 동일 문서라도 다시 분석되었습니다.');
    } catch (error) {
        console.error("OCR 요청 실패", error);
        resetEngineDisplay();
        setRateLabel(0);
        responseBox.textContent = `요청 실패: ${error.message}`;
        setProgressState('error', '요청에 실패했습니다. 다시 시도해 주세요.');
    }
});




