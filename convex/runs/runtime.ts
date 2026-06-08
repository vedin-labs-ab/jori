"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { runCodexInE2B } from "./e2b"
import { assemblePrompt, type PromptBundle } from "./prompt"
import {
  assembleToolsForRun,
  type RuntimeTarget,
  summarizeToolBundle,
  type ToolBundle,
} from "./tools"

export const runSlackExecution = internalAction({
  args: {
    executionId: v.id("executions"),
    sourceItemId: v.id("sourceItems"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.runs.executions.getInput, args)

    if (input === null) {
      return
    }

    const target = requireSlackTarget(input.sourceItem)
    const promptBundle = assemblePrompt(input)
    const toolBundle = assembleToolsForRun({
      integration: input.integration,
      target,
    })
    const trace = createInitialTrace(input, promptBundle, toolBundle)
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

function requireSlackTarget(sourceItem: {
  locationId?: string
}): RuntimeTarget {
  if (sourceItem.locationId === undefined || sourceItem.locationId === "") {
    throw new Error("Missing Slack channel target")
  }

  return {
    provider: "slack",
    locationId: sourceItem.locationId,
  }
}

function createInitialTrace(
  input: {
    execution: { _id: string; tenantId: string; createdAt: number }
    sourceItem: {
      _id: string
      kind: string
      externalId: string
      authorId?: string
      locationId?: string
      conversationId?: string
      content?: string
    }
    integration: { _id: string; provider: string; externalAccountId: string }
  },
  promptBundle: PromptBundle,
  toolBundle: ToolBundle
) {
  return {
    version: 1,
    runtime: {
      type: "codex-e2b",
      sandbox: "e2b",
    },
    assembly: {
      prompt: promptBundle,
      tools: summarizeToolBundle(toolBundle),
    },
    execution: {
      id: input.execution._id,
      tenantId: input.execution.tenantId,
      createdAt: input.execution.createdAt,
    },
    integration: {
      id: input.integration._id,
      provider: input.integration.provider,
      externalAccountId: input.integration.externalAccountId,
    },
    sourceItem: {
      id: input.sourceItem._id,
      kind: input.sourceItem.kind,
      externalId: input.sourceItem.externalId,
      authorId: input.sourceItem.authorId,
      locationId: input.sourceItem.locationId,
      conversationId: input.sourceItem.conversationId,
      content: input.sourceItem.content,
    },
    events: [
      {
        type: "runtime.started",
        at: Date.now(),
      },
    ] as Record<string, unknown>[],
  }
}
