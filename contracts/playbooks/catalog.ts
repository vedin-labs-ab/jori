import { type Scope } from "../permissions/scope"
import { type Duration } from "../runtime"
import { type PlaybookSlot } from "./capabilities"
import { type PlaybookDelivery } from "./delivery"
import {
  type PlaybookOptionValues,
  type PlaybookSetupSection,
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
   *  the playbook offers modes, that there is a choice ("Morning briefing or
   *  right before each meeting"). No clock times — the setup dialog shows
   *  the precise cadence for the chosen options. */
  cadence: string
  schedule: PlaybookSchedule
  /** High-level setup that compiles into the automation. */
  setup?: readonly PlaybookSetupSection[]
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
  /** Maximum child-agent research wait for instruction templates that
   *  delegate work. The runtime measures it from the wait tool call. */
  agentWait?: Duration
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
  const options = resolvePlaybookOptions(definition.setup, values)
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
  allowed: ["email", "slack"],
} as const satisfies Omit<PlaybookDelivery, "noun">

/** The sweep starts early enough to wait for research and still synthesize. */
const meetingBriefingResearchMinutes = 15
const meetingBriefingScheduleLeadMinutes = 30

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
    key: "meeting-briefing",
    title: "Meeting Briefing",
    description:
      "Walk into important meetings with the context, questions, and decisions that will help you make the most of them.",
    scope: "personal",
    agentWait: { unit: "minutes", value: meetingBriefingResearchMinutes },
    cadence: "Morning briefing or before each meeting",
    schedule: { repeat: "daily", time: "01:00" },
    setup: [
      {
        key: "meetings",
        kind: "fields",
        label: "Meetings",
        fields: [
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
        ],
      },
      {
        key: "delivery-timing",
        kind: "behaviors",
        label: "Delivery timing",
        behaviors: [
          {
            key: "morning-briefing",
            label: "Morning briefing",
            description: "Relevant meetings in one daily digest",
            enabledBy: {
              key: "morning",
              label: "Morning briefing",
              kind: "boolean",
              default: true,
            },
            fields: [
              {
                key: "morningTime",
                label: "Send at",
                kind: "time",
                default: "07:30",
                enabledWhen: { key: "morning", value: true },
              },
            ],
          },
          {
            key: "before-meeting",
            label: "Before meetings",
            description: (options) =>
              options.morning === true
                ? "Resend the prepared dossier as a reminder"
                : "Prepare and send each dossier just in time",
            enabledBy: {
              key: "beforeMeeting",
              label: "Before meetings",
              kind: "boolean",
              default: false,
            },
            fields: [
              {
                key: "leadMinutes",
                label: "Send",
                kind: "choice",
                control: "select",
                default: "45",
                enabledWhen: { key: "beforeMeeting", value: true },
                choices: [
                  { value: "15", label: "15 minutes before" },
                  { value: "30", label: "30 minutes before" },
                  { value: "45", label: "45 minutes before" },
                  { value: "60", label: "60 minutes before" },
                ],
              },
            ],
          },
        ],
      },
    ],
    // The planning sweep starts early enough for per-meeting researchers to
    // finish before the morning briefing. Without it, the sweep plans early.
    resolveSchedule: (options) =>
      options.morning === true
        ? {
            repeat: "daily",
            time: shiftClockTime(
              String(options.morningTime),
              -meetingBriefingScheduleLeadMinutes
            ),
          }
        : { repeat: "daily", time: "01:00" },
    describeCadence: (options) => {
      const morning =
        options.morning === true
          ? `Morning briefing at ${options.morningTime}`
          : ""
      const before =
        options.beforeMeeting === false
          ? ""
          : `${options.morning === true ? "briefing" : "Briefing"} ${options.leadMinutes} minutes before each meeting`

      return [morning, before].filter((part) => part !== "").join(", ")
    },
    validateOptions: (options) =>
      options.morning === false && options.beforeMeeting === false
        ? "Choose at least one delivery time."
        : undefined,
    slots: [
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ],
    delivery: {
      ...digestDelivery,
      slackTargets: ["dm"],
      noun: "briefing",
      style: "summary",
    },
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
