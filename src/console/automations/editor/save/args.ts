import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { type api } from "../../../../../convex/_generated/api"
import {
  getAutomationScopeConflict,
  hasAutomationWriteSurface,
} from "../../access"
import {
  type AutomationPolicyPermissions,
  validateAutomationPolicy,
} from "../../access/policy"
import { type Automation, type AutomationFormValues } from "../../types"
import { automationInstructionsErrors, automationNameErrors } from "../errors"
import { automationFormValues } from "."
import { prepareAutomationInstructions } from "./instructions"
import { automationInstructionMarkerErrors } from "./marker"
import {
  buildAutomationTriggerSpec,
  hasAutomationTriggerChanged,
  type TriggerSpec,
} from "./trigger"

type AutomationVisibilityArg = FunctionArgs<
  typeof api.jobs.console.create
>["visibility"]

type AutomationArgs = {
  name: string
  instructions: string
  visibility: AutomationVisibilityArg
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

export function createAutomationArgs(
  values: AutomationFormValues,
  options: AutomationArgsOptions = {}
): ArgsResult<
  AutomationArgs & {
    type: AutomationFormValues["type"]
    trigger: TriggerSpec
    folderId?: GenericId<"folders">
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

  return {
    args: {
      ...base.args,
      ...trigger,
      ...(values.folderId === null
        ? {}
        : { folderId: values.folderId as GenericId<"folders"> }),
    },
  }
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
    JSON.stringify(values.visibility) === JSON.stringify(existing.visibility) &&
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
  const prepared = prepareAutomationInstructions(values, options.permissions)
  const { instructions } = prepared
  const surfaces = values.surfaces

  if (name === "") {
    return { error: automationNameErrors.required }
  }

  if (instructions === "") {
    return { error: automationInstructionsErrors.required }
  }

  if (surfaces.length === 0) {
    return { error: automationInstructionMarkerErrors.noMarkers }
  }

  if (surfaces.some((surface) => surface.tools.length === 0)) {
    return { error: automationInstructionMarkerErrors.incompleteAccess }
  }

  const scopeError = getAutomationScopeConflict(values.scope, surfaces)?.message

  if (scopeError !== undefined) {
    return { error: scopeError }
  }

  if (prepared.issue !== undefined) {
    return { error: prepared.issue }
  }

  if (Object.hasOwn(options, "permissions")) {
    const policyError = validateAutomationPolicy({
      permissions: options.permissions,
      surfaces,
    })

    if (policyError !== undefined) {
      return {
        error: policyError.includes("not available for jobs")
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
      visibility: values.visibility as AutomationVisibilityArg,
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
