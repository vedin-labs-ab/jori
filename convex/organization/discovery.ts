import { v } from "convex/values"
import { compactRecord } from "../../contracts/json"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { type QueryLikeCtx } from "../shared/context"
import { discoveryStepKind } from "./schema"

const maxSteps = 40
const stepArgs = {
  id: v.string(),
  kind: discoveryStepKind,
  label: v.string(),
  url: v.optional(v.string()),
}

type DiscoveryStep = Doc<"organizationDiscovery">["steps"][number]

export const get = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await readDiscovery(ctx, args.organizationId)
  },
})

export const start = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const existing = await readDiscovery(ctx, args.organizationId)
    const value = {
      organizationId: args.organizationId,
      status: "running" as const,
      steps: [],
      startedAt: Date.now(),
      errors: [],
    }

    if (existing === null) {
      await ctx.db.insert("organizationDiscovery", value)

      return
    }

    await ctx.db.replace(existing._id, value)
  },
})

export const startStep = internalMutation({
  args: {
    organizationId: v.string(),
    ...stepArgs,
  },
  handler: async (ctx, args) => {
    const discovery = await requireDiscovery(ctx, args.organizationId)
    const startedAt = Date.now()

    await appendStep(
      ctx,
      discovery,
      compactRecord({
        activeAt: startedAt,
        id: args.id,
        kind: args.kind,
        label: args.label,
        startedAt,
        url: args.url,
      })
    )

    return startedAt
  },
})

export const queueStep = internalMutation({
  args: {
    organizationId: v.string(),
    ...stepArgs,
  },
  handler: async (ctx, args) => {
    const discovery = await requireDiscovery(ctx, args.organizationId)
    const queuedAt = Date.now()

    await appendStep(
      ctx,
      discovery,
      compactRecord({
        id: args.id,
        kind: args.kind,
        label: args.label,
        queuedAt,
        startedAt: queuedAt,
        url: args.url,
      })
    )

    return queuedAt
  },
})

export const activateStep = internalMutation({
  args: {
    organizationId: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.organizationId)

    const activeAt = Date.now()

    if (discovery === null) {
      return activeAt
    }

    await ctx.db.patch(discovery._id, {
      steps: discovery.steps.map((step) =>
        step.id === args.id
          ? { ...step, activeAt, startedAt: step.startedAt ?? activeAt }
          : step
      ),
    })

    return activeAt
  },
})

export const completeStep = internalMutation({
  args: {
    organizationId: v.string(),
    id: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.organizationId)

    if (discovery === null) {
      return
    }

    const completedAt = Date.now()

    await ctx.db.patch(discovery._id, {
      steps: discovery.steps.map((step) =>
        step.id === args.id
          ? {
              ...step,
              completedAt,
              ...(args.error === undefined ? {} : { error: args.error }),
            }
          : step
      ),
      errors: appendError(discovery.errors, args.error),
    })
  },
})

export const finish = internalMutation({
  args: { organizationId: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.organizationId)

    if (discovery === null) {
      return
    }

    const endedAt = Date.now()

    await ctx.db.patch(discovery._id, {
      status: "completed",
      endedAt,
      steps: closeOpenSteps(discovery.steps, endedAt, args.error),
      errors: appendError(discovery.errors, args.error),
    })
  },
})

async function requireDiscovery(ctx: MutationCtx, organizationId: string) {
  const discovery = await readDiscovery(ctx, organizationId)

  if (discovery === null) {
    throw new Error("Discovery run has not started.")
  }

  return discovery
}

async function appendStep(
  ctx: MutationCtx,
  discovery: Doc<"organizationDiscovery">,
  entry: DiscoveryStep
) {
  await ctx.db.patch(discovery._id, {
    steps: [...discovery.steps, entry].slice(-maxSteps),
  })
}

function closeOpenSteps(
  steps: DiscoveryStep[],
  completedAt: number,
  error: string | undefined
) {
  return steps.map((step) =>
    step.completedAt !== undefined || step.error !== undefined
      ? step
      : {
          ...step,
          completedAt,
          ...(error === undefined ? {} : { error }),
        }
  )
}

function appendError(errors: string[], error: string | undefined) {
  if (error === undefined || errors.includes(error)) {
    return errors
  }

  return [...errors, error]
}

async function readDiscovery(ctx: QueryLikeCtx, organizationId: string) {
  return await ctx.db
    .query("organizationDiscovery")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique()
}
