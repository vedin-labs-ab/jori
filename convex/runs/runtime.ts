"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { createCodexPrompt } from "./codex"
import { runCodexInDaytona } from "./daytona"

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

    const trace = createInitialTrace(input)
    let status: "completed" | "failed" = "completed"

    try {
      const runtimeResult = await runCodexInDaytona({
        authJsonBase64: requireCodexAuthJsonBase64(),
        onSandboxCreated: async (sandboxId) => {
          await ctx.runMutation(internal.runs.executions.markRunning, {
            executionId: args.executionId,
            sandboxId,
          })
        },
        prompt: createCodexPrompt(input),
        slackMcpToken: input.integration.tokenId,
      })

      trace.events.push({
        type: "runtime.completed",
        at: Date.now(),
        result: runtimeResult,
      })
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

function requireCodexAuthJsonBase64() {
  const authJson = process.env.CODEX_AUTH_JSON_BASE64

  if (authJson === undefined) {
    throw new Error("Missing CODEX_AUTH_JSON_BASE64")
  }

  return authJson
}

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
      type: "codex-daytona",
      sandbox: "daytona",
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
