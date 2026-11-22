// Sends a progress photo or a file (CSV export) to the user's own chat with the bot, so Telegram stores it.
import { auth, send, readJSON, tgApi } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method", error: "POST kerak" });
  const user = auth(req, res); if (!user) return;
  let b;
  try { b = await readJSON(req); } catch (e) { return send(res, 400, { code: "bad", error: "So'rov noto'g'ri." }); }
  try {
    if (b.type === "menu") {
      const text = String(b.text || "Ochish").slice(0, 20);
      const url = `https://${req.headers["x-forwarded-host"] || req.headers.host}/`;
      const r = await fetch(tgApi("setChatMenuButton"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: user.id, menu_button: { type: "web_app", text, web_app: { url } } }) });
      const j = await r.json().catch(() => ({}));
      return send(res, 200, { ok: !!j.ok });
    }
    if (b.type === "delete") {
      const r = await fetch(tgApi("deleteMessage"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: user.id, message_id: Number(b.mid) }) });
      const j = await r.json().catch(() => ({}));
      return send(res, 200, { ok: !!j.ok });
    }
    if (typeof b.data !== "string" || !b.data || b.data.length > 5500000) return send(res, 400, { code: "bad", error: "Fayl topilmadi yoki juda katta." });
    const buf = Buffer.from(b.data, "base64"), photo = b.type !== "doc";
    const fd = new FormData();
    fd.append("chat_id", String(user.id));
    if (b.caption) fd.append("caption", String(b.caption).slice(0, 900));
    if (photo) fd.append("photo", new Blob([buf], { type: "image/jpeg" }), "progress.jpg");
    else fd.append("document", new Blob([buf], { type: String(b.mime || "text/csv") }), String(b.name || "fayl.csv").replace(/[^\w.\-]/g, "_"));
    const r = await fetch(tgApi(photo ? "sendPhoto" : "sendDocument"), { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) {
      if (j.error_code === 403) return send(res, 403, { code: "start", error: "Bot sizga yoza olmayapti: botga /start yozing." });
      return send(res, 502, { code: "tg", error: "Telegram qabul qilmadi: " + (j.description || r.status) });
    }
    if (!photo) return send(res, 200, { ok: true, mid: j.result.message_id });
    const ph = j.result.photo || [];
    return send(res, 200, { ok: true, fid: ph.length ? ph[ph.length - 1].file_id : null, mid: j.result.message_id });
  } catch (e) {
    return send(res, 502, { code: "tg", error: "Telegram'ga ulanib bo'lmadi." });
  }
}
