import { type Scope } from "../permissions/scope"
import { type PlaybookSlot } from "./capabilities"
import { type PlaybookDelivery } from "./delivery"
import {
  type PlaybookOptionValues,
  type PlaybookSetupSection,
  resolvePlaybookOptions,
} from "./options"
import { preread } from "./preread"
import { describePlaybookSchedule, type PlaybookSchedule } from "./schedule"

export type PlaybookDefinition = {
  key: string
  /** Recipe version: bump when the instruction template or options change.
   *  Enablements pin it and surface newer as an update. */
  version: number
  title: string
  /** Outcome-first card copy: the value the user gets, never cadence
   *  detail — the rhythm and the setup dialog carry the schedule. */
  description: string
  /** Prompt template id for the rendered instructions, e.g.
   *  "playbooks/preread"; the source file is part of the versioned recipe. */
  template: string
  /** Personal playbooks enable per member; organization ones per organization. */
  scope: Scope
  /** Card-level rhythm on browse surfaces: what to expect and, when the
   *  playbook offers modes, that there is a choice ("Weekly or on demand").
   *  No clock times — setup shows the precise cadence. */
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
  /** Jori-level systems the playbook reads — always available, never a
   *  connection to make; surfaced under Access alongside integrations. */
  jori: readonly PlaybookJoriTool[]
  /** Where the output goes, and the default the user can override at enable. */
  delivery: PlaybookDelivery
  web: boolean
}

export type PlaybookJoriTool = "memory"

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

export const playbookCatalog: readonly PlaybookDefinition[] = [preread]

export function getPlaybook(key: string) {
  const playbook = playbookCatalog.find((definition) => definition.key === key)

  if (playbook === undefined) {
    throw new Error("Unknown playbook.")
  }

  return playbook
}
