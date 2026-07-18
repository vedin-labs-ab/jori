import { type Scope } from "../permissions/scope"
import { meetingBriefing } from "./briefing"
import { type PlaybookSlot } from "./capabilities"
import { digestDelivery, type PlaybookDelivery } from "./delivery"
import {
  type PlaybookOptionValues,
  type PlaybookSetupSection,
  resolvePlaybookOptions,
} from "./options"
import { describePlaybookSchedule, type PlaybookSchedule } from "./schedule"

export type PlaybookDefinition = {
  key: string
  /** Recipe version: bump when the instruction template, options, or artifact
   *  template change. Enablements pin it and surface newer as an update. */
  version: number
  title: string
  /** Outcome-first card copy: the value the user gets, never cadence
   *  detail — the rhythm and the setup dialog carry the schedule. */
  description: string
  /** Prompt template id for the rendered instructions, e.g.
   *  "playbooks/briefing"; the source file is part of the versioned recipe. */
  template: string
  /** Personal playbooks enable per member; organization ones per tenant. */
  scope: Scope
  /** The artifact this playbook materializes from its template, when it has
   *  one — setup discloses it and the artifact records the provenance. */
  artifact?: PlaybookArtifact
  /** Card-level rhythm on browse surfaces: what to expect and, when the
   *  playbook offers modes, that there is a choice ("Morning briefing or
   *  before each meeting"). No clock times — setup shows the precise cadence. */
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
}

export type PlaybookArtifact = {
  title: string
  /** What the artifact holds, in the user's terms, for setup disclosure. */
  description: string
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

export const playbookCatalog: readonly PlaybookDefinition[] = [
  {
    key: "morning-brief",
    template: "playbooks/brief",
    version: 2,
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
  meetingBriefing,
  {
    key: "follow-up-sweep",
    template: "playbooks/sweep",
    version: 2,
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
    template: "playbooks/review",
    version: 2,
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
