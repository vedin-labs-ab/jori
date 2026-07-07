import {
  defaultScopeForIntegrations,
  type Scope,
} from "@contracts/permissions/scope"
import {
  hasAutomationWriteSurface,
  normalizeAutomationSurfaceMentions,
  syncAutomationSurfaces,
} from "../../access"
import {
  type AutomationPolicyPermissions,
  validateAutomationPolicy,
} from "../../access/policy"
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
  scope: Scope
  access: {
    integrations: Array<{
      integration: AutomationFormValues["surfaces"][number]["integration"]
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
    const values = {
      ...emptyAutomationForm,
      ...readAutomationPreferences(),
    }

    return {
      ...values,
      scope: defaultScopeForIntegrations(
        values.surfaces.map((surface) => surface.integration)
      ),
    }
  }

  return {
    name: automation.name,
    instructions: normalizeAutomationSurfaceMentions(automation.instructions),
    ...triggerFormValues(automation),
    scope: automation.scope,
    webSearch: automation.access.webSearch,
    surfaces: automation.access.surfaces,
  }
}

export function createAutomationArgs(
  values: AutomationFormValues,
  options: AutomationArgsOptions = {}
): ArgsResult<
  AutomationArgs & {
    type: AutomationFormValues["type"]
    trigger: TriggerSpec
  }
> {
  const base = buildBaseArgs(values, options)

  if ("error" in base) {
    return base
  }

  const trigger = buildAutomationTriggerSpec(values)

  if ("error" in trigger) {
    return trigger
  }

  return { args: { ...base.args, ...trigger } }
}

export function updateAutomationArgs(
  values: AutomationFormValues,
  existing: Automation,
  options: AutomationArgsOptions = {}
): ArgsResult<
  AutomationArgs & {
    type?: AutomationFormValues["type"]
    trigger?: TriggerSpec
  }
> {
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

  return { args: { ...base.args, ...trigger } }
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
      scope: values.scope,
      access: {
        integrations: surfaces.map((surface) => ({
          integration: surface.integration,
          tools: surface.tools,
        })),
        web: values.webSearch,
      },
    },
  }
}
