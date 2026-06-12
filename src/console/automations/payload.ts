import { automationInstructionMarkerErrors } from "./payload/marker"
import {
  buildAutomationTriggerSpec,
  hasAutomationTriggerChanged,
  type TriggerSpec,
  triggerFormValues,
} from "./payload/trigger"
import { readAutomationPreferences } from "./preferences"
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

  const trigger = buildAutomationTriggerSpec(values)

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

  if (
    !hasAutomationTriggerChanged(
      values,
      existing,
      automationFormValues(existing)
    )
  ) {
    return base
  }

  const trigger = buildAutomationTriggerSpec(values)

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
    return { error: automationInstructionMarkerErrors.noMarkers }
  }

  if (surfaces.some((surface) => surface.access === "")) {
    return { error: automationInstructionMarkerErrors.incompleteAccess }
  }

  if (!hasAutomationWriteSurface(surfaces)) {
    return { error: automationInstructionMarkerErrors.noWrite }
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
