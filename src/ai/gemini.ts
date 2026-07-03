// ---------------------------------------------------------------------------
// Gemini client — the real LLM behind SBI Pulse's reasoning.
// Model: gemini-3.1-flash-lite-preview (v1beta REST, structured JSON output).
// Key comes ONLY from the GEMINI_API_KEY environment variable.
//   export GEMINI_API_KEY="AIza..."  &&  npm run web
// ---------------------------------------------------------------------------

const MODEL = "gemini-3.1-flash-lite-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const KEY = (process.env.GEMINI_API_KEY ?? "").trim();

export const hasGemini = () => !!KEY;

export interface GenOpts {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}

/** Call Gemini and return validated JSON matching `schema`. Throws on failure. */
export async function generateJSON<T = unknown>(opts: GenOpts): Promise<T> {
  if (!KEY) throw new Error("no gemini key");

  const call = async (extraInstruction = ""): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": KEY },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system + extraInstruction }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: opts.maxTokens ?? 700,
            responseMimeType: "application/json",
            responseSchema: opts.schema,
          },
        }),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        promptFeedback?: { blockReason?: string };
      };
      if (!data.candidates?.length) throw new Error(`blocked: ${data.promptFeedback?.blockReason ?? "no candidates"}`);
      const text = data.candidates[0].content?.parts?.map((p) => p.text).join("") ?? "";
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      return JSON.parse(cleaned) as T;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await call();
  } catch (e) {
    if (String(e).includes("JSON")) {
      // one stricter retry on parse failure
      return await call(" Return ONLY valid minified JSON. No prose, no markdown fences.");
    }
    throw e;
  }
}

export const GEMINI_MODEL = MODEL;
