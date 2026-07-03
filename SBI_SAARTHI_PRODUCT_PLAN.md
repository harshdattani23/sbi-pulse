# SBI Saarthi 🪔 — Agentic AI Banking Companion for the Next 400 Million

> **सारथी (Saarthi)** = the guide/charioteer. A voice-first, vernacular, **agentic** AI
> that *acquires, activates, and engages* customers — using India's Digital Public
> Infrastructure as its **hands** and Banking Bhashini as its **voice**. One agent,
> all three hackathon tracks.

**Tracks:** Customer Acquisition **+** Digital Adoption **+** Digital Engagement (unified).
**★ Primary submission track: DIGITAL ADOPTION** — lead with the voice-first "agent that
*acts*" (voice UPI + dormant-account activation + inclusion). Acquire and Engage are
presented as the same agent's other two capabilities (platform depth without diluting focus).
Saarthi is architected so **each track's problem statement is a first-class module**:
Acquire ↔ Customer Acquisition · Adopt ↔ Digital Adoption · Engage ↔ Digital Engagement.
**Theme:** Agentic AI & Emerging Tech.
**Event resonance:** *Hello UPI* — India's voice-payments rail — was launched by the RBI
Governor **at Global Fintech Fest itself**. Building the agentic layer on top of it is the
most on-theme thing you can present at GFF 2026.

---

## 0. Why the pivot (read this first)

The earlier concept ("Life-Event Radar") was a good *feature* — proactive engagement — but
a single feature is not a product and won't stand out. The research below reframes it:
**proactive engagement is just one of three jobs a single agent should do**, and the real
prize is the agent that owns the whole customer journey in the customer's own language.

The old engine is **not wasted** — its deterministic governance gate + explainability
ledger become Saarthi's **compliance spine**, and its life-event brain becomes the
**Engage** module. We build up from it, not over it. (See §11.)

---

## 1. The insight (grounded)

| Evidence | Source | Implication |
|---|---|---|
| SBI's board-level goal: **2× YONO to 20 crore users** and acquire at **~1/10th branch cost**; products-per-customer stuck at **2.3** | ZeeBiz / CIO, Dec 2025 | The bank is *explicitly* buying digital acquisition + cross-sell. Build for that number. |
| **Only 38% of rural households are digitally literate**; voice removes the literacy barrier; **78% of top-50 banks run production voice agents** | awaaz.ai, 2026 | App-first excludes the next 400M. **Voice-first vernacular is the unlock.** |
| **Banking BHASHINI** — RBI × Bhashini domain LLM for Indian languages; **Hello UPI** voice payments (NPCI × AI4Bharat), launched *at GFF* | PolicyEdge / DNA India | An **India-sovereign, credible** language + payments substrate to build on — not a US LLM demo. |
| **India Stack**: UPI (₹29.5L cr/mo), Account Aggregator (253M linked accts), DigiLocker, Aadhaar eKYC, ONDC credit | IBEF / DFS | The agent can **actually do things** — open accounts, verify docs, pull finances, pay, underwrite. |
| Winning agentic banks in 2026 **"start with the architecture, not the agent"** — semantic layer, deterministic guardrails, escalation, audit *before* go-live | BankInfoSecurity / Backbase | Our compliance-first design is exactly the 2026 best practice. Lead with it. |

**Thesis:** The highest-impact, most-defensible, most-on-theme build for SBI is a
**voice-first agentic banker for the mass/rural segment** — the 400M who have a Jan Dhan
account but have never made a digital transaction. Nobody gives them a private banker.
Saarthi does, in their language, and it *acts* instead of just answering.

---

## 2. The product

**SBI Saarthi** is one agent, reachable where the next 400M already are —
**WhatsApp, a normal phone call (IVR), and inside YONO** — that speaks 12+ Indian
languages and completes real banking tasks end-to-end.

It has three jobs, which map 1:1 to the three tracks:

```
   ACQUIRE            →           ADOPT             →          ENGAGE
 (Customer Acq.)              (Digital Adoption)          (Digital Engagement)
────────────────           ────────────────────        ────────────────────
Conversational             Guides & DOES the first      Proactive, consented
onboarding + video         UPI payment, first FD,        life-event & financial-
KYC in the user's          activates dormant Jan         health nudges (the old
language, at ~1/10th       Dhan accounts — voice-        Radar engine), with a
branch cost.               first, literacy-free.         human RM for big-ticket.
```

