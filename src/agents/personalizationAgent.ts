import type {
  Customer,
  LifeEventHypothesis,
  RankedAction,
  Channel,
  Message,
  LanguageCode,
} from "../domain.ts";

// ---------------------------------------------------------------------------
// Personalization Agent.
// Renders the chosen action into a respectful, vernacular message with a
// transparency ("why am I seeing this?") string. Template-based so the demo is
// deterministic and offline; optionally upgraded by Claude when USE_LLM=1.
// ---------------------------------------------------------------------------

const firstName = (name: string) => name.split(/[ &]/)[0];

/** Per-language framing. Body lines are event-specific and kept warm, not pushy. */
const LANG = {
  en: {
    greet: (n: string) => `Hi ${n},`,
    why: (ev: string, prod: string) =>
      `You turned on behavioural insights. We noticed ${ev} — that's why we're suggesting ${prod}. You can manage or turn this off anytime.`,
    cta: "Tap to explore",
  },
  hi: {
    greet: (n: string) => `नमस्ते ${n},`,
    why: (ev: string, prod: string) =>
      `आपने व्यवहार-आधारित सुझाव चालू किए हैं। हमने देखा: ${ev} — इसलिए हम ${prod} सुझा रहे हैं। आप इसे कभी भी बंद कर सकते हैं।`,
    cta: "जानने के लिए टैप करें",
  },
  or: {
    greet: (n: string) => `ନମସ୍କାର ${n},`,
    why: (ev: string, prod: string) =>
      `ଆପଣ ବ୍ୟବହାର-ଆଧାରିତ ପରାମର୍ଶ ସକ୍ରିୟ କରିଛନ୍ତି। ଆମେ ଦେଖିଲୁ: ${ev} — ସେଥିପାଇଁ ଆମେ ${prod} ପରାମର୍ଶ ଦେଉଛୁ। ଆପଣ ଏହାକୁ ଯେକୌଣସି ସମୟରେ ବନ୍ଦ କରିପାରିବେ।`,
    cta: "ଜାଣିବାକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ",
  },
} satisfies Record<LanguageCode, unknown>;

/** Short event phrase used inside the "why" line, per language. */
function eventPhrase(type: string, lang: LanguageCode): string {
  const m: Record<string, Record<LanguageCode, string>> = {
    salary_hike: { en: "your income has increased", hi: "आपकी आय बढ़ी है", or: "ଆପଣଙ୍କ ଆୟ ବଢ଼ିଛି" },
    relocation: { en: "you've moved to a new city", hi: "आप नए शहर में आए हैं", or: "ଆପଣ ନୂଆ ସହରକୁ ଆସିଛନ୍ତି" },
    marriage: { en: "a wedding in the family", hi: "परिवार में विवाह", or: "ପରିବାରରେ ବିବାହ" },
    new_baby: { en: "a new arrival at home", hi: "घर में नया मेहमान", or: "ଘରେ ନୂଆ ଅତିଥି" },
    approaching_retirement: { en: "retirement is approaching", hi: "सेवानिवृत्ति निकट है", or: "ଅବସର ନିକଟ" },
    child_college: { en: "college is approaching for your child", hi: "बच्चे की पढ़ाई का खर्च निकट", or: "ପିଲାଙ୍କ ଶିକ୍ଷା ଖର୍ଚ୍ଚ ନିକଟ" },
    financial_stress: { en: "things look a little tight this month", hi: "इस महीने बजट थोड़ा तंग है", or: "ଏହି ମାସ ବଜେଟ୍ ଟିକେ ଟାଣ" },
  };
  return m[type]?.[lang] ?? m[type]?.en ?? "a change in your finances";
}

/** Event-specific title + body, English base (kept short for a card/WhatsApp). */
function baseContent(event: LifeEventHypothesis, action: RankedAction) {
  const p = action.product.name;
  switch (event.type) {
    case "salary_hike":
      return { title: "Put your raise to work 💪", line: `Congrats on the income bump! Consider **${p}** so more of it compounds for you.` };
    case "relocation":
      return { title: `Settling into ${event.facts.toCity}? 🏙️`, line: `Make the move easier — **${p}** is a quick win for your new setup.` };
    case "marriage":
      return { title: "Congratulations! 💍", line: `As you build a life together, **${p}** helps you start on solid financial footing.` };
    case "new_baby":
      return { title: "Welcome to the family 👶", line: `Big moment! **${p}** helps you protect and plan for what's ahead.` };
    case "approaching_retirement":
      return { title: "Planning the next chapter 🌅", line: `**${p}** can help turn your savings into steady, safe income.` };
    case "child_college":
      return { title: "Big education milestone ahead 🎓", line: `Get ahead of the cost with **${p}**.` };
    case "financial_stress":
      return { title: "We're here to help 🤝", line: `This month looks tight. No pressure — **${p}** can ease things. Want us to set it up?` };
    default:
      return { title: "A suggestion for you", line: `Consider **${p}**.` };
  }
}

export async function personalize(
  customer: Customer,
  event: LifeEventHypothesis,
  action: RankedAction,
  channel: Channel,
): Promise<Message> {
  const lang = customer.preferredLanguage;
  const L = LANG[lang];
  const n = firstName(customer.name);
  const base = baseContent(event, action);

  let body = `${L.greet(n)}\n${base.line}\n\n${L.cta} →`;

  // Optional Claude upgrade for a more natural vernacular tone.
  if (process.env.USE_LLM === "1" && process.env.ANTHROPIC_API_KEY) {
    try {
      body = await refineWithClaude(customer, event, action, base.line, lang);
    } catch {
      /* fall back silently to the template — demo must never break */
    }
  }

  return {
    language: lang,
    channel,
    title: base.title,
    body,
    whyThis: L.why(eventPhrase(event.type, lang), action.product.name),
  };
}

async function refineWithClaude(
  customer: Customer,
  event: LifeEventHypothesis,
  action: RankedAction,
  englishLine: string,
  lang: LanguageCode,
): Promise<string> {
  const langName = { en: "English", hi: "Hindi", or: "Odia" }[lang];
  const prompt = `You are SBI's warm, respectful banking assistant. Write a 2-sentence ${langName} message for ${customer.name} about "${action.product.name}". Context (do not quote literally): ${englishLine}. Be helpful, never pushy, culturally appropriate for India. Output only the message text.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content: { text: string }[] };
  return data.content.map((c) => c.text).join("").trim();
}
