"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { runCodexInE2B } from "./e2b"
import { assemblePrompt } from "./prompt"
import { assembleToolsForRun } from "./tools"
import { CodexRunError, formatError, type StoredRuntimeTrace } from "./trace"

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

    const allowedChannelId = requireSlackChannelId(input.message.containerId)
    const promptBundle = assemblePrompt(input)
    const toolBundle = assembleToolsForRun({
      allowedChannelId,
      integration: input.integration,
    })
    let trace: StoredRuntimeTrace = { harness: {} }
    let status: "completed" | "failed" = "completed"

    try {
      const runtimeResult = await runCodexInE2B({
        authJsonBase64: requireCodexAuthJsonBase64(),
        onSandboxCreated: async (sandboxId) => {
          await ctx.runMutation(internal.runs.executions.markRunning, {
            executionId: args.executionId,
            sandboxId,
          })
        },
        prompt: promptBundle.rendered,
        toolBundle,
      })

      trace = runtimeResult.trace
    } catch (error) {
      status = "failed"
      trace =
        error instanceof CodexRunError
          ? error.trace
          : { harness: { runtime: { error: formatError(error) } } }
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

function requireSlackChannelId(channelId: string | undefined) {
  if (channelId === undefined || channelId === "") {
    throw new Error("Missing Slack channel target")
  }

  return channelId
}
