import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { checkRunBudget } from "../billing/guard"
import { resolveConsoleContext } from "../messages/references"
import { conversationScope } from "../messages/surface"
import { resolveRunAudience } from "../runs/audience"
import { wakeRun } from "../runs/execution/waiters/data"
import { startRun } from "../runs/execution/workflow"
import { executionPrincipalForPerson } from "../runs/principal"
import { type MessageCauseKind } from "../runs/schema"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { findSession, isReusableSession, startSession } from "../sessions/data"
import { createSight } from "../visibility/sight"
import { isFreshRunWithoutWaiter } from "./fresh"
import { findConversation } from "./resolve"

type StartMessageRunArgs = {
  conversation: Doc<"conversations"> | null
  // Console runs have no integration; their conversation always exists
  // before the run starts.
  integration: Doc<"integrations"> | null
  message: Doc<"messages">
  createdBy: Id<"persons"> | undefined
  externalId: string
  now: number
  replaceActiveSession?: boolean
}

export async function ensureConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const conversation = await findConversation(ctx, {
    organizationId: args.integration.organizationId,
    integrationId: args.integration._id,
    externalId: args.externalId,
  })

  if (conversation !== null) {
    return conversation
  }

  return await insertConversation(ctx, {
    externalId: args.externalId,
    integration: args.integration,
    message: args.message,
  })
}

async function insertConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const conversationId = await ctx.db.insert("conversations", {
    organizationId: args.integration.organizationId,
    surface: args.message.surface,
    integrationId: args.integration._id,
    externalId: args.externalId,
    scope: conversationScope(args.message),
  })
  const conversation = await ctx.db.get(conversationId)

  if (conversation === null) {
    throw new Error("Conversation insert failed.")
  }

  return conversation
}

export async function startMessageRun(
  ctx: MutationCtx,
  args: StartMessageRunArgs
) {
  const conversation = args.conversation
  const session =
    conversation === null ? null : await findSession(ctx, conversation._id)
  const activeSession =
    session === null || args.replaceActiveSession === true
      ? null
      : await isReusableSession(ctx, session)

  if (conversation !== null && activeSession !== null) {
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
      conversationId: conversation._id,
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
  // Mentions are interactive work: they get the grace floor. Continuing an
  // active session never lands here, so in-flight threads are not cut off.
  const budget = await checkRunBudget(ctx, {
    organizationId: args.message.organizationId,
    interactive: true,
  })

  if (!budget.ok) {
    return {
      status: "blocked" as const,
      messageId: args.message._id,
    }
  }

  const kind = session === null ? "mention" : "reply"
  const conversation =
    args.conversation ?? (await insertProviderConversation(ctx, args))
  const runId = await insertRun(ctx, { ...args, conversation, kind })

  const sessionId = await startSession(ctx, {
    conversationId: conversation._id,
    message: args.message,
    runId,
    now: args.now,
  })

  await startRun(ctx, runId)

  return {
    status: "started" as const,
    messageId: args.message._id,
    runId,
    sessionId,
    conversationId: conversation._id,
  }
}

async function insertProviderConversation(
  ctx: MutationCtx,
  args: StartMessageRunArgs
) {
  if (args.integration === null) {
    throw new Error("Console conversations are created before their run.")
  }

  return await insertConversation(ctx, {
    externalId: args.externalId,
    integration: args.integration,
    message: args.message,
  })
}

async function insertRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations"> | null
    message: Doc<"messages">
    conversation: Doc<"conversations">
    createdBy: Id<"persons"> | undefined
    now: number
    kind: MessageCauseKind
  }
) {
  const context = await consoleRunContext(
    ctx,
    args.conversation,
    args.createdBy
  )
  const folderId = context?.folderId

  return await ctx.db.insert("runs", {
    organizationId: args.message.organizationId,
    cause: {
      type: "message",
      messageId: args.message._id,
      kind: args.kind,
    },
    principal: executionPrincipalForPerson(args.createdBy),
    ...createMessageRunSnapshot({
      context,
      integration: args.integration,
      kind: args.kind,
      message: args.message,
    }),
    ...(await resolveRunAudience(ctx, {
      origin: { conversation: args.conversation },
      run: { createdBy: args.createdBy },
    })),
    ...(folderId === undefined ? {} : { folderId }),
    ...(args.conversation.model === undefined
      ? {}
      : { model: args.conversation.model }),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: args.now,
  })
}

/** What a console conversation was opened about, as the person who
 *  opened it sees it: the context rides on their first message, and every
 *  run the conversation starts is filed under its folder — the folder
 *  itself, or the one the resource is filed in. */
async function consoleRunContext(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  personId: Id<"persons"> | undefined
) {
  if (conversation.surface !== "console") {
    return undefined
  }

  const first = await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("organizationId", conversation.organizationId)
          .eq("integrationId", undefined)
          .eq("conversationId", conversation.externalId)
    )
    .order("asc")
    .first()
  const sight = createSight(ctx, {
    organizationId: conversation.organizationId,
    personId,
  })

  return await resolveConsoleContext(ctx, sight, first?.data)
}
