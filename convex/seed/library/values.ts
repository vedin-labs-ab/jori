import { type SeedStore } from "./shape"

// The stores Vedin Labs keeps: a store is one document, so each of these is a
// single settled thing the whole company reads from rather than a list that
// grows. Schemas are authored where the shape matters and left off where the
// value is just prose the team edits.

export const stores: SeedStore[] = [
  {
    name: "On-call rota",
    description:
      "Who is on call this week and next, and what counts as worth waking someone for. Jori reads this before it pages anyone in #incidents.",
    folder: "Engineering",
    created: 88,
    updated: 3,
    schema: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        rotatesOn: { type: "string" },
        escalateAfterMinutes: { type: "integer" },
        wakeFor: { type: "array", items: { type: "string" } },
      },
      required: ["primary", "secondary", "rotatesOn"],
    },
    value: {
      primary: "Nadia Rahman",
      secondary: "Oskar Hedlund",
      rotatesOn: "Monday 09:00 Europe/Stockholm",
      escalateAfterMinutes: 20,
      wakeFor: [
        "Sign-in is down for any customer",
        "Runs are failing across more than one workspace",
        "Any data loss, however small",
      ],
    },
  },
  {
    name: "Pricing",
    description:
      "The plans as they are actually sold, including the discount Tobias may give without asking. Support and Jori both quote from this.",
    folder: "Go to market",
    created: 106,
    updated: 19,
    schema: {
      type: "object",
      properties: {
        currency: { type: "string" },
        plans: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              perSeat: { type: "number" },
              minimumSeats: { type: "integer" },
              includes: { type: "string" },
            },
            required: ["name", "perSeat"],
          },
        },
        maximumDiscount: { type: "number" },
      },
      required: ["currency", "plans"],
    },
    value: {
      currency: "EUR",
      plans: [
        {
          name: "Starter",
          perSeat: 29,
          minimumSeats: 5,
          includes: "Slack, one automation, 30 days of run history",
        },
        {
          name: "Growth",
          perSeat: 35,
          minimumSeats: 20,
          includes: "Every integration, unlimited automations, shared tables",
        },
        {
          name: "Enterprise",
          perSeat: 45,
          minimumSeats: 75,
          includes: "Per-folder permissions, audit log, priority support",
        },
      ],
      maximumDiscount: 0.15,
    },
  },
  {
    name: "How we write",
    description:
      "The house voice, kept short enough that people actually read it. Every automation that drafts customer-facing text is pointed at this store.",
    folder: "Go to market",
    created: 71,
    updated: 26,
    value: {
      voice:
        "Plain, specific, and unhurried. We say what a thing does before we say why it matters.",
      avoid: [
        "Superlatives we cannot support",
        "The word seamless",
        "Exclamation marks in anything a customer reads",
        "Apologising twice in the same message",
      ],
      preferences: [
        "Name the customer's problem in their words before ours",
        "One idea per paragraph",
        "Numbers over adjectives: 820ms, not blazing fast",
      ],
      signOff: "Ask a question the reader can answer in one line.",
    },
  },
  {
    name: "Runway",
    description:
      "The board-facing numbers, kept where only the founders can read them. Updated after each month closes.",
    folder: "Board and runway",
    created: 76,
    updated: 14,
    schema: {
      type: "object",
      properties: {
        closedMonth: { type: "string" },
        cashOnHand: { type: "number" },
        monthlyBurn: { type: "number" },
        monthsRemaining: { type: "number" },
        netRevenueRetention: { type: "number" },
        note: { type: "string" },
      },
      required: ["closedMonth", "cashOnHand", "monthlyBurn"],
    },
    value: {
      closedMonth: "2026-07",
      cashOnHand: 2740000,
      monthlyBurn: 152000,
      monthsRemaining: 18,
      netRevenueRetention: 1.14,
      note: "Next hire is a second support person, not a third engineer.",
    },
  },
]