The point: **the same agent, the same memory, the same trust relationship** carries a
customer from "never banked digitally" → "transacting" → "holding 4 products" — which is
exactly SBI's funnel (acquire cheap → activate → cross-sell to raise products/customer).

---

## 3. The three journeys (concrete)

### 3A. Acquire — "Kholo Khata" (open an account by talking)
A prospect messages/calls Saarthi. In their language it:
1. Understands intent ("I want a savings account"), sets expectations, gets consent.
2. Captures identity via **DigiLocker / Aadhaar eKYC** (agent orchestrates the pull).
3. Runs eligibility + product fit (basic savings vs. salary vs. Jan Dhan).
4. Books/█hands off to **Video-KYC**, pre-filling everything.
5. Result: an account opened at digital cost, with zero forms and zero literacy assumed.

### 3B. Adopt — "Karke Dikhao" (do it *with* me)
The dormant-account and first-timer problem. Saarthi doesn't explain UPI — it **does the
task with the user** via **Hello UPI-style voice payments**:
- "Send ₹500 to my son Ravi" → agent resolves payee, states it back, user says the UPI PIN
  → done. First transaction ever, hands-free.
- "Start a small monthly savings" → agent sets up an RD/FD, confirms.
- Proactively **re-activates dormant Jan Dhan accounts** with a guided first-use nudge.

### 3C. Engage — "Aapka Apna Banker" (proactive, respectful)
The old **Life-Event Radar** brain: watches consented behaviour, infers life events
(new job, relocation, new baby, retirement, **financial stress**), and reaches out with the
right next-best-action — or, when stress is detected, **suppresses the sale and offers
help**. High-value items escalate to a human relationship manager with the agent's brief.

---

## 4. Why this wins (judge scorecard)

| Criterion | Saarthi |
|---|---|
| **On-theme (Agentic AI & Emerging Tech)** | Autonomous, tool-using, multi-step agent — not a chatbot. Voice + Bhashini + Hello UPI + DPI = maximal emerging-tech surface. |
| **Solves SBI's *stated* problem** | Directly attacks 20cr-users-at-1/10-cost and products-per-customer. Judges from SBI will recognize their own KPIs. |
| **Only works at SBI's scale/mandate** | Financial-inclusion mission + 500M base + rural footprint. A startup can't claim this ground. |
| **Hits all three tracks with one build** | Acquire + Adopt + Engage from a single agent — a platform story, not a point solution. |
| **Responsible-AI as a feature** | Deterministic guardrails + consent + audit + human-in-loop = 2026 best practice, demoed not claimed. |
| **Demoable & measurable** | A live vernacular voice flow that *opens an account* and *makes a payment* is unforgettable on stage. |

---

## 5. Emerging-tech surface (name these on stage)

- **Agentic AI** — planner/executor with tool-calling, memory, and guardrails.
- **Voice + vernacular** — **Banking BHASHINI / AI4Bharat** STT+TTS, code-switching, dialects.
- **Hello UPI** — voice-initiated UPI payments (NPCI), PIN-confirmed.
- **India Stack as tools** — Aadhaar eKYC, **DigiLocker**, **Account Aggregator**, UPI, **ONDC credit**.
- **Voice biometrics** — as a login/step-up auth factor (Phase 2+).

---

## 6. Architecture — "architecture before agent"

Following the 2026 best practice (build the governance/semantic/audit layer *first*):

```
        CHANNELS
  WhatsApp · Phone/IVR · YONO in-app · Missed-call
                    │
        ┌───────────▼────────────┐
        │   LANGUAGE GATEWAY      │  Bhashini/AI4Bharat STT · TTS · translit · dialect
        └───────────┬────────────┘
                    │  (normalized intent + language tag)
        ┌───────────▼────────────────────────────────────────────┐
        │              ORCHESTRATOR AGENT (planner)               │
        │   intent → plan → tool calls → confirm → act → explain  │
        └───┬─────────────┬──────────────┬───────────────┬────────┘
            │             │              │               │
     ┌──────▼─────┐ ┌─────▼──────┐ ┌─────▼───────┐ ┌─────▼────────┐
     │ ACQUIRE    │ │ ADOPT      │ │ ENGAGE      │ │ SERVICE/Q&A  │  ← skill agents
     │ (onboard)  │ │ (do-tasks) │ │ (Radar)     │ │ (grounded)   │
     └──────┬─────┘ └─────┬──────┘ └─────┬───────┘ └─────┬────────┘
            └─────────────┴───────┬──────┴───────────────┘
                                  │  every action passes through ↓
        ┌─────────────────────────▼─────────────────────────────┐
        │  POLICY & GUARDRAIL ENGINE  (DETERMINISTIC, not an LLM) │
        │  consent (DPDP) · TRAI window · eligibility · limits ·  │
        │  identity + delegated-authority auth · fraud/velocity · │
        │  human-in-the-loop escalation · frequency caps          │
        └─────────────────────────┬──────────────────────────────┘
                                  │  approved tool invocations
        ┌─────────────────────────▼─────────────────────────────┐
        │        DPI TOOL LAYER (typed connectors, mockable)     │
        │  eKYC · DigiLocker · Account Aggregator · UPI/Hello UPI │
        │  · Video-KYC · Core Banking · ONDC credit · CRM         │
        └─────────────────────────┬──────────────────────────────┘
                                  │
        ┌─────────────────────────▼─────────────────────────────┐
        │   EXPLAINABILITY / AUDIT LEDGER (append-only)          │
        │   who · what · why · which data · consent basis        │
        └────────────────────────────────────────────────────────┘
                    │
        SEMANTIC / KNOWLEDGE LAYER (products, eligibility, policy, RAG over SBI docs)
```

