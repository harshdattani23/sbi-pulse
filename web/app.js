// ============================================================================
// SBI Pulse — front-end (vanilla, no deps)
// ============================================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const mdBold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GRADS = [["#3d6dff", "#a879ff"], ["#16d6c8", "#3d6dff"], ["#2fd27a", "#16d6c8"], ["#ffc03d", "#ff5d73"], ["#a879ff", "#ff5d73"], ["#3d6dff", "#16d6c8"]];
const gradFor = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return GRADS[h % GRADS.length]; };

const state = { customers: [], currentId: null, hour: 11, streak: 0, busy: false };

// ---------------------------------------------------------------------------
async function boot() {
  state.customers = await (await fetch("/api/pulse/customers")).json();
  renderRail();
  wire();
  // deep-link support: /#cockpit /#impact /#studio /#flywheel /#journey:meena
  const h = (location.hash || "").slice(1);
  const [view, arg] = h.split(":");
  if (["cockpit", "impact", "studio", "flywheel"].includes(view)) {
    $(`.tab[data-view="${view}"]`).click();
    return;
  }
  select(arg && state.customers.some((c) => c.id === arg) ? arg : state.customers[0].id);
}

function renderRail() {
  const rail = $("#rail");
  rail.innerHTML = "";
  for (const c of state.customers) {
    const [a, b] = gradFor(c.id);
    const jr = c.journey ? `<div class="jr ${c.journey.isCare ? "care" : ""}">${c.journey.emoji} ${esc(c.journey.name)}</div>` : `<div class="jr none">— no trigger —</div>`;
    const div = document.createElement("div");
    div.className = "persona cust";
    div.dataset.id = c.id;
    div.innerHTML = `
      <div class="avatar" style="background:linear-gradient(140deg,${a},${b})">${c.name[0]}</div>
      <div class="meta">
        <div class="nm">${esc(c.name)}</div>
        ${jr}
      </div>
      ${ring(c.scores.engagement, "brand", "sm")}`;
    div.onclick = () => select(c.id);
    rail.appendChild(div);
  }
}

function ring(v, tone, sz = "") {
  const c = tone === "warn" ? "var(--red)" : tone === "good" ? "var(--green)" : "var(--brand)";
  return `<div class="ring ${sz}" style="--v:${v};--c:${c}"><span>${v}</span></div>`;
}

