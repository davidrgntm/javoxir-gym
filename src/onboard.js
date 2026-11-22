/* ---------- first launch: language, profile, AI schedule ---------- */
let ONB = null, BOOTING = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
const ONB_GOALS = ["cut", "endur", "mass", "strength"];
const LEVELS = [["new", "Yangi boshlayapman"], ["mid", "6 oydan ko'p shug'ullanganman"], ["pro", "2 yildan ko'p"]];
function onbStart(step, edit) {
  const p = S.profile || {};
  ONB = { step: step || 0, edit: !!edit, busy: false, err: "", plan: null, d: {
    lang: p.lang || "", name: p.name || (TGUSER && TGUSER.first_name) || "", sex: p.sex || "", age: p.age || "", h: p.h || "", wt: S.profile ? lastBW() : "",
    goal: S.profile ? S.plan.goal : "", focus: S.profile ? S.plan.focus : "none", days: S.profile ? S.plan.days : 3, level: p.level || "", notes: p.notes || "" } };
  render(); scrollTop();
}
const onbOk = () => {
  const d = ONB.d;
  switch (ONB.step) {
    case 0: return !!d.lang;
    case 1: return d.name.trim().length > 0;
    case 2: return (d.sex === "m" || d.sex === "f") && d.age >= 12 && d.age <= 90;
    case 3: return d.h >= 120 && d.h <= 230 && d.wt >= 30 && d.wt <= 250;
    case 4: return ONB_GOALS.includes(d.goal);
    case 5: return [2, 3, 4, 5, 6].includes(d.days) && !!d.level;
    default: return true;
  }
};
function viewOnboard() {
  const d = ONB.d, st = ONB.step, total = 6;
  const dots = `<div class="onb-dots">${Array.from({ length: total }, (_, i) => `<i class="${i < st ? "ok" : i === st ? "now" : ""}"></i>`).join("")}</div>`;
  const nav = (label) => `<div class="onb-nav">${st > (ONB.edit ? 1 : 0) ? `<button type="button" class="pill ghost" data-act="onbback">Orqaga</button>` : "<span></span>"}<button type="button" class="pill volt" data-act="onbnext" ${onbOk() ? "" : "disabled"}>${label || "Davom etish"}</button></div>`;
  let h = `<div class="onb"><div class="onb-in">${st < 6 ? dots : ""}`;
  if (st === 0) {
    h += `<span class="pl-step">Javoxir Gym</span><h1 class="D onb-h">Tilni tanlang<br><span class="muted">Выберите язык</span></h1>
      <div class="onb-langs"><button type="button" class="gcard ${d.lang === "uz" ? "on" : ""}" data-act="onblang" data-v="uz"><b>O'zbekcha</b><span>Lotin yozuvida</span></button><button type="button" class="gcard ${d.lang === "ru" ? "on" : ""}" data-act="onblang" data-v="ru"><b>Русский</b><span>Интерфейс на русском</span></button></div>`;
  } else if (st === 1) {
    h += `<h1 class="D onb-h">Ismingiz nima?</h1><div class="field"><label for="onbName">Ism</label><input id="onbName" data-onb="name" value="${esc(d.name)}" maxlength="30" autocomplete="given-name"></div>` + nav();
  } else if (st === 2) {
    h += `<h1 class="D onb-h">Jinsingiz va yoshingiz</h1><div class="goalgrid">${[["m", "Erkak"], ["f", "Ayol"]].map(([v, n]) => `<button type="button" class="gcard ${d.sex === v ? "on" : ""}" data-act="onbset" data-f="sex" data-v="${v}"><b>${n}</b></button>`).join("")}</div>
      <div class="field"><label for="onbAge">Yosh</label><input id="onbAge" data-onb="age" inputmode="numeric" value="${d.age || ""}" placeholder="25"></div>
      <p class="xs muted">Kaloriya va boshlang'ich vaznlarni to'g'ri hisoblash uchun kerak.</p>` + nav();
  } else if (st === 3) {
    h += `<h1 class="D onb-h">Bo'y va vazn</h1><div class="row2"><div class="field"><label for="onbH">Bo'y, sm</label><input id="onbH" data-onb="h" inputmode="numeric" value="${d.h || ""}" placeholder="170"></div><div class="field"><label for="onbW">Vazn, kg</label><input id="onbW" data-onb="wt" inputmode="decimal" value="${d.wt ? f(d.wt) : ""}" placeholder="65"></div></div>` + nav();
  } else if (st === 4) {
    h += `<h1 class="D onb-h">Maqsadingiz</h1><div class="goalgrid">${ONB_GOALS.map(k => `<button type="button" class="gcard ${d.goal === k ? "on" : ""}" data-act="onbset" data-f="goal" data-v="${k}"><b>${GOALS[k].name}</b><span>${GOALS[k].d}</span></button>`).join("")}</div>
      <h2 class="D" style="font-size:22px">Qaysi joyga ko'proq e'tibor?</h2><div class="chips wrap">${FOCUS.map(([k, n]) => `<button type="button" class="chip" data-act="onbset" data-f="focus" data-v="${k}" aria-pressed="${d.focus === k}">${n}</button>`).join("")}</div>` + nav();
  } else if (st === 5) {
    h += `<h1 class="D onb-h">Haftada necha kun?</h1><span class="seg">${[2, 3, 4, 5, 6].map(n => `<button type="button" data-act="onbset" data-f="days" data-v="${n}" aria-pressed="${d.days === n}">${n} kun</button>`).join("")}</span>
      <h2 class="D" style="font-size:22px">Tajribangiz</h2><div style="display:grid;gap:8px">${LEVELS.map(([k, n]) => `<button type="button" class="chip" style="text-align:left;min-height:48px" data-act="onbset" data-f="level" data-v="${k}" aria-pressed="${d.level === k}">${n}</button>`).join("")}</div>
      <div class="field"><label for="onbNotes">Jarohat, og'riq yoki istaklar (ixtiyoriy)</label><textarea id="onbNotes" data-onb="notes" class="aiq" rows="3" maxlength="300" placeholder="Masalan: tizzam og'riydi, dumbaga ko'proq e'tibor">${esc(d.notes)}</textarea></div>` + nav("Reja tuzish");
  } else if (st === 6) {
    if (ONB.busy) h += `<div class="aiload" style="padding-top:30vh"><span class="spin"></span><b>AI reja tuzmoqda…</b><span class="xs muted">Odatda 15–40 soniya</span></div>`;
    else if (ONB.err) h += `<h1 class="D onb-h">Reja</h1><p class="note">${esc(ONB.err)}</p><button type="button" class="pill block" data-act="onbgen">Qayta urinish</button><button type="button" class="pill ghost block" data-act="onbtpl">AI'siz standart reja</button><button type="button" class="pill ghost block" data-act="onbback">Orqaga</button>`;
    else if (ONB.plan) h += onbPlanView(ONB.plan);
  }
  return h + `</div></div>`;
}
function onbPlanView(pl) {
  const d = ONB.d, prof = onbProfile(), wk = parse(todayISO()).getDay();
  const info = withProfile(prof, { goal: pl.goal, focus: pl.focus, days: pl.custom.days.length, start: todayISO(), deload: false, custom: pl.custom }, () => ({
    rows: ORDER.map(k => ({ day: ROUT[k].day, name: ROUT[k].name, ex: ROUT[k].ex.map(id => { const e = X[id], p = presc(e); return `${X[id].uz} — ${p.s}×${p.r[0] === p.r[1] ? p.r[0] : p.r[0] + "–" + p.r[1]}${e.unit ? " " + e.unit : ""}`; }) })),
    kcal: pl.kcal || kcalBase(), prot: PROT(), g: G()
  }));
  return `<span class="pl-step">${esc(d.name)} uchun</span><h1 class="D onb-h">Sizning rejangiz</h1>
    ${pl.summary ? `<p>${esc(pl.summary)}</p>` : ""}
    <div class="stats"><div class="st"><b>${info.rows.length}</b><span>kun / hafta</span></div><div class="st"><b>${big(info.kcal)}</b><span>kkal / kun</span></div><div class="st"><b>${info.prot} g</b><span>oqsil / kun</span></div></div>
    ${info.rows.map(r => `<div class="box" style="gap:6px"><b>${WD[r.day]} · ${esc(r.name)}</b><ol class="blist sm">${r.ex.map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>`).join("")}
    ${pl.tips && pl.tips.length ? `<section class="sec"><h2 class="D">Maslahatlar</h2><ul class="blist">${pl.tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
    <p class="xs muted">${pl.ai ? "Jadvalni AI tuzdi." : "Standart jadval."} Mashqlarni keyin ham almashtirsa bo'ladi. Har kuni qomat uchun 12 daqiqalik qisqa mashqlar ham bor.</p>
    <button type="button" class="pill volt block" data-act="onbfinish" style="min-height:58px;font-size:18px">Boshlash</button>
    ${pl.ai ? `<button type="button" class="pill ghost block" data-act="onbgen">Boshqa variant</button>` : ""}
    <button type="button" class="pill ghost block" data-act="onbback">Ma'lumotlarni o'zgartirish</button>`;
}
const onbProfile = () => { const d = ONB.d; return { name: d.name.trim().slice(0, 30), sex: d.sex, age: Math.round(d.age), h: Math.round(d.h), wt0: Math.round(d.wt * 10) / 10, lang: d.lang, level: d.level, notes: (d.notes || "").trim().slice(0, 300) }; };
/* render plan numbers for a profile that is not saved yet */
function withProfile(prof, plan, fn) {
  const oldP = S.profile, oldPlan = S.plan, oldDays = S.days;
  S.profile = prof; S.days = Object.assign({}, S.days, { [todayISO()]: Object.assign({}, S.days[todayISO()] || {}, { wt: prof.wt0 }) });
  S.plan = plan; buildPlan(plan);
  try { return fn(); } finally { S.profile = oldP; S.plan = oldPlan; S.days = oldDays; buildPlan(oldPlan); }
}
function planPrompt(prof, d) {
  const L = prof.lang === "ru" ? "Russian" : "Uzbek (Latin script: o', g', sh, ch)";
  const cat = Object.values(X).filter(e => e.kind !== "post").map(e => `${e.id}: ${e.en} (${e.g}, ${e.kind}${COMP.has(e.id) ? ", compound" : ""})`).join("\n");
  return `You are an experienced strength coach. Build a weekly gym schedule for this person.
Person: ${prof.name}, ${prof.sex === "f" ? "female" : "male"}, ${prof.age} years, height ${prof.h} cm, weight ${prof.wt0} kg. Lives in Tashkent, trains in a regular gym.
Goal: ${d.goal} (${{ cut: "lose fat, keep muscle", endur: "endurance and muscle tone", mass: "build muscle", strength: "get stronger" }[d.goal]}). Extra focus wish: ${d.focus === "none" ? "balanced" : d.focus}.
Training days per week: ${d.days}. Experience: ${{ new: "beginner (new to the gym)", mid: "6+ months", pro: "2+ years" }[d.level]}.
Notes from the person: ${prof.notes || "none"}.
Exercise catalog — use ONLY these ids:
${cat}
Rules: exactly ${d.days} training days, spread across the week with rest days between where possible; weekday numbers 1=Monday … 6=Saturday, 0=Sunday. Each day 4–7 exercises, compound movements first. Every major muscle group at least once a week. Beginners get simpler machine and dumbbell moves and fewer exercises. Respect injuries and wishes in the notes. Do not repeat an exercise on the same day.
Daily calories: Mifflin-St Jeor with a sensible activity factor, adjusted for the goal. Protein in grams per day for the goal.
Reply with only JSON like {"goal":"${d.goal}","focus":"${d.focus}","days":[1,3,5],"routines":[{"name":"short day name","ex":["squat","rdl"]}],"kcal":2000,"protein":120,"summary":"2-4 sentences why this plan fits","tips":["up to 3 short tips"]}
routines must have the same length and order as days. Write name, summary and tips in ${L}, plain words, no markdown.`;
}
function parsePlan(j, d) {
  if (!j || typeof j !== "object") return null;
  const days = (Array.isArray(j.days) ? j.days : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  const rs = Array.isArray(j.routines) ? j.routines : [];
  const used = new Set(), out = [], dd = [];
  for (let i = 0; i < Math.min(days.length, rs.length, 6); i++) {
    if (dd.includes(days[i])) continue;
    const ex = [...new Set((Array.isArray(rs[i] && rs[i].ex) ? rs[i].ex : []).map(String))].filter(id => X[id] && X[id].kind !== "post").slice(0, 8);
    if (ex.length < 2) continue;
    ex.forEach(id => used.add(id));
    dd.push(days[i]); out.push({ name: aiS(rs[i].name, 40) || `${out.length + 1}-kun`, ex });
  }
  if (out.length < 2) return null;
  const order = dd.map((day, i) => ({ day: day === 0 ? 7 : day, i })).sort((a, b) => a.day - b.day);
  const custom = { days: order.map(o => dd[o.i]), r: order.map(o => out[o.i]) };
  const k = num(j.kcal);
  return { ai: true, goal: GOALS[j.goal] ? j.goal : d.goal, focus: FOCUS.some(x => x[0] === j.focus) ? j.focus : d.focus, custom, kcal: k >= 1200 && k <= 4500 ? Math.round(k / 10) * 10 : null, summary: aiS(j.summary, 700), tips: aiL(j.tips, 3, 200) };
}
function templatePlan(d) {
  const T = TEMPLATES[Math.min(5, Math.max(3, d.days))];
  return { ai: false, goal: d.goal, focus: d.focus, custom: { days: T.days.slice(), r: T.r.map(r => ({ name: r.name, ex: r.ex.slice() })) }, kcal: null, summary: "", tips: [] };
}
async function onbGenerate() {
  const prof = onbProfile(), d = ONB.d;
  ONB.step = 6; ONB.busy = true; ONB.err = ""; ONB.plan = null; render(); scrollTop();
  if (!TG) { ONB.busy = false; ONB.plan = templatePlan(d); render(); return; }
  try {
    const r = await api("/api/ai", { kind: "plan", messages: [{ role: "user", content: planPrompt(prof, d) }] });
    aiLog("plan", r);
    const pl = parsePlan(parseJSONLoose(r.text), d);
    if (!pl) throw { code: "json", message: "AI javobidan jadval chiqmadi. Qayta urinib ko'ring." };
    if (ONB) ONB.plan = pl;
  } catch (e) {
    if (ONB) ONB.err = e && e.code === "forbidden" ? "AI sizga hali ulanmagan. Standart rejadan boshlasangiz bo'ladi." : aiErrText(e);
  }
  if (ONB) { ONB.busy = false; render(); scrollTop(); haptic(ONB.err ? "warning" : "ok"); }
}
function onbFinish() {
  const prof = onbProfile(), pl = ONB.plan, t = todayISO(), fresh = !realWorkouts().length;
  const oldGoal = S.plan.goal;
  S.profile = Object.assign({}, S.profile || {}, prof);
  dayRec(t, true).wt = prof.wt0;
  S.plan = { goal: pl.goal, focus: pl.focus, days: pl.custom.days.length, start: ONB.edit && !fresh ? S.plan.start : t, deload: false, custom: pl.custom };
  S.routines = {}; buildPlan(S.plan);
  const fac = (prof.sex === "f" ? 0.5 : 1) * (prof.level === "new" ? 0.7 : prof.level === "pro" ? 1.2 : 1);
  Object.values(X).forEach(e => {
    if (e.kind === "post") return;
    if (fresh) S.prog[e.id] = { w: isW(e) ? Math.max(minW(e), roundTo(e.sw * fac, e.inc)) : 0, r: 0 };
    else if (pl.goal !== oldGoal) S.prog[e.id] = { w: S.prog[e.id].w, r: 0 };
  });
  S.kcal = pl.kcal || kcalBase();
  S.ai.plan = { d: t, summary: pl.summary, tips: pl.tips, ai: pl.ai };
  S.active = null; REST = null; MIN = false; ONB = null;
  applyLang(); touch(200); setMenuLang(); location.hash = "#bugun"; render(); scrollTop(); haptic("ok");
}
function onbBack() {
  if (!ONB || ONB.busy) return;
  if (ONB.step === 6) ONB.step = 5;
  else if (ONB.edit && ONB.step <= 1) { ONB = null; applyLang(); }
  else if (ONB.step > 0) ONB.step--;
  render(); scrollTop();
}
function onbInput(el) {
  const k = el.dataset.onb, v = el.value;
  ONB.d[k] = ["age", "h", "wt"].includes(k) ? (num(v) || "") : v;
  const b = document.querySelector('[data-act="onbnext"]'); if (b) b.disabled = !onbOk();
}
function onbClick(a, b) {
  const d = ONB && ONB.d;
  const H = {
    onblang: () => { d.lang = b.dataset.v; applyLang(); ONB.step = 1; render(); scrollTop(); },
    onbset: () => { const fld = b.dataset.f; d[fld] = fld === "days" ? +b.dataset.v : b.dataset.v; const y = window.scrollY; render(); try { window.scrollTo(0, y); } catch (e) { /* ignore */ } },
    onbnext: () => { if (!onbOk()) return; if (ONB.step === 5) onbGenerate(); else { ONB.step++; render(); scrollTop(); } },
    onbback: onbBack,
    onbgen: () => onbGenerate(),
    onbtpl: () => { ONB.err = ""; ONB.plan = templatePlan(d); render(); scrollTop(); },
    onbfinish: () => onbFinish()
  };
  if (H[a]) { H[a](); return true; }
  return false;
}
