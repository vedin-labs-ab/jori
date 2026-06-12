import {
  type AutomationEventCriteria,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
  isAutomationEventProvider,
} from "../../../convex/automations/events"
import { buildRecurringCron, classifyCron } from "./cron"
import { toDatetimeLocal } from "./format"
import { criteriaKey, eventCriteriaFormValues } from "./payload/criteria"
import { readAutomationPreferences } from "./preferences"
import { readAutomationEventCriteria } from "./rules"
import {
  hasAutomationWriteSurface,
  normalizeAutomationSurfaceMentions,
  syncAutomationSurfaces,
} from "./surfaces"
import {
  type Automation,
  type AutomationFormValues,
  emptyAutomationForm,
} from "./types"

type TriggerSpec =
  | { type: "once"; at: string }
  | { type: "cron"; cron: string }
  | {
      type: "event"
      provider: AutomationFormValues["eventProvider"]
      event: string
      criteria?: AutomationEventCriteria
    }

type AutomationArgs = {
  name: string
  instructions: string
  access: {
    read: "all" | AutomationFormValues["surfaces"][number]["provider"][]
    write: AutomationFormValues["surfaces"][number]["provider"][]
    web: boolean
  }
}

type ArgsResult<Args> = { args: Args } | { error: string }

export function automationFormValues(
  automation: Automation | undefined
): AutomationFormValues {
  if (automation === undefined) {
    return {
      ...emptyAutomationForm,
      ...readAutomationPreferences(),
    }
  }

  return {
    name: automation.name,
    instructions: normalizeAutomationSurfaceMentions(automation.instructions),
    ...triggerFormValues(automation),
    readScope: automation.access.readScope,
    webSearch: automation.access.webSearch,
    surfaces: automation.access.surfaces,
  }
}

export function createAutomationArgs(
  values: AutomationFormValues
): ArgsResult<AutomationArgs & { trigger: TriggerSpec }> {
  const base = buildBaseArgs(values)

  if ("error" in base) {
    return base
  }

  const trigger = buildTriggerSpec(values)

  if ("error" in trigger) {
    return trigger
  }

  return { args: { ...base.args, trigger: trigger.trigger } }
}

export function updateAutomationArgs(
  values: AutomationFormValues,
  existing: Automation
): ArgsResult<AutomationArgs & { trigger?: TriggerSpec }> {
  const base = buildBaseArgs(values)

  if ("error" in base) {
    return base
  }

  if (!hasTriggerChanged(values, existing)) {
    return base
  }

  const trigger = buildTriggerSpec(values)

  if ("error" in trigger) {
    return trigger
  }

  return { args: { ...base.args, trigger: trigger.trigger } }
}

function buildBaseArgs(
  values: AutomationFormValues
): ArgsResult<AutomationArgs> {
  const name = values.name.trim()
  const instructions = normalizeAutomationSurfaceMentions(
    values.instructions.trim()
  )
  const surfaces = syncAutomationSurfaces(
    instructions,
    values.surfaces,
    values.readScope
  )

  if (name === "") {
    return { error: "Name is required." }
  }

  if (instructions === "") {
    return { error: "Instructions are required." }
  }

  if (surfaces.length === 0) {
    return { error: "Mention at least one integration in the instructions." }
  }

  if (surfaces.some((surface) => surface.access === "")) {
    return { error: "Choose read, write, or read/write for each mention." }
  }

  if (!hasAutomationWriteSurface(surfaces)) {
    return { error: "Give at least one mentioned integration write access." }
  }

  return {
    args: {
      name,
      instructions,
      access: {
        read:
          values.readScope === "allConnected"
            ? "all"
            : surfaces
                .filter(
                  (surface) =>
                    surface.access === "read" || surface.access === "both"
                )
                .map((surface) => surface.provider),
        write: surfaces
          .filter(
            (surface) => surface.access === "write" || surface.access === "both"
          )
          .map((surface) => surface.provider),
        web: values.webSearch,
      },
    },
  }
}

function buildTriggerSpec(
  values: AutomationFormValues
): { trigger: TriggerSpec } | { error: string } {
  if (values.type === "cron") {
    const built = buildRecurringCron(values)

    if ("error" in built) {
      return built
    }

    return { trigger: { type: "cron", cron: built.cron } }
  }

  if (values.type === "event") {
    const definition = getAutomationEventDefinition(
      values.eventProvider,
      values.event
    )

    if (definition === undefined) {
      return { error: "Choose a supported automation event." }
    }

    const criteria = readAutomationEventCriteria(
      definition,
      values.eventCriteria
    )

    if ("error" in criteria) {
      return criteria
    }

    return {
      trigger: {
        type: "event",
        provider: values.eventProvider,
        event: definition.value,
        criteria: criteria.value,
      },
    }
  }

  if (values.runAt === "") {
    return { error: "Run time is required." }
  }

  const runAt = new Date(values.runAt)

  if (Number.isNaN(runAt.getTime())) {
    return { error: "Run time is not a valid date." }
  }

  if (runAt.getTime() <= Date.now()) {
    return { error: "Run time must be in the future." }
  }

  return { trigger: { type: "once", at: runAt.toISOString() } }
}

function hasTriggerChanged(values: AutomationFormValues, existing: Automation) {
  const existingValues = automationFormValues(existing)

  if (values.type !== existingValues.type) {
    return true
  }

  if (values.type === "cron") {
    const built = buildRecurringCron(values)

    return (
      existing.trigger.type !== "cron" ||
      "error" in built ||
      built.cron !== existing.trigger.cron
    )
  }

  if (values.type === "event") {
    return (
      values.eventProvider !== existingValues.eventProvider ||
      values.event.trim() !== existingValues.event ||
      criteriaKey(values.eventCriteria) !==
        criteriaKey(existingValues.eventCriteria)
    )
  }

  return values.runAt !== existingValues.runAt
}

function triggerFormValues(automation: Automation) {
  const trigger = automation.trigger

  if (trigger.type === "cron") {
    return {
      type: "cron" as const,
      ...classifyCron(trigger.cron),
      runAt: "",
      eventProvider: emptyAutomationForm.eventProvider,
      event: emptyAutomationForm.event,
      eventCriteria: {},
    }
  }

  if (trigger.type === "event") {
    const provider = isAutomationEventProvider(trigger.provider)
      ? trigger.provider
      : emptyAutomationForm.eventProvider
    const definition =
      getAutomationEventDefinition(provider, trigger.event) ??
      getDefaultAutomationEvent(provider)

    return {
      type: "event" as const,
      ...classifyCron(undefined),
      runAt: "",
      eventProvider: provider,
      event: definition.value,
      eventCriteria:
        definition.value === trigger.event
          ? eventCriteriaFormValues(definition, trigger)
          : {},
    }
  }

  return {
    type: "once" as const,
    ...classifyCron(undefined),
    runAt: toDatetimeLocal(trigger.at),
    eventProvider: emptyAutomationForm.eventProvider,
    event: emptyAutomationForm.event,
    eventCriteria: {},
  }
}
