import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { postReply } from "../providers/slack/reply"

export const runSlackExecution = internalAction({
  args: {
    executionId: v.id("executions"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.runs.executions.getInput, args)

    if (input === null) {
      return
    }

    await ctx.runMutation(internal.runs.executions.markRunning, {
      executionId: args.executionId,
    })

    const trace = createInitialTrace(input)
    let status: "completed" | "failed" = "completed"

    try {
      const runtimeResult = await runTemporaryCodexRuntime(input.message.text)
      trace.events.push({
        type: "runtime.completed",
        at: Date.now(),
        result: runtimeResult,
      })

      const reply = await postReply({
        token: input.integration.tokenId,
        channel: input.message.containerId,
        threadId: input.message.threadId,
        text: runtimeResult.reply,
      })

      trace.events.push({
        type: "slack.reply",
        at: Date.now(),
        ok: reply.ok,
        error: reply.error,
        ts: reply.ts,
      })

      if (!reply.ok) {
        status = "failed"
      }
    } catch (error) {
      status = "failed"
      trace.events.push({
        type: "runtime.failed",
        at: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const fileId = await ctx.storage.store(
      new Blob([JSON.stringify(trace, null, 2)], {
        type: "application/json",
      })
    )

    await ctx.runMutation(internal.runs.executions.finish, {
      tenantId: input.execution.tenantId,
      executionId: args.executionId,
      fileId,
      status,
    })
  },
})

function createInitialTrace(input: {
  execution: { _id: string; tenantId: string; createdAt: number }
  message: {
    _id: string
    providerId: string
    actorId?: string
    containerId?: string
    threadId?: string
    text?: string
  }
  integration: { _id: string; accountId: string }
}) {
  return {
    version: 1,
    runtime: {
      type: "codex-temporary",
      sandbox: "stubbed",
    },
    execution: {
      id: input.execution._id,
      tenantId: input.execution.tenantId,
      createdAt: input.execution.createdAt,
    },
    integration: {
      id: input.integration._id,
      provider: "slack",
      accountId: input.integration.accountId,
    },
    message: {
      id: input.message._id,
      providerId: input.message.providerId,
      actorId: input.message.actorId,
      containerId: input.message.containerId,
      threadId: input.message.threadId,
      text: input.message.text,
    },
    events: [
      {
        type: "runtime.started",
        at: Date.now(),
      },
    ] as Record<string, unknown>[],
  }
}

async function runTemporaryCodexRuntime(messageText: string | undefined) {
  return {
    summary: "Temporary Codex runtime accepted the Slack request.",
    input: messageText ?? "",
    reply:
      "Milo started a run for this thread. The temporary runtime completed and stored its trace.",
  }
}
