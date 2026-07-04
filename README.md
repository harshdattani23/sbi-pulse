<div align="center">

# 🫀 SBI Pulse

### Agentic AI that runs proactive engagement **journeys, not nudges**

*Submission for the SBI Hackathon @ Global Fintech Fest 2026 — **Pillar 03 · Digital Engagement***

![TypeScript](https://img.shields.io/badge/TypeScript-native%20on%20Node%2022+-3178c6)
![Dependencies](https://img.shields.io/badge/npm%20dependencies-0-2fd27a)
![AI](https://img.shields.io/badge/AI-live%20LLM%20reasoning-a879ff)
![Compliance](https://img.shields.io/badge/DPDP%20·%20TRAI-deterministic%20gate-ffc03d)
![License](https://img.shields.io/badge/license-hackathon%20prototype-8a93ad)

### 🌐 **[Live demo → sbi-pulse-774217255969.asia-south1.run.app](https://sbi-pulse-774217255969.asia-south1.run.app)**
*Running on Cloud Run (Mumbai) with live AI reasoning — auto-deployed from this repo via GitHub Actions.*

<img src="docs/mesh.jpg" width="900" alt="SBI Pulse — 4 specialist agents run in parallel, the orchestrator rules ENGAGE-CARE, and the conversation agent delivers a gated care message" />

*Four specialist agents investigate in parallel (timings on screen), the orchestrator rules ENGAGE·CARE,<br>and the conversation agent delivers a gated care message. Every step lands on the audit trail.*

</div>

---

## The problem (Pillar 03, verbatim)

> *"Create AI-driven engagement models that **proactively interact** with customers based on **behaviours, financial patterns, and life events**."*

SBI has ~100M digital users — but **34% of new accounts go dormant within a year** and cross-sell sits at **2.3 products per customer**. Banks answer with batch campaigns optimised for clicks. Result: fatigue, opt-outs, thin trust.

## The answer: stop sending nudges. Run journeys.

A **nudge** is one message. A **journey** is an adaptive, multi-step conversation the agent runs over time, branching on every reply. Pulse is a **multi-agent mesh**: four specialist LLM agents investigate every customer **in parallel** (~2.2s vs ~8.4s serial), an LLM orchestrator weighs their reports and decides, and a ReAct conversation agent executes — behind a deterministic governance gate and in front of a learning policy:

| | |
|---|---|
| 📡 **Sense** | 4 parallel specialist agents — Spending, Cash-flow, Risk & Consent, Product-Fit — each with its own role-restricted tools |
| ✨ **Decide** | An **LLM orchestrator** synthesizes the four reports and rules: engage-care, engage-growth, or **stay silent** (a first-class decision) |
| 💬 **Engage** | A **ReAct conversation agent**: free-text chat in **Hindi · Odia · English**, and real banking actions on agreement (spend cap, SIP, reminder, RM) |
| 🛡️ **Restrain** | On detected stress: **all cross-sell suppressed**, care offered instead. Knowing when *not* to sell is a decision |
| 🔁 **Learn** | Every outcome trains a Thompson-sampling policy — **using the product improves it** |

## ⚡ Quick start

```bash
# Requires Node 22+. No npm install — zero dependencies.
echo "GEMINI_API_KEY=your-key" > .env    # from https://aistudio.google.com/apikey
npm run web                               # → http://localhost:5173
```

No key? It still runs — a deterministic rule engine takes over (the ✨ AI badge just won't show).

```bash
npm run demo        # CLI demo: rule-engine trace for all 10 personas
```

## 🖥️ Five surfaces, one brain

| Surface | What it shows |
|---|---|
| **Journey** | YONO-style phone where the AI journey unfolds live — reasoning, vernacular chat, governance verdict, audit trail |
| **Engagement Cockpit** | Fleet view: engagement / churn / dormancy scores, journey mix, delivered vs suppressed |
| **Impact** | 1,500-customer cohort vs **randomised holdout** — **+20pp uplift**, measured on outcomes, not clicks |
| **Journey Studio** | Every journey as a governed, no-code **state machine** |
| **Flywheel** | The moat: a live learning curve climbing from random baseline toward the oracle ceiling |

<div align="center">
<img src="docs/impact.jpg" width="430" alt="Impact — uplift vs randomised holdout" /> <img src="docs/flywheel.jpg" width="430" alt="Flywheel — Thompson-sampling policy learning live" />
<img src="docs/cockpit.jpg" width="430" alt="Engagement Cockpit — fleet scores" /> <img src="docs/studio.jpg" width="430" alt="Journey Studio — governed state machines" />
</div>

## 🏛️ Architecture — the AI proposes, policy disposes

```
Transactions / behaviours / life events
        │
        ▼  TRUE parallel fan-out (Promise.all) — ~2.2s wall-clock vs ~8.4s serial
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ 🧾 SPENDING     │ │ 📈 CASH-FLOW    │ │ ⚖️ RISK &        │ │ 🎯 PRODUCT-FIT  │
│ ANALYST         │ │ ANALYST runs a  │ │ CONSENT ANALYST │ │ ANALYST         │
│ trends · creep  │ │ TRAINED model + │ │ churn · consent │ │ what would      │
│                 │ │ its confidence  │ │ posture         │ │ genuinely help  │
└───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
        └───────────────┬──┴──────────────────┴──────────────────┘
                        ▼  4 structured reports
            ┌───────────────────────────┐
            │ 🧠 ORCHESTRATOR (LLM)      │  decides: care · growth · or SILENCE
            └────────────┬──────────────┘
                         ▼  written brief
            ┌───────────────────────────┐   ┌──────────────────────────────┐
            │ 💬 CONVERSATION AGENT      │ → │ 🛡️ GATE — deterministic code   │
            │ ReAct loop · 9 banking     │   │ INSIDE respond_to_customer:   │
            │ action tools · vernacular  │   │ DPDP · TRAI 9–9 · caps        │
            └───────────────────────────┘   └──────────────┬───────────────┘
                                                            ▼
            ┌───────────────────────────┐   every outcome → 🔁 THOMPSON-SAMPLING
            │ DELIVER (YONO / WhatsApp)  │   POLICY · uplift vs randomised holdout
            └───────────────────────────┘
        every step → append-only EXPLAINABILITY AUDIT TRAIL
```

**Why this split matters for a bank:** the model can never bypass consent, contact windows or caps — those live in plain, reviewable code (`src/governance/consentGate.ts`). An auditor reads one file and knows exactly when a customer can be contacted.

## 📁 Project structure

```
src/
  ai/            gemini.ts (LLM + function-calling client) · mesh.ts (4 parallel specialists + orchestrator) · agent.ts (ReAct loop) · tools.ts (9 banking tools; the gate lives INSIDE respond_to_customer)
  ml/            forecaster.ts (per-customer cash-flow model, holdout-validated)
  engagement/    scores.ts (analytics features) · cohort.ts (holdout uplift sim)
  journeys/      orchestrator.ts · definitions.ts (6 journeys) · i18n.ts (hi/or/en)
  governance/    consentGate.ts (deterministic gate) · ledger.ts (audit)
  learn/         bandit.ts (Thompson sampling) · flywheel.ts (outcome feedback loop)
  data/          generator.ts (seeded synthetic transactions) · personas.ts (10 personas)
  server/        server.ts (zero-dep node:http) · pulseApi.ts · engineApi.ts
web/             index.html · app.js · styles.css · deck.html   (no framework)
```

**~5,700 lines · 33 files · 0 npm dependencies · 1 command**

## ☁️ Deploy (Cloud Run)

```bash
gcloud run deploy sbi-pulse --source . --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=your-key
```

The included `Dockerfile` runs the TypeScript natively on `node:22-alpine` — no build step.

## 🧭 Honest notes (read before judging)

- **Data is synthetic** — a deterministic, seeded transaction generator (zero PII by design). Production swaps in consented **Account Aggregator** + YONO event streams.
- **The AI is real** — a live LLM reasons over the transactions, decides, and converses. A rule engine is the automatic fallback so the demo never breaks.
- **The Impact numbers are a labelled simulation** of the holdout-uplift methodology that ships with the product — not field data.
- **The Flywheel's learning is real** (a genuine Thompson-sampling policy fed by live journey outcomes); its reward stream in the demo comes from synthetic ground truth so convergence is visible in seconds instead of months.

## 📚 Docs in this repo

| File | Purpose |
|---|---|
| `PILLAR3_DIGITAL_ENGAGEMENT_PLAN.md` | Full research-grounded product plan (phases 0–3) |
| `SUBMISSION.md` | Copy-paste answers for the submission form |
| `PITCH.md` · `VIDEO_SCRIPT.md` | 3-minute pitch script + video narration |
| `pulse-presentation.html` | 17-slide idea deck (open in browser, `F` for fullscreen) |

---

<div align="center">

**Journeys, not nudges · Knows when not to sell · Consent & explainability by design · Learns from every outcome**

*Built for Pillar 03 · Digital Engagement · Agentic AI & Emerging Tech — GFF 2026*

</div>
