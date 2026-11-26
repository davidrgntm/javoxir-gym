/* ---------- meal plan: AI suggests breakfast, lunch, snack and dinner for the day's targets ---------- */
const SLOTS = [
  { id: "b", n: "Nonushta", en: "breakfast", t: [5, 11], tt: "07:00–10:00", sh: [0.25, 0.3] },
  { id: "l", n: "Tushlik", en: "lunch", t: [11, 16], tt: "12:00–15:00", sh: [0.35, 0.4] },
  { id: "s", n: "Tamaddi", en: "afternoon snack", t: [16, 18.5], tt: "16:00–18:00", sh: [0.1, 0] },
  { id: "d", n: "Kechki ovqat", en: "dinner", t: [18.5, 24], tt: "19:00–21:00", sh: [0.3, 0.3] }
];
const SLOTMAP = { breakfast: "b", lunch: "l", snack: "s", "afternoon snack": "s", dinner: "d" };
let MENUDAY = null, MENUBUSY = null, MENUERR = "", HOMESCR = null;
const slotsOn = () => SLOTS.filter(s => s.id !== "s" || S.meal.snack);
const slotShare = s => S.meal.snack ? s.sh[0] : s.sh[1];
const nowH = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const menuOf = d => { const m = (S.days[d] || {}).menu; return m && m.meals && Object.keys(m.meals).length ? m : null; };
const itemsLine = m => m.items.map(x => `${x.n}${x.q ? " — " + x.q : ""}`).join(" · ");
function mealTargets(day, slots) {
  const P = PROT(), rows = slots.map(s => ({ s, k: S.kcal * slotShare(s), p: P * slotShare(s) }));
  if (day === todayISO()) {
    const ft = foodTotals(day), sumK = rows.reduce((a, r) => a + r.k, 0), sumP = rows.reduce((a, r) => a + r.p, 0);
    const fk = sumK ? Math.min(1, Math.max(0.35, (S.kcal - ft.k) / sumK)) : 1, fp = sumP ? Math.min(1, Math.max(0.35, (P - ft.p) / sumP)) : 1;
    rows.forEach(r => { r.k *= fk; r.p *= fp; });
  }
  return rows.map(r => ({ s: r.s, k: Math.round(r.k / 10) * 10, p: Math.round(r.p) }));
}
function menuPrompt(day, plan, avoid) {
  const L = LANG() === "ru" ? "Russian" : "Uzbek (Latin script: o', g', sh, ch)", today = day === todayISO();
  const ft = today ? foodTotals(day) : null, eaten = today ? (dayRec(day).food || []).map(x => x.n).slice(-8) : [];
  const gym = (() => { const w = weekNum(day), k = w > 0 ? PLAN[parse(day).getDay()] : null; return k ? `Gym workout that day: ${rname(k)}.` : "Rest day from the gym."; })();
  return `You are a sports nutritionist. Plan ${today ? "today's remaining meals" : "the meals for " + day} for this person.
Person: ${PF().name}, ${BASE.sex === "f" ? "female" : "male"}, ${BASE.age} years, ${BASE.h} cm, ${lastBW().toFixed(1)} kg. Goal: ${G().name} (${S.plan.goal}). Daily target: ${S.kcal} kcal, ${PROT()} g protein. ${gym}
${ft && ft.k ? `Already eaten today: ${Math.round(ft.k)} kcal, ${Math.round(ft.p)} g protein (${eaten.join(", ")}).` : ""}
Meals to plan, with a target for each:
${plan.map(x => `- slot "${x.s.id}" (${x.s.en}): about ${x.k} kcal and ${x.p} g protein`).join("\n")}
The person lives in Tashkent, Uzbekistan. Use foods sold in local shops and bazaars, Uzbek and common Russian or European home dishes, halal. Breakfast and snack take at most 10 minutes; lunch and dinner at most 30 minutes, or are easy to order in a canteen or cafe. Realistic portions with grams or pieces. Every meal must reach its protein target within about 10%.${avoid.length ? ` Do not repeat these dishes: ${avoid.join(", ")}.` : ""}
Preferences and limits from the person: ${S.meal.prefs || "none"}.
Reply with only JSON like {"meals":[{"slot":"b","name":"dish name","how":"one short line: how to make it or where to get it","items":[{"n":"Eggs","q":"3 pcs","p":18,"k":210}]}],"note":"one short practical tip"}
One meal for each listed slot, using exactly the slot letters given. 1-5 items per meal; p = grams of protein and k = kcal of that item as eaten. Write name, how, item names, quantities and note in ${L}, plain words, no markdown.`;
}
function parseMenu(j, plan) {
  const ids = new Set(plan.map(x => x.s.id)), out = {};
  (Array.isArray(j && j.meals) ? j.meals : []).forEach(m => {
    const sl = m && (ids.has(m.slot) ? m.slot : SLOTMAP[String(m.slot || "").toLowerCase()]);
    if (!sl || !ids.has(sl) || out[sl]) return;
    const items = (Array.isArray(m.items) ? m.items : []).map(x => ({ n: aiS(x && x.n, 50), q: aiS(x && x.q, 30), p: Math.max(0, Math.round((num(x && x.p) || 0) * 10) / 10), k: Math.max(0, Math.round(num(x && x.k) || 0)) })).filter(x => x.n && (x.k || x.p)).slice(0, 6);
    if (!items.length) return;
    out[sl] = { slot: sl, name: aiS(m.name, 70) || items[0].n, how: aiS(m.how, 160), items, p: Math.round(items.reduce((a, x) => a + x.p, 0)), k: items.reduce((a, x) => a + x.k, 0), eaten: false };
  });
  return out;
}
async function menuGen(day, slotId) {
  if (!aiOn() || MENUBUSY || !aiCapOk()) return;
  const cur = menuOf(day), today = day === todayISO();
  const cand = slotsOn().filter(s => slotId ? s.id === slotId : !(cur && cur.meals[s.id] && cur.meals[s.id].eaten) && (!today || nowH() < s.t[1]));
  if (!cand.length) { toast("Bugungi ovqat vaqtlari o'tdi — ertangi menyuni tuzing"); return; }
  const plan = mealTargets(day, cand);
  const avoid = [cur, menuOf(addDays(day, -1))].filter(Boolean).flatMap(m => Object.values(m.meals).map(x => x.name)).slice(0, 10);
  MENUBUSY = { day, slot: slotId || null }; MENUERR = ""; renderKeep();
  try {
    const r = await api("/api/ai", { kind: "menu", messages: [{ role: "user", content: menuPrompt(day, plan, avoid) }] });
    aiLog("menu", r);
    const j = parseJSONLoose(r.text), got = parseMenu(j, plan);
    if (!Object.keys(got).length) throw { code: "json", message: "AI javobidan menyu chiqmadi. Qayta urinib ko'ring." };
    const rec = dayRec(day, true);
    if (!rec.menu || !rec.menu.meals) rec.menu = { meals: {}, note: "" };
    if (!slotId) Object.keys(rec.menu.meals).forEach(k => { if (!rec.menu.meals[k].eaten) delete rec.menu.meals[k]; });
    Object.assign(rec.menu.meals, got);
    if (!slotId && j) rec.menu.note = aiS(j.note, 200);
    rec.menu.ts = Date.now();
    touch(); haptic("ok");
  } catch (e) { MENUERR = aiErrText(e); haptic("warning"); }
  MENUBUSY = null;
  if (!S.active || MIN) renderKeep();
}
function menuEat(day, slot) {
  const menu = menuOf(day), m = menu && menu.meals[slot]; if (!m) return;
  const rec = dayRec(day, true), L = rec.food = rec.food || [];
  if (m.eaten) { rec.food = L.filter(x => x.m !== slot); m.eaten = false; touch(); renderKeep(); toast("Bekor qilindi"); return; }
  m.items.forEach(x => L.push({ n: x.n, q: x.q, p: x.p, k: x.k, m: slot }));
  m.eaten = true; touch(); renderKeep(); haptic("ok");
  toast(`${SLOTS.find(s => s.id === slot).n} qo'shildi · +${m.p} g oqsil`);
}
const busySpin = txt => `<div class="aiload" style="padding:8px 0"><span class="spin"></span><span class="xs muted">${txt}</span></div>`;
function mealCard(day, s, m, home) {
  const today = day === todayISO(), busy = MENUBUSY && MENUBUSY.day === day && (MENUBUSY.slot === s.id || (!MENUBUSY.slot && !m.eaten));
  return `<div class="meal ${m.eaten ? "done" : ""}"><div class="meal-h"><span class="xs muted">${home ? (nowH() >= s.t[0] ? "Hozir" : "Keyingi") + ": " : ""}${s.n} · ${s.tt}</span><span class="xs"><b>${m.k}</b> kkal · <b>${m.p}</b> g oqsil</span></div>
    <b class="meal-n" data-notr>${esc(m.name)}</b>${m.how ? `<small class="muted" data-notr>${esc(m.how)}</small>` : ""}<small data-notr>${esc(itemsLine(m))}</small>
    ${busy ? busySpin("AI boshqa variant tanlayapti…") : `<div class="meal-b">${today ? `<button type="button" class="pill sm ${m.eaten ? "ghost" : ""}" data-act="menueat" data-day="${day}" data-slot="${s.id}" aria-pressed="${!!m.eaten}">${m.eaten ? "✓ Yedim" : "Yedim"}</button>` : ""}${home ? `<button type="button" class="pill sm ghost" data-act="gomenu">Menyu ›</button>` : m.eaten ? "" : `<button type="button" class="pill sm ghost" data-act="menuswap" data-day="${day}" data-slot="${s.id}" ${MENUBUSY ? "disabled" : ""}>Boshqasi</button>`}</div>`}</div>`;
}
function mealSection() {
  if (!aiOn()) return "";
  const t = todayISO(), tm = addDays(t, 1), left = slotsOn().some(s => nowH() < s.t[1]);
  const day = MENUDAY === "m" ? tm : MENUDAY === "t" ? t : (left || menuOf(t) ? t : tm);
  const menu = menuOf(day), allBusy = MENUBUSY && MENUBUSY.day === day && !MENUBUSY.slot;
  let h = `<section class="sec" id="menu"><div class="sec-h"><h2 class="D">Menyu</h2><span class="seg">${[["t", "Bugun", t], ["m", "Ertaga", tm]].map(([k, n, d]) => `<button type="button" data-act="menuday" data-v="${k}" aria-pressed="${day === d}">${n}</button>`).join("")}</span></div>`;
  if (!menu) {
    h += `<div class="box"><p class="sm">AI ${day === t ? "bugungi" : "ertangi"} ${slotsOn().map(s => s.n.toLowerCase()).join(", ")} uchun taomlarni me'yoringizga moslab tuzadi: ${big(S.kcal)} kkal, ${PROT()} g oqsil.</p>
      ${allBusy ? busySpin("AI menyu tuzmoqda…") : `<button type="button" class="pill volt block" data-act="menugen" data-day="${day}">Menyu tuzish</button>`}
      ${MENUERR ? `<p class="note">${esc(MENUERR)}</p>` : ""}<button type="button" class="link" data-act="menuprefs" style="justify-self:start">Istaklar va cheklovlar${S.meal.prefs ? " ✓" : ""}</button></div>`;
    return h + `</section>`;
  }
  const ms = slotsOn().map(s => [s, menu.meals[s.id]]), sumK = ms.reduce((a, [, m]) => a + (m ? m.k : 0), 0), sumP = ms.reduce((a, [, m]) => a + (m ? m.p : 0), 0);
  h += `<div style="display:grid;gap:10px">${ms.map(([s, m]) => m ? mealCard(day, s, m) : `<div class="meal empty"><div class="meal-h"><span class="xs muted">${s.n} · ${s.tt}</span></div><span class="sm muted">${day === t && nowH() >= s.t[1] ? "Vaqti o'tgan" : "Rejada yo'q"}</span>${day !== t || nowH() < s.t[1] ? `<div class="meal-b"><button type="button" class="pill sm ghost" data-act="menuswap" data-day="${day}" data-slot="${s.id}" ${MENUBUSY ? "disabled" : ""}>Tuzish</button></div>` : ""}</div>`).join("")}</div>
    <p class="sm">Menyu bo'yicha jami: <b>${big(sumK)}</b> kkal · <b>${Math.round(sumP)}</b> g oqsil <span class="muted">(me'yor ${big(S.kcal)} / ${PROT()} g)</span></p>
    ${menu.note ? `<p class="note" data-notr>${esc(menu.note)}</p>` : ""}${MENUERR ? `<p class="note">${esc(MENUERR)}</p>` : ""}
    ${allBusy ? busySpin("AI menyu tuzmoqda…") : `<div class="row2"><button type="button" class="pill ghost" data-act="menugen" data-day="${day}" ${MENUBUSY ? "disabled" : ""}>Yangi menyu</button><button type="button" class="pill ghost" data-act="menuprefs">Istaklar${S.meal.prefs ? " ✓" : ""}</button></div>`}
    <p class="xs muted">«Yedim» taom tarkibini bugungi ovqatlarga qo'shadi. «Yangi menyu» yeyilganlarini qoldirib, qolganini qayta tuzadi.</p>`;
  return h + `</section>`;
}
function nextMealHome() {
  if (!aiOn()) return "";
  const t = todayISO(), menu = menuOf(t), h = nowH();
  if (!menu) return h < 20 ? `<button type="button" class="planchip" data-act="gomenu"><span><small>Ovqat</small><b>Bugungi menyuni AI tuzib bersin</b></span><span aria-hidden="true">›</span></button>` : "";
  const s = slotsOn().find(x => menu.meals[x.id] && !menu.meals[x.id].eaten && h < x.t[1]);
  return s ? `<section class="sec">${mealCard(t, s, menu.meals[s.id], true)}</section>` : "";
}
function sheetMealPrefs() {
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="Istaklar va cheklovlar"><div class="in">${sheetBar("Istaklar va cheklovlar")}
    <h1 class="D">Ovqat istaklari</h1><p class="sm muted">AI menyuni shularni hisobga olib tuzadi.</p>
    <form id="mealForm" style="display:grid;gap:12px"><div class="field"><label for="mealPrefs">Nima yemaysiz, nima yoqmaydi, qayerda ovqatlanasiz?</label><textarea id="mealPrefs" name="prefs" class="aiq" rows="4" maxlength="400" placeholder="Masalan: baliq yoqmaydi, tushlikni ishxonada yeyman, kechqurun 20:00 dan keyin yemayman">${esc(S.meal.prefs)}</textarea></div>
      <div class="box" style="gap:0"><div class="set-row"><span><b class="sm">Tamaddi</b><br><span class="xs muted">16:00–18:00 orasida yengil ovqat</span></span><button type="button" class="sw" role="switch" aria-checked="${!!S.meal.snack}" aria-label="Tamaddi" data-act="mealsnack"></button></div></div>
      <button type="submit" class="pill block">Saqlash</button></form></div></div>`;
}
/* home screen shortcut (Telegram Bot API 8.0+) */
function hsInit() {
  if (!TG || !tgv("8.0") || typeof TG.checkHomeScreenStatus !== "function") return;
  try { TG.onEvent("homeScreenAdded", () => { HOMESCR = "added"; toast("Telefon ekraniga qo'shildi"); if (!S.active || MIN) render(); }); } catch (e) { /* ignore */ }
  try { TG.checkHomeScreenStatus(st => { HOMESCR = st || null; if (!S.active || MIN) render(); }); } catch (e) { /* unsupported */ }
}
const hsCan = () => !!(TG && HOMESCR && HOMESCR !== "unsupported" && typeof TG.addToHomeScreen === "function");
function hsRow() {
  if (!hsCan()) return "";
  return `<div class="set-row"><span><b class="sm">Telefon ekrani</b><br><span class="xs muted">Ilova belgisi — bir bosishda ochiladi</span></span>${HOMESCR === "added" ? `<span class="sm">✓ Qo'shilgan</span>` : `<button type="button" class="pill sm" data-act="homescr">Qo'shish</button>`}</div>`;
}
function hsHint() {
  if (!hsCan() || HOMESCR === "added" || S.settings.hsHide) return "";
  return `<div class="box" style="grid-template-columns:1fr auto;align-items:center"><span class="sm"><b>Ilovani telefon ekraniga qo'shing</b><br><span class="muted">Keyingi safar bot ochmasdan, bir bosishda ochiladi.</span></span><button type="button" class="x" data-act="hshide" aria-label="Yopish">×</button><button type="button" class="pill block" data-act="homescr" style="grid-column:1/-1">Ekranga qo'shish</button></div>`;
}
