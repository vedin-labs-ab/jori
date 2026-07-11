import { type Scope } from "../permissions/scope"
import { type PlaybookSlot } from "./capabilities"
import { type PlaybookDelivery } from "./delivery"
import { describePlaybookSchedule, type PlaybookSchedule } from "./schedule"

export type PlaybookDefinition = {
  key: string
  title: string
  /** Outcome-first card copy: what the user gets, not how it works. */
  description: string
  /** Personal playbooks enable per member; organization ones per tenant. */
  scope: Scope
  schedule: PlaybookSchedule
  /** User-facing rhythm, for playbooks whose cron line would mislead —
   *  a planning sweep that delivers at meeting times, for example. */
  cadence?: string
  /** Input capabilities the playbook reads; delivery is separate. */
  slots: readonly PlaybookSlot[]
  /** Where the output goes, and the default the user can override at enable. */
  delivery: PlaybookDelivery
  web: boolean
}

/** What the user is promised: the cadence when set, else the schedule. */
export function describePlaybookCadence(definition: PlaybookDefinition) {
  return definition.cadence ?? describePlaybookSchedule(definition.schedule)
}

const digestDelivery = {
  default: "email",
  allowed: ["email", "slack"],
} as const satisfies Omit<PlaybookDelivery, "noun">

export const playbookCatalog: readonly PlaybookDefinition[] = [
  {
    key: "morning-brief",
    title: "Morning brief",
    description:
      "Start each day knowing what's ahead: today's meetings and the emails that actually need you, in one email before you sit down.",
    scope: "personal",
    schedule: { repeat: "weekdays", time: "08:00" },
    slots: [
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ],
    delivery: { ...digestDelivery, noun: "brief" },
    web: false,
  },
  {
    key: "meeting-prep",
    title: "Meeting prep",
    description:
      "Walk into every meeting prepared: who you're meeting, what it's about, and what to have ready — researched and sent to you 45 minutes before each external meeting.",
    scope: "personal",
    schedule: { repeat: "daily", time: "01:00" },
    cadence: "45 minutes before each external meeting",
    slots: [
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ],
    delivery: { ...digestDelivery, noun: "prep note", style: "summary" },
    web: true,
  },
  {
    key: "follow-up-sweep",
    title: "Follow-up sweep",
    description:
      "Nothing slips through: threads waiting on you get reply drafts ready to review, and you get a list of who still owes you an answer.",
    scope: "personal",
    schedule: { repeat: "weekdays", time: "15:30" },
    slots: [{ capability: "email", intents: ["read", "draft"] }],
    delivery: { ...digestDelivery, noun: "summary" },
    web: false,
  },
  {
    key: "week-in-review",
    title: "Week in review",
    description:
      "Close the week with a clear head: what happened, what's unresolved, and what next week looks like — one email every Friday afternoon.",
    scope: "personal",
    schedule: { repeat: "weekly", weekday: 5, time: "16:00" },
    slots: [
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ],
    delivery: { ...digestDelivery, noun: "review" },
    web: false,
  },
]

export function getPlaybook(key: string) {
  const playbook = playbookCatalog.find((definition) => definition.key === key)

  if (playbook === undefined) {
    throw new Error("Unknown playbook.")
  }

  return playbook
}
