import { type Scope } from "../permissions/scope"
import { type PlaybookSlot } from "./capabilities"
import { type PlaybookDelivery } from "./delivery"
import {
  type PlaybookOptionField,
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "./options"
import {
  describePlaybookSchedule,
  type PlaybookSchedule,
  shiftClockTime,
} from "./schedule"

export type PlaybookDefinition = {
  key: string
  title: string
  /** Outcome-first card copy: the value the user gets, never cadence
   *  detail — the rhythm and the setup dialog carry the schedule. */
  description: string
  /** Personal playbooks enable per member; organization ones per tenant. */
  scope: Scope
  /** Card-level rhythm shown on browse surfaces: what to expect and, when
   *  the playbook offers modes, that there is a choice ("Morning digest or
   *  right before each meeting"). No clock times — the setup dialog shows
   *  the precise cadence for the chosen options. */
  cadence: string
  schedule: PlaybookSchedule
  /** Setup knobs beyond accounts and delivery; resolved values feed the
   *  instruction template, the schedule, and the cadence copy. */
  options?: readonly PlaybookOptionField[]
  /** Derive the cron schedule from the chosen options; defaults to
   *  `schedule` when absent. */
  resolveSchedule?: (options: PlaybookOptionValues) => PlaybookSchedule
  /** Precise cadence at the point of decision, when the cron line would
   *  mislead — a planning sweep that delivers at meeting times, say. */
  describeCadence?: (options: PlaybookOptionValues) => string
  /** Reject option combinations no single field can forbid. Setup surfaces
   *  the message and blocks enabling; the plan resolver enforces it. */
  validateOptions?: (options: PlaybookOptionValues) => string | undefined
  /** Input capabilities the playbook reads; delivery is separate. */
  slots: readonly PlaybookSlot[]
  /** Where the output goes, and the default the user can override at enable. */
  delivery: PlaybookDelivery
  web: boolean
}

/** What the user is promised: the card rhythm on browse surfaces, or the
 *  precise cadence once options are in hand at the point of decision. */
export function describePlaybookCadence(
  definition: PlaybookDefinition,
  values?: PlaybookOptionValues
) {
  if (values === undefined) {
    return definition.cadence
  }

  return (
    definition.describeCadence?.(values) ??
    describePlaybookSchedule(definition.schedule)
  )
}

/** Resolve a playbook's options and enforce its cross-field rules. */
export function resolveValidPlaybookOptions(
  definition: PlaybookDefinition,
  values?: PlaybookOptionValues
) {
  const options = resolvePlaybookOptions(definition.options, values)
  const issue = definition.validateOptions?.(options)

  if (issue !== undefined) {
    throw new Error(issue)
  }

  return options
}

/** The cron schedule a playbook runs on, under the given options. */
export function resolvePlaybookSchedule(
  definition: PlaybookDefinition,
  options: PlaybookOptionValues
) {
  return definition.resolveSchedule?.(options) ?? definition.schedule
}

const digestDelivery = {
  default: "email",
  allowed: ["email", "slack"],
} as const satisfies Omit<PlaybookDelivery, "noun">

/** How long before the digest goes out its research agents get to work. */
const digestPrepMinutes = 15

export const playbookCatalog: readonly PlaybookDefinition[] = [
  {
    key: "morning-brief",
    title: "Morning brief",
    description:
      "Start the day knowing what's ahead: today's meetings and the emails that actually need you, gathered into one brief.",
    scope: "personal",
    cadence: "Every weekday morning",
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
      "Walk into every meeting prepared. Who you're meeting, what it's about, and what to have ready, in a researched dossier for every meeting that matters.",
    scope: "personal",
    cadence: "Morning digest or right before each meeting",
    schedule: { repeat: "daily", time: "01:00" },
    options: [
      {
        key: "meetings",
        label: "Meetings",
        kind: "choice",
        default: "external",
        choices: [
          { value: "external", label: "External" },
          { value: "internal", label: "Internal" },
          { value: "both", label: "Both" },
        ],
      },
      // The two deliveries are orthogonal: a morning overview and a
      // per-meeting send, in any combination — validated to keep at least
      // one on. The pre-meeting one-shot researches when no digest ran and
      // refreshes when one did, so no mode switch is needed.
      {
        key: "digest",
        label: "Morning digest",
        kind: "choice",
        default: "on",
        choices: [
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ],
      },
      {
        key: "time",
        label: "Deliver at",
        kind: "time",
        default: "07:30",
        enabledWhen: { key: "digest", value: "on" },
      },
      {
        key: "before",
        label: "Before each meeting",
        kind: "choice",
        control: "select",
        default: "45",
        choices: [
          { value: "off", label: "Off" },
          { value: "15", label: "15 minutes" },
          { value: "30", label: "30 minutes" },
          { value: "45", label: "45 minutes" },
          { value: "60", label: "60 minutes" },
        ],
      },
    ],
    // The digest sweep starts ahead of the chosen time so per-meeting
    // research agents finish before the digest goes out; without a digest
    // the sweep just plans the day early.
    resolveSchedule: (options) =>
      options.digest === "on"
        ? {
            repeat: "daily",
            time: shiftClockTime(String(options.time), -digestPrepMinutes),
          }
        : { repeat: "daily", time: "01:00" },
    describeCadence: (options) => {
      const digest =
        options.digest === "on" ? `Morning digest at ${options.time}` : ""
      const before =
        options.before === "off"
          ? ""
          : `${options.digest === "on" ? "prep" : "Prep"} ${options.before} minutes before each meeting`

      return [digest, before].filter((part) => part !== "").join(", ")
    },
    validateOptions: (options) =>
      options.digest === "off" && options.before === "off"
        ? "Turn on the morning digest or a pre-meeting send."
        : undefined,
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
    cadence: "Weekday afternoons",
    schedule: { repeat: "weekdays", time: "15:30" },
    slots: [{ capability: "email", intents: ["read", "draft"] }],
    delivery: { ...digestDelivery, noun: "summary" },
    web: false,
  },
  {
    key: "week-in-review",
    title: "Week in review",
    description:
      "Close the week with a clear head: what happened, what's unresolved, and what next week looks like, in one review.",
    scope: "personal",
    cadence: "Friday afternoons",
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
