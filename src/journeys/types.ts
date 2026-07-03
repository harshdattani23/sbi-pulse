// ---------------------------------------------------------------------------
// Journey model — an AI-led banking journey is an adaptive state machine.
// Each step offers the customer options; their choice BRANCHES the journey.
// This is what makes Pulse "journeys, not nudges".
// ---------------------------------------------------------------------------

export type JourneyChannel = "yono_card" | "whatsapp" | "push";

export interface JourneyOption {
  label: string; // what the customer taps ("Start a ₹500 SIP", "Not now")
  choice: string; // machine id
  next: string | null; // next step id (null = end of journey)
}

export interface JourneyStep {
  id: string;
  kind: "insight" | "offer" | "celebrate" | "care" | "close";
  title: string;
  body: string; // supports {name} and {growth} placeholders + **bold**
  channel: JourneyChannel;
  options: JourneyOption[]; // empty => terminal step
  effect?: string; // outcome recorded when this terminal step is reached
}

export interface JourneyDef {
  id: string;
  name: string;
  emoji: string;
  goal: string; // the wellness goal (why this journey exists)
  isCare?: boolean; // care/service journey → gated differently (no UCC consent needed)
  startStep: string;
  steps: Record<string, JourneyStep>;
}

export interface JourneySession {
  customerId: string;
  journeyId: string;
  currentStep: string;
  status: "active" | "completed";
  outcome?: string; // effect of the terminal step reached
  facts: Record<string, string | number>;
  history: Array<{ step: string; choice?: string; label?: string; at: string }>;
  startedAt: string;
}
