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
const analyzeHistoryList = document.getElementById("analyzeHistoryList");
const toast = document.getElementById("toast");

const ANALYZE_HISTORY_KEY = "spread_analyze_history";

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
    analyzeHistoryList.innerHTML = `<p class="empty-history">还没有分析记录</p>`;
    return;
  }

  analyzeHistoryList.innerHTML = items
    .map((item) => {
      return `
        <div class="analyze-history-item">
          <h3>${item.productName}</h3>
          <p class="analyze-history-meta">${item.country} · ${item.category} · ${item.priceRange} · ${item.time}</p>
          <p><strong>市场匹配度：</strong>${item.score}</p>
          <p><strong>进入建议：</strong>${item.advice}</p>
          <p><strong>推荐文案方向：</strong>${item.copyDirection}</p>
          <p><strong>喜欢什么：</strong></p>
          <ul>
            ${item.likes.map((like) => `<li>${like}</li>`).join("")}
          </ul>
          <p><strong>不喜欢什么：</strong></p>
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

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("复制成功");
  });
}

analyzeBtn.addEventListener("click", async () => {
  errorText.classList.add("hidden");
  loadingText.classList.remove("hidden");

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "分析中...";

  const productName = document.getElementById("productName").value.trim();
  const category = document.getElementById("category").value.trim();
  const priceRange = document.getElementById("priceRange").value;
  const country = document.getElementById("country").value;

  if (!productName || !category || !priceRange || !country) {
    loadingText.classList.add("hidden");
    errorText.textContent = "请先把所有内容填写完整";
    errorText.classList.remove("hidden");
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "开始分析";
    return;
  }

  try {
    const res = await fetch("https://spread-api-5wyc.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName,
        category,
        priceRange,
        country,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "分析失败，请重新尝试");
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
    errorText.textContent = error.message || "分析失败，请重新尝试";
    errorText.classList.remove("hidden");
  } finally {
    loadingText.classList.add("hidden");
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "开始分析";
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
  const allText = `
喜欢什么:
${getListText(likesResult)}

不喜欢什么:
${getListText(dislikesResult)}

市场匹配度:
${scoreResult.textContent}

进入建议:
${adviceResult.textContent}

推荐文案方向:
${copyDirectionResult.textContent}
  `.trim();

  copyText(allText);
});

clearAnalyzeHistoryBtn.addEventListener("click", () => {
  clearAnalyzeHistory();
  showToast("分析历史已清空");
});

renderAnalyzeHistory();
