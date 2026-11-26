/* ---------- AI murabbiy: requests go to /api/ai, where the API key stays on the server ---------- */
const AIN = { scale: "Tarozi", body: "Tana", food: "Ovqat", ask: "Savol", plan: "Reja", menu: "Menyu" };
const AIK = ["scale", "body", "food", "ask", "plan", "menu"];
const AIICON = {
  scale: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 10a4 4 0 0 1 8 0"/><path d="M12 10l1.6-2.2"/></svg>',
  body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.8" r="2.3"/><path d="M6 9.5c1.8-1.2 3.8-1.7 6-1.7s4.2.5 6 1.7l-1.6 5.3h-2.6L13.3 21h-2.6l-.5-6.2H7.6z"/></svg>',
  food: '<svg viewBox="0 0 24 24"><circle cx="13" cy="13" r="7.5"/><circle cx="13" cy="13" r="3.5"/><path d="M3 3v4.5M1.8 3v3a1.2 1.2 0 0 0 2.4 0V3M3 8v8"/></svg>',
  ask: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>'
};
const QCHIPS = ["Bugun yana nima yesam bo'ladi?", "Vaznim to'g'ri ketyaptimi?", "Qaysi mashqda orqada qolyapman?", "Charchadim, bugun zalga boraymi?"];
let AIKIND = "scale", AICTL = null, AIQ = "", AIA = null, AIINFO = null;
const aiOn = () => !!TG;
const aiDay = d => S.ai.use[d] || {};
const aiN = u => AIK.reduce((a, k) => a + (u[k] || 0), 0);
function aiSum(prefix) {
  const o = { tok: 0, usd: 0, nousd: 0 }; AIK.forEach(k => { o[k] = 0; });
  Object.keys(S.ai.use).forEach(d => { if (d.startsWith(prefix)) AIK.concat(["tok", "usd", "nousd"]).forEach(k => { o[k] += S.ai.use[d][k] || 0; }); });
  o.n = aiN(o); return o;
}
function aiLog(kind, r) {
  const d = todayISO(), u = S.ai.use[d] = S.ai.use[d] || {};
  u[kind] = (u[kind] || 0) + 1;
  u.tok = (u.tok || 0) + ((r.usage && (r.usage.in + r.usage.out)) || 0);
  if (typeof r.cost === "number") u.usd = Math.round(((u.usd || 0) + r.cost) * 1e6) / 1e6; else u.nousd = (u.nousd || 0) + 1;
  AIINFO = { provider: r.provider, model: r.model };
  S.ai.last = AIINFO;
  const cut = addDays(d, -400); Object.keys(S.ai.use).forEach(k => { if (k < cut) delete S.ai.use[k]; });
  touch();
}
const kTok = n => n >= 1000000 ? f(Math.round(n / 100000) / 10) + " mln" : n >= 1000 ? f(Math.round(n / 100) / 10) + " ming" : String(Math.round(n));
const usd = n => n === 0 ? "$0" : n < 0.01 ? "$" + n.toFixed(4) : n < 1 ? "$" + n.toFixed(3) : "$" + n.toFixed(2);
const cleanAns = s => String(s || "").replace(/\*\*/g, "").replace(/^#{1,6}\s*/gm, "").trim();
const aiS = (v, n) => typeof v === "string" ? v.trim().slice(0, n || 400) : "";
const aiL = (v, k, n) => Array.isArray(v) ? v.map(x => aiS(x, n || 220)).filter(Boolean).slice(0, k || 4) : [];
function parseJSONLoose(t) {
  t = String(t || "").trim();
  try { return JSON.parse(t); } catch (e) { /* try fenced / embedded */ }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch (e) { /* next */ } }
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* none */ } }
  return null;
}
function aiContext() {
  const st = weightStats(), t = todayISO(), ft = foodTotals(t), L = realWorkouts().slice(-5);
  const md = Object.keys(S.meas).sort(), m = md.length ? S.meas[md[md.length - 1]] : null;
  return [
    `User: ${PF().name}, ${BASE.sex === "f" ? "female" : "male"}, ${BASE.age} years, height ${BASE.h} cm, current weight ${lastBW().toFixed(1)} kg (start ${BASE.wt} kg)${st.avg7 ? `, 7-day average ${st.avg7.toFixed(1)} kg` : ""}${st.perMonth !== undefined ? `, trend ${st.perMonth.toFixed(2)} kg/month` : ""}. Lives in Tashkent.`,
    PF().notes ? `Notes from the user: ${PF().notes}` : "",
    `Experience: ${{ new: "beginner", mid: "6+ months", pro: "2+ years" }[PF().level] || "6+ months"}.`,
    `Goal: ${G().name} (${S.plan.goal}); focus muscle group: ${S.plan.focus}; ${S.plan.days} gym days per week; week ${Math.max(0, weekNum(t))} of the current plan (started ${S.plan.start}); target weight change: ${G().rateTxt}.${S.plan.deload ? " Deload week now." : ""}`,
    `Daily targets: ${S.kcal} kcal, protein ${PROT()} g. Eaten today so far: ${Math.round(ft.k)} kcal, ${Math.round(ft.p)} g protein.`,
    m ? `Last body measurements (${md[md.length - 1]}): ${Object.entries(m).map(([k, v]) => `${k} ${v} cm`).join(", ")}.` : "",
    `Workouts done in total: ${realWorkouts().length}.` + (L.length ? " Recent: " + L.map(w => `${w.date} ${rname(w.k)} (${Math.round(w.vol)} kg volume${(w.prs || []).length ? ", " + w.prs.length + " PR" : ""})`).join("; ") + "." : ""),
    "Main lifts, current working weight x target reps: " + MAIN.map(id => `${X[id].en} ${S.prog[id].w} kg x ${S.prog[id].r || presc(X[id]).r[0]}`).join(", ") + "."
  ].filter(Boolean).join("\n");
}
const UZL = () => LANG() === "ru" ? "Write all text in Russian, plain everyday words. No markdown." : "Write all text in Uzbek using the Latin alphabet (o', g', sh, ch), plain everyday words. No English, no Cyrillic, no markdown.";
const AIP = {
  scale: () => `The attached photo was taken by the user of their bathroom scale display. Read the weight number on the display exactly.
Reply with only JSON like {"ok": true, "weight": 72.4, "unit": "kg", "sure": "high", "note": ""}
- ok: false if there is no scale display or the digits are not readable; then "note" gives one short tip (closer, less glare, straight angle).
- unit: "kg" or "lb" as shown (kg if no unit is visible). sure: "high", "medium" or "low". Never invent digits you cannot see.
${UZL()}`,
  body: prev => `The attached photo is the user's own mirror progress photo, which they share for fitness coaching.
${aiContext()}
${prev ? `Previous analysis (${prev.d}): ${prev.summary} Body fat estimate then: ${prev.bf || "-"}.` : "This is their first analyzed photo."}
Assess only what is visible and useful for training: muscle development and proportions by muscle group, visible posture (shoulder level, rounded shoulders, forward head, pelvic tilt) if the angle shows it, and a rough body-fat range. Be honest and specific, not flattering; no medical diagnosis. If there is a previous analysis, say what looks different, remembering that light, angle and pump change photos and real change takes weeks. Tie the tips to their goal and plan.
Reply with only JSON like {"photo_ok": true, "photo_tip": "", "bf": "16-19%", "summary": "2-3 sentences", "strong": ["..."], "work_on": ["..."], "posture": "1-2 sentences, empty if not visible", "tips": ["up to 3 concrete actions"], "short": "one line under 90 characters for their history"}
photo_ok false (with photo_tip on how to retake) if the body is not visible enough to judge.
${UZL()}`,
  food: () => `The attached photo shows a meal the user is about to eat (Tashkent, Uzbekistan; common dishes: osh/plov, lag'mon, manti, shashlik, somsa, non, sho'rva, salads, eggs, chicken, tvorog).
Identify each food item, estimate its portion, protein grams and kcal. Be realistic about the oil in Uzbek dishes.
Reply with only JSON like {"ok": true, "items": [{"n": "Osh", "q": "1 lagan ~350 g", "p": 18, "k": 650}], "note": "one short sentence about uncertainty or a protein tip"}
ok false with empty items if no food is visible.
${UZL()}`,
  ask: () => `You are a concise, practical gym and nutrition coach inside the user's training app. Their data:
${aiContext()}
Answer the latest question using this data. Up to about 120 words, concrete numbers where useful, short lines or "- " bullets. If they mention pain or injury, give safe general advice and say to see a doctor if it persists. No medical diagnosis.
${UZL()}`
};
function aiParse(kind, r) {
  r = r && typeof r === "object" ? r : {};
  if (kind === "scale") {
    let w = num(r.weight);
    if (w && String(r.unit || "").toLowerCase().startsWith("lb")) w *= 0.45359237;
    const ok = r.ok !== false && w >= 30 && w <= 250;
    return { ok, w: ok ? Math.round(w * 10) / 10 : null, sure: aiS(r.sure, 10) || "medium", note: aiS(r.note, 200) };
  }
  if (kind === "food") {
    const items = (Array.isArray(r.items) ? r.items : []).map(x => ({ n: aiS(x && x.n, 40) || "Ovqat", q: aiS(x && x.q, 40), p: Math.max(0, Math.round((num(x && x.p) || 0) * 10) / 10), k: Math.max(0, Math.round(num(x && x.k) || 0)) })).filter(x => x.p || x.k).slice(0, 12);
    return { ok: items.length > 0, items, note: aiS(r.note, 200) };
  }
  return { photo_ok: r.photo_ok !== false, photo_tip: aiS(r.photo_tip, 200), bf: aiS(r.bf, 20), summary: aiS(r.summary, 700), strong: aiL(r.strong, 4), work_on: aiL(r.work_on, 4), posture: aiS(r.posture, 300), tips: aiL(r.tips, 3), short: aiS(r.short, 110) };
}
function aiErrText(e) {
  const c = e && e.code;
  if (c === "forbidden" || c === "no_key" || c === "setup" || c === "key" || c === "limit" || c === "auth" || c === "start") return e.message;
  if (c === "net") return "Internet yo'q yoki server javob bermadi. Qayta urinib ko'ring.";
  if (c === "json") return "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring.";
  return (e && e.message) || "Xato. Qayta urinib ko'ring.";
}
function aiCapOk() {
  const n = aiN(aiDay(todayISO()));
  if (n < S.ai.cap) return true;
  ask("Bugungi AI limiti tugadi", `Kunlik limit — ${S.ai.cap} ta so'rov (bugun ${n} ta). Kerak bo'lsa, AI murabbiy → Rasxod bo'limida oshiring.`, [{ t: "Limitni ochish", fn: () => { SHEET = { type: "ai" }; } }, { t: "Yopish", cls: "ghost" }]);
  return false;
}
function aiClose() {
  if (AICTL) { AICTL.abort(); AICTL = null; }
  if (SHEET && SHEET.url) { try { URL.revokeObjectURL(SHEET.url); } catch (e) { /* ignore */ } }
  const bk = SHEET && SHEET.back; SHEET = bk || null;
}
function renderKeep() { const sh = overlay.querySelector(".sheet"), y = sh ? sh.scrollTop : 0; render(); const s2 = overlay.querySelector(".sheet"); if (s2) s2.scrollTop = y; }
async function aiPhoto(kind, file) {
  if (!file || !aiOn() || !aiCapOk()) return;
  let blob;
  try { blob = await shrink(file, 1280, 0.85); } catch (e) { blob = /^image\/(jpeg|png|webp)$/.test(file.type) ? file : null; }
  if (!blob) { toast("Bu rasmni ochib bo'lmadi — JPG yoki PNG tanlang"); return; }
  const back = SHEET && SHEET.type === "ai" ? { type: "ai" } : SHEET && SHEET.back ? SHEET.back : null;
  if (SHEET && SHEET.url) { try { URL.revokeObjectURL(SHEET.url); } catch (e) { /* ignore */ } }
  if (AICTL) AICTL.abort();
  const ctl = { aborted: false, abort() { this.aborted = true; } }; AICTL = ctl;
  const s = { type: "aires", kind, st: "load", url: URL.createObjectURL(blob), blob, back };
  SHEET = s; renderOverlay(); const sh = overlay.querySelector(".sheet"); if (sh) sh.scrollTop = 0;
  const t = todayISO(), prev = S.ai.body.filter(z => z.d < t).pop();
  try {
    const r = await api("/api/ai", { kind, messages: [{ role: "user", content: kind === "body" ? AIP.body(prev) : AIP[kind]() }], image: await b64(blob), mime: blob.type || "image/jpeg" });
    aiLog(kind, r);
    if (ctl.aborted) { if (!S.active || MIN) render(); return; }
    const j = parseJSONLoose(r.text);
    if (!j) throw { code: "json" };
    s.r = aiParse(kind, j); s.st = "ok";
    if (kind === "body" && s.r.photo_ok) {
      const en = { d: t, ts: Date.now(), wt: lastBW() }; ["bf", "summary", "strong", "work_on", "posture", "tips", "short"].forEach(k => { en[k] = s.r[k]; });
      S.ai.body.push(en); if (S.ai.body.length > 52) S.ai.body.splice(0, S.ai.body.length - 52);
      s.ts = en.ts; touch();
    }
  } catch (e) {
    if (ctl.aborted) return;
    s.st = "err"; s.err = aiErrText(e);
  } finally { if (AICTL === ctl) AICTL = null; }
  if (SHEET === s) { renderKeep(); haptic(s.st === "ok" ? "ok" : "warning"); } else if (!S.active || MIN) render();
}
async function aiAsk(q) {
  q = String(q || "").trim();
  if (!q || !aiOn() || (AIA && AIA.st === "load") || !aiCapOk()) return;
  const ctl = { aborted: false, abort() { this.aborted = true; } }; AICTL = ctl;
  AIA = { q, text: "", st: "load" }; AIQ = "";
  renderKeep();
  const T = [{ role: "user", content: AIP.ask() }];
  S.ai.qa.filter(x => x.d === todayISO()).slice(-2).forEach(x => { T.push({ role: "user", content: x.q }); T.push({ role: "assistant", content: x.a }); });
  T.push({ role: "user", content: q });
  try {
    const r = await api("/api/ai", { kind: "ask", messages: T });
    aiLog("ask", r);
    if (ctl.aborted) { AIA = null; return; }
    S.ai.qa.push({ d: todayISO(), q: q.slice(0, 300), a: cleanAns(r.text).slice(0, 2500) + (r.cut ? " …" : "") });
    if (S.ai.qa.length > 20) S.ai.qa.splice(0, S.ai.qa.length - 20);
    AIA = null; touch(); haptic("ok");
  } catch (e) {
    if (ctl.aborted) { AIA = null; AIQ = q; }
    else { AIA = { q, text: "", st: "err", err: aiErrText(e) }; AIQ = q; }
  } finally { if (AICTL === ctl) AICTL = null; }
  if (SHEET && SHEET.type === "ai") renderKeep(); else if (!S.active || MIN) render();
}
function aiTiles() {
  const T = [["scale", "vaznni o'qiydi"], ["body", "rasm tahlili"], ["food", "oqsil, kkal"], ["ask", "maslahat"]];
  return `<div class="aigrid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${T.map(([k, sub]) => `<button type="button" class="ait" data-act="${k === "ask" ? "aihub" : "aipick"}" data-k="${k}"><i>${AIICON[k]}</i><b>${AIN[k]}</b><small>${sub}</small></button>`).join("")}</div>`;
}
function aiHomeSection() {
  if (!aiOn()) return "";
  const n = aiN(aiDay(todayISO()));
  return `<section class="sec"><div class="sec-h"><h2 class="D">AI murabbiy</h2><button type="button" class="link" data-act="aihub" data-k="use">Bugun ${n}/${S.ai.cap}</button></div>${aiTiles()}</section>`;
}
function sheetAI() {
  const t = todayISO(), td = aiN(aiDay(t)), m = aiSum(t.slice(0, 7)), pm = aiSum(addDays(t.slice(0, 8) + "01", -1).slice(0, 7)), info = AIINFO || S.ai.last;
  const busy = AIA && AIA.st === "load";
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="AI murabbiy"><div class="in">${sheetBar("AI murabbiy")}
    <h1 class="D">AI murabbiy</h1><p class="sm muted">Rasm yuboring yoki savol bering — javob rejangiz, vazningiz va mashg'ulotlaringizni hisobga oladi.</p>
    ${aiTiles()}
    <section class="sec"><h2 class="D">Savol</h2>
      <form id="aiForm" style="display:grid;gap:8px"><label class="xs muted" for="aiQ">Masalan: «Bugun nima yesam bo'ladi?»</label><textarea id="aiQ" name="q" class="aiq" rows="3" maxlength="600" placeholder="Savolingizni yozing…">${esc(AIQ)}</textarea><button type="submit" class="pill block" ${busy ? "disabled" : ""}>${busy ? "Javob kutilmoqda…" : "Yuborish"}</button></form>
      <div class="chips">${QCHIPS.map((c, i) => `<button type="button" class="chip" data-act="aiqchip" data-i="${i}" ${busy ? "disabled" : ""}>${esc(c)}</button>`).join("")}</div>
      ${AIA ? `<div class="box"><b class="sm">${esc(AIA.q)}</b>${busy ? `<div class="aiload" style="padding:6px 0"><span class="spin"></span><span class="xs muted">Javob yozilmoqda…</span></div><button type="button" class="pill sm ghost" data-act="aistop">To'xtatish</button>` : ""}${AIA.st === "err" ? `<p class="note">${esc(AIA.err)}</p>` : ""}</div>` : ""}
      ${S.ai.qa.length ? `<div>${S.ai.qa.slice(-5).reverse().map(x => `<div class="qa" data-notr><b class="sm">${esc(x.q)}</b><span class="xs muted">${short(x.d)}</span><div class="ans sm">${esc(x.a)}</div></div>`).join("")}</div>` : ""}
    </section>
    <section class="sec"><div class="sec-h"><h2 class="D">Tana tahlillari</h2><span class="xs muted">${S.ai.body.length} ta</span></div>
      ${S.ai.body.length ? `<div>${S.ai.body.slice().reverse().map(z => `<button type="button" class="li" data-act="aibody" data-ts="${z.ts}"><span class="grow"><b class="sm">${human(z.d)}${z.bf ? " · yog' ~" + esc(z.bf) : ""}</b><small>${esc(z.short || (z.summary || "").slice(0, 90))}</small></span><span class="muted">›</span></button>`).join("")}</div>` : `<p class="sm muted">Oyna oldida tushgan rasmingizni yuboring. Haftada 1 marta, bir xil joy va yorug'likda — shunda o'zgarish aniq ko'rinadi.</p>`}
    </section>
    <section class="sec" id="aiuse"><h2 class="D">Rasxod</h2>
      <div class="stats"><div class="st"><b>${td}/${S.ai.cap}</b><span>bugun so'rov</span></div><div class="st"><b>${m.n}</b><span>bu oy so'rov</span></div><div class="st"><b>${usd(m.usd)}${m.nousd ? "+" : ""}</b><span>bu oy, AI narxi</span></div></div>
      <div class="kinds" style="grid-template-columns:repeat(3,1fr)">${AIK.map(k => `<div><b>${m[k]}</b><span>${AIN[k]}</span></div>`).join("")}</div>
      <p class="sm">Bu oy ≈ ${kTok(m.tok)} token${m.n ? ` · o'rtacha ${usd(m.usd / Math.max(1, m.n - m.nousd))} / so'rov` : ""}. O'tgan oy: ${pm.n} so'rov, ${usd(pm.usd)}.</p>
      <div class="box" style="gap:0"><div class="set-row"><span><b class="sm">Kunlik limit</b><br><span class="xs muted">Shundan oshsa, AI yuborilmaydi</span></span><span class="seg">${[5, 10, 20, 30].map(n => `<button type="button" data-act="aicap" data-v="${n}" aria-pressed="${S.ai.cap === n}">${n}</button>`).join("")}</span></div></div>
      <p class="xs muted">${info ? `Model: ${esc(info.provider || "")} · ${esc(info.model || "")}. ` : ""}Narx — API javobidagi aniq token soni × provayder narxi (USD). Hosting bepul. Tejash uchun: tarozi, ovqat va savollar arzon modelda; har so'rovda 1 ta rasm, yuborishdan oldin kichraytiriladi.${m.nousd ? " «+» — narxi noma'lum model ishlatilgan so'rovlar bor." : ""}</p>
    </section></div></div>`;
}
function sheetAIRes(s) {
  const k = s.kind, r = s.r || {}, small = s.st === "ok" && k !== "body";
  let h = `<div class="sheet" role="dialog" aria-modal="true" aria-label="AI: ${AIN[k]}"><div class="in">${sheetBar("AI · " + AIN[k])}`;
  if (s.url) h += `<img class="aiimg ${small ? "small" : ""}" src="${esc(s.url)}" alt="Yuborilgan rasm">`;
  else if (r.fid) h += photoImg({ fid: r.fid, date: r.d }, 'class="aiimg" style="min-height:200px"');
  const retake = `<button type="button" class="pill ghost block" data-act="aipick" data-k="${k}">Boshqa rasm</button>`;
  if (s.st === "load") return h + `<div class="aiload"><span class="spin"></span><b>AI ko'ryapti…</b><span class="xs muted">${k === "body" ? "Odatda 10–40 soniya" : "Bir necha soniya"}</span></div><button type="button" class="pill ghost block" data-act="close">To'xtatish</button></div></div>`;
  if (s.st === "err") return h + `<p class="note">${esc(s.err)}</p>${s.blob ? `<button type="button" class="pill block" data-act="airetry">Qayta urinish</button>` : ""}${retake}</div></div>`;
  if (k === "scale") {
    if (!r.ok) return h + `<p class="note">${esc(r.note || "Tarozi raqamlari o'qilmadi.")}</p>${retake}</div></div>`;
    const t = todayISO(), cur = dayRec(t).wt, E = weightStats().E.filter(e => e.d < t), last = E[E.length - 1];
    const warn = last && Math.abs(r.w - last.y) > 2.5 ? `Oxirgi yozuv: ${f1(last.y)} kg (${human(last.d)}). Farq katta — rasmni tekshiring.` : "";
    return h + `<div class="box" style="justify-items:center;text-align:center"><span class="xs muted" style="font-weight:700;letter-spacing:.1em;text-transform:uppercase">Tarozida</span><span class="bigv">${f1(r.w)} kg</span>${r.sure !== "high" ? `<span class="sm muted">Aniq o'qilmadi — tekshirib oling</span>` : ""}</div>
      ${warn || r.note ? `<p class="note">${esc([warn, r.note].filter(Boolean).join(" "))}</p>` : ""}
      <div class="field"><label for="aiw">To'g'ri bo'lmasa, tuzating (kg)</label><input id="aiw" inputmode="decimal" value="${f(r.w)}"></div>
      <button type="button" class="pill block" data-act="aiwsave" style="min-height:58px">Bugungi vazn sifatida saqlash</button>
      ${cur ? `<p class="xs muted">Bugun ${f(cur)} kg yozilgan — yangisi bilan almashtiriladi.</p>` : ""}</div></div>`;
  }
  if (k === "food") {
    if (!r.ok && !(r.items && r.items.length)) return h + `<p class="note">${esc(r.note || "Rasmda ovqat aniqlanmadi.")}</p>${retake}</div></div>`;
    const tp = r.items.reduce((a, x) => a + x.p, 0), tk = r.items.reduce((a, x) => a + x.k, 0);
    return h + `<section class="sec"><div class="sec-h"><h2 class="D">Aniqlandi</h2><span class="xs muted">taxminiy</span></div>${r.items.length ? `<div>${r.items.map((x, i) => `<div class="li"><span class="grow"><b class="sm">${esc(x.n)}</b><small>${x.q ? esc(x.q) + " · " : ""}${f(x.p)} g oqsil · ${x.k} kkal</small></span><button type="button" class="x" data-act="aifoodx" data-i="${i}" aria-label="${esc(x.n)} — olib tashlash">×</button></div>`).join("")}</div>` : `<p class="sm muted">Hammasi olib tashlandi.</p>`}</section>
      <div class="stats" style="grid-template-columns:1fr 1fr"><div class="st"><b>${Math.round(tp)} g</b><span>oqsil</span></div><div class="st"><b>${big(tk)}</b><span>kkal</span></div></div>
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ""}
      ${r.items.length ? `<button type="button" class="pill block" data-act="aifoodadd" style="min-height:58px">Bugungi ovqatlarga qo'shish</button>` : ""}
      <p class="xs muted">Noto'g'ri aniqlangan bo'lsa, × bilan olib tashlang. Porsiya rasmdan taxmin qilinadi.</p></div></div>`;
  }
  if (r.photo_ok === false) return h + `<p class="note">${esc(r.photo_tip || "Tana yetarli ko'rinmayapti.")}</p>${retake}</div></div>`;
  const list = (title, L, ol) => L && L.length ? `<section class="sec"><h2 class="D">${title}</h2><${ol ? "ol" : "ul"} class="blist">${L.map(x => `<li>${esc(x)}</li>`).join("")}</${ol ? "ol" : "ul"}></section>` : "";
  const saved = s.saved || !!r.fid;
  return h + `${s.hist ? `<p class="sm muted">${human(r.d)}</p>` : ""}
    <div class="stats" style="grid-template-columns:1fr 1fr"><div class="st"><b>${esc(r.bf || "—")}</b><span>yog' (taxminiy)</span></div><div class="st"><b>${r.wt ? f1(r.wt) : f1(lastBW())}</b><span>kg, o'sha kungi vazn</span></div></div>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ""}
    ${list("Kuchli tomonlar", r.strong)}${list("Ustida ishlash kerak", r.work_on)}
    ${r.posture ? `<section class="sec"><h2 class="D">Qomat</h2><p class="sm">${esc(r.posture)}</p></section>` : ""}
    ${list("Nima qilamiz", r.tips, true)}
    ${s.blob && !saved ? `<button type="button" class="pill ghost block" data-act="aisavephoto">Progress fotolarga saqlash</button>` : saved && s.blob ? `<p class="sm muted">✓ Progress fotolarga saqlandi</p>` : ""}
    <p class="xs muted">AI bahosi taxminiy: yorug'lik, burchak va pump natijaga ta'sir qiladi. Real o'zgarish haftalarda ko'rinadi — haftada 1 marta, bir xil joy va yorug'likda suratga oling.</p></div></div>`;
}
