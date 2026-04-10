const analyzeBtn = document.getElementById("analyzeBtn");
const loadingText = document.getElementById("loadingText");
const errorText = document.getElementById("errorText");

const verdictResult = document.getElementById("verdictResult");
const confidenceResult = document.getElementById("confidenceResult");
const reasonsResult = document.getElementById("reasonsResult");
const customerResult = document.getElementById("customerResult");
const anglesResult = document.getElementById("anglesResult");
const risksResult = document.getElementById("risksResult");
const nextStepsResult = document.getElementById("nextStepsResult");
const copyDirectionResult = document.getElementById("copyDirectionResult");

const copyAnalyzeAllBtn = document.getElementById("copyAnalyzeAllBtn");
const clearAnalyzeHistoryBtn = document.getElementById("clearAnalyzeHistoryBtn");
const goToGenerateBtn = document.getElementById("goToGenerateBtn");
const analyzeHistoryList = document.getElementById("analyzeHistoryList");
const toast = document.getElementById("toast");

const ANALYZE_HISTORY_KEY = "spread_analyze_history";
const MARKET_CONTEXT_KEY = "spread_market_context";
const API_BASE = "https://spread-api-5wyc.onrender.com";

let currentAnalysisRecord = null;
let isTranslatingCurrentRecord = false;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 1500);
}

