import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import {
  getJobScopeConflict,
  hasJobWriteSurface,
} from "@/shared/console/jobs/access"
import {
  type JobPolicyPermissions,
  validateJobPolicy,
} from "@/shared/console/jobs/access/policy"
import {
  jobInstructionMarkerErrors,
  jobInstructionsErrors,
  jobNameErrors,
} from "@/shared/console/jobs/editor/errors"
import { type Job, type JobFormValues } from "@/shared/console/jobs/types"
import { type api } from "../../../../../convex/_generated/api"
import { jobFormValues } from "."
import { prepareJobInstructions } from "./instructions"
import {
  buildJobTriggerSpec,
  hasJobTriggerChanged,
  type TriggerSpec,
} from "./trigger"

type JobVisibilityArg = FunctionArgs<
  typeof api.jobs.console.create
>["visibility"]

type JobArgs = {
  name: string
  instructions: string
  visibility: JobVisibilityArg
  access: {
    integrations: Array<{
      integration: JobFormValues["surfaces"][number]["integration"]
      tools: string[]
    }>
    web: boolean
  }
}

type ArgsResult<Args> = { args: Args } | { error: string }
type JobArgsOptions = {
  permissions?: JobPolicyPermissions
}

export function createJobArgs(
  values: JobFormValues,
  options: JobArgsOptions = {}
): ArgsResult<
  JobArgs & {
    type: JobFormValues["type"]
    trigger: TriggerSpec
    folderId?: GenericId<"folders">
  }
> {
  const base = buildBaseArgs(values, options)

  if ("error" in base) {
    return base
  }

  const trigger = buildJobTriggerSpec(values)

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

export function updateJobArgs(
  values: JobFormValues,
  existing: Job,
  options: JobArgsOptions = {}
): ArgsResult<
  JobArgs & {
    type?: JobFormValues["type"]
    trigger?: TriggerSpec
  }
> {
  const base = buildBaseArgs(values, options)

  if ("error" in base) {
    return base
  }

  if (
    JSON.stringify(values.visibility) === JSON.stringify(existing.visibility) &&
    !hasJobTriggerChanged(values, existing, jobFormValues(existing))
  ) {
    return base
  }

  const trigger = buildJobTriggerSpec(values)

  if ("error" in trigger) {
    return trigger
  }

  return { args: { ...base.args, ...trigger } }
}

function buildBaseArgs(
  values: JobFormValues,
  options: JobArgsOptions
): ArgsResult<JobArgs> {
  const name = values.name.trim()
  const prepared = prepareJobInstructions(values, options.permissions)
  const { instructions } = prepared
  const surfaces = values.surfaces

  if (name === "") {
    return { error: jobNameErrors.required }
  }

  if (instructions === "") {
    return { error: jobInstructionsErrors.required }
  }

  if (surfaces.length === 0) {
    return { error: jobInstructionMarkerErrors.noMarkers }
  }

  if (surfaces.some((surface) => surface.tools.length === 0)) {
    return { error: jobInstructionMarkerErrors.incompleteAccess }
  }

  const scopeError = getJobScopeConflict(values.scope, surfaces)?.message

  if (scopeError !== undefined) {
    return { error: scopeError }
  }

  if (prepared.issue !== undefined) {
    return { error: prepared.issue }
  }

  if (Object.hasOwn(options, "permissions")) {
    const policyError = validateJobPolicy({
      permissions: options.permissions,
      surfaces,
    })

    if (policyError !== undefined) {
      return {
        error: policyError.includes("not available for jobs")
          ? jobInstructionMarkerErrors.unavailableAccess
          : policyError,
      }
    }
  }

  if (Array.isArray(options.permissions)) {
    if (!hasJobWriteSurface(surfaces, options.permissions)) {
      return { error: jobInstructionMarkerErrors.noWrite }
    }
  }

  return {
    args: {
      name,
      instructions,
      visibility: values.visibility as JobVisibilityArg,
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
