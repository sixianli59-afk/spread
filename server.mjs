import http from "node:http";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
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

      if (!productName || !feature1 || !feature2 || !feature3 || !country) {
        return sendJson(res, 400, { error: "请先把所有内容填写完整" });
      }

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
- likes must be 3 short bullet points about what this market tends to value
- dislikes must be 3 short bullet points about what this market may reject
- score should look like "78 / 100"
- advice should be one short paragraph in Chinese
- copyDirection should be one short paragraph in Chinese
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