function getAnalyzeHistory() {
  const saved = localStorage.getItem(ANALYZE_HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveAnalyzeHistory(items) {
  localStorage.setItem(ANALYZE_HISTORY_KEY, JSON.stringify(items));
}

function createAnalysisRecord({
  productName,
  category,
  priceRange,
  country,
  verdict,
  confidence,
  reasons,
  targetCustomers,
  keyAngles,
  risks,
  nextSteps,
  copyDirection,
  language,
}) {
  return {
    id: `analysis_${Date.now()}`,
    productName,
    category,
    priceRange,
    country,
    createdAt: new Date().toISOString(),
    time: new Date().toLocaleString(),
    versions: {
      [language]: {
        verdict,
        confidence,
        reasons,
        targetCustomers,
        keyAngles,
        risks,
        nextSteps,
        copyDirection,
      },
    },
  };
}

function getVersionFromRecord(record, lang = getLanguage()) {
  if (!record || !record.versions) return null;
  return (
    record.versions[lang] ||
    record.versions.zh ||
    record.versions.en ||
    Object.values(record.versions)[0] ||
    null
  );
}

function renderList(el, items) {
  el.innerHTML = "";
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderResultFromRecord(record) {
  const version = getVersionFromRecord(record);
  if (!version) return;

  verdictResult.textContent = version.verdict || "";
  confidenceResult.textContent = version.confidence || "";
  renderList(reasonsResult, version.reasons || []);
  renderList(customerResult, version.targetCustomers || []);
  renderList(anglesResult, version.keyAngles || []);
  renderList(risksResult, version.risks || []);
  renderList(nextStepsResult, version.nextSteps || []);
  copyDirectionResult.textContent = version.copyDirection || "";
}

function renderAnalyzeHistory() {
  const items = getAnalyzeHistory();

  if (!items.length) {
    analyzeHistoryList.innerHTML = `<p class="empty-history">${t("emptyAnalyzeHistory")}</p>`;
    return;
  }

  const verdictLabel = getLanguage() === "en" ? "Verdict:" : "市场结论：";
  const confidenceLabel = getLanguage() === "en" ? "Confidence:" : "信心等级：";
  const reasonsLabel = getLanguage() === "en" ? "Reasons:" : "判断原因：";
  const customersLabel = getLanguage() === "en" ? "Target customers:" : "目标消费者：";
  const anglesLabel = getLanguage() === "en" ? "Key selling angles:" : "应重点强调的卖点：";
  const risksLabel = getLanguage() === "en" ? "Risks:" : "可能阻碍成交的风险点：";
  const nextStepsLabel = getLanguage() === "en" ? "Next steps:" : "下一步执行建议：";
  const copyDirectionLabel = getLanguage() === "en" ? "Recommended copy direction:" : "推荐文案方向：";

  analyzeHistoryList.innerHTML = items
    .map((item) => {
      const version = getVersionFromRecord(item);
      if (!version) return "";

      return `
        <div class="analyze-history-item">
          <h3>${item.productName}</h3>
          <p class="analyze-history-meta">${item.country} · ${item.category} · ${item.priceRange} · ${item.time}</p>
          <p><strong>${verdictLabel}</strong>${version.verdict || ""}</p>
          <p><strong>${confidenceLabel}</strong>${version.confidence || ""}</p>
          <p><strong>${copyDirectionLabel}</strong>${version.copyDirection || ""}</p>

          <p><strong>${reasonsLabel}</strong></p>
          <ul>
            ${(version.reasons || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${customersLabel}</strong></p>
          <ul>
            ${(version.targetCustomers || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${anglesLabel}</strong></p>
          <ul>
            ${(version.keyAngles || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${risksLabel}</strong></p>
          <ul>
            ${(version.risks || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${nextStepsLabel}</strong></p>
          <ul>
            ${(version.nextSteps || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");
}

function upsertAnalyzeHistory(record) {
  const items = getAnalyzeHistory();
  const index = items.findIndex((item) => item.id === record.id);

  if (index >= 0) {
    items[index] = record;
  } else {
    items.unshift(record);
  }

  saveAnalyzeHistory(items.slice(0, 10));
  renderAnalyzeHistory();
}

function clearAnalyzeHistory() {
  localStorage.removeItem(ANALYZE_HISTORY_KEY);
  renderAnalyzeHistory();
}

function getListText(listEl) {
  return Array.from(listEl.querySelectorAll("li"))
    .map((li) => li.textContent)
    .join("\n");
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t("toastCopied"));
  });
}

function saveMarketContext() {
  if (!currentAnalysisRecord) return;

  const version = getVersionFromRecord(currentAnalysisRecord);
  if (!version) return;

  const context = {
    id: currentAnalysisRecord.id,
    productName: currentAnalysisRecord.productName,
    category: currentAnalysisRecord.category,
    priceRange: currentAnalysisRecord.priceRange,
    country: currentAnalysisRecord.country,
    language: getLanguage(),
    verdict: version.verdict || "",
    confidence: version.confidence || "",
    reasons: version.reasons || [],
    targetCustomers: version.targetCustomers || [],
    keyAngles: version.keyAngles || [],
    risks: version.risks || [],
    nextSteps: version.nextSteps || [],
    copyDirection: version.copyDirection || "",
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(MARKET_CONTEXT_KEY, JSON.stringify(context));
}

function setIdleAnalyzeButtonText() {
  analyzeBtn.textContent = t("btnAnalyze");
}

function setLoadingAnalyzeText() {
  loadingText.textContent = t("loadingAnalyze");
}

function setDefaultAnalyzeErrorText() {
  errorText.textContent =
    getLanguage() === "en"
      ? "Analysis failed. Please try again."
      : "分析失败，请重新尝试";
}

async function translateRecordVersion(record, targetLang) {
  if (!record || !record.versions) return null;
  if (record.versions[targetLang]) return record.versions[targetLang];
  if (isTranslatingCurrentRecord) return null;

  const sourceLang = record.versions.zh
    ? "zh"
    : record.versions.en
    ? "en"
    : Object.keys(record.versions)[0];

  if (!sourceLang || !record.versions[sourceLang]) return null;

  isTranslatingCurrentRecord = true;

  try {
    const res = await fetch(`${API_BASE}/translate-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysis: record.versions[sourceLang],
        fromLanguage: sourceLang,
        toLanguage: targetLang,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          (getLanguage() === "en" ? "Translation failed" : "翻译失败")
      );
    }

    record.versions[targetLang] = {
      verdict: data.verdict || "",
      confidence: data.confidence || "",
      reasons: data.reasons || [],
      targetCustomers: data.targetCustomers || [],
      keyAngles: data.keyAngles || [],
      risks: data.risks || [],
      nextSteps: data.nextSteps || [],
      copyDirection: data.copyDirection || "",
    };

    if (currentAnalysisRecord && currentAnalysisRecord.id === record.id) {
      currentAnalysisRecord = record;
    }

    upsertAnalyzeHistory(record);
    return record.versions[targetLang];
  } catch (error) {
    showToast(
      error.message ||
        (getLanguage() === "en" ? "Translation failed" : "翻译失败")
    );
    return null;
  } finally {
    isTranslatingCurrentRecord = false;
  }
}

window.refreshDynamicLanguage = function () {
  renderAnalyzeHistory();
  setLoadingAnalyzeText();
  setDefaultAnalyzeErrorText();

  if (!analyzeBtn.disabled) {
    setIdleAnalyzeButtonText();
  }

  if (currentAnalysisRecord) {
    const lang = getLanguage();
    if (currentAnalysisRecord.versions?.[lang]) {
      renderResultFromRecord(currentAnalysisRecord);
    } else {
      translateRecordVersion(currentAnalysisRecord, lang).then(() => {
        renderResultFromRecord(currentAnalysisRecord);
        renderAnalyzeHistory();
      });
    }
  }

  if (toast.textContent === "复制成功" || toast.textContent === "Copied") {
    toast.textContent = t("toastCopied");
  }
};

analyzeBtn.addEventListener("click", async () => {
  errorText.classList.add("hidden");
  loadingText.classList.remove("hidden");

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("loadingAnalyze");

  const productName = document.getElementById("productName").value.trim();
  const category = document.getElementById("category").value.trim();
  const priceRange = document.getElementById("priceRange").value;
  const country = document.getElementById("country").value;
  const language = getLanguage();

  if (!productName || !category || !priceRange || !country) {
    loadingText.classList.add("hidden");
    errorText.textContent =
      language === "en"
        ? "Please complete all fields first"
        : "请先把所有内容填写完整";
    errorText.classList.remove("hidden");
    analyzeBtn.disabled = false;
    setIdleAnalyzeButtonText();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName,
        category,
        priceRange,
        country,
        uiLanguage: language,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          (language === "en"
            ? "Analysis failed. Please try again."
            : "分析失败，请重新尝试")
      );
    }

    currentAnalysisRecord = createAnalysisRecord({
      productName,
      category,
      priceRange,
      country,
      verdict: data.verdict || "",
      confidence: data.confidence || "",
      reasons: data.reasons || [],
      targetCustomers: data.targetCustomers || [],
      keyAngles: data.keyAngles || [],
      risks: data.risks || [],
      nextSteps: data.nextSteps || [],
      copyDirection: data.copyDirection || "",
      language,
    });

    renderResultFromRecord(currentAnalysisRecord);
    upsertAnalyzeHistory(currentAnalysisRecord);
  } catch (error) {
    errorText.textContent =
      error.message ||
      (language === "en"
        ? "Analysis failed. Please try again."
        : "分析失败，请重新尝试");
    errorText.classList.remove("hidden");
  } finally {
    loadingText.classList.add("hidden");
    analyzeBtn.disabled = false;
    setIdleAnalyzeButtonText();
  }
});

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-copy");
    const target = document.getElementById(targetId);

    let textToCopy = "";

    if (target.tagclear
cd ~/Desktop/spread

cat > analyze.js <<'EOF'
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingText = document.getElementById("loadingText");
const errorText = document.getElementById("errorText");

const verdictResult = document.getElementById("verdictResult");
const confidenceResult = document.getElementById("confidenceResult");
const reasonsResult = document.getElementById("reasonsResult");
const customerResult = document.getElementById("customerResult");
const anglesResult = document.getElementById("anglesResult");
const risksResult = document.getElementById("risksResult");
const nextStepsResult = document.getElementById("nextStepsResult");
const copyDirectionResult = document.getElementById("copyDirectionResult");

const copyAnalyzeAllBtn = document.getElementById("copyAnalyzeAllBtn");
const clearAnalyzeHistoryBtn = document.getElementById("clearAnalyzeHistoryBtn");
const goToGenerateBtn = document.getElementById("goToGenerateBtn");
const analyzeHistoryList = document.getElementById("analyzeHistoryList");
const toast = document.getElementById("toast");

const ANALYZE_HISTORY_KEY = "spread_analyze_history";
const MARKET_CONTEXT_KEY = "spread_market_context";
const API_BASE = "https://spread-api-5wyc.onrender.com";

let currentAnalysisRecord = null;
let isTranslatingCurrentRecord = false;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 1500);
}