**Two design rules that win credibility:**
1. **The guardrail engine is deterministic code, never the LLM.** The LLM *proposes*
   actions; policy *disposes*. An auditor can read it and know exactly what the agent can do.
2. **Every action is logged with its consent basis and a human-readable "why."**

---

## 7. Responsible AI & security (the moat — grounded in 2026 practice)

- **Delegated-authority auth**: verify *both* the agent's identity *and* the user's
  delegated permission for each action (the core 2026 agentic-banking auth problem).
- **Money movement is always PIN/biometric-confirmed** and rate-limited; nothing moves on
  the LLM's say-so alone.
- **Human-in-the-loop** for account opening approval, loans, insurance, and any high-value
  action — agent assists, human signs off.
- **Consent-native (DPDP 2023 / Rules 2025)** purpose-scoped, revocable; **AA** as the only
  external-data path; **TRAI/DLT** respected for outbound.
- **Real-time fraud/velocity guardrails**; anomaly → step-up auth or freeze.
- **Full audit trail** — traceable, policy-bound, reviewable from day one.

---

## 8. PHASED PRODUCT PLAN

### Phase 0 — Hackathon MVP (48–72h) · *win the room*
**Goal:** one agent, three unforgettable hero flows, in 2–3 languages, fully guardrailed,
with everything risky **simulated but honest**.

**Build:**
- Conversational agent (WhatsApp-style web chat + **voice note in/out**) in **Hindi +
  English (+ Odia)**.
- **Acquire** hero flow: open a savings account by talking → DigiLocker/eKYC *mock* →
  eligibility → "Video-KYC booked."
- **Adopt** hero flow: "send ₹500 to my son" → Hello UPI-style voice payment with PIN
  confirm; dormant-account activation nudge.
- **Engage** hero flow: reuse the **Life-Event Radar** engine for a proactive vernacular nudge.
- **Guardrail engine + audit ledger** visibly gating every action (reuse existing).
- **Ops console**: agent reasoning trace, tool calls, compliance verdicts, and the
  scale/impact projection.

**Tech:** TypeScript/Node engine (already built) · Claude for the conversational
planner + tool-calling · mocked DPI connectors with realistic latency · browser
SpeechSynthesis/Whisper-style STT *or* a TTS API for voice, with a template fallback so
**the demo never breaks**.

**Success = judges see a real vernacular voice conversation open an account and make a
payment, with every step consented and auditable.**

---

### Phase 1 — Internal Pilot (Month 1–3) · *prove it works*
- Swap mocks for **sandboxes**: WhatsApp Business API, **Bhashini/AI4Bharat** STT/TTS,
  **UPI sandbox**, **AA sandbox**, **DigiLocker sandbox**, Video-KYC.
- Narrow to 2 flows (Acquire + one Adopt task) in **3–4 languages**.
- **Human-in-the-loop on 100%** of money/account actions.
- Stand up the **governance + audit infrastructure first** (semantic layer, policy engine,
  ledger) — before scaling agents.
- Pilot cohort: staff + consenting volunteers (low thousands).
- **KPIs:** onboarding completion rate, cost/acquisition vs. branch, first-transaction rate,
  containment (no-human) rate, zero unauthorized actions.

---

