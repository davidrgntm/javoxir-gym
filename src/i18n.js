/* ---------- language: data texts are swapped (ru.js), interface texts are translated after each render (ru-dict.js) ---------- */
const LANG = () => { try { return (ONB && ONB.d.lang) || (S && S.profile && S.profile.lang) || "uz"; } catch (e) { return "uz"; } };
let ORIG = null, TOKRE = null;
function snapshotOrig() {
  if (ORIG) return;
  ORIG = { X: {}, GROUPS: GROUPS.map(g => g[1]), FOODS: FOODS.map(x => [x.n, x.q]), GOALS: {}, FOCUS: FOCUS.map(x => x[1]), WARM: WARM.slice(), BADGES: {}, LEVELS: LEVELS.map(x => x[1]), QCHIPS: QCHIPS.slice(), WD: WD.slice(), WD2: WD2.slice(), MONTHS: MONTHS.slice(), MON3: MON3.slice() };
  Object.values(X).forEach(e => { ORIG.X[e.id] = [e.uz, e.prim, e.sec, e.steps.slice(), e.d]; });
  Object.entries(GOALS).forEach(([k, g]) => { ORIG.GOALS[k] = [g.name, g.d, g.rateTxt]; });
  Object.values(TEMPLATES).forEach(T => T.r.forEach(r => { if (!r._uz) r._uz = r.name; }));
  BADGES.forEach(b => { ORIG.BADGES[b.id] = [b.n, b.d]; });
}
const swapArr = (a, b) => { a.splice(0, a.length, ...b); };
function applyLang() {
  snapshotOrig();
  const ru = LANG() === "ru";
  Object.values(X).forEach(e => {
    const o = ORIG.X[e.id], r = RU.X[e.id];
    if (ru && r) { e.uz = r[0]; e.prim = r[1]; e.sec = r[2]; e.steps = r[3]; if (r[4]) e.d = r[4]; }
    else { e.uz = o[0]; e.prim = o[1]; e.sec = o[2]; e.steps = o[3]; e.d = o[4]; }
  });
  GROUPS.forEach((g, i) => { g[1] = ru ? RU.GROUPS[g[0]] || ORIG.GROUPS[i] : ORIG.GROUPS[i]; });
  FOODS.forEach((x, i) => { const r = RU.FOODS[i]; x.n = ru && r ? r[0] : ORIG.FOODS[i][0]; x.q = ru && r ? r[1] : ORIG.FOODS[i][1]; });
  Object.entries(GOALS).forEach(([k, g]) => { const r = RU.GOALS[k], o = ORIG.GOALS[k]; [g.name, g.d, g.rateTxt] = ru && r ? r : o; });
  FOCUS.forEach((x, i) => { x[1] = ru ? RU.FOCUS[x[0]] || ORIG.FOCUS[i] : ORIG.FOCUS[i]; });
  LEVELS.forEach((x, i) => { x[1] = ru ? RU.LEVELS[x[0]] : ORIG.LEVELS[i]; });
  Object.values(TEMPLATES).forEach(T => T.r.forEach(r => { r.name = ru ? RU.ROUTINES[r._uz] || r._uz : r._uz; }));
  BADGES.forEach(b => { [b.n, b.d] = ru && RU.BADGES[b.id] ? RU.BADGES[b.id] : ORIG.BADGES[b.id]; });
  swapArr(WARM, ru ? RU.WARM : ORIG.WARM); swapArr(QCHIPS, ru ? RU.QCHIPS : ORIG.QCHIPS);
  swapArr(WD, ru ? RU.WD : ORIG.WD); swapArr(WD2, ru ? RU.WD2 : ORIG.WD2); swapArr(MONTHS, ru ? RU.MONTHS : ORIG.MONTHS); swapArr(MON3, ru ? RU.MON3 : ORIG.MON3);
  try { buildPlan(S.plan); } catch (e) { /* before state exists */ }
  document.documentElement.lang = ru ? "ru" : "uz";
  buildTokens();
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* data names inside interface sentences become {v}, numbers become {n}: the same sentence then matches whatever name or number it shows */
function buildTokens() {
  const t = new Set();
  Object.values(X).forEach(e => { t.add(e.uz); t.add(e.prim); t.add(e.sec); if (e.d) t.add(e.d); });
  FOODS.forEach(x => t.add(x.q));
  GROUPS.forEach(g => t.add(g[1])); FOCUS.forEach(x => t.add(x[1])); LEVELS.forEach(x => t.add(x[1]));
  Object.values(GOALS).forEach(g => { t.add(g.name); t.add(g.rateTxt); });
  Object.values(TEMPLATES).forEach(T => T.r.forEach(r => t.add(r.name)));
  try { Object.values(ROUT).forEach(r => t.add(r.name)); } catch (e) { /* none yet */ }
  FOODS.forEach(x => t.add(x.n)); WD.forEach(w => t.add(w)); MONTHS.forEach(m => t.add(m)); BADGES.forEach(b => t.add(b.n));
  try { if (S && S.profile && S.profile.name) t.add(S.profile.name); } catch (e) { /* none */ }
  const short = new Set([...WD2, ...MON3]);
  const list = [...t].filter(x => x && (x.length > 2 || short.has(x))).concat([...short]).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => b.length - a.length).map(escRe);
  TOKRE = new RegExp(`(?<![\\p{L}\\d'’])(?:${list.join("|")})(?![\\p{L}\\d'’])|\\d+(?:[.,]\\d+)*`, "gu");
}
function trKey(core) {
  const vals = [];
  const key = core.replace(TOKRE, m => { vals.push(m); return /^\d/.test(m) ? "{n}" : "{v}"; });
  return { key, vals };
}
function trText(t) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t), core = m[2];
  if (!core || !/[A-Za-z]/.test(core)) return t;
  if (window.__HARVEST) { window.__HARVEST.add(trKey(core).key); return t; }
  let out = RUD[core];
  if (out === undefined) {
    const { key, vals } = trKey(core);
    const tpl = RUD[key];
    if (tpl !== undefined) { let i = 0; out = tpl.replace(/\{[vn]\}/g, () => (vals[i++] ?? "")); }
    else out = RUF.reduce((s, [a, b]) => s.replace(a, b), core);
  }
  return m[1] + out + m[3];
}
const TR_SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);
function trDOM(root) {
  if (!root || (LANG() !== "ru" && !window.__HARVEST)) return;
  if (!TOKRE) buildTokens();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) { if (TR_SKIP.has(p.tagName.toUpperCase()) || (p.dataset && p.dataset.notr !== undefined)) return NodeFilter.FILTER_REJECT; } return NodeFilter.FILTER_ACCEPT; } });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { const v = trText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
  root.querySelectorAll("[placeholder],[aria-label],[alt],[title]").forEach(el => ["placeholder", "aria-label", "alt", "title"].forEach(a => { const v = el.getAttribute(a); if (v && !el.closest("[data-notr]")) { const x = trText(v); if (x !== v) el.setAttribute(a, x); } }));
}
function setMenuLang() { if (TG) api("/api/send", { type: "menu", text: LANG() === "ru" ? "Открыть" : "Ochish" }).catch(() => { /* keeps default */ }); }