function getAnalyzeHistory() {
  const saved = localStorage.getItem(ANALYZE_HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveAnalyzeHistory(items) {
  localStorage.setItem(ANALYZE_HISTORY_KEY, JSON.stringify(items));
}

function createAnalysisRecord({
  productName,
  category,
  priceRange,
  country,
  verdict,
  confidence,
  reasons,
  targetCustomers,
  keyAngles,
  risks,
  nextSteps,
  copyDirection,
  language,
}) {
  return {
    id: `analysis_${Date.now()}`,
    productName,
    category,
    priceRange,
    country,
    createdAt: new Date().toISOString(),
    time: new Date().toLocaleString(),
    versions: {
      [language]: {
        verdict,
        confidence,
        reasons,
        targetCustomers,
        keyAngles,
        risks,
        nextSteps,
        copyDirection,
      },
    },
  };
}

function getVersionFromRecord(record, lang = getLanguage()) {
  if (!record || !record.versions) return null;
  return (
    record.versions[lang] ||
    record.versions.zh ||
    record.versions.en ||
    Object.values(record.versions)[0] ||
    null
  );
}

function renderList(el, items) {
  el.innerHTML = "";
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderResultFromRecord(record) {
  const version = getVersionFromRecord(record);
  if (!version) return;

  verdictResult.textContent = version.verdict || "";
  confidenceResult.textContent = version.confidence || "";
  renderList(reasonsResult, version.reasons || []);
  renderList(customerResult, version.targetCustomers || []);
  renderList(anglesResult, version.keyAngles || []);
  renderList(risksResult, version.risks || []);
  renderList(nextStepsResult, version.nextSteps || []);
  copyDirectionResult.textContent = version.copyDirection || "";
}

function renderAnalyzeHistory() {
  const items = getAnalyzeHistory();

  if (!items.length) {
    analyzeHistoryList.innerHTML = `<p class="empty-history">${t("emptyAnalyzeHistory")}</p>`;
    return;
  }

  const verdictLabel = getLanguage() === "en" ? "Verdict:" : "市场结论：";
  const confidenceLabel = getLanguage() === "en" ? "Confidence:" : "信心等级：";
  const reasonsLabel = getLanguage() === "en" ? "Reasons:" : "判断原因：";
  const customersLabel = getLanguage() === "en" ? "Target customers:" : "目标消费者：";
  const anglesLabel = getLanguage() === "en" ? "Key selling angles:" : "应重点强调的卖点：";
  const risksLabel = getLanguage() === "en" ? "Risks:" : "可能阻碍成交的风险点：";
  const nextStepsLabel = getLanguage() === "en" ? "Next steps:" : "下一步执行建议：";
  const copyDirectionLabel = getLanguage() === "en" ? "Recommended copy direction:" : "推荐文案方向：";

  analyzeHistoryList.innerHTML = items
    .map((item) => {
      const version = getVersionFromRecord(item);
      if (!version) return "";

      return `
        <div class="analyze-history-item">
          <h3>${item.productName}</h3>
          <p class="analyze-history-meta">${item.country} · ${item.category} · ${item.priceRange} · ${item.time}</p>
          <p><strong>${verdictLabel}</strong>${version.verdict || ""}</p>
          <p><strong>${confidenceLabel}</strong>${version.confidence || ""}</p>
          <p><strong>${copyDirectionLabel}</strong>${version.copyDirection || ""}</p>

          <p><strong>${reasonsLabel}</strong></p>
          <ul>
            ${(version.reasons || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${customersLabel}</strong></p>
          <ul>
            ${(version.targetCustomers || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${anglesLabel}</strong></p>
          <ul>
            ${(version.keyAngles || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${risksLabel}</strong></p>
          <ul>
            ${(version.risks || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>

          <p><strong>${nextStepsLabel}</strong></p>
          <ul>
            ${(version.nextSteps || []).map((x) => `<li>${x}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");
}

function upsertAnalyzeHistory(record) {
  const items = getAnalyzeHistory();
  const index = items.findIndex((item) => item.id === record.id);

  if (index >= 0) {
    items[index] = record;
  } else {
    items.unshift(record);
  }

  saveAnalyzeHistory(items.slice(0, 10));
  renderAnalyzeHistory();
}

function clearAnalyzeHistory() {
  localStorage.removeItem(ANALYZE_HISTORY_KEY);
  renderAnalyzeHistory();
}

function getListText(listEl) {
  return Array.from(listEl.querySelectorAll("li"))
    .map((li) => li.textContent)
    .join("\n");
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t("toastCopied"));
  });
}

function saveMarketContext() {
  if (!currentAnalysisRecord) return;

  const version = getVersionFromRecord(currentAnalysisRecord);
  if (!version) return;

  const context = {
    id: currentAnalysisRecord.id,
    productName: currentAnalysisRecord.productName,
    category: currentAnalysisRecord.category,
    priceRange: currentAnalysisRecord.priceRange,
    country: currentAnalysisRecord.country,
    language: getLanguage(),
    verdict: version.verdict || "",
    confidence: version.confidence || "",
    reasons: version.reasons || [],
    targetCustomers: version.targetCustomers || [],
    keyAngles: version.keyAngles || [],
    risks: version.risks || [],
    nextSteps: version.nextSteps || [],
    copyDirection: version.copyDirection || "",
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(MARKET_CONTEXT_KEY, JSON.stringify(context));
}

function setIdleAnalyzeButtonText() {
  analyzeBtn.textContent = t("btnAnalyze");
}

function setLoadingAnalyzeText() {
  loadingText.textContent = t("loadingAnalyze");
}

function setDefaultAnalyzeErrorText() {
  errorText.textContent =
    getLanguage() === "en"
      ? "Analysis failed. Please try again."
      : "分析失败，请重新尝试";
}

async function translateRecordVersion(record, targetLang) {
  if (!record || !record.versions) return null;
  if (record.versions[targetLang]) return record.versions[targetLang];
  if (isTranslatingCurrentRecord) return null;

  const sourceLang = record.versions.zh
    ? "zh"
    : record.versions.en
    ? "en"
    : Object.keys(record.versions)[0];

  if (!sourceLang || !record.versions[sourceLang]) return null;

  isTranslatingCurrentRecord = true;

  try {
    const res = await fetch(`${API_BASE}/translate-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysis: record.versions[sourceLang],
        fromLanguage: sourceLang,
        toLanguage: targetLang,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          (getLanguage() === "en" ? "Translation failed" : "翻译失败")
      );
    }

    record.versions[targetLang] = {
      verdict: data.verdict || "",
      confidence: data.confidence || "",
      reasons: data.reasons || [],
      targetCustomers: data.targetCustomers || [],
      keyAngles: data.keyAngles || [],
      risks: data.risks || [],
      nextSteps: data.nextSteps || [],
      copyDirection: data.copyDirection || "",
    };

    if (currentAnalysisRecord && currentAnalysisRecord.id === record.id) {
      currentAnalysisRecord = record;
    }

    upsertAnalyzeHistory(record);
    return record.versions[targetLang];
  } catch (error) {
    showToast(
      error.message ||
        (getLanguage() === "en" ? "Translation failed" : "翻译失败")
    );
    return null;
  } finally {
    isTranslatingCurrentRecord = false;
  }
}

window.refreshDynamicLanguage = function () {
  renderAnalyzeHistory();
  setLoadingAnalyzeText();
  setDefaultAnalyzeErrorText();

  if (!analyzeBtn.disabled) {
    setIdleAnalyzeButtonText();
  }

  if (currentAnalysisRecord) {
    const lang = getLanguage();
    if (currentAnalysisRecord.versions?.[lang]) {
      renderResultFromRecord(currentAnalysisRecord);
    } else {
      translateRecordVersion(currentAnalysisRecord, lang).then(() => {
        renderResultFromRecord(currentAnalysisRecord);
        renderAnalyzeHistory();
      });
    }
  }

  if (toast.textContent === "复制成功" || toast.textContent === "Copied") {
    toast.textContent = t("toastCopied");
  }
};

analyzeBtn.addEventListener("click", async () => {
  errorText.classList.add("hidden");
  loadingText.classList.remove("hidden");

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("loadingAnalyze");

  const productName = document.getElementById("productName").value.trim();
  const category = document.getElementById("category").value.trim();
  const priceRange = document.getElementById("priceRange").value;
  const country = document.getElementById("country").value;
  const language = getLanguage();

  if (!productName || !category || !priceRange || !country) {
    loadingText.classList.add("hidden");
    errorText.textContent =
      language === "en"
        ? "Please complete all fields first"
        : "请先把所有内容填写完整";
    errorText.classList.remove("hidden");
    analyzeBtn.disabled = false;
    setIdleAnalyzeButtonText();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName,
        category,
        priceRange,
        country,
        uiLanguage: language,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          (language === "en"
            ? "Analysis failed. Please try again."
            : "分析失败，请重新尝试")
      );
    }

    currentAnalysisRecord = createAnalysisRecord({
      productName,
      category,
      priceRange,
      country,
      verdict: data.verdict || "",
      confidence: data.confidence || "",
      reasons: data.reasons || [],
      targetCustomers: data.targetCustomers || [],
      keyAngles: data.keyAngles || [],
      risks: data.risks || [],
      nextSteps: data.nextSteps || [],
      copyDirection: data.copyDirection || "",
      language,
    });

    renderResultFromRecord(currentAnalysisRecord);
    upsertAnalyzeHistory(currentAnalysisRecord);
  } catch (error) {
    errorText.textContent =
      error.message ||
      (language === "en"
        ? "Analysis failed. Please try again."
        : "分析失败，请重新尝试");
    errorText.classList.remove("hidden");
  } finally {
    loadingText.classList.add("hidden");
    analyzeBtn.disabled = false;
    setIdleAnalyzeButtonText();
  }
});

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-copy");
    const target = document.getElementById(targetId);

    let textToCopy = "";

    if (target.tagName === "UL") {
      textToCopy = getListText(target);
    } else {
      textToCopy = target.textContent;
    }

    copyText(textToCopy);
  });
});

copyAnalyzeAllBtn.addEventListener("click", () => {
  const verdictLabel = getLanguage() === "en" ? "Verdict:" : "市场结论：";
  const confidenceLabel = getLanguage() === "en" ? "Confidence:" : "信心等级：";
  const reasonsLabel = getLanguage() === "en" ? "Reasons:" : "判断原因：";
  const customersLabel = getLanguage() === "en" ? "Target customers:" : "目标消费者：";
  const anglesLabel = getLanguage() === "en" ? "Key selling angles:" : "应重点强调的卖点：";
  const risksLabel = getLanguage() === "en" ? "Risks:" : "可能阻碍成交的风险点：";
  const nextStepsLabel = getLanguage() === "en" ? "Next steps:" : "下一步执行建议：";
  const copyDirectionLabel = getLanguage() === "en" ? "Recommended copy direction:" : "推荐文案方向：";

  const allText = `
${verdictLabel}
${verdictResult.textContent}

${confidenceLabel}
${confidenceResult.textContent}

${reasonsLabel}
${getListText(reasonsResult)}

${customersLabel}
${getListText(customerResult)}

${anglesLabel}
${getListText(anglesResult)}

${risksLabel}
${getListText(risksResult)}

${nextStepsLabel}
${getListText(nextStepsResult)}

${copyDirectionLabel}
${copyDirectionResult.textContent}
  `.trim();

  copyText(allText);
});

clearAnalyzeHistoryBtn.addEventListener("click", () => {
  clearAnalyzeHistory();
  showToast(t("toastAnalyzeCleared"));
});

goToGenerateBtn.addEventListener("click", () => {
  const hasResult =
    verdictResult.textContent.trim() &&
    copyDirectionResult.textContent.trim() &&
    verdictResult.textContent.trim() !== "...";

  if (!hasResult) {
    showToast(
      getLanguage() === "en"
        ? "Please complete an analysis first"
        : "请先完成一次分析"
    );
    return;
  }

  saveMarketContext();
  window.location.href = "generate.html";
});

renderAnalyzeHistory();
setLoadingAnalyzeText();
setDefaultAnalyzeErrorText();
