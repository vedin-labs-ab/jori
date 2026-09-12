import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { conversationScope } from "../../integrations/messages/audience"
import { messageReplyTargetIdentifier } from "../../integrations/messages/identifiers"
import { resolveMessageOwner } from "../../messages/data"
import { resolveRunAudience } from "../../runs/audience"
import { wakeRun } from "../../runs/execution/waiters/data"
import { startRun } from "../../runs/execution/workflow"
import { type MessageCauseKind } from "../../runs/schema"
import { createMessageRunSnapshot } from "../../runs/snapshot"
import { stopRunTree } from "../../runs/tree"
import {
  isReusableSession,
  readPendingMessages,
  startSession,
} from "../../sessions/data"
import { currentConversationSession } from "../../sessions/execution"
import { consoleRunDetails } from "../console/execution"
import { conversationExecutionPrincipal } from "../console/principal"
import { isFreshRunWithoutWaiter } from "../fresh"
import { insertConversation } from "../records"

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

export async function startMessageRun(
  ctx: MutationCtx,
  args: StartMessageRunArgs
) {
  const conversation = args.conversation
  const session =
    conversation === null
      ? null
      : await currentConversationSession(ctx, conversation)
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
        await stopStaleRun(ctx, activeSession.runId)

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
  const message =
    session === null
      ? args.message
      : ((await readPendingMessages(ctx, session, 1))[0] ?? args.message)
  const runId = await insertRun(ctx, {
    ...args,
    conversation,
    message,
    kind,
    createdBy:
      message._id === args.message._id
        ? args.createdBy
        : await resolveMessageOwner(ctx, {
            message,
            surface: message.surface,
            organizationId: message.organizationId,
          }),
  })

  const sessionId = await startSession(ctx, {
    conversationId: conversation._id,
    message,
    target: messageReplyTargetIdentifier(message) ?? undefined,
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
    scope: conversationScope(args.message),
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
  const principal = conversationExecutionPrincipal(
    args.conversation,
    args.createdBy
  )
  const { context, title } = await consoleRunDetails(
    ctx,
    args.conversation,
    args.message
  )
  const folderId = args.conversation.folderId

  return await ctx.db.insert("runs", {
    organizationId: args.message.organizationId,
    cause: {
      type: "message",
      messageId: args.message._id,
      kind: args.kind,
    },
    principal,
    ...createMessageRunSnapshot({
      context,
      integration: args.integration,
      kind: args.kind,
      message: args.message,
      ...(title === undefined ? {} : { title }),
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

async function stopStaleRun(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run !== null) {
    await stopRunTree(ctx, run)
  }
}
