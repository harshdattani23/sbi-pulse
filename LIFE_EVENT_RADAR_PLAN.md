# Life‑Event Radar — SBI GFF Hackathon 2026 Plan

> An agentic AI that watches consented financial behaviour to infer **life events**,
> reasons about the right help at the right moment, and initiates a **proactive,
> consented, explainable** conversation — turning SBI's 100M+ digital base into
> per‑customer relationships instead of mass campaigns.

**Track fit:** Primarily *Digital Engagement*; spans *Customer Acquisition* (cross‑sell)
and *Digital Adoption* (nudging to digital products). Theme: *Agentic AI & Emerging Tech*.

---

## 1. The one‑line pitch

> "SBI has 100 million people in its app but talks to them like a billboard.
> Life‑Event Radar gives every customer a private banker‑agent that notices what's
> happening in their life — a new job, a new city, a new baby, a coming retirement —
> and reaches out *before* they have to ask, with consent baked in and every action
> explainable to an auditor."

---

## 2. Why this, why SBI, why now (the grounded case)

| Fact | Source | Why it matters |
|---|---|---|
| ~10 crore (100M) YONO users, target 20 crore in 2 yrs; ~70,000 accounts/day; 93% payments digital | The Week / Trak.in, Dec 2025 | Massive base + rich transaction stream = the only place life‑event inference works at scale. A startup can't replicate the data. |
| Account Aggregator: 2.61B accounts, 253M users, RBI‑regulated consented sharing; ₹1.6L cr AA‑based loans in FY25 | Dept. of Financial Services / Sahamati | A **legal, standardized pipe** to enrich inference beyond in‑house data — and a story judges recognize. |
| DPDP Act 2023 + Rules 2025: consent must be free/specific/informed; Consent Manager live 13 Nov 2026; full compliance 13 May 2027 | MeitY / EY | Compliance is now a *product feature*, not an afterthought. Building it in is the differentiator. |
| TRAI TCCCPR/DLT: outbound only 9am–9pm, DLT‑registered templates, granular consent, penalties to ₹50cr | TRAI | Forces "responsible proactive contact" — the hard part most teams skip. |
| Wells Fargo & HSBC run life‑stage next‑best‑action engines | industry case studies | Validates the concept commercially — but none are agentic + AA + vernacular + inclusion‑scale. |

**Thesis:** The idea is *validated* (banks do life-stage NBA) but *uncrowded at SBI's
context* (agentic, AA-enriched, multilingual, consent-native). That's the sweet spot.

---

## 3. What it actually does — the loop

The agent runs a continuous **Observe → Infer → Decide → Consent‑Gate → Act → Learn** loop
per customer. This is the "agentic" core — not Q&A, but autonomous multi‑step reasoning
with tools and guardrails.

```
                 ┌───────────────────────────────────────────────┐
                 │              LIFE‑EVENT RADAR AGENT            │
                 │                                               │
  Txn stream ───▶│  1. OBSERVE   feature/signal extraction       │
  AA data    ───▶│  2. INFER     life‑event hypothesis + score   │
  Profile    ───▶│  3. DECIDE    next‑best‑action reasoning      │
                 │  4. GATE      consent + eligibility + policy   │──▶ ❌ suppress (logged)
                 │  5. ACT       personalize + vernacular + send  │──▶ ✅ WhatsApp/YONO/voice
                 │  6. LEARN     outcome feedback → thresholds    │
                 └───────────────────────────────────────────────┘
```

---

## 4. Life‑event taxonomy (the heart of the demo)

Pick 5–6 events with **clear, fakeable-yet-realistic signals**. Each maps to a signal
pattern, an inferred need, and a next‑best‑action.

| Life event | Signal pattern (from txns/AA) | Inferred need | Next‑best‑action |
|---|---|---|---|
| **New job / salary hike** | New recurring credit, ~30%+ higher, new employer name in narration | Grow surplus, tax planning | Start/step‑up SIP; sweep‑FD; tax‑saver ELSS |
| **Relocation to new city** | Rent debit shifts, new merchant geo cluster, deposit for rent | Local banking, higher rent outflow | Update home branch; rent‑autopay; personal‑loan pre‑approval for deposit |
| **Marriage** | Jewellery + venue + large one‑off spends cluster | Joint finances, protection | Joint account; life/health insurance; gold loan option |
| **New baby** | Hospital/pharma spend spike, then baby‑care merchants | Long‑term goal + protection | Child education SIP/RD; health cover top‑up; term insurance |
| **Child nearing college (age model)** | Account age + prior education spends + tuition merchants | Large lump sum in 1–3 yrs | Education loan pre‑approval; goal FD maturity alignment |
| **Approaching retirement** | Age signal + declining income credits + PF/NPS inflow | Income stability, safety | SCSS / annuity; balance‑to‑debt‑fund; pension‑account nudge |
| **Financial stress (guardrail case)** | Falling balance velocity, min‑payment reliance, missed‑EMI risk | Relief, not a sale | *Suppress cross‑sell*; offer restructuring / budgeting — demonstrates responsible AI |

