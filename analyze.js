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

function getLang() {
  try {
    if (typeof getLanguage === "function") return getLanguage();
  } catch (e) {}
  return "zh";
}

function tt(key, fallback) {
  try {
    if (typeof t === "function") return t(key);
  } catch (e) {}
  return fallback;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 1500);
}

function getAnalyzeHistory() {
  try {
    const saved = localStorage.getItem(ANALYZE_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveAnalyzeHistory(items) {
  localStorage.setItem(ANALYZE_HISTORY_KEY, JSON.stringify(items));
}

function createAnalysisRecord(data, language) {
  return {
    id: "analysis_" + Date.now(),
    productName: data.productName,
    category: data.category,
    priceRange: data.priceRange,
    country: data.country,
    time: new Date().toLocaleString(),
    versions: {
      [language]: {
        verdict: data.verdict || "",
        confidence: data.confidence || "",
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        targetCustomers: Array.isArray(data.targetCustomers) ? data.targetCustomers : [],
        keyAngles: Array.isArray(data.keyAngles) ? data.keyAngles : [],
        risks: Array.isArray(data.risks) ? data.risks : [],
        nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps : [],
        copyDirection: data.copyDirection || ""
      }
    }
  };
}

function getVersion(record) {
  if (!record || !record.versions) return null;
  const lang = getLang();
  return (
    record.versions[lang] ||
    record.versions.zh ||
    record.versions.en ||
    Object.values(record.versions)[0] ||
    null
  );
}

function renderList(el, items) {
  if (!el) return;
  el.innerHTML = "";
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderResult(record) {
  const version = getVersion(record);
  if (!version) return;

  if (verdictResult) verdictResult.textContent = version.verdict || "";
  if (confidenceResult) confidenceResult.textContent = version.confidence || "";
  renderList(reasonsResult, version.reasons || []);
  renderList(customerResult, version.targetCustomers || []);
  renderList(anglesResult, version.keyAngles || []);
  renderList(risksResult, version.risks || []);
  renderList(nextStepsResult, version.nextSteps || []);
  if (copyDirectionResult) copyDirectionResult.textContent = version.copyDirection || "";
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

function renderAnalyzeHistory() {
  if (!analyzeHistoryList) return;

  const items = getAnalyzeHistory();
  if (!items.length) {
    analyzeHistoryList.innerHTML = '<p class="empty-history">' + tt("emptyAnalyzeHistory", "No analysis history yet") + "</p>";
    return;
  }

  analyzeHistoryList.innerHTML = items.map((item) => {
    const version = getVersion(item);
    if (!version) return "";

    const reasons = (version.reasons || []).map((x) => "<li>" + x + "</li>").join("");
    const customers = (version.targetCustomers || []).map((x) => "<li>" + x + "</li>").join("");
    const angles = (version.keyAngles || []).map((x) => "<li>" + x + "</li>").join("");
    const risks = (version.risks || []).map((x) => "<li>" + x + "</li>").join("");
    const nextSteps = (version.nextSteps || []).map((x) => "<li>" + x + "</li>").join("");

    return `
      <div class="analyze-history-item">
        <h3>${item.productName || ""}</h3>
        <p class="analyze-history-meta">${item.country || ""} · ${item.category || ""} · ${item.priceRange || ""} · ${item.time || ""}</p>
        <p><strong>Verdict:</strong> ${version.verdict || ""}</p>
        <p><strong>Confidence:</strong> ${version.confidence || ""}</p>
        <p><strong>Copy direction:</strong> ${version.copyDirection || ""}</p>
        <p><strong>Reasons:</strong></p>
        <ul>${reasons}</ul>
        <p><strong>Target customers:</strong></p>
        <ul>${customers}</ul>
        <p><strong>Key angles:</strong></p>
        <ul>${angles}</ul>
        <p><strong>Risks:</strong></p>
        <ul>${risks}</ul>
        <p><strong>Next steps:</strong></p>
        <ul>${nextSteps}</ul>
      </div>
    `;
  }).join("");
}

function getListText(listEl) {
  if (!listEl) return "";
  return Array.from(listEl.querySelectorAll("li"))
    .map((li) => li.textContent)
    .join("\n");
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(tt("toastCopied", "Copied"));
  }).catch(() => {
    showToast("Copy failed");
  });
}

function saveMarketContext() {
  if (!currentAnalysisRecord) return;
  const version = getVersion(currentAnalysisRecord);
  if (!version) return;

  const context = {
    id: currentAnalysisRecord.id,
    productName: currentAnalysisRecord.productName,
    category: currentAnalysisRecord.category,
    priceRange: currentAnalysisRecord.priceRange,
    country: currentAnalysisRecord.country,
    language: getLang(),
    verdict: version.verdict || "",
    confidence: version.confidence || "",
    reasons: version.reasons || [],
    targetCustomers: version.targetCustomers || [],
    keyAngles: version.keyAngles || [],
    risks: version.risks || [],
    nextSteps: version.nextSteps || [],
    copyDirection: version.copyDirection || "",
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(MARKET_CONTEXT_KEY, JSON.stringify(context));
}

function setLoading(on) {
  if (loadingText) loadingText.classList.toggle("hidden", !on);
  if (analyzeBtn) {
    analyzeBtn.disabled = on;
    analyzeBtn.textContent = on ? tt("loadingAnalyze", "Analyzing...") : tt("btnAnalyze", "Analyze");
  }
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (errorText) errorText.classList.add("hidden");
    setLoading(true);

    const productName = document.getElementById("productName")?.value.trim() || "";
    const category = document.getElementById("category")?.value.trim() || "";
    const priceRange = document.getElementById("priceRange")?.value || "";
    const country = document.getElementById("country")?.value || "";
    const lang = getLang();

    if (!productName || !category || !priceRange || !country) {
      if (errorText) {
        errorText.textContent = "Please complete all fields first";
        errorText.classList.remove("hidden");
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(API_BASE + "/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productName,
          category,
          priceRange,
          country,
          uiLanguage: lang
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      currentAnalysisRecord = createAnalysisRecord({
        productName,
        category,
        priceRange,
        country,
        verdict: data.verdict,
        confidence: data.confidence,
        reasons: data.reasons,
        targetCustomers: data.targetCustomers,
        keyAngles: data.keyAngles,
        risks: data.risks,
        nextSteps: data.nextSteps,
        copyDirection: data.copyDirection
      }, lang);

      renderResult(currentAnalysisRecord);
      upsertAnalyzeHistory(currentAnalysisRecord);
    } catch (err) {
      if (errorText) {
        errorText.textContent = err.message || "Analysis failed";
        errorText.classList.remove("hidden");
      }
    } finally {
      setLoading(false);
    }
  });
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-copy");
    const target = document.getElementById(targetId);
    let text = "";

    if (target && target.tagName === "UL") {
      text = getListText(target);
    } else if (target) {
      text = target.textContent || "";
    }

    copyText(text);
  });
});

if (copyAnalyzeAllBtn) {
  copyAnalyzeAllBtn.addEventListener("click", () => {
    const text = [
      "Verdict:",
      verdictResult?.textContent || "",
      "",
      "Confidence:",
      confidenceResult?.textContent || "",
      "",
      "Reasons:",
      getListText(reasonsResult),
      "",
      "Target customers:",
      getListText(customerResult),
      "",
      "Key angles:",
      getListText(anglesResult),
      "",
      "Risks:",
      getListText(risksResult),
      "",
      "Next steps:",
      getListText(nextStepsResult),
      "",
      "Copy direction:",
      copyDirectionResult?.textContent || ""
    ].join("\n");

    copyText(text);
  });
}

if (clearAnalyzeHistoryBtn) {
  clearAnalyzeHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem(ANALYZE_HISTORY_KEY);
    renderAnalyzeHistory();
    showToast(tt("toastAnalyzeCleared", "Cleared"));
  });
}

if (goToGenerateBtn) {
  goToGenerateBtn.addEventListener("click", () => {
    const hasResult = (verdictResult?.textContent || "").trim() && (copyDirectionResult?.textContent || "").trim();
    if (!hasResult) {
      showToast("Please complete an analysis first");
      return;
    }
    saveMarketContext();
    window.location.href = "generate.html";
  });
}

window.refreshDynamicLanguage = function () {
  renderAnalyzeHistory();
  if (currentAnalysisRecord) renderResult(currentAnalysisRecord);
  setLoading(false);
};

renderAnalyzeHistory();
setLoading(false);