function wire() {
  $$(".tab").forEach((t) => {
    t.onclick = () => {
      $$(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      const v = t.dataset.view;
      $("#view-journey").classList.toggle("hidden", v !== "journey");
      $("#view-cockpit").classList.toggle("hidden", v !== "cockpit");
      $("#view-impact").classList.toggle("hidden", v !== "impact");
      $("#view-studio").classList.toggle("hidden", v !== "studio");
      $("#view-flywheel").classList.toggle("hidden", v !== "flywheel");
      if (v === "cockpit") loadCockpit();
      if (v === "impact") loadImpact();
      if (v === "studio") loadStudio();
      if (v === "flywheel") loadFlywheel();
    };
  });
  $("#hour").oninput = (e) => { state.hour = +e.target.value; $("#hour-val").textContent = String(state.hour).padStart(2, "0") + ":00"; select(state.currentId); };
  $("#restart").onclick = () => select(state.currentId);
  $("#demo-btn").onclick = () => (state.demo ? stopDemo() : runDemo());
  $("#demo-skip").onclick = stopDemo;
  const ci = $("#chat-input");
  const fire = () => { const v = ci.value.trim(); if (v) { ci.value = ""; send(v, { msg: v }); } };
  $("#chat-send").onclick = fire;
  ci.addEventListener("keydown", (e) => { if (e.key === "Enter") fire(); });
  $("#fly-run").onclick = async () => {
    const b = $("#fly-run"); b.disabled = true; b.textContent = "▶ Running…";
    await loadFlywheel(2000);
    b.disabled = false; b.textContent = "▶ Run 2,000 more interactions";
  };
}

// ---------------------------------------------------------------------------
// Guided demo — scripted walkthrough of the hero beats
// ---------------------------------------------------------------------------
function setTab(v) { $(`.tab[data-view="${v}"]`).click(); }
function caption(t) { $("#demo-cap").textContent = t; }
async function waitIdle() { await sleep(300); for (let i = 0; i < 60 && state.busy; i++) await sleep(150); await sleep(500); }
async function clickOption(which) {
  const btns = $$(".opt-btn");
  if (!btns.length) return;
  (which === "last" ? btns[btns.length - 1] : btns[0]).click();
  await waitIdle();
}

async function stopDemo() {
  state.demo = false;
  $("#demo-overlay").classList.add("hidden");
  document.body.classList.remove("demo-live");
  $("#demo-btn").classList.remove("running");
  $("#demo-btn").textContent = "▶ Guided demo";
}

async function runDemo() {
  state.demo = true;
  document.body.classList.add("demo-live");
  $("#demo-overlay").classList.remove("hidden");
  $("#demo-btn").classList.add("running");
  $("#demo-btn").textContent = "■ Stop demo";
  const beats = [
    async () => { setTab("journey"); caption("SBI Pulse senses behaviours, patterns & life events — and runs journeys, not nudges."); await sleep(2800); },
    async () => { caption("Meena is in a tight month. Watch Pulse suppress the sale and lead with care 🛡️"); await pick("meena"); await sleep(3600); },
    async () => { caption("Neha just got a raise — Gemini opens an investing journey. Watch it adapt to her reply."); await pick("neha"); await sleep(3000); },
    async () => { caption("She hesitates…"); await clickOption("last"); caption("…and the agent adapts — gentler, not pushy. That's a real conversation, not a script."); await sleep(2600); },
    async () => { caption("Now she's in — let's say yes."); await clickOption("first"); caption("Engagement earned, not forced. 🔥"); await sleep(2400); },
    async () => { setTab("impact"); caption("And it works: +20pp uplift vs a randomised holdout — measured on outcomes, not clicks."); await sleep(4200); },
    async () => { setTab("studio"); caption("Every journey is a governed, no-code state machine — business designs, the guardrail engine enforces."); await sleep(3800); },
    async () => { setTab("journey"); caption("SBI Pulse · Pillar 03 · Digital Engagement — proactive, vernacular, consent-native, explainable."); await sleep(3600); },
  ];
  for (const beat of beats) { if (!state.demo) return; await beat(); }
  stopDemo();
}
async function pick(id) { const el = $(`.persona[data-id="${id}"]`); if (el) el.scrollIntoView({ block: "nearest" }); await select(id); }

// ---------------------------------------------------------------------------
// Journey experience
// ---------------------------------------------------------------------------
async function select(id) {
  state.currentId = id;
  state.streak = 0;
  $$(".persona").forEach((p) => p.classList.toggle("active", p.dataset.id === id));
  $("#streak-slot").innerHTML = "";
  $("#chatbar").classList.add("hidden");

  const convo = $("#convo");
  convo.innerHTML = "";
  const stop = showTyping(convo); // show "thinking" during the real LLM latency

  let data;
  try { data = await (await fetch(`/api/pulse/start?id=${id}&hour=${state.hour}`)).json(); }
  finally { stop(); }
  if (state.currentId !== id) return; // a newer selection superseded this one

  state.ai = !!data.ai;
  renderHeader(data);
  renderWhy(data);
  renderAudit(data.audit);

  if (!data.delivered) {
    const silent = data.ai && !data.journey;
    convo.innerHTML = silent
      ? `<div class="rm-note" style="color:var(--purple);border-color:rgba(168,121,255,.35);background:rgba(168,121,255,.08)">🤖 The agent read the data and <b>chose to stay silent</b> — no confident, helpful reason to reach out.</div>`
      : `<div class="rm-note" style="color:var(--red);border-color:rgba(255,93,115,0.35);background:rgba(255,93,115,0.08)">🔕 Outreach suppressed by the governance gate.<br>The insight stays in-app for pull-based discovery only.</div>`;
    return;
  }
  addAgentCard(data.step);
  if (state.ai) $("#chatbar").classList.remove("hidden");
}

function renderHeader(data) {
  const c = state.customers.find((x) => x.id === data.id) || {};
  const bal = c.recentTxns?.[0]?.balanceAfter ?? 0;
  $("#phone-who").textContent = `${data.name} · ${data.city}`;
  $("#phone-bal").textContent = inr(bal);
  $("#phone-acct").textContent = `•••• ${1000 + (data.name.length * 137) % 9000} · Savings`;
}

const TOOL_ICONS = { get_customer_profile: "👤", get_spending_breakdown: "📊", get_cashflow_forecast: "📈", get_engagement_analytics: "🧮", create_sip: "✅", set_spend_cap: "🎯", schedule_reminder: "⏰", escalate_to_rm: "🧑‍💼", respond_to_customer: "🛡️" };

function renderTrace(trace) {
  if (!trace || !trace.length) return "";
  return `<div class="agent-trace">${trace.map((t, i) =>
    `<div class="tr-step" style="animation-delay:${i * 0.35}s"><span class="tr-ic">${TOOL_ICONS[t.tool] || "🔧"}</span>${esc(t.label)}</div>`).join("")}</div>`;
}

function renderWhy(data) {
  const s = data.scores;
  const badge = data.ai
    ? `<div class="ai-badge">✨ Live ReAct agent · ${(data.trace || []).length} tool calls</div>`
    : data.fallbackMode
      ? `<div class="ai-badge fallback">⚙ rule fallback — no AI</div>`
      : "";
  const situation = data.situation ? `<div class="situation">“${esc(data.situation)}”</div>` : "";
  const trace = data.ai ? renderTrace(data.trace) : "";
  const body = data.journey
    ? `${data.journey.emoji} <strong>${esc(data.journey.name)}</strong> — ${esc(data.reason)}<span class="goal">🎯 ${esc(data.journey.goal)}</span>`
    : data.ai
      ? `<div class="situation" style="border-color:var(--faint)">🤖 Agent note: “${esc(data.reason || "stayed silent")}”</div>`
      : esc(data.reason || "Staying silent.");
  $("#jr-reason").innerHTML = badge + trace + situation + body;
  loadForecastChart(data.id);

  const healthTone = s.financialHealth >= 55 ? "good" : "warn";
  $("#scores").innerHTML = `
    ${scoreRow("Engagement", s.engagement, "brand", "recency · frequency · breadth")}
    ${scoreRow("Financial health", s.financialHealth, healthTone, `savings rate ${s.savingsRatePct}%`)}
    ${scoreRow("Churn risk", s.churnRisk, s.churnRisk > 50 ? "warn" : "brand", `dormancy ${s.dormancyRisk} · silent ${s.daysSinceLastTxn}d`)}`;

  $("#drivers").innerHTML = (s.drivers || []).map((d) => `<li>${esc(d)}</li>`).join("");

  const g = data.governance;
  const v = data.delivered ? "approved" : (g?.verdict || "suppressed");
  const label = data.delivered ? "Delivered" : "Suppressed";
  $("#governance").innerHTML = `<span class="verdict ${v}">${label}</span>
    <ul class="reasons">${(g?.reasons || []).map((r) => `<li class="${/suppress|not granted|outside|cap reached/i.test(r) ? "block" : ""}">${esc(r)}</li>`).join("")}</ul>`;
}

// ---------------------------------------------------------------------------
// Cash-flow forecast chart (real model output, incl. its own validation)
// ---------------------------------------------------------------------------
async function loadForecastChart(id) {
  const host = $("#forecast");
  if (!host) return;
  host.innerHTML = "";
  let f;
  try { f = await (await fetch(`/api/pulse/forecast?id=${id}`)).json(); } catch { return; }
  if (!f || !f.available) { host.innerHTML = `<div class="dim" style="font-size:11.5px">Not enough history for a forecast.</div>`; return; }

  const pts = [...f.history.map((p) => ({ x: p.day, y: p.balance, proj: false })),
               ...f.projected.map((p) => ({ x: p.day, y: p.balance, proj: true }))];
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys, 0), ymax = Math.max(...ys) * 1.05;
  const W = 360, H = 120, P = 6;
  const X = (x) => P + ((x - xmin) / (xmax - xmin)) * (W - 2 * P);
  const Y = (y) => H - P - ((y - ymin) / (ymax - ymin)) * (H - 2 * P);
  const line = (arr, cls, dash) => `<polyline points="${arr.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")}" fill="none" class="${cls}" ${dash ? `stroke-dasharray="4 4"` : ""}/>`;
  const hist = pts.filter((p) => !p.proj), proj = pts.filter((p) => p.proj);
  if (hist.length) proj.unshift(hist[hist.length - 1]);
  const zeroLine = ymin < 0 ? `<line x1="${P}" x2="${W - P}" y1="${Y(0)}" y2="${Y(0)}" class="f-zero"/>` : "";
  const low = f.lowBalanceEvent
    ? `<circle cx="${X(f.lowBalanceEvent.inDays)}" cy="${Y(f.lowBalanceEvent.balance)}" r="4" class="f-low"/>` : "";
  const skillCls = f.validation.skill >= 20 ? "ok" : "bad";
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="f-svg">${zeroLine}${line(hist, "f-hist")}${line(proj, "f-proj", true)}${low}</svg>
    <div class="f-meta">
      <span>solid = observed · dashed = <b>model projection (30d)</b></span>
      <span class="f-skill ${skillCls}">holdout skill ${f.validation.skill}% vs naive</span>
    </div>
    ${f.lowBalanceEvent ? `<div class="f-alert">⚠ model predicts balance below ₹${f.lowBalanceEvent.threshold.toLocaleString("en-IN")} in <b>${f.lowBalanceEvent.inDays} days</b></div>` : ""}`;
}

function scoreRow(label, v, tone, sub) {
  return `<div class="score-row">
    <div class="lbl">${label}<small>${esc(sub)}</small></div>
    <div class="bar"><i class="${tone}" style="width:${v}%"></i></div>
    <span class="mono" style="width:30px;text-align:right;font-size:12px">${v}</span>
  </div>`;
}

function renderAudit(audit) {
  const el = $("#audit");
  if (!audit || !audit.length) { el.innerHTML = ""; return; }
  el.className = "fade-in";
  el.innerHTML = audit.map((e) => `
    <div class="ledger-item">
      <div class="rail-dot"><span class="dot" style="background:${auditColor(e.stage)};box-shadow:0 0 0 3px ${auditColor(e.stage)}22"></span><span class="line"></span></div>
      <div>
        <div class="st">${esc(e.stage)}</div>
        <div class="sm">${esc(e.summary)}</div>
        ${e.detail ? `<div class="ts" style="color:var(--muted);font-family:var(--font);margin-top:2px">${esc(e.detail)}</div>` : ""}
      </div>
    </div>`).join("");
}
function auditColor(stage) {
  return { observe: "var(--brand)", infer: "var(--brand-2)", decide: "var(--purple)", gate: "var(--amber)", deliver: "var(--green)", reply: "var(--teal)", complete: "var(--green)" }[stage] || "var(--brand)";
}

function showTyping(convo) {
  const t = document.createElement("div");
  t.className = "j-msg";
  t.innerHTML = `<div class="j-card"><div class="dots"><span></span><span></span><span></span></div></div>`;
  convo.appendChild(t);
  convo.scrollTop = convo.scrollHeight;
  const start = Date.now();
  return () => { const wait = Math.max(0, 400 - (Date.now() - start)); setTimeout(() => t.remove(), wait); };
}

function addAgentCard(step) {
  const convo = $("#convo");
  const kindClass = { celebrate: "celebrate", care: "care", close: "close" }[step.kind] || "";
  const msg = document.createElement("div");
  msg.className = "j-msg";
  msg.innerHTML = `<div class="j-card ${kindClass}">
    <div class="cx">${step.channel === "whatsapp" ? "🟢 WhatsApp" : "◈ YONO card"}${state.ai ? " · ✨ AI" : ""}</div>
    ${step.title ? `<div class="tt">${esc(step.title)}</div>` : ""}
    <div class="bd">${mdBold(step.body)}</div>
  </div>`;
  convo.appendChild(msg);

  if (step.options?.length) {
    const opts = document.createElement("div");
    opts.className = "opts";
    step.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "opt-btn" + (i === 0 ? " primary" : "");
      b.dataset.choice = o.choice;
      b.textContent = o.label;
      b.onclick = () => send(o.label, state.ai ? { msg: o.label } : { choice: o.choice });
      opts.appendChild(b);
    });
    convo.appendChild(opts);
  } else {
    // terminal — reward
    handleTerminal(step);
  }
  convo.scrollTop = convo.scrollHeight;
}

async function send(displayText, params) {
  if (state.busy || !displayText.trim()) return;
  state.busy = true;
  const convo = $("#convo");
  $$(".opts", convo).forEach((o) => o.remove());
  const u = document.createElement("div");
  u.className = "u-msg";
  u.textContent = displayText;
  convo.appendChild(u);
  convo.scrollTop = convo.scrollHeight;

  const stop = showTyping(convo);
  const q = params.msg !== undefined ? `msg=${encodeURIComponent(params.msg)}` : `choice=${encodeURIComponent(params.choice)}`;
  let data;
  try { data = await (await fetch(`/api/pulse/reply?id=${state.currentId}&${q}`)).json(); }
  finally { stop(); }

  if (data.step && (data.step.body || data.step.title)) addAgentCard(data.step);
  if (data.reward) applyReward(data.reward);
  if (data.audit) renderAudit(data.audit);
  if (data.status === "completed") $("#chatbar").classList.add("hidden");
  state.busy = false;
}

function handleTerminal(step) {
  // reward visuals are applied via applyReward from the reply payload
}

function applyReward(reward) {
  if (reward.kind === "positive") {
    state.streak += 1;
    const s = $("#streak-slot");
    s.innerHTML = `<span class="streak pop">🔥 ${state.streak}-day streak</span>`;
  } else if (reward.kind === "rm") {
    const convo = $("#convo");
    const n = document.createElement("div");
    n.className = "rm-note";
    n.textContent = "🧑‍💼 A relationship manager will follow up personally.";
    convo.appendChild(n);
    convo.scrollTop = convo.scrollHeight;
  }
}

// ---------------------------------------------------------------------------
// Engagement Cockpit
// ---------------------------------------------------------------------------
async function loadCockpit() {
  const d = await (await fetch(`/api/pulse/cockpit?hour=${state.hour}`)).json();
  const m = d.metrics;
  const cards = [
    { k: "Avg engagement", v: m.avgEngagement, s: "0–100 across base", cls: "" },
    { k: "Avg churn risk", v: m.avgChurnRisk, s: "lower is better", cls: m.avgChurnRisk > 40 ? "stop" : "good" },
    { k: "Dormant at-risk", v: m.dormantAtRisk, s: "revival journeys", cls: "warn" },
    { k: "Care interventions", v: m.careInterventions, s: "cross-sell suppressed", cls: "good" },
    { k: "Journeys delivered", v: m.delivered, s: "consent + window ✓", cls: "good" },
    { k: "Outreach suppressed", v: m.suppressed, s: "DPDP / TRAI", cls: "stop" },
  ];
  $("#metrics").innerHTML = cards.map((c) => `<div class="card metric ${c.cls}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s}</div></div>`).join("");

  $("#uplift-banner").innerHTML = `
    <div><div class="big">${d.projected.churnReductionPct} churn ↓</div></div>
    <div class="cap"><strong>Projected retention uplift.</strong> ${esc(d.projected.note)} Every journey here is consented, wellness-first, and measured on <em>uplift, not clicks</em>.</div>`;

  $("#churn-body").innerHTML = d.churnBoard.map((r) => {
    const [a, b] = gradFor(r.id);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px"><span class="avatar" style="width:26px;height:26px;border-radius:7px;font-size:11px;background:linear-gradient(140deg,${a},${b})">${r.name[0]}</span>${esc(r.name)}</div></td>
      <td>${ring(r.engagement, "brand", "sm")}</td>
      <td><span class="mono" style="color:${r.churnRisk > 50 ? "var(--red)" : "var(--muted)"}">${r.churnRisk}</span></td>
      <td class="mono dim">${r.dormancyRisk}</td>
      <td><span class="ev-tag">${r.journey.emoji} ${esc(r.journey.name)}</span></td>
    </tr>`;
  }).join("");

  const maxMix = Math.max(...d.journeyMix.map((x) => x.count), 1);
  $("#mix").innerHTML = d.journeyMix.map((x) => `
    <div class="mix-row"><div class="nm">${x.emoji} ${esc(x.name)}</div>
      <div class="track"><i style="width:${(x.count / maxMix) * 100}%"></i></div><div class="ct">${x.count}</div></div>`).join("");

  const bands = d.engagementBands; const totB = bands.low + bands.mid + bands.high || 1;
  $("#bands").innerHTML = [["High (66+)", bands.high, "var(--green)"], ["Mid (33–65)", bands.mid, "var(--amber)"], ["Low (<33)", bands.low, "var(--red)"]]
    .map(([nm, ct, col]) => `<div class="mix-row"><div class="nm">${nm}</div><div class="track"><i style="width:${(ct / totB) * 100}%;background:${col}"></i></div><div class="ct">${ct}</div></div>`).join("");
}

// ---------------------------------------------------------------------------
// Impact (uplift vs holdout)
// ---------------------------------------------------------------------------
async function loadImpact() {
  const d = await (await fetch(`/api/pulse/impact?hour=${state.hour}`)).json();
  const o = d.overall;

  $("#impact-hero").innerHTML = `
    <div class="hero-split">
      <div><div class="big">+${o.upliftPp}pp</div>
        <div class="cap" style="max-width:340px">Absolute uplift in positive outcomes vs a randomised holdout — a <strong>+${o.upliftRelPct}%</strong> relative lift. This is the "does it actually work" number.</div></div>
      <div class="hero-split">
        <div class="vs"><div class="n t">${o.treatRatePct}%</div><div class="l">Pulse (treatment)</div></div>
        <div class="arrow">vs</div>
        <div class="vs"><div class="n h">${o.holdRatePct}%</div><div class="l">Holdout</div></div>
      </div>
    </div>`;

  const cards = [
    { k: "Cohort size", v: d.cohort.size, s: "synthetic customers", cls: "" },
    { k: "Eligible for a journey", v: d.cohort.eligible, s: "had a real trigger", cls: "" },
    { k: "Treatment / Holdout", v: `${d.cohort.treatment}/${d.cohort.holdout}`, s: "80/20 split", cls: "" },
    { k: "Engagement-score lift", v: "+" + o.engagementLift, v2: true, s: "points, per contacted", cls: "good" },
    { k: "Suppressed by gate", v: d.cohort.suppressed, s: "DPDP / TRAI", cls: "stop" },
    { k: "Relative uplift", v: "+" + o.upliftRelPct + "%", s: "vs holdout", cls: "good" },
  ];
  $("#impact-metrics").innerHTML = cards.map((c) => `<div class="card metric ${c.cls}"><div class="k">${c.k}</div><div class="v" style="font-size:${String(c.v).length > 5 ? 22 : 30}px">${c.v}</div><div class="s">${c.s}</div></div>`).join("");

  $("#impact-journeys").innerHTML = d.journeys.map((j) => {
    const maxRate = Math.max(j.treatRatePct, j.holdRatePct, 1);
    const steps = [["Delivered", j.delivered], ["Engaged", j.engaged], ["Completed", j.completed]];
    const fmax = Math.max(...steps.map((s) => s[1]), 1);
    return `<div class="ijr">
      <div class="hd"><span>${j.emoji}</span><span class="nm">${esc(j.name)}</span><span class="up">+${j.upliftPp}pp uplift</span></div>
      <div class="grid">
        <div class="funnel">${steps.map(([l, v]) => `<div class="fbar"><div class="fv">${v}</div><i style="height:${(v / fmax) * 40 + 3}px"></i><div class="fl">${l}</div></div>`).join("")}</div>
        <div class="cmp">
          <div class="cl"><span>Pulse</span><b>${j.treatRatePct}%</b></div>
          <div class="track"><i class="treat" style="width:${(j.treatRatePct / maxRate) * 100}%"></i></div>
          <div class="cl" style="margin-top:7px"><span>Holdout</span><b>${j.holdRatePct}%</b></div>
          <div class="track"><i class="hold" style="width:${(j.holdRatePct / maxRate) * 100}%"></i></div>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Journey Studio
// ---------------------------------------------------------------------------
async function loadStudio() {
  const journeys = await (await fetch("/api/pulse/studio")).json();
  $("#studio-list").innerHTML = journeys.map((j) => {
    const steps = j.steps.map((s) => {
      const kindClass = { celebrate: "celebrate", care: "care", close: "close" }[s.kind] || "";
      const startCls = s.id === j.startStep ? " start" : "";
      const termCls = s.terminal ? " terminal" : "";
      const branches = s.terminal
        ? (s.effect ? `<div class="effect">✦ outcome: ${esc(s.effect)}</div>` : "")
        : `<div class="branches">${s.options.map((o) => `
            <div class="branch"><span class="opt">${esc(o.label)}</span><span class="arr">→</span>
              <span class="to ${o.next ? "" : "end"}">${o.next ? esc(o.nextTitle || o.next) : "end"}</span></div>`).join("")}</div>`;
      return `<div class="fstep ${kindClass}${startCls}${termCls}">
        <div class="sh"><span class="kd">${s.kind}</span><span class="stitle">${esc(s.title)}</span>
          ${s.id === j.startStep ? '<span class="start-tag">● START</span>' : ""}
          <span class="ch">${s.channel === "whatsapp" ? "WhatsApp" : s.channel === "push" ? "Push" : "YONO card"}</span></div>
        ${branches}</div>`;
    }).join("");

    return `<div class="card card-pad jd">
      <div class="jd-hd"><span class="em">${j.emoji}</span><span class="nm">${esc(j.name)}</span>
        ${j.isCare ? '<span class="care-badge">Care · no sell</span>' : ""}</div>
      <div class="meta-line">
        <span class="trig">⚡ Trigger: <b>${esc(j.trigger)}</b></span>
        <span>🎯 Goal: <b>${esc(j.goal)}</b></span>
        <span>${j.steps.length} steps</span>
      </div>
      <div class="flow">${steps}</div>
    </div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Flywheel (learning curve)
// ---------------------------------------------------------------------------
async function loadFlywheel(rounds = 0) {
  const q = rounds ? `?rounds=${rounds}` : "";
  const d = await (await fetch(`/api/pulse/flywheel${q}`)).json();
  const c = d.current;

  $("#fly-hero").innerHTML = `
    <div><div class="big">+${c.upliftPp}pp</div>
      <div class="cap" style="max-width:360px">acceptance vs a random-tone policy, after <b>${d.interactions.toLocaleString()}</b> learned interactions — <b>${c.pctOfCeiling}%</b> of the theoretical ceiling. It keeps climbing as it's used.</div></div>
    <div class="hero-split">
      <div class="vs"><div class="n t">${c.bandit}%</div><div class="l">Pulse policy</div></div>
      <div class="arrow">vs</div>
      <div class="vs"><div class="n h">${c.random}%</div><div class="l">Random tone</div></div>
    </div>`;

  $("#fly-metrics").innerHTML = [
    { k: "Interactions learned", v: d.interactions.toLocaleString(), s: "outcomes folded in", cls: "" },
    { k: "Policy acceptance", v: c.bandit + "%", s: "current", cls: "good" },
    { k: "Random baseline", v: c.random + "%", s: "no learning", cls: "" },
    { k: "Ceiling reached", v: c.pctOfCeiling + "%", s: "of oracle (best-possible)", cls: "good" },
  ].map((m) => `<div class="card metric ${m.cls}"><div class="k">${m.k}</div><div class="v" style="font-size:26px">${m.v}</div><div class="s">${m.s}</div></div>`).join("");

  $("#fly-chart").innerHTML = lineChart(d.curve);
  $("#fly-tones").innerHTML = d.bestTones.map((t) => `
    <div class="tone-row"><span class="jn">${esc(t.journey.replace(/_/g, " "))}</span>
      <span class="tn">${esc(t.tone)}</span><span class="mn">${t.mean}%</span>
      <span class="ck ${t.learnedRight ? "y" : "n"}">${t.learnedRight ? "✓" : "·"}</span></div>`).join("");
}

function lineChart(curve) {
  if (!curve.length) return `<div class="dim">No data yet.</div>`;
  const W = 780, H = 300, P = 38;
  const maxI = curve[curve.length - 1].i;
  const maxY = Math.max(...curve.map((p) => p.oracle)) * 1.1;
  const x = (i) => P + (i / maxI) * (W - P - 10);
  const y = (v) => H - P - (v / maxY) * (H - P - 12);
  const line = (key, color, dash = "") => {
    const pts = curve.map((p) => `${x(p.i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${dash ? 2 : 3}" stroke-dasharray="${dash}" stroke-linejoin="round" />`;
  };
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = Math.round(maxY * f);
    return `<line class="grid-l" x1="${P}" y1="${y(v)}" x2="${W - 10}" y2="${y(v)}" /><text class="axis-t" x="6" y="${y(v) + 3}">${v}%</text>`;
  }).join("");
  const xTicks = curve.filter((_, i) => i % Math.ceil(curve.length / 6) === 0).map((p) =>
    `<text class="axis-t" x="${x(p.i)}" y="${H - 14}" text-anchor="middle">${p.i >= 1000 ? (p.i / 1000).toFixed(1) + "k" : p.i}</text>`).join("");
  return `<svg class="fly-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${yTicks}${xTicks}
    ${line("oracle", "#16d6c8", "5 5")}
    ${line("random", "#5a6483", "5 5")}
    ${line("bandit", "#3d6dff")}
  </svg>
  <div class="chart-legend">
    <span class="lg"><span class="sw" style="background:#3d6dff"></span>Pulse policy (learning)</span>
    <span class="lg"><span class="sw" style="background:#16d6c8"></span>Oracle (best-possible ceiling)</span>
    <span class="lg"><span class="sw" style="background:#5a6483"></span>Random tone (no learning)</span>
  </div>`;
}

boot();