> The stress row is deliberate: it shows the agent knows **when NOT to sell**. Judges
> remember the team that added restraint.

---

## 5. System architecture (multi‑agent, but justified)

2026 lesson: *multi‑agent only when one agent isn't enough.* Here it genuinely isn't —
inference, policy, and personalization are distinct concerns with different failure modes.
Keep it to a small **orchestrator + 3 specialist agents + a hard-coded guardrail layer**.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR AGENT  (maintains per-customer context, sequences steps) │
└──────────────────────────────────────────────────────────────────────┘
        │                    │                      │
        ▼                    ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│ SIGNAL/INFER  │   │ NEXT-BEST-ACTION │   │ PERSONALIZATION     │
│ AGENT         │   │ AGENT            │   │ AGENT               │
│ • features    │   │ • product catalog│   │ • tone + language   │
│ • event score │   │ • eligibility    │   │ • reading level     │
│ • confidence  │   │ • ROI ranking    │   │ • channel choice    │
└───────────────┘   └──────────────────┘   └────────────────────┘
        │                    │                      │
        └──────────┬─────────┴──────────┬───────────┘
                   ▼                     ▼
        ┌─────────────────────┐  ┌─────────────────────────┐
        │ GOVERNANCE / CONSENT│  │ EXPLAINABILITY LEDGER   │
        │ GATE (deterministic)│  │ (why this, why now,     │
        │ • DPDP consent      │  │  what data, opt-out)    │
        │ • TRAI window/DLT   │  │  — every decision logged│
        │ • frequency cap     │  └─────────────────────────┘
        │ • suppression rules │
        └─────────────────────┘
