// AI proxy: keeps the API key on the server. Accepts Anthropic (Claude), OpenAI or Google Gemini keys.
import { auth, send, readJSON, env } from "./_lib.js";

// USD per 1M tokens [input, output]. Unknown models: set AI_PRICE_IN / AI_PRICE_OUT in Vercel, otherwise cost is not shown.
const PRICES = {
  "claude-haiku-5-5": [0.10, 0.50],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "gpt-5.4-mini": [0.75, 4.50],
  "gpt-5.4": [2.50, 15],
  "gpt-5.5": [5, 30]
};
const DEFAULTS = {
  anthropic: { fast: "claude-haiku-5-5", smart: "claude-sonnet-5-5", name: "Claude" },
  openai: { fast: "gpt-5.4-mini", smart: "gpt-5.4-mini", name: "OpenAI" },
  gemini: { fast: "gemini-3.5-flash", smart: "gemini-3.5-flash", name: "Gemini" }
};
const KINDS = ["scale", "body", "food", "ask", "plan"];

function pickProvider() {
  let key = env("AI_API_KEY"), p = null;
  if (key) p = key.startsWith("sk-ant-") ? "anthropic" : key.startsWith("AIza") ? "gemini" : key.startsWith("sk-") ? "openai" : env("AI_PROVIDER").toLowerCase() || null;
  else if ((key = env("ANTHROPIC_API_KEY"))) p = "anthropic";
  else if ((key = env("OPENAI_API_KEY"))) p = "openai";
  else if ((key = env("GEMINI_API_KEY"))) p = "gemini";
  if (!p || !DEFAULTS[p]) return null;
  const d = DEFAULTS[p];
  return { p, key, name: d.name, fast: env("AI_MODEL_FAST") || d.fast, smart: env("AI_MODEL_SMART") || env("AI_MODEL_FAST") || d.smart };
}

class ProvErr extends Error { constructor(status, msg) { super(msg || "AI xatosi"); this.status = status; } }
async function post(url, headers, body) {
  const r = await fetch(url, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, headers), body: JSON.stringify(body), signal: AbortSignal.timeout(55000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ProvErr(r.status, (j.error && (j.error.message || j.error.status)) || j.message || `HTTP ${r.status}`);
  return j;
}

async function anthropic(P, model, msgs, img, maxOut) {
  const last = msgs.length - 1;
  const messages = msgs.map((m, i) => ({ role: m.role, content: i === last && img ? [{ type: "image", source: { type: "base64", media_type: img.mime, data: img.data } }, { type: "text", text: m.content }] : m.content }));
  const j = await post("https://api.anthropic.com/v1/messages", { "x-api-key": P.key, "anthropic-version": "2023-06-01" }, { model, max_tokens: maxOut, messages });
  return { text: (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim(), tin: (j.usage && j.usage.input_tokens) || 0, tout: (j.usage && j.usage.output_tokens) || 0, cut: j.stop_reason === "max_tokens" };
}
async function openai(P, model, msgs, img, maxOut, json) {
  const last = msgs.length - 1;
  const messages = msgs.map((m, i) => ({ role: m.role, content: i === last && img ? [{ type: "text", text: m.content }, { type: "image_url", image_url: { url: `data:${img.mime};base64,${img.data}` } }] : m.content }));
  const body = { model, messages, max_completion_tokens: maxOut };
  if (json) body.response_format = { type: "json_object" };
  const j = await post("https://api.openai.com/v1/chat/completions", { authorization: `Bearer ${P.key}` }, body);
  const c = (j.choices && j.choices[0]) || {};
  return { text: ((c.message && c.message.content) || "").trim(), tin: (j.usage && j.usage.prompt_tokens) || 0, tout: (j.usage && j.usage.completion_tokens) || 0, cut: c.finish_reason === "length" };
}
async function gemini(P, model, msgs, img, maxOut, json) {
  const last = msgs.length - 1;
  const contents = msgs.map((m, i) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }].concat(i === last && img ? [{ inline_data: { mime_type: img.mime, data: img.data } }] : []) }));
  const gc = { maxOutputTokens: maxOut }; if (json) gc.responseMimeType = "application/json";
  const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": P.key }, { contents, generationConfig: gc });
  const c = (j.candidates && j.candidates[0]) || {}, u = j.usageMetadata || {};
  return { text: ((c.content && c.content.parts) || []).map(x => x.text || "").join("").trim(), tin: u.promptTokenCount || 0, tout: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), cut: c.finishReason === "MAX_TOKENS" };
}

function price(model) {
  const pi = parseFloat(env("AI_PRICE_IN")), po = parseFloat(env("AI_PRICE_OUT"));
  if (PRICES[model]) return PRICES[model];
  return isFinite(pi) && isFinite(po) ? [pi, po] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method", error: "POST kerak" });
  const user = auth(req, res); if (!user) return;
  const P = pickProvider();
  if (!P) return send(res, 500, { code: "no_key", error: "Vercel'da AI_API_KEY o'rnatilmagan." });
  let b;
  try { b = await readJSON(req); } catch (e) { return send(res, 400, { code: "bad", error: "So'rov noto'g'ri." }); }
  const kind = KINDS.includes(b.kind) ? b.kind : "ask";
  // normalize turns: only user/assistant text, merged when the same role repeats, ending on the user
  const msgs = [];
  (Array.isArray(b.messages) ? b.messages : []).slice(-9).forEach(m => {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) return;
    const c = m.content.slice(0, 20000), prev = msgs[msgs.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + c; else msgs.push({ role: m.role, content: c });
  });
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return send(res, 400, { code: "bad", error: "Savol bo'sh." });
  let img = null;
  if (kind !== "ask" && kind !== "plan") {
    if (typeof b.image !== "string" || b.image.length < 100 || b.image.length > 5500000) return send(res, 400, { code: "image", error: "Rasm topilmadi yoki juda katta." });
    img = { data: b.image, mime: ["image/jpeg", "image/png", "image/webp"].includes(b.mime) ? b.mime : "image/jpeg" };
  }
  const model = kind === "body" || kind === "plan" ? P.smart : P.fast;
  const maxOut = kind === "body" || kind === "plan" ? 8000 : kind === "ask" ? 3000 : 2000;
  try {
    const fn = P.p === "anthropic" ? anthropic : P.p === "openai" ? openai : gemini;
    const r = await fn(P, model, msgs, img, maxOut, kind !== "ask");
    if (!r.text) return send(res, 502, { code: "empty", error: "AI bo'sh javob qaytardi. Qayta urinib ko'ring." });
    const pr = price(model);
    send(res, 200, { text: r.text, cut: !!r.cut, provider: P.name, model, usage: { in: r.tin, out: r.tout }, cost: pr ? (r.tin * pr[0] + r.tout * pr[1]) / 1e6 : null });
  } catch (e) {
    const s = e.status || 0;
    if (s === 401 || s === 403) return send(res, 502, { code: "key", error: "API kalit noto'g'ri yoki ruxsati yo'q." });
    if (s === 429) return send(res, 429, { code: "limit", error: "AI limiti yoki balans tugagan. Provayder hisobini tekshiring." });
    if (s === 400 || s === 404) return send(res, 502, { code: "bad_req", error: "AI so'rovni qabul qilmadi: " + String(e.message).slice(0, 200) });
    if (e.name === "TimeoutError" || e.name === "AbortError") return send(res, 504, { code: "timeout", error: "AI uzoq javob bermadi. Qayta urinib ko'ring." });
    return send(res, 502, { code: "busy", error: "AI serveri javob bermadi. Keyinroq urinib ko'ring." });
  }
}
