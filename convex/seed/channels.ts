import { type PlaceClaim, type PlaceVisibility } from "../places/schema"

// The Slack channels Vedin Labs works in, each with the distilled profile a
// few weeks of traffic would have produced. Claims are what a run reads
// before answering in a channel, so they are written the way the profiler
// writes them: one durable norm per line, confirmed against recent traffic.

type SeedChannel = {
  externalId: string
  name: string
  visibility: PlaceVisibility
  /** Days before the seed instant the newest profiled message landed. */
  profiled: number
  claims: [PlaceClaim["section"], string][]
}

export const channels: SeedChannel[] = [
  {
    externalId: "C08GENERAL01",
    name: "general",
    visibility: "public",
    profiled: 3,
    claims: [
      [
        "purpose",
        "Company-wide announcements and anything that does not have a narrower home.",
      ],
      [
        "people",
        "Everyone at Vedin Labs is a member; Albin posts most announcements.",
      ],
      [
        "language",
        "Plain and short. Announcements open with a bolded one-line summary.",
      ],
      [
        "rhythm",
        "A Monday plan post and a Friday shipped post, both from the founders.",
      ],
      [
        "jori",
        "Summarize on request only. Do not post unprompted in this channel.",
      ],
    ],
  },
  {
    externalId: "C08ENGROOM2",
    name: "engineering",
    visibility: "public",
    profiled: 1,
    claims: [
      [
        "purpose",
        "Day-to-day engineering: pull requests, deploys, and design debates that outgrew a Linear comment.",
      ],
      [
        "people",
        "Oskar and Nadia carry most threads; Albin joins on architecture questions.",
      ],
      [
        "language",
        "Direct and technical. Code and errors go in fenced blocks, never as screenshots.",
      ],
      [
        "rhythm",
        "Deploys land weekday afternoons; the team avoids shipping after 16:00 Stockholm time on Fridays.",
      ],
      [
        "jori",
        "Triage failing checks and summarize long review threads. Never push commits without being asked.",
      ],
    ],
  },
  {
    externalId: "C08PRODUCT3",
    name: "product",
    visibility: "public",
    profiled: 2,
    claims: [
      ["purpose", "Scope, sequencing, and what a release is actually for."],
      [
        "people",
        "Mia leads; Tobias brings customer pressure and Nadia the implementation cost.",
      ],
      [
        "language",
        "Decisions are written as a short claim followed by the trade-off it accepts.",
      ],
      [
        "rhythm",
        "Scope is settled Tuesdays. Anything reopened after Tuesday needs a stated reason.",
      ],
      [
        "jori",
        "Pull the relevant customer asks into a thread when scope is being argued.",
      ],
    ],
  },
  {
    externalId: "C08SUPPORT4",
    name: "support",
    visibility: "public",
    profiled: 1,
    claims: [
      [
        "purpose",
        "Inbound customer problems and the escalations that come out of them.",
      ],
      [
        "people",
        "Priya triages everything first; engineering is pulled in by name, not by broadcast.",
      ],
      [
        "language",
        "Every escalation names the customer, the plan, and what the customer cannot do right now.",
      ],
      [
        "rhythm",
        "Triage twice a day, morning and mid-afternoon. Anything unresolved by Thursday goes to the weekly review.",
      ],
      [
        "jori",
        "Draft the first reply and file the escalation row. A person sends it.",
      ],
    ],
  },
  {
    externalId: "C08GTMDESK5",
    name: "gtm",
    visibility: "public",
    profiled: 4,
    claims: [
      [
        "purpose",
        "Pipeline, pricing questions, and the accounts that need something before they renew.",
      ],
      [
        "people",
        "Tobias owns pipeline; Elin covers launches and content; Johan answers billing.",
      ],
      [
        "language",
        "Accounts are named the way they appear in the customer table, never by shorthand.",
      ],
      [
        "rhythm",
        "Pipeline is reviewed Monday morning before the company plan post.",
      ],
      [
        "jori",
        "Keep the account table current and flag accounts that have gone quiet for two weeks.",
      ],
    ],
  },
  {
    externalId: "C08INCIDENT6",
    name: "incidents",
    visibility: "public",
    profiled: 9,
    claims: [
      [
        "purpose",
        "Live incidents only. Everything else belongs in engineering.",
      ],
      [
        "people",
        "Whoever is on call opens the thread; Oskar is the default escalation.",
      ],
      [
        "language",
        "One thread per incident, timestamped updates, no side conversation in the channel.",
      ],
      [
        "rhythm",
        "A written postmortem is filed within two working days of resolution.",
      ],
      [
        "jori",
        "Open the incident thread, keep the timeline, and draft the postmortem from it.",
      ],
    ],
  },
  {
    externalId: "C08DESIGN07",
    name: "design",
    visibility: "public",
    profiled: 6,
    claims: [
      ["purpose", "Interface work in progress and the critique around it."],
      [
        "people",
        "Mia posts most work; Albin and Nadia give the bulk of the feedback.",
      ],
      [
        "language",
        "Critique names the specific element it is about rather than reacting to the whole screen.",
      ],
      ["jori", "Stay out of critique threads unless asked a factual question."],
    ],
  },
  {
    externalId: "C08FOUNDERS8",
    name: "founders",
    visibility: "private",
    profiled: 5,
    claims: [
      [
        "purpose",
        "Runway, hiring, and anything not yet ready to be said company-wide.",
      ],
      ["people", "Founders only."],
      [
        "jori",
        "Never quote this channel anywhere else, and never summarize it into a shared surface.",
      ],
    ],
  },
]