```

**Design rules that win points:**
- The **consent/governance gate is deterministic code, not an LLM** — you never let a
  model "decide" to bypass consent. Judges from a bank will look for exactly this.
- Every outbound carries a **reason string** ("We noticed X; here's why we think Y")
  drawn from the explainability ledger → DPDP/RBI transparency.
- Agents return **structured, schema‑validated** outputs, not free text.

---

## 6. Responsible‑AI & compliance layer (your moat)

This is where you beat prettier chatbots. Bake these in and *say so on stage*:

1. **Consent‑native (DPDP 2023 / Rules 2025):** Simulate a Consent Manager. No inference
   or contact without an explicit, purpose‑scoped, revocable consent record. Show the
   opt‑out flowing through instantly.
2. **AA as the enrichment path:** Frame external data as consented AA pulls (FIU role),
   not scraping. This is the RBI‑blessed rail — name it.
3. **TRAI/DLT respect:** Outbound only 9am–9pm, capped frequency, "template‑registered"
   messages, honor Do‑Not‑Disturb. Demo a suppressed message outside the window.
4. **Explainability ledger:** Human‑readable "why" for every nudge; audit export.
5. **Fairness/guardrails:** No dark patterns; suppress cross‑sell during detected
   financial stress; confidence threshold below which the agent stays silent.
6. **Human‑in‑the‑loop for high‑value:** Loans/insurance above a threshold route to a
   relationship manager with the agent's brief — agent assists, human decides.

---

## 7. Tech stack (build‑in‑a‑weekend friendly)

| Layer | Choice | Notes |
|---|---|---|
| Agent framework | LangGraph *or* a plain orchestrator + tool functions | Don't over‑engineer; deterministic gate stays outside the LLM |
| LLM | Claude (Opus 4.8 for reasoning, Haiku 4.5 for cheap personalization) | Structured outputs via tool/JSON schema |
| Event inference | Rule + lightweight ML (or LLM‑as‑classifier for demo) on synthetic txns | Real version = trained model; demo = explainable rules + scores |
| Data | **Synthetic transaction generator** (personas → realistic statements) | Never use real PII; generate 8–10 demo personas |
| Backend | FastAPI (Python) | Simple, fast to demo |
| Store | Postgres / SQLite (or Supabase) | Customers, consents, events, decisions, ledger |
| Frontend | Next.js + Tailwind | Two views: **Customer** (YONO‑like) + **Banker/Ops console** |
| Channels (simulated) | WhatsApp‑style + YONO in‑app card + voice snippet (TTS) | Multilingual: show Hindi + one regional language |

> **Biggest force‑multiplier: the synthetic data generator.** It lets you script the
> exact "aha" moment on demand and avoids all PII risk. Build it first.

---

## 8. The demo (what makes or breaks the pitch)

**The money shot (90 seconds):** Pick persona "Ravi, 28, Bhubaneswar → Bangalore."
1. Show his transaction feed scrolling: rent debit stops in city A, new higher salary
   credit appears, deposit + new‑city merchant cluster begins.
2. The **Signal Agent** lights up: "Relocation + salary increase detected, confidence 0.82."
3. **NBA Agent** reasons live (show the trace): "Higher surplus + new rent obligation →
   rank: rent‑autopay, step‑up SIP, pre‑approved PL for deposit."
4. **Governance Gate**: consent ✅, time window ✅, frequency ✅ → approved.
5. **Personalization Agent**: renders the message in Ravi's language, respectful tone,
   as a YONO card + WhatsApp preview, with a one‑tap "Why am I seeing this?" → ledger.
6. Flip to a **second persona in financial stress** → agent **suppresses** the sale and
   offers help instead. (This beat wins the room.)
7. Show the **Ops console**: events detected today, actions taken/suppressed, opt‑outs,
   projected conversion lift — the "SBI at scale" view.

**Fakeable vs real (be honest to yourself):**
- *Real for demo:* the agent loop, inference scoring, NBA reasoning trace, consent gate,
  explainability ledger, multilingual rendering, both console views.
- *Simulated:* live bank core integration, actual AA pulls, real WhatsApp/DLT sending,
  a trained production model. Say "productionizing = swap synthetic feed for AA + core."

---

## 9. Build roadmap (assume a ~2–3 day sprint)

**Phase 0 — Foundations (first few hours)**
- [ ] Synthetic transaction + persona generator (8–10 personas, incl. 1 stress case)
- [ ] Data schema: customers, consents, transactions, events, decisions, ledger
- [ ] Product catalog + eligibility rules (SIP, FD, insurance, loans, SCSS…)

**Phase 1 — The agent loop**
- [ ] Signal/Inference agent → life‑event hypotheses + confidence
- [ ] NBA agent → ranked actions with reasoning trace
- [ ] Deterministic governance/consent gate (DPDP + TRAI window + freq cap + suppression)
- [ ] Explainability ledger writer

**Phase 2 — Experience**
- [ ] Customer view (YONO‑style card, "why am I seeing this", opt‑out)
- [ ] Ops/banker console (fleet view + suppressed actions + metrics)
- [ ] Multilingual personalization (Hindi + 1 regional) + voice snippet

**Phase 3 — Polish & pitch**
- [ ] Script the 2 hero personas end‑to‑end
- [ ] Metrics/impact dashboard (projected lift, opt‑out rate, suppression count)
- [ ] Deck + 3‑min demo rehearsal; failure‑safe (pre‑recorded backup clip)

---

## 10. Impact & business case (for the judges' scorecard)

- **Engagement:** proactive, relevant contact → higher YONO stickiness (vs 93% payments
  but low product depth today).
- **Acquisition/cross‑sell:** life‑event timing is the single biggest lever on conversion
  (industry NBA engines report materially higher conversion).
- **Adoption:** each nudge moves a customer to a *digital* product action.
- **Trust/retention:** the stress‑suppression + explainability builds the thing SBI needs
  most at 200M scale — trust.
- **Quantify (illustrative):** even a 1% cross‑sell lift on 100M users at modest product
  economics is a very large number — frame it, don't overclaim precision.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| "Creepy" / privacy backlash | Consent‑native, explainable, opt‑out one tap, suppression rules — lead with this |
| False‑positive life events | Confidence threshold + human‑in‑loop for high value + "was this useful?" feedback |
| Regulatory (DPDP/TRAI/RBI) | Deterministic gate; frame external data as AA; respect DLT window — demoed, not claimed |
| Looks like a chatbot | Emphasize the autonomous loop + reasoning trace + ops fleet view |
| Demo fragility | Synthetic data you control + pre‑recorded backup |

---

## 12. What to say in the last slide (the differentiators)

1. **Agentic, not conversational** — it acts before being asked.
2. **Consent‑native & explainable** — compliance is a feature, every decision auditable.
3. **AA‑enriched, inclusion‑scale, multilingual** — built for *SBI's* India, not a generic bank.
4. **Knows when not to sell** — restraint during stress = trust at 200M scale.

---

### Appendix — Sources
- SBI/YONO scale: The Week (Dec 2025), Trak.in, IBM case study
- Account Aggregator: Dept. of Financial Services, Sahamati, HyperVerge
- DPDP Act 2023 / Rules 2025: MeitY, EY, IndusLaw FAQs
- TRAI TCCCPR / DLT / consent: TRAI regulations, Lawrbit
- Life‑event NBA precedent: Wells Fargo, HSBC case studies
- Agentic architecture 2026: multi‑agent orchestration / agentic‑RAG references