### Phase 2 — Controlled Rollout (Month 3–9) · *scale the channels*
- Add **IVR/phone-call** channel (feature-phone + no-app users) and **YONO in-app**.
- **8–12 languages**; add **voice biometrics** as a step-up auth factor.
- New journeys: FD/RD, insurance, **AA-based loan pre-qualification**, **dormant Jan Dhan
  re-activation campaigns**, bill autopay.
- Full **DPDP consent-manager** integration, **TRAI DLT** registration, RBI compliance
  hardening; red-team + fraud guardrails.
- Measure against SBI's own numbers: **acquisition cost, activation, products-per-customer**.

---

### Phase 3 — Platform & Ecosystem (Month 9–24) · *own the relationship*
- Saarthi as a **skills platform**: add-on agent skills (govt schemes, KCC for farmers,
  MSME working capital via GST+AA, ONDC credit).
- **All 22 scheduled languages** + offline/edge inference for low-connectivity regions.
- **BC / branch-staff copilot**: the agent briefs the human for assisted-digital in villages.
- Open the **Engage brain to relationship managers** as a next-best-action cockpit.
- Continuous-learning loop with model governance, drift monitoring, and outcome feedback.

---

## 9. Business case (tie to SBI's own KPIs)

- **Acquisition:** digital onboarding at ~1/10th branch cost, applied to the 20-crore push.
- **Adoption:** convert dormant Jan Dhan accounts to active — the single biggest untapped
  base in Indian banking.
- **Cross-sell:** move products-per-customer from 2.3 upward via timed, consented nudges.
- **Inclusion + trust:** serve the 62% who aren't digitally literate — a mandate metric, not
  just a revenue one.
- *Illustrative:* even a modest lift in activation + one extra product across tens of millions
  of users is a very large, board-relevant number. Frame with clear assumptions; don't overclaim.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Voice accuracy across dialects | Bhashini/AI4Bharat models; confirm-before-act; graceful fallback to menu/human |
| Agent doing something unauthorized | Deterministic guardrails; PIN/biometric on money; human-in-loop; hard limits |
| Trust / fraud fear in rural users | Verified SBI channel, voice biometrics, "why" transparency, easy human handoff |
| Regulatory (DPDP/RBI/TRAI) | Consent-native, AA-only external data, DLT-registered outbound, full audit from day one |
| "It's just a chatbot" | Show the tool calls + the account actually opening + the payment actually clearing (sandbox) |
| Connectivity | IVR/missed-call + offline/edge in later phases |

---

## 11. What we reuse (nothing wasted)

The code already built becomes Saarthi's **compliance spine** and **Engage module**:
- `governance/consentGate.ts` → the **Policy & Guardrail Engine** (extended with auth + limits).
- `governance/ledger.ts` → the **Audit Ledger**.
- `agents/signalAgent.ts` + `nbaAgent.ts` + `personalizationAgent.ts` → the **Engage** skill.
- `data/*` synthetic generator → demo personas for all three journeys.
- The web Ops console → Saarthi's **agent-operations cockpit**.
New in Phase 0: the conversational **Orchestrator**, the **Language Gateway** (voice), and
the **DPI tool layer** (mock connectors for eKYC/DigiLocker/UPI/Video-KYC).

---

## 12. Demo script (3 minutes, on stage)
1. **Adopt (the hook):** a rural persona *speaks in Hindi* — "मेरे बेटे को पाँच सौ रुपये भेजो।"
   Saarthi confirms the payee aloud, user says the PIN, payment clears. First digital
   transaction, hands-free. (Show the tool call + audit entry.)
2. **Acquire:** a prospect opens a savings account by talking — DigiLocker pull, eligibility,
   Video-KYC booked — no form, no English.
3. **Engage + restraint:** a stressed customer — Saarthi **suppresses the cross-sell** and
   offers help; a high-value case escalates to a human RM.
4. **Ops cockpit:** flip to the console — reasoning traces, compliance verdicts, and the
   projected impact at SBI scale.
5. Close on the four differentiators: **agentic · voice-first vernacular · DPI-native ·
   consent-and-audit by design.**

---

### Appendix — sources
SBI 20cr/1-10th-cost + 2.3 products: ZeeBiz, CIO, Whalesbook (Dec 2025) · Voice/inclusion +
78% of top banks: awaaz.ai, gnani.ai (2026) · Banking BHASHINI + DPI: PolicyEdge, IBEF,
India Stack · Hello UPI @ GFF: DNA India, India.com, Paytm blog · Agentic guardrails/auth
(architecture-first, human-in-loop, delegated authority): BankInfoSecurity, Backbase,
Neontri, IMF Notes 2026.
