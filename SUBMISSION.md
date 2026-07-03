# SBI Hackathon 2026 — Submission Form (copy-paste ready)

---

### Theme *
**Agentic AI & Emerging Tech — Pillar 03: Digital Engagement**

---

### Project Title *
**SBI Pulse — Agentic AI that runs proactive engagement journeys, not nudges**

---

### Team details *
> Fill in your real details; template below.

Harsh Dattani — Independent developer *(add organization / college if applicable)*
*(add teammates 2–4 here: Name — Organization)*

---

### Brief description of the idea *

SBI Pulse is an agentic AI engagement platform built for Pillar 03. It continuously senses
each customer's **behaviours, financial patterns and life events** from their transaction
stream, and autonomously runs **proactive, multi-step engagement journeys** — not one-shot
nudges. A live AI agent reads the actual transactions, infers the customer's situation
(salary hike, overspending, dormancy, a new baby, financial stress), decides the best
journey — or decides to stay silent — and holds a real, free-text conversation in the
customer's own language (Hindi, Odia, English). On detected financial stress it suppresses
all cross-sell and leads with care. Every decision passes a deterministic consent-and-
compliance gate (DPDP consent, TRAI 9am–9pm window, frequency caps) and is logged on an
explainability audit trail. A Thompson-sampling learning policy improves from every
outcome — so using the product trains it.

---

### Proposed solution — Business model / commercial potential *

**Model:** an in-bank engagement platform for YONO (B2B2C), deployed inside SBI's
perimeter; per-conversation AI cost is under ₹0.05 at lightweight-LLM pricing, so unit
economics hold at 100M-customer scale.

**Commercial potential, tied to SBI's own KPIs:**
- **Retention:** proactive engagement cuts churn 15–25% (industry benchmark); retaining a
  customer is 5–7× cheaper than acquiring one.
- **Dormancy:** ~34% of new accounts go dormant within a year (industry); revival journeys
  reactivate this base — the largest untapped pool in Indian banking.
- **Cross-sell depth:** timed, consented, helpful journeys lift products-per-customer from
  the current ~2.3 — even a fraction of a product per customer across 100M+ users is a
  board-level number.
- **Measured honestly:** impact is evaluated as **uplift versus a randomised holdout**
  (+20pp positive outcomes in our simulation of the methodology), not clicks — which is
  also the anti-dark-pattern guarantee regulators and customers can trust.
- **Moat:** an outcome-feedback flywheel (bandit policy) that compounds only with SBI's
  scale of consented interactions; competitors can clone the UI, not the learned policy.
- **Expansion path:** Journey Studio lets business teams compose new governed journeys
  without code — insurance, MSME, agri (KCC), and government-scheme engagement on the
  same rails.

---

### Technology stack details *

- **AI:** lightweight production LLM (structured JSON reasoning, generation and free-text
  conversation; vernacular output in Hindi/Odia/English); model-agnostic — swappable to an
  India-hosted / Banking-BHASHINI model. Natural-voice TTS for the demo narration.
- **Learning:** hand-built Thompson-sampling contextual bandit (Beta-Bernoulli posteriors)
  learning message-tone effectiveness per customer segment from outcomes.
- **Runtime:** TypeScript on Node.js 22+ (native TS execution), **zero npm dependencies** —
  no supply-chain surface; one command to run.
- **Backend:** node:http server, REST JSON API, in-memory session store, append-only
  explainability audit ledger, retry/timeout LLM client with deterministic rule-engine
  fallback.
- **Compliance rails:** deterministic consent gate (DPDP-style purpose-scoped consent),
  TRAI 9am–9pm window and frequency caps in plain reviewable code; human-in-the-loop
  routing for high-value products.
- **Front end:** hand-built HTML/CSS/JS (no framework) — five surfaces: Journey (YONO-style
  phone with live chat), Engagement Cockpit, Impact (holdout uplift), Journey Studio
  (no-code state machines), Flywheel (live learning curve).
- **Data:** deterministic synthetic transaction generator (8 personas, seeded, zero PII);
  production swaps in consented Account Aggregator + YONO event streams.

---

### Process flow / architecture *

```
Transactions / behaviours / life events
        │
        ▼
  SIGNAL & SCORING LAYER  — engagement, financial-health, churn & dormancy scores
        │
        ▼
  AI REASONING AGENT (LLM) — reads the actual transaction stream, infers the situation,
        │                    chooses the journey (or silence), writes the vernacular
        │                    message, and converses free-text with the customer
        ▼
  GOVERNANCE GATE (deterministic code, not AI) — DPDP consent · TRAI 9–9 window ·
        │                    frequency caps · stress → care-only · human-in-loop for
        │                    high-value  ▸ THE AI PROPOSES, POLICY DISPOSES
        ▼
  DELIVER & CONVERSE — YONO card / WhatsApp, in the customer's language; journey
        │                    branches on every reply
        ▼
  LEARN — outcome feeds a Thompson-sampling policy (tone × segment); measured as
                             uplift vs a randomised holdout; every step written to an
                             append-only explainability audit trail
```

---

### Upload your idea deck
Open `pulse-presentation.html` via the app (`npm run web`, then the file) or the published
artifact, press **F** for fullscreen → browser **Print → Save as PDF** → upload.
17 slides incl. live screenshots, competitive analysis, sources & assumptions.

---

### Demo video link (maximum 3 minutes)
Upload **`pulse-submission.mp4`** (2:56, 1080p, 7.4MB) to YouTube (Unlisted) or Google
Drive (anyone-with-link) and paste the URL. Structure: title → 4 explainer slides (~65s)
→ live product demo (~110s) → close. *Test the link in a private browser window.*

---

### GitHub repository link (If any)
> Create it when ready:
```bash
cd /Users/harsh/Documents/projects/sbi
git init && git add -A && git commit -m "SBI Pulse — Pillar 03 Digital Engagement"
gh repo create sbi-pulse --private --source=. --push
```
`.env` is git-ignored (key never committed); `.env.example` documents setup. Add the repo
URL to the form. Make it public (or grant access) before judging.
