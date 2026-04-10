import http from "node:http";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeJsonParse(text) {
  const cleaned = String(text || "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

async function createJsonCompletion(messages) {
  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    max_tokens: 1000,
    messages,
  });

  const text = completion.choices?.[0]?.message?.content || "{}";
  return safeJsonParse(text);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing) {
    rateLimitStore.set(ip, {
      count: 1,
      startTime: now,
    });
    return false;
  }

  if (now - existing.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, {
      count: 1,
      startTime: now,
    });
    return false;
  }

  existing.count += 1;

  if (existing.count > RATE_LIMIT_MAX) {
    return true;
  }

  return false;
}

function cleanupRateLimitStore() {
  const now = Date.now();

  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

function languageName(lang) {
  return lang === "en" ? "English" : "Chinese";
}

function buildMarketContextPrompt(marketContext) {
  if (!marketContext || typeof marketContext !== "object") {
    return "";
  }

  const verdict = marketContext.verdict || "";
  const confidence = marketContext.confidence || "";
  const reasons = Array.isArray(marketContext.reasons) ? marketContext.reasons.join("; ") : "";
  const targetCustomers = Array.isArray(marketContext.targetCustomers)
    ? marketContext.targetCustomers.join("; ")
    : "";
  const keyAngles = Array.isArray(marketContext.keyAngles) ? marketContext.keyAngles.join("; ") : "";
  const risks = Array.isArray(marketContext.risks) ? marketContext.risks.join("; ") : "";
  const nextSteps = Array.isArray(marketContext.nextSteps) ? marketContext.nextSteps.join("; ") : "";
  const copyDirection = marketContext.copyDirection || "";

  const legacyLikes = Array.isArray(marketContext.likes) ? marketContext.likes.join("; ") : "";
  const legacyDislikes = Array.isArray(marketContext.dislikes) ? marketContext.dislikes.join("; ") : "";
  const legacyScore = marketContext.score || "";
  const legacyAdvice = marketContext.advice || "";

  if (
    !verdict &&
    !confidence &&
    !reasons &&
    !targetCustomers &&
    !keyAngles &&
    !risks &&
    !nextSteps &&
    !copyDirection &&
    !legacyLikes &&
    !legacyDislikes &&
    !legacyScore &&
    !legacyAdvice
  ) {
    return "";
  }

  return `
Additional market analysis context:
- Market verdict: ${verdict}
- Confidence: ${confidence}
- Reasons: ${reasons}
- Target customers: ${targetCustomers}
- Key angles to emphasize: ${keyAngles}
- Risks: ${risks}
- Next steps: ${nextSteps}
- Recommended copy direction: ${copyDirection}
- Legacy likes: ${legacyLikes}
- Legacy dislikes: ${legacyDislikes}
- Legacy score: ${legacyScore}
- Legacy advice: ${legacyAdvice}

Use this context to make the copy more aligned with the target market.
Do not mention the analysis directly in the output.
  `.trim();
}

const server = http.createServer(async (req, res) => {
  cleanupRateLimitStore();

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (
    req.method === "POST" &&
    (req.url === "/generate" || req.url === "/analyze" || req.url === "/translate-analysis")
  ) {
    const ip = getClientIp(req);

    if (isRateLimited(ip)) {
      return sendJson(res, 429, {
        error: "请求过于频繁，请稍后再试",
      });
    }
  }

  if (req.method === "POST" && req.url === "/generate") {
    try {
      const rawBody = await readBody(req);
      const data = JSON.parse(rawBody || "{}");

      const productName = (data.productName || "").trim();
      const feature1 = (data.feature1 || "").trim();
      const feature2 = (data.feature2 || "").trim();
      const feature3 = (data.feature3 || "").trim();
      const country = (data.country || "").trim();
      const marketContext = data.marketContext || null;

      if (!productName || !feature1 || !feature2 || !feature3 || !country) {
        return sendJson(res, 400, { error: "请先把所有内容填写完整" });
      }

      const marketContextPrompt = buildMarketContextPrompt(marketContext);

      const parsed = await createJsonCompletion([
        {
          role: "system",
          content: `
You are an e-commerce copywriter for English-speaking markets.
Return JSON only.
The response must be valid json.
          `.trim(),
        },
        {
          role: "user",
          content: `
Write product copy for the ${country} market.

Product name:
${productName}

Selling points:
1. ${feature1}
2. ${feature2}
3. ${feature3}

${marketContextPrompt}

Return json in exactly this shape:
{
  "title": "string",
  "bullets": ["string", "string", "string"],
  "description": "string"
}

Rules:
- Use natural English
- Title should be concise and marketable
- Bullets must be 3 short selling points
- Description should be 1 short paragraph
- Align the copy with the target market when market context is available
- Do not include markdown
- Do not include any text outside json
          `.trim(),
        },
      ]);

      return sendJson(res, 200, parsed);
    } catch (error) {
      console.error("Generate error:", error);
      return sendJson(res, 500, {
        error: "生成失败，请检查 DeepSeek API key、余额或返回格式",
      });
    }
  }

  if (req.method === "POST" && req.url === "/analyze") {
    try {
      const rawBody = await readBody(req);
      const data = JSON.parse(rawBody || "{}");

      const productName = (data.productName || "").trim();
      const category = (data.category || "").trim();
      const priceRange = (data.priceRange || "").trim();
      const country = (data.country || "").trim();
      const uiLanguage = data.uiLanguage === "en" ? "en" : "zh";

      if (!productName || !category || !priceRange || !country) {
        return sendJson(res, 400, { error: "请先把所有内容填写完整" });
      }

      const parsed = await createJsonCompletion([
        {
          role: "system",
          content: `
You are a market-entry strategist for cross-border e-commerce sellers.
Return JSON only.
The response must be valid json.
          `.trim(),
        },
        {
          role: "user",
          content: `
Analyze whether this product is suitable for the ${country} market.

Product name:
${productName}

Category:
${category}

Price range:
${priceRange}

Return json in exactly this shape:
{
  "verdict": "string",
  "confidence": "string",
  "reasons": ["string", "string", "string"],
  "targetCustomers": ["string", "string"],
  "keyAngles": ["string", "string", "string"],
  "risks": ["string", "string", "string"],
  "nextSteps": ["string", "string", "string"],
  "copyDirection": "string"
}

Rules:
- All fields must be in ${languageName(uiLanguage)}
- verdict should be one of these meanings:
  - good fit / suitable to enter
  - worth small-scale testing
  - not recommended for now
- confidence should match one of these meanings:
  - high
  - medium
  - low
- reasons must be 3 concrete reasons behind the judgment
- targetCustomers must be 2 clear customer groups
- keyAngles must be 3 practical selling angles to emphasize
- risks must be 3 realistic obstacles that may reduce conversion
- nextSteps must be 3 practical next actions for the seller
- copyDirection must be one short paragraph
- Keep the result practical, concrete, and decision-oriented
- Avoid generic filler language
- Do not include markdown
- Do not include any text outside json
          `.trim(),
        },
      ]);

      return sendJson(res, 200, parsed);
    } catch (error) {
      console.error("Analyze error:", error);
      return sendJson(res, 500, {
        error: "分析失败，请检查 DeepSeek API key、余额或返回格式",
      });
    }
  }

  if (req.method === "POST" && req.url === "/translate-analysis") {
    try {
      const rawBody = await readBody(req);
      const data = JSON.parse(rawBody || "{}");

      const analysis = data.analysis || {};
      const fromLanguage = data.fromLanguage === "en" ? "en" : "zh";
      const toLanguage = data.toLanguage === "en" ? "en" : "zh";

      if (fromLanguage === toLanguage) {
        return sendJson(res, 200, analysis);
      }

      const verdict = analysis.verdict || "";
      const confidence = analysis.confidence || "";
      const reasons = Array.isArray(analysis.reasons) ? analysis.reasons : [];
      const targetCustomers = Array.isArray(analysis.targetCustomers) ? analysis.targetCustomers : [];
      const keyAngles = Array.isArray(analysis.keyAngles) ? analysis.keyAngles : [];
      const risks = Array.isArray(analysis.risks) ? analysis.risks : [];
      const nextSteps = Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [];
      const copyDirection = analysis.copyDirection || "";

      if (
        !verdict &&
        !confidence &&
        !reasons.length &&
        !targetCustomers.length &&
        !keyAngles.length &&
        !risks.length &&
        !nextSteps.length &&
        !copyDirection
      ) {
        return sendJson(res, 400, { error: "没有可翻译的分析内容" });
      }

      const parsed = await createJsonCompletion([
        {
          role: "system",
          content: `
You are a translation assistant for structured market analysis results.
Return JSON only.
The response must be valid json.
          `.trim(),
        },
        {
          role: "user",
          content: `
Translate the following market analysis from ${languageName(fromLanguage)} to ${languageName(toLanguage)}.

Important rules:
- Do not re-analyze
- Do not add new opinions
- Do not remove information
- Keep the same meaning
- Keep the same JSON structure
- verdict and confidence must keep the same business meaning
- Return JSON only

Original analysis:
{
  "verdict": ${JSON.stringify(verdict)},
  "confidence": ${JSON.stringify(confidence)},
  "reasons": ${JSON.stringify(reasons)},
  "targetCustomers": ${JSON.stringify(targetCustomers)},
  "keyAngles": ${JSON.stringify(keyAngles)},
  "risks": ${JSON.stringify(risks)},
  "nextSteps": ${JSON.stringify(nextSteps)},
  "copyDirection": ${JSON.stringify(copyDirection)}
}

Return json in exactly this shape:
{
  "verdict": "string",
  "confidence": "string",
  "reasons": ["string", "string", "string"],
  "targetCustomers": ["string", "string"],
  "keyAngles": ["string", "string", "string"],
  "risks": ["string", "string", "string"],
  "nextSteps": ["string", "string", "string"],
  "copyDirection": "string"
}
          `.trim(),
        },
      ]);

      return sendJson(res, 200, parsed);
    } catch (error) {
      console.error("Translate analysis error:", error);
      return sendJson(res, 500, {
        error: "翻译失败，请稍后重试",
      });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
