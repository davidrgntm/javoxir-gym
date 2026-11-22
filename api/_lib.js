// Shared helpers for the Vercel functions. Files starting with "_" are not exposed as endpoints.
import crypto from "node:crypto";

const env = k => (process.env[k] || "").trim();

/* Telegram Mini App initData check: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export function checkInitData(initData, botToken, maxAgeSec = 7 * 24 * 3600) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData), hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  const a = Buffer.from(calc, "hex"), b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const age = Date.now() / 1000 - Number(p.get("auth_date") || 0);
  if (!(age < maxAgeSec)) return null;
  try { return JSON.parse(p.get("user") || "null"); } catch (e) { return null; }
}

export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

/* Returns the Telegram user or sends an error response and returns null. */
export function auth(req, res) {
  const token = env("BOT_TOKEN");
  if (!token) { send(res, 500, { code: "setup", error: "Vercel'da BOT_TOKEN o'rnatilmagan." }); return null; }
  const user = checkInitData(req.headers["x-init-data"], token);
  if (!user || !user.id) { send(res, 401, { code: "auth", error: "Telegram tasdig'i o'tmadi. Ilovani bot ichidan qayta oching." }); return null; }
  const allowed = env("ALLOWED_IDS").split(/[\s,]+/).filter(Boolean);
  if (!allowed.includes(String(user.id))) { send(res, 403, { code: "forbidden", id: user.id, error: `Ruxsat yo'q. Sizning Telegram ID: ${user.id} — uni Vercel'da ALLOWED_IDS ga yozing.` }); return null; }
  return user;
}

export async function readJSON(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString("utf8");
  return s ? JSON.parse(s) : {};
}

export const tgApi = (method) => `https://api.telegram.org/bot${env("BOT_TOKEN")}/${method}`;
export { env };
