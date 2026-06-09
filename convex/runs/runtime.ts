"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import { createPromptedExecution } from "./artifacts"
import { type CodexRuntimeInput } from "./codex"
import { prepareIntegrationForRuntime } from "./integrations"
import { runCodexInE2B } from "./sandbox/e2b"
import { requireMessageTarget } from "./targets"
import { createExecutionToken, hashExecutionToken } from "./tokens"
import { CodexRunError, formatError } from "./trace"

export const runMessageExecution = internalAction({
  args: {
    triggerId: v.id("triggers"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(
      internal.runs.executions.getInputByTrigger,
      args
    )

    if (input === null || input.type !== "message") {
      return
    }

    requireMessageTarget(input.provider, input.message.data)

    await runExecution(ctx, {
      type: "message",
      provider: input.provider,
      trigger: input.trigger,
      integration: input.integration,
      integrations: await prepareIntegrationsForRuntime(
        ctx,
        input.integrations
      ),
      message: input.message,
    })
  },
})

export const runScheduledExecution = internalAction({
  args: {
    triggerId: v.id("triggers"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(
      internal.runs.executions.getInputByTrigger,
      args
    )

    if (input === null || input.type !== "scheduled") {
      return
    }

    if (input.integration === null) {
      await createFailedExecution(
        ctx,
        input,
        "Scheduled task output target requires a connected Slack integration."
      )
      return
    }

    await runExecution(ctx, {
      type: "scheduled",
      trigger: input.trigger,
      integration: input.integration,
      integrations: await prepareIntegrationsForRuntime(
        ctx,
        input.integrations
      ),
      schedule: input.schedule,
    })
  },
})

async function runExecution(ctx: ActionCtx, input: CodexRuntimeInput) {
  const executionToken = createExecutionToken()
  const hash = await hashExecutionToken(executionToken)
  const execution = await createPromptedExecution(ctx, {
    convexSiteUrl: requireConvexSiteUrl(),
    input,
    executionToken,
  })

  if (execution === null) {
    return
  }

  let trace: string | undefined
  let executionError: string | undefined
  let status: "completed" | "failed" = "completed"

  try {
    const runtimeResult = await runCodexInE2B({
      authJsonBase64: requireCodexAuthJsonBase64(),
      onSandboxCreated: async (sandboxId) => {
        await ctx.runMutation(internal.runs.executions.markRunning, {
          executionId: execution.id,
          sandboxId,
          hash,
        })
      },
      prompt: execution.prompt,
      toolBundle: execution.toolBundle,
    })

    trace = runtimeResult.trace
  } catch (error) {
    status = "failed"
    executionError = formatError(error)
    trace = error instanceof CodexRunError ? error.trace : undefined
  }

  const fileId =
    trace === undefined
      ? undefined
      : await ctx.storage.store(
          new Blob([trace], {
            type: "application/x-ndjson",
          })
        )

  await ctx.runMutation(internal.runs.executions.finish, {
    tenantId: input.trigger.tenantId,
    executionId: execution.id,
    fileId,
    error: executionError,
    status,
  })
}

async function prepareIntegrationsForRuntime(
  ctx: ActionCtx,
  integrations: CodexRuntimeInput["integrations"]
) {
  const prepared: CodexRuntimeInput["integrations"] = []

  for (const integration of integrations) {
    prepared.push(
      await prepareIntegrationForRuntime(ctx, {
        integration,
      })
    )
  }

  return prepared
}

async function createFailedExecution(
  ctx: ActionCtx,
  input: CodexRuntimeInput,
  message: string
) {
  const execution = await createPromptedExecution(ctx, {
    convexSiteUrl: requireConvexSiteUrl(),
    input,
    executionToken: createExecutionToken(),
  })

  if (execution === null) {
    return
  }

  await ctx.runMutation(internal.runs.executions.finish, {
    tenantId: input.trigger.tenantId,
    executionId: execution.id,
    error: message,
    status: "failed",
  })
}

function requireCodexAuthJsonBase64() {
  const authJson = process.env.CODEX_AUTH_JSON_BASE64

  if (authJson === undefined) {
    throw new Error("Missing CODEX_AUTH_JSON_BASE64")
  }

  return authJson
}

function requireConvexSiteUrl() {
  const siteUrl = process.env.CONVEX_SITE_URL

  if (siteUrl === undefined) {
    throw new Error("Missing CONVEX_SITE_URL")
  }

  return siteUrl
}
