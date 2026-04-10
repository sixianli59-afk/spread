if (typeof translations !== "undefined") {
  Object.assign(translations.zh, {
    brandWord: "pread",

    homeKicker: "适合独立站、亚马逊、TikTok Shop 等跨境销售场景",

    homeHeroTitle: "先判断市场，再生成更能卖的英文文案",
    homeHeroDesc:
      "为跨境卖家提供目标国家市场适配分析与本地化文案生成。输入产品信息，快速获得市场判断、风险提示和可直接使用的销售文案。",

    homePrimaryCta: "开始市场分析",
    homeSecondaryCta: "查看示例结果",

    homePreviewTitle: "市场分析结果",
    homePreviewProductLabel: "产品：",
    homePreviewProductValue: "Portable Blender",
    homePreviewCountryLabel: "国家：",
    homePreviewCountryValue: "United States",
    homePreviewVerdictLabel: "结论：",
    homePreviewVerdictValue: "适合测试",
    homePreviewConfidenceLabel: "置信度：",
    homePreviewConfidenceValue: "78%",
    homePreviewRiskLabel: "风险：",
    homePreviewRiskValue: "竞争较高，价格敏感",
    homePreviewAdviceLabel: "建议：",
    homePreviewAdviceValue: "突出便携、健康、上班通勤场景",

    homeProblemTitle: "为跨境卖家解决两个常见问题",
    homeProblem1Title: "这个产品适合卖到哪个国家？",
    homeProblem1Desc:
      "很多卖家会直接上架和投广告，但在进入新市场前，往往缺少一个快速、结构化的判断。",
    homeProblem2Title: "英文文案怎么写得更像本地表达？",
    homeProblem2Desc:
      "普通 AI 能写文案，但未必能结合目标国家消费习惯、场景偏好和卖点重点。",
    homeProblemSummary:
      "Spread 把“市场判断”和“文案生成”连成一个完整流程，帮你更快完成跨境上架前准备。",

    homeFeatureTitle: "两个核心功能，一条完整工作流",
    homeFeatureSummary: "先分析，再写文案，减少盲目上架和重复修改",

    homeFeature1Title: "市场适配分析",
    homeFeature1Bullet1: "判断产品在目标国家是否值得测试",
    homeFeature1Bullet2: "输出结论、置信度、风险和卖点方向",
    homeFeature1Bullet3: "帮你在投放前先做一轮初筛",
    homeFeature1Cta: "开始分析",

    homeFlowArrow: "先分析 → 再写文案",

    homeFeature2Title: "英文文案生成",
    homeFeature2Bullet1: "生成产品标题、卖点 bullet points 和描述",
    homeFeature2Bullet2: "更适合跨境电商上架场景",
    homeFeature2Bullet3: "支持根据目标国家调整表达方向",
    homeFeature2Cta: "开始生成"
  });

  Object.assign(translations.en, {
    brandWord: "pread",

    homeKicker: "Built for independent stores, Amazon, TikTok Shop, and other cross-border selling scenarios",

    homeHeroTitle: "Assess the market first, then generate English copy that sells better",
    homeHeroDesc:
      "Built for cross-border sellers who need target-market analysis and localized copy generation. Enter product information to get a fast market judgment, risk reminders, and usable sales copy.",

    homePrimaryCta: "Start market analysis",
    homeSecondaryCta: "View sample results",

    homePreviewTitle: "Market analysis result",
    homePreviewProductLabel: "Product:",
    homePreviewProductValue: "Portable Blender",
    homePreviewCountryLabel: "Country:",
    homePreviewCountryValue: "United States",
    homePreviewVerdictLabel: "Verdict:",
    homePreviewVerdictValue: "Worth testing",
    homePreviewConfidenceLabel: "Confidence:",
    homePreviewConfidenceValue: "78%",
    homePreviewRiskLabel: "Risk:",
    homePreviewRiskValue: "High competition and price sensitivity",
    homePreviewAdviceLabel: "Advice:",
    homePreviewAdviceValue: "Highlight portability, healthy lifestyle, and office commute scenarios",

    homeProblemTitle: "Solve two common problems for cross-border sellers",
    homeProblem1Title: "Which country is this product worth selling in?",
    homeProblem1Desc:
      "Many sellers go straight to listing and advertising, but often lack a fast, structured judgment before entering a new market.",
    homeProblem2Title: "How do you write English copy that feels more local?",
    homeProblem2Desc:
      "Generic AI can write copy, but it may not reflect local buying habits, use cases, or the right selling angles for the target country.",
    homeProblemSummary:
      "Spread connects market judgment and copy generation into one workflow, so sellers can prepare faster before going live.",

    homeFeatureTitle: "Two core features, one complete workflow",
    homeFeatureSummary: "Analyze first, then write copy — reduce blind listings and repeated revisions",

    homeFeature1Title: "Market fit analysis",
    homeFeature1Bullet1: "Judge whether a product is worth testing in a target country",
    homeFeature1Bullet2: "Get verdict, confidence, risks, and selling-angle guidance",
    homeFeature1Bullet3: "Run a quick first-screening before spending on ads",
    homeFeature1Cta: "Start analysis",

    homeFlowArrow: "Analyze first → Then write copy",

    homeFeature2Title: "English copy generation",
    homeFeature2Bullet1: "Generate titles, bullet points, and product descriptions",
    homeFeature2Bullet2: "Better suited for cross-border e-commerce listing scenarios",
    homeFeature2Bullet3: "Adjust messaging direction for different target countries",
    homeFeature2Cta: "Start generating"
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
