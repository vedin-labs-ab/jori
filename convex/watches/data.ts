import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { queueRun } from "../runtime/outbox"
import { wakeRun } from "../runtime/waiters/data"
import { findSession, isReusableSession, startSession } from "../sessions/data"

const waiterWakeGraceMs = 5 * 60 * 1000
const runActivityGraceMs = 2 * 60 * 60 * 1000

type StartMessageRunArgs = {
  watch: Doc<"watches"> | null
  integration: Doc<"integrations">
  message: Doc<"messages">
  createdBy: Id<"persons"> | undefined
  externalId: string
  now: number
  replaceActiveSession?: boolean
}

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
  args: StartMessageRunArgs
) {
  const watch = args.watch
  const session = watch === null ? null : await findSession(ctx, watch._id)
  const activeSession =
    session === null || args.replaceActiveSession === true
      ? null
      : await isReusableSession(ctx, session)

  if (watch !== null && activeSession !== null) {
    if (activeSession.runId !== undefined) {
      const woken = await wakeRun(ctx, {
        runId: activeSession.runId,
        reason: "message",
        subject: { kind: "message", id: args.message._id },
      })

      if (
        !woken &&
        !(await isFreshRunWithoutWaiter(ctx, activeSession.runId, args.now))
      ) {
        return await startNewMessageRun(ctx, args, session)
      }
    }

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

  return await startNewMessageRun(ctx, args, session)
}

async function startNewMessageRun(
  ctx: MutationCtx,
  args: StartMessageRunArgs,
  session: Doc<"sessions"> | null
) {
  const kind = session === null ? "mention" : "reply"
  const runId = await insertRun(ctx, { ...args, kind })

  const watchId =
    args.watch === null
      ? await ctx.db.insert("watches", {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          externalId: args.externalId,
        })
      : args.watch._id

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

async function isFreshRunWithoutWaiter(
  ctx: MutationCtx,
  runId: Id<"runs">,
  now: number
) {
  const run = await ctx.db.get(runId)

  if (run === null || isTerminalRun(run)) {
    return false
  }

  const latestActivity = await latestRunActivity(ctx, run)
  const latestInactiveWaiter = await latestInactiveWaiterUpdate(ctx, runId)

  if (isUnresumedWaiterWake(latestActivity, latestInactiveWaiter, now)) {
    return false
  }

  return now - latestActivity <= runActivityGraceMs
}

async function latestRunActivity(ctx: MutationCtx, run: Doc<"runs">) {
  const trace = await ctx.db
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", run._id))
    .order("desc")
    .first()

  return Math.max(run.createdAt, trace?.timestamp ?? 0)
}

async function latestInactiveWaiterUpdate(ctx: MutationCtx, runId: Id<"runs">) {
  const updates = await Promise.all(
    (["cancelled", "expired", "woken"] as const).map(async (status) => {
      const waiter = await ctx.db
        .query("waiters")
        .withIndex("by_run_and_status", (query) =>
          query.eq("runId", runId).eq("status", status)
        )
        .order("desc")
        .first()

      return waiter?.updatedAt
    })
  )

  const values = updates.filter(
    (updatedAt): updatedAt is number => updatedAt !== undefined
  )

  return values.length === 0 ? 0 : Math.max(...values)
}

function isUnresumedWaiterWake(
  latestActivity: number,
  latestInactiveWaiter: number,
  now: number
) {
  return (
    latestInactiveWaiter > 0 &&
    latestActivity <= latestInactiveWaiter &&
    now - latestInactiveWaiter > waiterWakeGraceMs
  )
}

function isTerminalRun(run: Doc<"runs">) {
  return (
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "stopped"
  )
}

async function insertRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    createdBy: Id<"persons"> | undefined
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
