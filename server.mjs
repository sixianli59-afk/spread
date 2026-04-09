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
    max_tokens: 800,
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

function buildMarketContextPrompt(marketContext) {
  if (!marketContext || typeof marketContext !== "object") {
    return "";
  }

  const likes = Array.isArray(marketContext.likes) ? marketContext.likes.join("; ") : "";
  const dislikes = Array.isArray(marketContext.dislikes) ? marketContext.dislikes.join("; ") : "";
  const score = marketContext.score || "";
  const advice = marketContext.advice || "";
  const copyDirection = marketContext.copyDirection || "";

  if (!likes && !dislikes && !score && !advice && !copyDirection) {
    return "";
  }

  return `
Additional market analysis context:
- Market fit score: ${score}
- What this market tends to like: ${likes}
- What this market tends to dislike: ${dislikes}
- Entry advice: ${advice}
- Recommended copy direction: ${copyDirection}

Use this context to make the copy more aligned with the target market.
Do not mention the analysis directly in the output.
  `.trim();
}

const server = http.createServer(async (req, res) => {
  cleanupRateLimitStore();

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && (req.url === "/generate" || req.url === "/analyze")) {
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
      const uiLanguage = data.uiLanguage === "en" ? "en" : "zh";
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
You are a market-fit analyst for cross-border e-commerce sellers.
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
  "likes": ["string", "string", "string"],
  "dislikes": ["string", "string", "string"],
  "score": "string",
  "advice": "string",
  "copyDirection": "string"
}

Rules:
- likes must be 3 short bullet points in ${uiLanguage === "en" ? "English" : "Chinese"} about what this market tends to value
- dislikes must be 3 short bullet points in ${uiLanguage === "en" ? "English" : "Chinese"} about what this market may reject
- score should look like "78 / 100"
- advice should be one short paragraph in ${uiLanguage === "en" ? "English" : "Chinese"}
- copyDirection should be one short paragraph in ${uiLanguage === "en" ? "English" : "Chinese"}
- All fields except score must be in ${uiLanguage === "en" ? "English" : "Chinese"}
- Keep the analysis practical for an independent e-commerce seller
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

  return sendJson(res, 404, { error: "Not found" });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
