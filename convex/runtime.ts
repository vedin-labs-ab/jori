import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const runSlackExecution = internalAction({
  args: {
    executionId: v.id("executions"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.slack.getExecutionInput, args)

    if (input === null) {
      return
    }

    await ctx.runMutation(internal.slack.markExecutionRunning, {
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

      const reply = await postSlackReply({
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

    await ctx.runMutation(internal.slack.finishExecution, {
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

async function postSlackReply(args: {
  token: string
  channel: string | undefined
  threadId: string | undefined
  text: string
}) {
  if (args.channel === undefined) {
    return { ok: false, error: "missing_channel" }
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: args.channel,
      text: args.text,
      thread_ts: args.threadId,
    }),
  })
  const result = (await response.json()) as {
    ok?: boolean
    error?: string
    ts?: string
  }

  return {
    ok: result.ok === true,
    error: result.error,
    ts: result.ts,
  }
}
