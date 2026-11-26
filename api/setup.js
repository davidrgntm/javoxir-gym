// One-time bot setup: open https://<your-app>.vercel.app/api/setup once after deploy.
// Sets the bot's menu button to open this Mini App, so nothing has to be configured in BotFather by hand.
import { send, tgApi, env } from "./_lib.js";

async function tg(method, body) {
  const r = await fetch(tgApi(method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  return r.json().catch(() => ({ ok: false }));
}

export default async function handler(req, res) {
  if (!env("BOT_TOKEN")) return send(res, 500, { ok: false, error: "Vercel'da BOT_TOKEN o'rnatilmagan." });
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host || !/\.vercel\.app$|^[\w.-]+\.[a-z]{2,}$/i.test(host)) return send(res, 400, { ok: false, error: "Noma'lum manzil" });
  const url = `https://${host}/`;
  const me = await tg("getMe");
  if (!me.ok) return send(res, 502, { ok: false, error: "BOT_TOKEN noto'g'ri: " + (me.description || "") });
  const menu = await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "Ochish", web_app: { url } } });
  let avatar = "o'zgarmadi";
  if (new URL(req.url, "http://local").searchParams.get("avatar") === "1") {
    try {
      const img = await fetch(url + "icon.jpg");
      const fd = new FormData();
      fd.append("photo", JSON.stringify({ type: "static", photo: "attach://avatar" }));
      fd.append("avatar", new Blob([await img.arrayBuffer()], { type: "image/jpeg" }), "icon.jpg");
      const a = await (await fetch(tgApi("setMyProfilePhoto"), { method: "POST", body: fd })).json().catch(() => ({}));
      avatar = a.ok ? "Bot rasmi o'rnatildi" : "Bot rasmi o'rnatilmadi: " + (a.description || "xato");
    } catch (e) { avatar = "Bot rasmi o'rnatilmadi"; }
  }
  await tg("setMyShortDescription", { short_description: "Javoxir Gym — mashg'ulot, ovqat va AI murabbiy" });
  send(res, 200, { ok: !!menu.ok, bot: "@" + me.result.username, url, menu: menu.ok ? "Menyu tugmasi «Ochish» o'rnatildi" : (menu.description || "xato"), avatar, allowed_ids: env("ALLOWED_IDS") ? "bor" : "yo'q — ALLOWED_IDS ni kiriting" });
}
