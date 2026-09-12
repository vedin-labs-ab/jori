// Where sixty days of work comes from: the jobs that fired on a
// schedule, the ones a Slack event woke, and the things people asked for by
// hand. Days are always counted back from the seed instant.

type ScheduledSource = {
  name: string
  folder: string
  cron: string
  /** Days before the seed instant after which it stopped firing. */
  pausedAfter?: number
}

type EventedSource = {
  name: string
  folder: string
  channel: string
  /** Days before the seed instant it was woken. */
  on: number[]
}

type ManualSource = {
  title: string
  person: string
  folder?: string
  /** Days before the seed instant it was asked for. */
  day: number
}

export const scheduled: ScheduledSource[] = [
  { name: "Friday shipped post", folder: "Releases", cron: "0 15 * * 5" },
  { name: "Monday pipeline prep", folder: "Pipeline", cron: "30 7 * * 1" },
  {
    name: "Monthly vendor reconciliation",
    folder: "Vendors",
    cron: "0 8 3 * *",
  },
  {
    name: "Quiet account nudge",
    folder: "Pipeline",
    cron: "0 9 * * 3",
    pausedAfter: 32,
  },
  {
    name: "Weekly escalation sweep",
    folder: "Support",
    cron: "0 13 * * 4",
    pausedAfter: 16,
  },
]

export const evented: EventedSource[] = [
  {
    name: "Triage new support threads",
    folder: "Support",
    channel: "support",
    on: [26, 25, 15, 7, 2],
  },
  {
    name: "Incident postmortem draft",
    folder: "Incidents",
    channel: "incidents",
    on: [24],
  },
]

export const manual: ManualSource[] = [
  {
    title: "Compare our pricing against three competitors",
    person: "tobias@vedinlabs.example",
    day: 30,
  },
  {
    title: "Draft the Holmberg security questionnaire answers",
    person: "priya@vedinlabs.example",
    folder: "Support",
    day: 11,
  },
  {
    title: "Which accounts renew before December?",
    person: "johan@vedinlabs.example",
    folder: "Customers",
    day: 13,
  },
  {
    title: "Summarize what the March release changed for customers",
    person: "elin@vedinlabs.example",
    folder: "Releases",
    day: 9,
  },
  {
    title: "Reconcile the August card statement against the vendor table",
    person: "johan@vedinlabs.example",
    folder: "Vendors",
    day: 7,
  },
  {
    title: "What did we promise Kessler during the security review?",
    person: "tobias@vedinlabs.example",
    day: 4,
  },
]
