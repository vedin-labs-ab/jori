import { type Integration } from "../../shared/integrations"

// What Jori has worked out that Vedin Labs is doing. Efforts are the small
// concrete units clustered from activity; a workstream is the durable thing
// they belong to. Statuses read the way the pipeline leaves them: work that
// concluded is closed rather than deleted, and a thing seen only once is
// still proposed.

export type SeedEffort = {
  name: string
  summary: string
  /** The channel whose conversation this effort cites. */
  channel: string
  why: string
  anchors: string[]
  /** People involved, by the local part of their address. */
  people: string[]
  sources: Integration[]
  /** Days before the seed instant it was last seen. */
  seen: number
  journal: [days: number, entry: string][]
}

type SeedWorkstream = {
  name: string
  brief: string
  aliases: string[]
  status: "proposed" | "confirmed" | "closed"
  seen: number
  efforts: SeedEffort[]
}

export const workstreams: SeedWorkstream[] = [
  {
    name: "Per-folder permissions",
    brief:
      "Making visibility cascade from a folder over everything filed inside it, so a workspace can hold material only some people may read. Asked for by Northwind and Kessler; shipped in the March release as a cascade rather than a per-resource toggle.",
    aliases: ["Folder permissions", "Cascading visibility"],
    status: "confirmed",
    seen: 6,
    efforts: [
      {
        name: "Choosing the permission model",
        summary:
          "Deciding between a folder cascade and a per-resource toggle. The cascade won on the argument that it is the right model once, rather than cheap now.",
        channel: "product",
        why: "Nadia priced both options and Mia settled it in the same thread, naming the trade-off the cascade accepts.",
        anchors: ["per-folder permissions", "cascade", "move dialog"],
        people: ["mia", "nadia", "tobias"],
        sources: ["slack"],
        seen: 20,
        journal: [
          [
            21,
            "Nadia put numbers on both models: two weeks for the cascade, one day per resource. She argued for paying once.",
          ],
          [
            20,
            "Mia settled on the cascade and wrote down the trade-off: moving a folder can change who sees its contents, so the move dialog has to say so.",
          ],
        ],
      },
      {
        name: "Shipping the cascade",
        summary:
          "Building and releasing the cascade, including the ancestor check the release checklist caught, and the move dialog copy.",
        channel: "general",
        why: "The Friday shipped post named per-folder permissions as landed, and the release checklist records the missing ancestor check that was found in review.",
        anchors: ["ancestor check", "March release", "move dialog"],
        people: ["nadia", "mia", "elin"],
        sources: ["slack", "github"],
        seen: 6,
        journal: [
          [
            10,
            "Shipped with the March release. Review caught a missing ancestor check before it went out.",
          ],
          [
            6,
            "Launch post is written but held until the feature is on for everyone rather than the release cohort.",
          ],
        ],
      },
    ],
  },
  {
    name: "Slack reconnect reliability",
    brief:
      "A nine-day window where rotated Slack refresh tokens were read from the wrong response field and dropped, breaking reconnects for five workspaces. Fixed, postmortem filed, two follow-ups still open.",
    aliases: ["invalid_grant", "Token rotation"],
    status: "closed",
    seen: 24,
    efforts: [
      {
        name: "Diagnosing invalid_grant",
        summary:
          "Tracing reconnect failures from a Northwind support thread to the token rotation change that dropped the refresh token.",
        channel: "support",
        why: "Priya raised it with the customer and the plan named, and Oskar identified the wrong response field the same morning.",
        anchors: ["invalid_grant", "Northwind Systems", "refresh token"],
        people: ["priya", "oskar"],
        sources: ["slack"],
        seen: 25,
        journal: [
          [
            26,
            "Priya escalated a Northwind reconnect failing with invalid_grant. Oskar found the cause within two hours: the rotated token was read from the outer body rather than authed_user.",
          ],
          [
            25,
            "Five workspaces reconnected. Priya wrote to the four who had not noticed.",
          ],
        ],
      },
      {
        name: "Closing the incident",
        summary:
          "Writing the postmortem and turning its two follow-ups into work: a nightly reconnect health check and a token-age alert.",
        channel: "incidents",
        why: "The incident thread was closed with a postmortem filed under Engineering / Incidents and two named follow-ups.",
        anchors: ["postmortem", "token age alert", "reconnect health check"],
        people: ["oskar"],
        sources: ["slack"],
        seen: 24,
        journal: [
          [
            24,
            "Incident closed. Nothing watches token age, which is why it took nine days; that is now follow-up two.",
          ],
        ],
      },
    ],
  },
  {
    name: "Rate limiting and retry behaviour",
    brief:
      "Making the sync path respect Retry-After instead of treating 429s like server errors. Shipped; p99 on the sync endpoint fell from 4.1s to 820ms.",
    aliases: ["Retry backoff", "429 handling"],
    status: "confirmed",
    seen: 9,
    efforts: [
      {
        name: "Fixing the 429 backoff",
        summary:
          "Nadia found that 429s were retried like 500s, hammering the same endpoint for ten minutes, and shipped a limiter that respects Retry-After.",
        channel: "engineering",
        why: "Nadia described the wrong backoff and opened the change; the measured p99 improvement was posted in the same channel when it went live.",
        anchors: ["Retry-After", "429", "sync endpoint", "p99"],
        people: ["nadia", "oskar"],
        sources: ["slack", "github"],
        seen: 9,
        journal: [
          [
            31,
            "Nadia found 429s being retried like 500s. Oskar connected it to the Northwind sync failure the week before.",
          ],
          [
            9,
            "Live in production. p99 on the sync endpoint went 4.1s to 820ms.",
          ],
        ],
      },
    ],
  },
  {
    name: "Enterprise pipeline",
    brief:
      "The accounts that decide the quarter: Kessler signed for 90 annual seats, Holmberg is in security review, Aurora Freight has gone quiet.",
    aliases: ["Pipeline", "Q3 pipeline"],
    status: "confirmed",
    seen: 5,
    efforts: [
      {
        name: "Kessler Group",
        summary:
          "From a scoping question about limiting Jori to one channel through contracting to signature at 90 annual seats.",
        channel: "gtm",
        why: "Tobias tracked it weekly in the pipeline post and announced the signature in the same channel.",
        anchors: ["Kessler Group", "90 seats", "annual"],
        people: ["tobias", "mia"],
        sources: ["slack"],
        seen: 11,
        journal: [
          [
            15,
            "Kessler asked whether Jori can be scoped to one channel for legal. Per-folder permissions answers it.",
          ],
          [11, "Signed. 90 seats, annual, starting the first of next month."],
        ],
      },
      {
        name: "Holmberg security review",
        summary:
          "Answering a security questionnaire on data location, access, training, and retention, pending a subprocessor check.",
        channel: "support",
        why: "The questionnaire answers were drafted and filed under Support, waiting on Johan to confirm the subprocessor list.",
        anchors: ["Holmberg Retail", "security review", "subprocessors"],
        people: ["priya", "johan", "tobias"],
        sources: ["slack"],
        seen: 11,
        journal: [
          [
            11,
            "Answers drafted. Held on one open item: whether the subprocessor list is current.",
          ],
        ],
      },
    ],
  },
  {
    name: "Usage and cost visibility",
    brief:
      "A page for what Jori costs, broken down by folder, job, and person. Behind a flag for Vedin Labs only; the day bucket was moved to the organization's own timezone before it ships.",
    aliases: ["Usage page"],
    status: "proposed",
    seen: 6,
    efforts: [
      {
        name: "Usage page review",
        summary:
          "Reviewing the first version: timezone bucketing was corrected, and the chart still collapses when one job dominates a day.",
        channel: "product",
        why: "Mia named the timezone bucket as the one thing to change before shipping, and Nadia raised the chart scaling in design the same week.",
        anchors: ["usage page", "timezone bucket", "log scale"],
        people: ["mia", "nadia"],
        sources: ["slack"],
        seen: 6,
        journal: [
          [
            8,
            "Nadia: a single dominant job flattens every other bar. Worth a log scale or a cap.",
          ],
          [
            6,
            "Mia: bucket the day in the organization's zone, not UTC, or Stockholm customers see yesterday's spend on today.",
          ],
        ],
      },
    ],
  },
]
