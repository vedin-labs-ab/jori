import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { queueRun } from "../runtime/outbox"
import { findSession, isReusableSession, startSession } from "../sessions/data"

export async function findWatch(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    externalId: string | undefined
  }
) {
  if (args.externalId === undefined) {
    return null
  }

  const externalId = args.externalId

  return await ctx.db
    .query("watches")
    .withIndex("by_tenant_and_integration_and_external", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("externalId", externalId)
    )
    .first()
}

export async function ensureWatch(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    externalId: string | undefined
  }
) {
  const watch = await findWatch(ctx, args)

  if (watch !== null || args.externalId === undefined) {
    return watch
  }

  const watchId = await ctx.db.insert("watches", {
    tenantId: args.tenantId,
    integrationId: args.integrationId,
    externalId: args.externalId,
  })

  return await ctx.db.get(watchId)
}

export async function startMessageRun(
  ctx: MutationCtx,
  args: {
    watch: Doc<"watches"> | null
    integration: Doc<"integrations">
    message: Doc<"messages">
    createdBy: string | undefined
    externalId: string
    now: number
    replaceActiveSession?: boolean
  }
) {
  const watch = args.watch
  const session = watch === null ? null : await findSession(ctx, watch._id)
  const activeSession =
    session === null || args.replaceActiveSession === true
      ? null
      : await isReusableSession(ctx, session)

  if (watch !== null && activeSession !== null) {
    return {
      status: "continued" as const,
      messageId: args.message._id,
      sessionId: activeSession._id,
      watchId: watch._id,
      ...(activeSession.runId === undefined
        ? {}
        : { runId: activeSession.runId }),
    }
  }

  const kind = session === null ? "mention" : "reply"
  const runId = await insertRun(ctx, { ...args, kind })

  const watchId =
    watch === null
      ? await ctx.db.insert("watches", {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          externalId: args.externalId,
        })
      : watch._id

  const sessionId = await startSession(ctx, {
    watchId,
    message: args.message,
    runId,
    now: args.now,
  })

  await queueRun(ctx, runId)

  return {
    status: "started" as const,
    messageId: args.message._id,
    runId,
    sessionId,
    watchId,
  }
}

async function insertRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    createdBy: string | undefined
    now: number
    kind: "mention" | "reply"
  }
) {
  return await ctx.db.insert("runs", {
    tenantId: args.integration.tenantId,
    cause: {
      type: "message",
      messageId: args.message._id,
      kind: args.kind,
    },
    ...createMessageRunSnapshot({
      integration: args.integration,
      kind: args.kind,
      message: args.message,
    }),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: args.now,
  })
}
