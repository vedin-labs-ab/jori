import { type Scope } from "../permissions/scope"
import { type PlaybookSlot } from "./capabilities"
import { type PlaybookDelivery } from "./delivery"
import { type PlaybookOptionField, type PlaybookOptionValues } from "./options"
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
export const digestPrepMinutes = 15

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
      "Walk into every meeting prepared: who you're meeting, what it's about, and what to have ready — a researched dossier for every meeting that matters.",
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
      {
        key: "mode",
        label: "Delivery",
        kind: "choice",
        default: "digest",
        choices: [
          { value: "digest", label: "Morning digest" },
          { value: "meeting", label: "Before each meeting" },
        ],
      },
      {
        key: "time",
        label: "Deliver at",
        kind: "time",
        default: "07:30",
        enabledWhen: { key: "mode", value: "digest" },
      },
      {
        key: "reminders",
        label: "Reminders",
        kind: "choice",
        control: "select",
        default: "45",
        choices: [
          { value: "off", label: "Off" },
          { value: "15", label: "15 minutes before" },
          { value: "30", label: "30 minutes before" },
          { value: "45", label: "45 minutes before" },
          { value: "60", label: "60 minutes before" },
        ],
        enabledWhen: { key: "mode", value: "digest" },
      },
      {
        key: "sendBefore",
        label: "Send before",
        kind: "minutes",
        default: 45,
        min: 10,
        max: 240,
        presets: [30, 45, 60, 90],
        enabledWhen: { key: "mode", value: "meeting" },
      },
    ],
    // The digest sweep starts ahead of the chosen time so per-meeting
    // research agents finish before the digest goes out.
    resolveSchedule: (options) =>
      options.mode === "digest"
        ? {
            repeat: "daily",
            time: shiftClockTime(String(options.time), -digestPrepMinutes),
          }
        : { repeat: "daily", time: "01:00" },
    describeCadence: (options) =>
      options.mode === "digest"
        ? `Morning digest at ${options.time}${
            options.reminders === "off"
              ? ""
              : `, reminders ${options.reminders} minutes before meetings`
          }`
        : `${options.sendBefore} minutes before each external meeting`,
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
