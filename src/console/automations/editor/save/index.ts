import {
  hasAutomationWriteSurface,
  normalizeAutomationSurfaceMentions,
  syncAutomationSurfaces,
} from "../../surface"
import {
  type AutomationPolicyPermissions,
  validateAutomationPolicy,
} from "../../surface/policy"
import {
  type Automation,
  type AutomationFormValues,
  emptyAutomationForm,
} from "../../types"
import { readAutomationPreferences } from "../preferences"
import { automationInstructionMarkerErrors } from "./marker"
import {
  buildAutomationTriggerSpec,
  hasAutomationTriggerChanged,
  type TriggerSpec,
  triggerFormValues,
} from "./trigger"

type AutomationArgs = {
  name: string
  instructions: string
  access: {
    integrations: Array<{
      provider: AutomationFormValues["surfaces"][number]["provider"]
      tools: string[]
    }>
    web: boolean
  }
}

type ArgsResult<Args> = { args: Args } | { error: string }
type AutomationArgsOptions = {
  permissions?: AutomationPolicyPermissions
}

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
    webSearch: automation.access.webSearch,
    surfaces: automation.access.surfaces,
  }
}

export function createAutomationArgs(
  values: AutomationFormValues,
  options: AutomationArgsOptions = {}
): ArgsResult<AutomationArgs & { trigger: TriggerSpec }> {
  const base = buildBaseArgs(values, options)

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
  existing: Automation,
  options: AutomationArgsOptions = {}
): ArgsResult<AutomationArgs & { trigger?: TriggerSpec }> {
  const base = buildBaseArgs(values, options)

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
  values: AutomationFormValues,
  options: AutomationArgsOptions
): ArgsResult<AutomationArgs> {
  const name = values.name.trim()
  const instructions = normalizeAutomationSurfaceMentions(
    values.instructions.trim()
  )
  const surfaces = syncAutomationSurfaces(instructions, values.surfaces)

  if (name === "") {
    return { error: "Name is required." }
  }

  if (instructions === "") {
    return { error: "Instructions are required." }
  }

  if (surfaces.length === 0) {
    return { error: automationInstructionMarkerErrors.noMarkers }
  }

  if (surfaces.some((surface) => surface.tools.length === 0)) {
    return { error: automationInstructionMarkerErrors.incompleteAccess }
  }

  if (Object.hasOwn(options, "permissions")) {
    const policyError = validateAutomationPolicy({
      permissions: options.permissions,
      surfaces,
    })

    if (policyError !== undefined) {
      return {
        error: policyError.includes("not available for automations")
          ? automationInstructionMarkerErrors.unavailableAccess
          : policyError,
      }
    }
  }

  if (Array.isArray(options.permissions)) {
    if (!hasAutomationWriteSurface(surfaces, options.permissions)) {
      return { error: automationInstructionMarkerErrors.noWrite }
    }
  }

  return {
    args: {
      name,
      instructions,
      access: {
        integrations: surfaces.map((surface) => ({
          provider: surface.provider,
          tools: surface.tools,
        })),
        web: values.webSearch,
      },
    },
  }
}
