// Returns a progress photo stored in the bot chat. The bot token never reaches the browser.
import { auth, send, tgApi, env } from "./_lib.js";

export default async function handler(req, res) {
  const user = auth(req, res); if (!user) return;
  const fid = new URL(req.url, "http://local").searchParams.get("fid") || "";
  if (!fid || fid.length > 300) return send(res, 400, { code: "bad", error: "fid kerak" });
  try {
    const g = await (await fetch(tgApi("getFile") + "?file_id=" + encodeURIComponent(fid))).json();
    if (!g.ok || !g.result || !g.result.file_path) return send(res, 404, { code: "gone", error: "Foto topilmadi" });
    const f = await fetch(`https://api.telegram.org/file/bot${env("BOT_TOKEN")}/${g.result.file_path}`);
    if (!f.ok) return send(res, 502, { code: "tg", error: "Foto yuklanmadi" });
    const buf = Buffer.from(await f.arrayBuffer());
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=604800");
    res.end(buf);
  } catch (e) {
    send(res, 502, { code: "tg", error: "Telegram'ga ulanib bo'lmadi" });
  }
}
