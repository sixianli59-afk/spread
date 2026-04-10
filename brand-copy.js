if (typeof translations !== "undefined") {
  Object.assign(translations.zh, {
    landingTitle: "先判断市场，再生成文案。",
    landingDesc: "帮跨境卖家快速判断产品是否适合目标国家，并生成更贴近当地市场的商品文案。",
    searchPrompt: "先判断市场，再生成文案。",
    searchHint: "给跨境卖家一条更省脑子的路径：先看是否适合卖，再继续写更贴近市场的文案。"
  });

  Object.assign(translations.en, {
    landingTitle: "Assess the market first, then generate the copy.",
    landingDesc: "Help cross-border sellers evaluate product-market fit for a target country and create more localized product copy.",
    searchPrompt: "Assess the market first, then generate the copy.",
    searchHint: "A simpler workflow for cross-border sellers: validate the market first, then create copy that fits it."
  });
}

function refreshBrandCopy() {
  if (typeof applyTranslations === "function") {
    applyTranslations();
  }
  if (typeof window.refreshDynamicLanguage === "function") {
    window.refreshDynamicLanguage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", refreshBrandCopy);
} else {
  refreshBrandCopy();
}
