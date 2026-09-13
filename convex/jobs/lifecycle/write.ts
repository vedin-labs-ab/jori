import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  executesAsOrganization,
  executionPrincipalForVisibility,
} from "../../runs/principal"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
} from "../../visibility/schema"
import { type JobAccessInput, resolveAccessInput } from "../access"
import { findJobByKey, jobKeyPartition } from "../keys"
import { type JobTriggerInput, type JobType } from "../schema"
import { releaseSubscription } from "../subscriptions/data"
import {
  isSameEventTrigger,
  normalizeRequiredText,
  sameTriggerDefinition,
} from "../timing"
import { deleteOwnedJobs, requireValidOwnershipUpdate } from "./children"
import { getOrganizationJob, getRequiredJob } from "./read"
import { activateTrigger, cancelTrigger, resolveTrigger } from "./trigger"

type UpdateJobArgs = {
  organizationId: string
  jobId: Id<"jobs">
  name?: string
  instructions?: string
  visibility?: StoredVisibility
  access?: JobAccessInput
  type?: JobType
  trigger?: JobTriggerInput
  updatedBy?: Id<"persons">
}

export async function updateJob(ctx: MutationCtx, args: UpdateJobArgs) {
  const existing = await getOrganizationJob(
    ctx,
    args.organizationId,
    args.jobId
  )
  await requireValidOwnershipUpdate(ctx, args, existing)
  const now = Date.now()
  const patch = await buildJobPatch(ctx, args, existing, now)
  const invalidatesChildren =
    existing.parent === undefined && ownedJobsAreStale(existing, patch)

  if (invalidatesChildren) {
    patch.version = (existing.version ?? 1) + 1
  }

  await ctx.db.patch(args.jobId, patch)
  if (
    args.trigger !== undefined &&
    existing.type === "event" &&
    "integrationId" in existing.trigger &&
    !isSameEventTrigger(existing.trigger, patch.trigger)
  ) {
    await releaseSubscription(ctx, {
      organizationId: existing.organizationId,
      trigger: existing.trigger,
      exceptJobId: args.jobId,
    })
  }
  if (invalidatesChildren) {
    await deleteOwnedJobs(ctx, existing._id)
  }

  return await getRequiredJob(ctx, args.jobId)
}

export function ownedJobsAreStale(
  existing: Doc<"jobs">,
  patch: Partial<Doc<"jobs">>
) {
  return (
    (patch.instructions !== undefined &&
      patch.instructions !== existing.instructions) ||
    (patch.visibility !== undefined &&
      JSON.stringify(patch.visibility) !==
        JSON.stringify(existing.visibility)) ||
    (patch.type !== undefined && patch.type !== existing.type) ||
    (patch.access !== undefined &&
      JSON.stringify(patch.access) !== JSON.stringify(existing.access)) ||
    (patch.trigger !== undefined &&
      !sameTriggerDefinition(existing.trigger, patch.trigger))
  )
}

async function buildJobPatch(
  ctx: MutationCtx,
  args: UpdateJobArgs,
  existing: Doc<"jobs">,
  now: number
) {
  const patch: Partial<Doc<"jobs">> = { updatedAt: now }
  const principal =
    args.visibility === undefined
      ? existing.principal
      : executionPrincipalForVisibility(args.visibility, args.updatedBy)

  if (args.name !== undefined) {
    patch.name = normalizeRequiredText(args.name, "name")
  }

  if (args.instructions !== undefined) {
    patch.instructions = normalizeRequiredText(
      args.instructions,
      "instructions"
    )
  }

  await applyPrincipalPatch(ctx, args, existing, principal, patch)

  if (args.access !== undefined) {
    patch.access = await resolveAccessInput(ctx, {
      access: args.access,
      principal,
      organizationId: existing.organizationId,
    })
  }

  if (
    args.trigger === undefined &&
    args.type !== undefined &&
    args.type !== existing.type
  ) {
    throw new Error("Changing job type requires a trigger.")
  }

  if (args.trigger !== undefined) {
    Object.assign(
      patch,
      await buildTriggerPatch(
        ctx,
        args.jobId,
        existing,
        args.type ?? existing.type,
        args.trigger,
        now,
        principal
      )
    )
  }

  return patch
}

async function applyPrincipalPatch(
  ctx: MutationCtx,
  args: UpdateJobArgs,
  existing: Doc<"jobs">,
  principal: Doc<"jobs">["principal"],
  patch: Partial<Doc<"jobs">>
) {
  if (args.visibility === undefined) {
    return
  }

  const visibility = normalizeStoredVisibility(args.visibility)
  const sharingChanges =
    executesAsOrganization(visibility) !==
    executesAsOrganization(existing.visibility)

  if (args.access === undefined && sharingChanges) {
    throw new Error("Changing sharing requires an updated access contract.")
  }

  if (
    sharingChanges &&
    existing.type === "event" &&
    args.trigger === undefined
  ) {
    throw new Error("Changing sharing requires an updated event trigger.")
  }

  patch.visibility = visibility
  patch.principal = principal
  await updateKeyPartition(ctx, existing, principal, patch)
}

async function buildTriggerPatch(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  existing: Doc<"jobs">,
  type: JobType,
  input: JobTriggerInput,
  now: number,
  principal: Doc<"jobs">["principal"]
) {
  await cancelTrigger(ctx, existing.trigger)
  const trigger = await resolveTrigger(ctx, {
    principal,
    organizationId: existing.organizationId,
    type,
    trigger: input,
    now,
  })
  const status = existing.status === "paused" ? "paused" : "active"
  const storedTrigger =
    status === "active"
      ? await activateTrigger(ctx, {
          jobId,
          organizationId: existing.organizationId,
          type,
          trigger,
        })
      : trigger

  return { status, trigger: storedTrigger, type }
}

async function updateKeyPartition(
  ctx: MutationCtx,
  existing: Doc<"jobs">,
  principal: Doc<"jobs">["principal"],
  patch: Partial<Doc<"jobs">>
) {
  if (existing.key === undefined) {
    return
  }

  const keyPartition = jobKeyPartition(principal)
  const conflict = await findJobByKey(ctx, {
    organizationId: existing.organizationId,
    key: existing.key,
    keyPartition,
  })

  if (conflict !== null && conflict._id !== existing._id) {
    throw new Error("Job key already exists for the new owner.")
  }

  patch.keyPartition = keyPartition
}
