const analyzeBtn = document.getElementById("analyzeBtn");
const loadingText = document.getElementById("loadingText");
const errorText = document.getElementById("errorText");

const likesResult = document.getElementById("likesResult");
const dislikesResult = document.getElementById("dislikesResult");
const scoreResult = document.getElementById("scoreResult");
const adviceResult = document.getElementById("adviceResult");
const copyDirectionResult = document.getElementById("copyDirectionResult");

const copyAnalyzeAllBtn = document.getElementById("copyAnalyzeAllBtn");
const clearAnalyzeHistoryBtn = document.getElementById("clearAnalyzeHistoryBtn");
const goToGenerateBtn = document.getElementById("goToGenerateBtn");
const analyzeHistoryList = document.getElementById("analyzeHistoryList");
const toast = document.getElementById("toast");

const ANALYZE_HISTORY_KEY = "spread_analyze_history";
const MARKET_CONTEXT_KEY = "spread_market_context";
const API_BASE = "https://spread-api-5wyc.onrender.com";

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

function renderAnalyzeHistory() {
  const items = getAnalyzeHistory();

  if (!items.length) {
    analyzeHistoryList.innerHTML = `<p class="empty-history">${t("emptyAnalyzeHistory")}</p>`;
    return;
  }

  const scoreLabel = getLanguage() === "en" ? "Market fit score:" : "市场匹配度：";
  const adviceLabel = getLanguage() === "en" ? "Entry advice:" : "进入建议：";
  const copyDirectionLabel = getLanguage() === "en" ? "Recommended copy direction:" : "推荐文案方向：";
  const likesLabel = getLanguage() === "en" ? "What this market tends to like:" : "喜欢什么：";
  const dislikesLabel = getLanguage() === "en" ? "What this market tends to dislike:" : "不喜欢什么：";

  analyzeHistoryList.innerHTML = items
    .map((item) => {
      return `
        <div class="analyze-history-item">
          <h3>${item.productName}</h3>
          <p class="analyze-history-meta">${item.country} · ${item.category} · ${item.priceRange} · ${item.time}</p>
          <p><strong>${scoreLabel}</strong>${item.score}</p>
          <p><strong>${adviceLabel}</strong>${item.advice}</p>
          <p><strong>${copyDirectionLabel}</strong>${item.copyDirection}</p>
          <p><strong>${likesLabel}</strong></p>
          <ul>
            ${item.likes.map((like) => `<li>${like}</li>`).join("")}
          </ul>
          <p><strong>${dislikesLabel}</strong></p>
          <ul>
            ${item.dislikes.map((dislike) => `<li>${dislike}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");
}

function addAnalyzeHistory(record) {
  const items = getAnalyzeHistory();
  items.unshift(record);
  const latest10 = items.slice(0, 10);
  saveAnalyzeHistory(latest10);
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

function getListArray(listEl) {
  return Array.from(listEl.querySelectorAll("li"))
    .map((li) => li.textContent.trim())
    .filter(Boolean);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t("toastCopied"));
  });
}

function saveMarketContext() {
  const productName = document.getElementById("productName").value.trim();
  const category = document.getElementById("category").value.trim();
  const priceRange = document.getElementById("priceRange").value;
  const country = document.getElementById("country").value;

  const context = {
    productName,
    category,
    priceRange,
    country,
    likes: getListArray(likesResult),
    dislikes: getListArray(dislikesResult),
    score: scoreResult.textContent.trim(),
    advice: adviceResult.textContent.trim(),
    copyDirection: copyDirectionResult.textContent.trim(),
    language: getLanguage(),
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
  errorText.textContent = getLanguage() === "en"
    ? "Analysis failed. Please try again."
    : "分析失败，请重新尝试";
}

window.refreshDynamicLanguage = function () {
  renderAnalyzeHistory();
  setLoadingAnalyzeText();
  setDefaultAnalyzeErrorText();

  if (!analyzeBtn.disabled) {
    setIdleAnalyzeButtonText();
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

  if (!productName || !category || !priceRange || !country) {
    loadingText.classList.add("hidden");
    errorText.textContent =
      getLanguage() === "en"
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
        uiLanguage: getLanguage(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          (getLanguage() === "en"
            ? "Analysis failed. Please try again."
            : "分析失败，请重新尝试")
      );
    }

    likesResult.innerHTML = "";
    (data.likes || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      likesResult.appendChild(li);
    });

    dislikesResult.innerHTML = "";
    (data.dislikes || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      dislikesResult.appendChild(li);
    });

    scoreResult.textContent = data.score || "";
    adviceResult.textContent = data.advice || "";
    copyDirectionResult.textContent = data.copyDirection || "";

    addAnalyzeHistory({
      productName,
      category,
      priceRange,
      country,
      likes: data.likes || [],
      dislikes: data.dislikes || [],
      score: data.score || "",
      advice: data.advice || "",
      copyDirection: data.copyDirection || "",
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    errorText.textContent =
      error.message ||
      (getLanguage() === "en"
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
  const likesLabel = getLanguage() === "en" ? "Likes:" : "喜欢什么:";
  const dislikesLabel = getLanguage() === "en" ? "Dislikes:" : "不喜欢什么:";
  const scoreLabel = getLanguage() === "en" ? "Market fit score:" : "市场匹配度:";
  const adviceLabel = getLanguage() === "en" ? "Entry advice:" : "进入建议:";
  const copyDirectionLabel = getLanguage() === "en" ? "Recommended copy direction:" : "推荐文案方向:";

  const allText = `
${likesLabel}
${getListText(likesResult)}

${dislikesLabel}
${getListText(dislikesResult)}

${scoreLabel}
${scoreResult.textContent}

${adviceLabel}
${adviceResult.textContent}

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
    adviceResult.textContent.trim() &&
    copyDirectionResult.textContent.trim() &&
    scoreResult.textContent.trim() &&
    scoreResult.textContent.trim() !== "...";

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
