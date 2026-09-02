// The Slack traffic behind everything else the seed writes: the escalation
// the support table has a row for, the incident the postmortem file
// describes, the pricing argument the workstream cites. Every line is
// backdated, so the deduction sweep sees a window it has already reviewed.

export type SeedMessage = {
  channel: string
  /** When it was said: days before the seed instant, then hour and minute. */
  at: [days: number, hour: number, minute: number]
  /** The local part of the author's Vedin Labs address. */
  author: string
  text: string
  /** Jori was addressed directly, which is what starts a run from a message. */
  mentioned?: boolean
}

const engineering: SeedMessage[] = [
  {
    channel: "engineering",
    at: [34, 9, 12],
    author: "oskar",
    text: "Search reindex from last night finished at 04:20. 1.2M documents, no failures. I am going to leave the old index in place until Friday in case we need to roll back.",
  },
  {
    channel: "engineering",
    at: [31, 14, 5],
    author: "nadia",
    text: "The webhook retry backoff is wrong for 429s. We treat them like 500s and hammer the same endpoint for ten minutes. Opening a PR that respects Retry-After.",
  },
  {
    channel: "engineering",
    at: [31, 14, 41],
    author: "oskar",
    text: "Good catch. That is almost certainly what tripped the Northwind sync last week.",
  },
  {
    channel: "engineering",
    at: [24, 11, 30],
    author: "nadia",
    text: "Jori, summarize what changed in the ingestion path over the last two weeks and who reviewed each change.",
    mentioned: true,
  },
  {
    channel: "engineering",
    at: [17, 16, 22],
    author: "oskar",
    text: "Reminder that we do not ship after 16:00 on a Friday. The deploy queue is open again Monday morning.",
  },
  {
    channel: "engineering",
    at: [9, 10, 8],
    author: "nadia",
    text: "Rate limiter is live in production. p99 on the sync endpoint went from 4.1s to 820ms once we stopped retrying into a wall.",
  },
  {
    channel: "engineering",
    at: [4, 13, 44],
    author: "oskar",
    text: "Postgres upgrade to 16 is scheduled for the maintenance window on Sunday. Read replicas go first, primary last, with a full snapshot before either.",
  },
]

const product: SeedMessage[] = [
  {
    channel: "product",
    at: [29, 10, 15],
    author: "mia",
    text: "Scope for the March release is settled: shared workspaces, the usage page, and per-folder permissions. Everything else moves to April.",
  },
  {
    channel: "product",
    at: [28, 9, 50],
    author: "tobias",
    text: "Northwind and Kessler have both asked for per-folder permissions by name. Holmberg has not, but they asked about audit logs twice, which is the same worry wearing a different hat.",
  },
  {
    channel: "product",
    at: [21, 15, 5],
    author: "nadia",
    text: "Per-folder permissions is two weeks if we cascade from the folder and one day if we do it per resource. The cascade is the right model and I would rather pay for it once.",
  },
  {
    channel: "product",
    at: [20, 11, 0],
    author: "mia",
    text: "Cascade it is. Trade-off we are accepting: moving a folder can change who sees what inside it, so the move dialog has to say so plainly.",
  },
  {
    channel: "product",
    at: [12, 14, 30],
    author: "tobias",
    text: "Jori, pull every customer ask about permissions from the last quarter into this thread so we can check the shape against what we built.",
    mentioned: true,
  },
  {
    channel: "product",
    at: [6, 9, 40],
    author: "mia",
    text: "Usage page is in review. The one thing I want changed before it ships: the day bucket should be the organization's day, not UTC, or Stockholm customers will see yesterday's spend on today.",
  },
]

