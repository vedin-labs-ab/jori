import { defaultVisibilityForIntegrations } from "../../../contracts/visibility"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveCreationFolder } from "../../folders/tree"
import { executionPrincipalForVisibility } from "../../runs/principal"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
} from "../../visibility/schema"
import { type Sight } from "../../visibility/sight"
import { type JobAccessInput, resolveAccessInput } from "../access"
import {
  findJobByKey,
  jobKeyPartition,
  normalizeJobKey,
  sameJobDefinition,
} from "../keys"
import { type JobTriggerInput, type JobType } from "../schema"
import { ensureSubscription } from "../subscriptions/data"
import { normalizeRequiredText } from "../timing"
import { sameJobPrincipal } from "./children"
import { getRequiredJob } from "./read"
import { resolveTrigger, scheduleJobIfNeeded } from "./trigger"

type CreateJobArgs = {
  organizationId: string
  /** The job asking for this one, with the configuration generation
   *  the caller believes it is on; a mismatch rejects the creation. */
  parent?: { id: Id<"jobs">; version?: number }
  key?: string
  name: string
  instructions: string
  visibility?: StoredVisibility
  folderId?: Id<"folders">
  access: JobAccessInput
  type: JobType
  trigger: JobTriggerInput
  createdBy?: Id<"persons">
}

export async function createJob(ctx: MutationCtx, args: CreateJobArgs, sight?: Sight) {
  const now = Date.now()
  const prepared = await prepareJob(ctx, args, now, sight)
  const existing = await keyedJob(ctx, prepared)

  if (existing !== null) {
    if (!sameJobDefinition(existing, prepared)) {
      throw new Error("Job key already has different configuration.")
    }

    return { ...existing, created: false }
  }

  const jobId = await ctx.db.insert("jobs", {
    ...prepared,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })

  await activateJob(ctx, jobId, prepared)

  return { ...(await getRequiredJob(ctx, jobId)), created: true }
}

async function prepareJob(ctx: MutationCtx, args: CreateJobArgs, now: number, sight?: Sight) {
  const visibility = normalizeStoredVisibility(
    args.visibility ??
      defaultVisibilityForIntegrations(
        args.access.integrations.map((entry) => entry.integration)
      )
  )
  const key = normalizeJobKey(args.key)
  const principal = executionPrincipalForVisibility(visibility, args.createdBy)
  const ownership = await resolveOwnership(ctx, {
    owner: args.parent,
    principal,
    organizationId: args.organizationId,
    type: args.type,
  })
  const trigger = await resolveTrigger(ctx, {
    principal,
    organizationId: args.organizationId,
    type: args.type,
    trigger: args.trigger,
    now,
  })

  return {
    organizationId: args.organizationId,
    parent: ownership,
    version: 1,
    key,
    ...(key === undefined ? {} : { keyPartition: jobKeyPartition(principal) }),
    name: normalizeRequiredText(args.name, "name"),
    instructions: normalizeRequiredText(args.instructions, "instructions"),
    visibility,
    principal,
    folderId: await resolveCreationFolder(ctx, {
      organizationId: args.organizationId,
      personId: args.createdBy,
      folderId: args.folderId,
    }, sight),
    type: args.type,
    access: await resolveAccessInput(ctx, {
      access: args.access,
      principal,
      organizationId: args.organizationId,
    }),
    trigger,
    createdBy: args.createdBy,
  }
}

async function resolveOwnership(
  ctx: MutationCtx,
  args: {
    owner?: { id: Id<"jobs">; version?: number }
    principal: ReturnType<typeof executionPrincipalForVisibility>
    organizationId: string
    type: JobType
  }
) {
  if (args.owner === undefined) {
    return undefined
  }

  if (args.type !== "once") {
    return undefined
  }

  const owner = await ctx.db.get(args.owner.id)
  if (owner === null) {
    throw new Error("Parent job is no longer available.")
  }

  const parent =
    owner.type === "once" && owner.parent !== undefined
      ? await ctx.db.get(owner.parent.id)
      : owner.type === "once"
        ? null
        : owner

  if (parent === null) {
    return undefined
  }

  if (
    parent.organizationId !== args.organizationId ||
    parent.status !== "active" ||
    parent.type === "once" ||
    !sameJobPrincipal(parent.principal, args.principal)
  ) {
    throw new Error("Parent job is no longer active for this owner.")
  }

  const version = parent.version ?? 1

  if (args.owner.version !== version) {
    throw new Error("Parent job configuration has changed.")
  }

  return { id: parent._id, version }
}

async function keyedJob(
  ctx: MutationCtx,
  prepared: Awaited<ReturnType<typeof prepareJob>>
) {
  return prepared.key === undefined || prepared.keyPartition === undefined
    ? null
    : await findJobByKey(ctx, {
        organizationId: prepared.organizationId,
        key: prepared.key,
        keyPartition: prepared.keyPartition,
      })
}

async function activateJob(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  prepared: Awaited<ReturnType<typeof prepareJob>>
) {
  await scheduleJobIfNeeded(ctx, jobId, prepared.trigger)

  if (prepared.type === "event" && "integrationId" in prepared.trigger) {
    await ensureSubscription(ctx, {
      organizationId: prepared.organizationId,
      trigger: prepared.trigger,
    })
  }
}
