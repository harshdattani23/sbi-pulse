import type { JourneyDef } from "./types.ts";

// ---------------------------------------------------------------------------
// The 5 Phase-0 journeys. Copy is warm, respectful, and wellness-first.
// Note how "Not now" never dead-ends into a nag — it branches to a smaller,
// kinder ask. That restraint is the point.
// ---------------------------------------------------------------------------

export const JOURNEYS: Record<string, JourneyDef> = {
  // ------------------------------------------------------------------ First SIP
  first_sip: {
    id: "first_sip",
    name: "First SIP",
    emoji: "📈",
    goal: "Build a lasting investing habit",
    startStep: "insight",
    steps: {
      insight: {
        id: "insight", kind: "insight", channel: "whatsapp",
        title: "Put your raise to work 💪",
        body: "Hi {name}, your income went up recently — congrats! Park even a small slice into a SIP and it quietly compounds in the background.",
        options: [
          { label: "Start a ₹500 SIP", choice: "start_500", next: "celebrate" },
          { label: "How does it work?", choice: "learn", next: "educate" },
          { label: "Not now", choice: "later", next: "smaller" },
        ],
      },
      educate: {
        id: "educate", kind: "offer", channel: "whatsapp",
        title: "A SIP in one line",
        body: "It invests a fixed amount every month, automatically. Start tiny, pause anytime. No lock-in stress.",
        options: [
          { label: "Okay, start ₹500", choice: "start_500", next: "celebrate" },
          { label: "Maybe later", choice: "later", next: "later" },
        ],
      },
      smaller: {
        id: "smaller", kind: "offer", channel: "whatsapp",
        title: "No rush at all 🌱",
        body: "Even ₹100 a month builds the habit — want to try that instead?",
        options: [
          { label: "Start ₹100", choice: "start_100", next: "celebrate_small" },
          { label: "Not right now", choice: "later", next: "later" },
        ],
      },
      celebrate: {
        id: "celebrate", kind: "celebrate", channel: "yono_card",
        title: "You're investing! 🎉",
        body: "Your ₹500/month SIP is set. I'll cheer you on every payday.",
        options: [], effect: "sip_500",
      },
      celebrate_small: {
        id: "celebrate_small", kind: "celebrate", channel: "yono_card",
        title: "Great first step! 🌱",
        body: "₹100/month SIP started. Small and steady really does win.",
        options: [], effect: "sip_100",
      },
      later: {
        id: "later", kind: "close", channel: "whatsapp",
        title: "All good 👍",
        body: "I'll remind you gently next payday. No pressure.",
        options: [], effect: "declined",
      },
    },
  },

  // ----------------------------------------------------------- Overspend Rescue
  overspend_rescue: {
    id: "overspend_rescue",
    name: "Overspend Rescue",
    emoji: "🧭",
    goal: "Regain control without guilt",
    startStep: "alert",
    steps: {
      alert: {
        id: "alert", kind: "insight", channel: "whatsapp",
        title: "A quick heads-up 👀",
        body: "Hi {name}, your lifestyle spends have climbed about {growth}% lately. Want to take a quick look together?",
        options: [
          { label: "Show me", choice: "show", next: "breakdown" },
          { label: "Set a soft cap", choice: "cap", next: "cap" },
          { label: "I'm okay", choice: "dismiss", next: "dismiss" },
        ],
      },
      breakdown: {
        id: "breakdown", kind: "insight", channel: "yono_card",
        title: "Where it's going",
        body: "Most of the jump is dining, shopping and entertainment. A gentle monthly cap keeps it fun — without the month-end guilt.",
        options: [
          { label: "Set a soft cap", choice: "cap", next: "cap" },
          { label: "Not now", choice: "dismiss", next: "dismiss" },
        ],
      },
      cap: {
        id: "cap", kind: "celebrate", channel: "yono_card",
        title: "Cap set 🎯",
        body: "I'll ping you weekly on how you're tracking. No judgment — just clarity.",
        options: [], effect: "cap_set",
      },
      dismiss: {
        id: "dismiss", kind: "close", channel: "whatsapp",
        title: "You've got this 🙂",
        body: "I'm here if it ever helps. No nagging, promise.",
        options: [], effect: "declined",
      },
    },
  },

  // ------------------------------------------------------------ Dormant Revival
  dormant_revival: {
    id: "dormant_revival",
    name: "Dormant Revival",
    emoji: "🔥",
    goal: "Reactivate a silent customer",
    startStep: "reintro",
    steps: {
      reintro: {
        id: "reintro", kind: "insight", channel: "whatsapp",
        title: "We miss you 👋",
        body: "Hi {name}, it's been a while! Want to knock out something useful in just one tap?",
        options: [
          { label: "Pay a bill", choice: "bill", next: "action_bill" },
          { label: "Send money (UPI)", choice: "upi", next: "action_upi" },
          { label: "Not now", choice: "close", next: "close" },
        ],
      },
      action_bill: {
        id: "action_bill", kind: "offer", channel: "yono_card",
        title: "One-tap bill pay",
        body: "Your electricity bill is due soon. Shall I set it up for you?",
        options: [
          { label: "Pay now", choice: "done", next: "streak" },
          { label: "Later", choice: "close", next: "close" },
        ],
      },
      action_upi: {
        id: "action_upi", kind: "offer", channel: "yono_card",
        title: "Quick UPI",
        body: "Send money to a saved contact in seconds — want to try?",
        options: [
          { label: "Do it", choice: "done", next: "streak" },
          { label: "Later", choice: "close", next: "close" },
        ],
      },
      streak: {
        id: "streak", kind: "celebrate", channel: "yono_card",
        title: "🔥 You're back!",
        body: "Day-1 streak started. Small wins add up — see you tomorrow?",
        options: [], effect: "reactivated",
      },
      close: {
        id: "close", kind: "close", channel: "whatsapp",
        title: "Anytime 🙏",
        body: "Whenever you're ready, I'm just one message away.",
        options: [], effect: "declined",
      },
    },
  },

  // -------------------------------------------------------------- Stress Shield
  stress_shield: {
    id: "stress_shield",
    name: "Stress Shield",
    emoji: "🛡️",
    goal: "Support in a tight month — not a sale",
    isCare: true,
    startStep: "care_intro",
    steps: {
      care_intro: {
        id: "care_intro", kind: "care", channel: "yono_card",
        title: "We're here to help 🤝",
        body: "Hi {name}, this month looks a little tight. No pressure at all — would some help make things easier?",
        options: [
          { label: "Yes, please", choice: "yes", next: "options" },
          { label: "I'm managing", choice: "no", next: "close_care" },
        ],
      },
      options: {
        id: "options", kind: "care", channel: "yono_card",
        title: "A few ways I can help",
        body: "I can ease your EMIs, or set up a simple budget buddy — whichever helps more.",
        options: [
          { label: "Ease my EMIs", choice: "restructure", next: "restructure" },
          { label: "Budget buddy", choice: "coach", next: "coach" },
          { label: "Just checking in", choice: "no", next: "close_care" },
        ],
      },
      restructure: {
        id: "restructure", kind: "care", channel: "yono_card",
        title: "Let's lighten the load",
        body: "I'll connect you to a relationship manager to restructure your EMIs — it's free to talk it through.",
        options: [], effect: "rm_handoff",
      },
      coach: {
        id: "coach", kind: "celebrate", channel: "yono_card",
        title: "Budget buddy on 📊",
        body: "I'll help you track weekly and spot easy savings. We'll get through this.",
        options: [], effect: "coach_on",
      },
      close_care: {
        id: "close_care", kind: "close", channel: "yono_card",
        title: "Take care 🙏",
        body: "I'm right here whenever you need me.",
        options: [], effect: "declined",
      },
    },
  },

  // ------------------------------------------------------------- New-Baby Nest
  new_baby_nest: {
    id: "new_baby_nest",
    name: "New-Baby Nest",
    emoji: "👶",
    goal: "Plan early for the little one",
    startStep: "congrats",
    steps: {
      congrats: {
        id: "congrats", kind: "insight", channel: "whatsapp",
        title: "Congratulations! 👶",
        body: "Hi {name}, exciting times! Want to get a small plan going for the little one?",
        options: [
          { label: "Start a child goal", choice: "goal", next: "goal" },
          { label: "Review protection", choice: "protection", next: "protection" },
          { label: "Maybe later", choice: "later", next: "close" },
        ],
      },
      goal: {
        id: "goal", kind: "celebrate", channel: "yono_card",
        title: "Nest egg started 🎓",
        body: "A Child Education RD is set up. Tiny monthly steps, a big future.",
        options: [], effect: "goal_started",
      },
      protection: {
        id: "protection", kind: "care", channel: "yono_card",
        title: "Protecting them",
        body: "A term plan keeps them secure. I'll get a relationship manager to walk you through it.",
        options: [], effect: "rm_handoff",
      },
      close: {
        id: "close", kind: "close", channel: "whatsapp",
        title: "All good 👍",
        body: "I'll check back in a little while.",
        options: [], effect: "declined",
      },
    },
  },
};