const support: SeedMessage[] = [
  {
    channel: "support",
    at: [26, 8, 45],
    author: "priya",
    text: "Northwind Systems cannot complete their Slack reconnect. Enterprise plan, 180 seats. They get an invalid_grant error after approving the scopes. Oskar, this looks like the refresh token path.",
  },
  {
    channel: "support",
    at: [26, 10, 12],
    author: "oskar",
    text: "Confirmed. We were storing the rotated refresh token from the wrong response field. Fix is small, but every workspace that reconnected in the last nine days has to redo it.",
  },
  {
    channel: "support",
    at: [25, 9, 20],
    author: "priya",
    text: "Northwind is back on. I have sent the four other affected workspaces a reconnect link with an apology and a note about what happened.",
  },
  {
    channel: "support",
    at: [15, 13, 5],
    author: "priya",
    text: "Kessler Group is asking whether Jori can be scoped to a single Slack channel for their legal team. Answering yes with per-folder permissions, but I want someone to check I am not overpromising.",
  },
  {
    channel: "support",
    at: [15, 13, 32],
    author: "mia",
    text: "You are not. Private places never travel into a run outside them, so a legal-only channel stays legal-only.",
  },
  {
    channel: "support",
    at: [7, 8, 55],
    author: "priya",
    text: "Jori, draft the first reply to Holmberg about the missing export and file an escalation row for it.",
    mentioned: true,
  },
  {
    channel: "support",
    at: [2, 15, 10],
    author: "priya",
    text: "Quiet week. Two billing questions, both answered same day, nothing escalated.",
  },
]

const gtm: SeedMessage[] = [
  {
    channel: "gtm",
    at: [33, 9, 5],
    author: "tobias",
    text: "Pipeline for the week: Kessler Group in contracting, Holmberg Retail in a security review, Aurora Freight went quiet after the second call.",
  },
  {
    channel: "gtm",
    at: [22, 11, 25],
    author: "johan",
    text: "Reminder that we invoice annual plans on the anniversary, not the calendar quarter. Two of last month's renewals were dated wrong and I have corrected them.",
  },
  {
    channel: "gtm",
    at: [18, 10, 0],
    author: "elin",
    text: "The permissions launch post is drafted. Holding it until the feature is actually on for everyone, not just the release cohort.",
  },
  {
    channel: "gtm",
    at: [11, 9, 15],
    author: "tobias",
    text: "Kessler signed. 90 seats, annual, starting the first of next month. That takes us past the number we set for the quarter.",
  },
  {
    channel: "gtm",
    at: [5, 9, 30],
    author: "tobias",
    text: "Aurora Freight has been quiet for sixteen days. I am going to send one more note and then park them until they come back.",
  },
]

const incidents: SeedMessage[] = [
  {
    channel: "incidents",
    at: [26, 7, 40],
    author: "oskar",
    text: "Opening an incident: Slack reconnects are failing with invalid_grant. Started roughly nine days ago with the token rotation change. Five workspaces affected, Northwind is the largest.",
  },
  {
    channel: "incidents",
    at: [26, 11, 5],
    author: "oskar",
    text: "Cause found: we persisted the refresh token from the outer response body instead of the authed_user object, so rotated tokens were silently dropped. Fix deployed, affected workspaces need a manual reconnect.",
  },
  {
    channel: "incidents",
    at: [24, 16, 30],
    author: "oskar",
    text: "Incident closed. Postmortem is filed under Engineering / Incidents. Two follow-ups: a reconnect health check, and an alert when a workspace's token age exceeds its expiry.",
  },
]

const company: SeedMessage[] = [
  {
    channel: "general",
    at: [30, 9, 0],
    author: "mia",
    text: "Welcome Elin, who joins this week on marketing. She is picking up the launch post backlog first.",
  },
  {
    channel: "general",
    at: [10, 16, 45],
    author: "mia",
    text: "Shipped this week: per-folder permissions, the Slack reconnect fix, and the first version of the usage page behind a flag.",
  },
  {
    channel: "design",
    at: [19, 13, 20],
    author: "mia",
    text: "New folder move dialog. The line about visibility changing is doing a lot of work here, so I have given it the whole width rather than tucking it under the buttons.",
  },
  {
    channel: "design",
    at: [8, 10, 35],
    author: "nadia",
    text: "The usage chart reads well until a single job dominates a day, and then the other bars collapse to nothing. Worth a log scale toggle or a cap.",
  },
  {
    channel: "founders",
    at: [27, 20, 15],
    author: "mia",
    text: "Runway is eighteen months at the current burn. The next hire should be the second support person, not a third engineer.",
  },
]

export const threads: SeedMessage[] = [
  ...engineering,
  ...product,
  ...support,
  ...gtm,
  ...incidents,
  ...company,
]
