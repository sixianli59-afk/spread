const generateBtn = document.getElementById("generateBtn");
const loadingText = document.getElementById("loadingText");
const errorText = document.getElementById("errorText");

const titleResult = document.getElementById("titleResult");
const bulletsResult = document.getElementById("bulletsResult");
const descResult = document.getElementById("descResult");

const copyAllBtn = document.getElementById("copyAllBtn");
const historyList = document.getElementById("historyList");
const toast = document.getElementById("toast");

const marketContextCard = document.getElementById("marketContextCard");
const contextProductName = document.getElementById("contextProductName");
const contextCountry = document.getElementById("contextCountry");
const contextAdvice = document.getElementById("contextAdvice");
const contextCopyDirection = document.getElementById("contextCopyDirection");

const HISTORY_KEY = "spread_history";
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

function getHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function renderHistory() {
  const items = getHistory();

  if (!items.length) {
    historyList.innerHTML = `<p class="empty-history">${t("emptyHistory")}</p>`;
    return;
  }

  const productLabel = getLanguage() === "en" ? "Product name:" : "商品名：";
  const descLabel = getLanguage() === "en" ? "English short description:" : "英文短描述：";

  historyList.innerHTML = items
    .map((item) => {
      return `
        <div class="history-item">
          <h3>${item.title}</h3>
          <p class="history-meta">${item.country} · ${item.time}</p>
          <p><strong>${productLabel}</strong>${item.productName}</p>
          <p><strong>${descLabel}</strong>${item.description}</p>
          <ul>
            ${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");
}

function addToHistory(record) {
  const items = getHistory();
  items.unshift(record);
  const latest10 = items.slice(0, 10);
  saveHistory(latest10);
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function getBulletsText() {
  return Array.from(bulletsResult.querySelectorAll("li"))
    .map((li) => li.textContent)
    .join("\n");
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t("toastCopied"));
  });
}

function loadMarketContext() {
  const saved = localStorage.getItem(MARKET_CONTEXT_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function renderMarketContext() {
  const context = loadMarketContext();
  if (!context) return;

  marketContextCard.classList.remove("hidden");

  contextProductName.textContent = context.productName || "-";
  contextCountry.textContent = context.country || "-";
  contextAdvice.textContent = context.advice || "-";
  contextCopyDirection.textContent = context.copyDirection || "-";

  if (context.productName) {
    document.getElementById("productName").value = context.productName;
  }

  if (context.country) {
    document.getElementById("country").value = context.country;
  }
}

function setIdleButtonText() {
  generateBtn.textContent = t("btnGenerate");
}

function setLoadingText() {
  loadingText.textContent = t("loadingGenerate");
}

function setDefaultErrorText() {
  errorText.textContent = t("errorGeneric");
}

window.refreshDynamicLanguage = function () {
  renderHistory();
  setLoadingText();
  setDefaultErrorText();

  if (!generateBtn.disabled) {
    setIdleButtonText();
  }

  if (toast.textContent === "复制成功" || toast.textContent === "Copied") {
    toast.textContent = t("toastCopied");
  }
};

generateBtn.addEventListener("click", async () => {
  errorText.classList.add("hidden");
  loadingText.classList.remove("hidden");

  generateBtn.disabled = true;
  generateBtn.textContent = t("loadingGenerate");

  const productName = document.getElementById("productName").value.trim();
  const feature1 = document.getElementById("feature1").value.trim();
  const feature2 = document.getElementById("feature2").value.trim();
  const feature3 = document.getElementById("feature3").value.trim();
  const country = document.getElementById("country").value;
  const marketContext = loadMarketContext();

  if (!productName || !feature1 || !feature2 || !feature3) {
    loadingText.classList.add("hidden");
    errorText.textContent =
      getLanguage() === "en"
        ? "Please complete all fields first"
        : "请先把所有内容填写完整";
    errorText.classList.remove("hidden");
    generateBtn.disabled = false;
    setIdleButtonText();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName,
        feature1,
        feature2,
        feature3,
        country,
        marketContext,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || t("errorGeneric"));
    }

    titleResult.textContent = data.title || "";

    bulletsResult.innerHTML = "";
    (data.bullets || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      bulletsResult.appendChild(li);
    });

    descResult.textContent = data.description || "";

    addToHistory({
      productName,
      country,
      title: data.title || "",
      bullets: data.bullets || [],
      description: data.description || "",
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    errorText.textContent = error.message || t("errorGeneric");
    errorText.classList.remove("hidden");
  } finally {
    loadingText.classList.add("hidden");
    generateBtn.disabled = false;
    setIdleButtonText();
  }
});

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-copy");
    const target = document.getElementById(targetId);

    let textToCopy = "";

    if (target.tagName === "UL") {
      textToCopy = Array.from(target.querySelectorAll("li"))
        .map((li) => li.textContent)
        .join("\n");
    } else {
      textToCopy = target.textContent;
    }

    copyText(textToCopy);
  });
});

copyAllBtn.addEventListener("click", () => {
  const titleLabel = getLanguage() === "en" ? "Title:" : "标题：";
  const bulletsLabel = getLanguage() === "en" ? "Bullets:" : "卖点：";
  const descLabel = getLanguage() === "en" ? "Description:" : "描述：";

  const allText = `
${titleLabel}
${titleResult.textContent}

${bulletsLabel}
${getBulletsText()}

${descLabel}
${descResult.textContent}
  `.trim();

  copyText(allText);
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  clearHistory();
  showToast(t("toastCleared"));
});

renderHistory();
renderMarketContext();
setLoadingText();
setDefaultErrorText();
