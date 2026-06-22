import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveMessageOwner } from "../messages/data"
import { maxPendingReadLimit } from "../sessions/cursor"
import { readPendingMessages, stopSession } from "../sessions/data"
import { isUserActor } from "../shared/actor"
import { startMessageRun } from "./data"

export async function continuePendingWatchRun(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    now: number
  }
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .first()

  if (session === null || session.runId !== args.runId) {
    return
  }

  await continueSession(ctx, session, args.now)
}

export async function continueTerminalWatchSession(
  ctx: MutationCtx,
  args: {
    watchId: Id<"watches">
    now: number
  }
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_watch", (query) => query.eq("watchId", args.watchId))
    .first()

  if (session === null || !(await isTerminalSession(ctx, session))) {
    return
  }

  await continueSession(ctx, session, args.now)
}

async function continueSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number
) {
  const pending = await readPendingContinuationMessage(ctx, session)

  if (pending.message === undefined) {
    await stopSession(ctx, session, now)
    return
  }

  const watch = await ctx.db.get(session.watchId)

  if (watch === null) {
    await stopSession(ctx, session, now)
    return
  }

  const integration = await ctx.db.get(watch.integrationId)

  if (integration === null || integration.status !== "active") {
    await stopSession(ctx, session, now)
    return
  }

  await startMessageRun(ctx, {
    integration,
    message: pending.message,
    createdBy: await resolveMessageOwner(ctx, {
      tenantId: integration.tenantId,
      message: pending.message,
    }),
    externalId: watch.externalId,
    now,
    replaceActiveSession: true,
    watch,
  })
}

async function readPendingContinuationMessage(
  ctx: MutationCtx,
  session: Doc<"sessions">
) {
  const messages = await readPendingMessages(ctx, session, maxPendingReadLimit)

  for (const message of messages) {
    if (shouldStartContinuation(message)) {
      return { status: "start" as const, message }
    }
  }

  return { status: "idle" as const }
}

function shouldStartContinuation(message: Doc<"messages">) {
  if (!isUserActor(message.actor)) {
    return false
  }

  return hasText(message)
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}

async function isTerminalSession(ctx: MutationCtx, session: Doc<"sessions">) {
  const runId = session.runId

  if (runId === undefined) {
    return false
  }

  const run = await ctx.db.get(runId)

  return run !== null && isTerminalStatus(run.status)
}

function isTerminalStatus(status: Doc<"runs">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}
