"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import { type CodexRuntimeInput } from "./codex"
import { prepareIntegrationForRuntime } from "./integrations"
import { assemblePrompt } from "./prompt"
import { runCodexInE2B } from "./sandbox/e2b"
import { requireMessageTarget } from "./targets"
import { createExecutionToken, hashExecutionToken } from "./tokens"
import { assembleToolsForRun, type RuntimeTarget } from "./tools"
import { CodexRunError, formatError } from "./trace"

export const runMessageExecution = internalAction({
  args: {
    executionId: v.id("executions"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.runs.executions.getInput, args)

    if (input === null || input.type !== "message") {
      return
    }

    const target = requireMessageTarget(input.provider, input.message.data)

    await runExecution(
      ctx,
      {
        type: "message",
        provider: input.provider,
        execution: input.execution,
        trigger: input.trigger,
        integration: input.integration,
        integrations: await prepareIntegrationsForRuntime(
          ctx,
          input.integrations,
          target
        ),
        message: input.message,
      },
      target
    )
  },
})

export const runScheduledExecution = internalAction({
  args: {
    executionId: v.id("executions"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.runs.executions.getInput, args)

    if (input === null || input.type !== "scheduled") {
      return
    }

    if (input.integration === null) {
      await finishExecutionWithError(
        ctx,
        input.execution.tenantId,
        input.execution._id,
        "Scheduled task output target requires a connected Slack integration."
      )
      return
    }

    await runExecution(
      ctx,
      {
        type: "scheduled",
        execution: input.execution,
        trigger: input.trigger,
        integration: input.integration,
        integrations: await prepareIntegrationsForRuntime(
          ctx,
          input.integrations,
          {
            provider: "slack",
            channelId: input.schedule.output.channelId,
            threadId: input.schedule.output.threadId,
          }
        ),
        schedule: input.schedule,
      },
      {
        provider: "slack",
        channelId: input.schedule.output.channelId,
        threadId: input.schedule.output.threadId,
      }
    )
  },
})

async function runExecution(
  ctx: ActionCtx,
  input: CodexRuntimeInput,
  target: RuntimeTarget
) {
  const executionToken = createExecutionToken()
  const hash = await hashExecutionToken(executionToken)
  const skills = await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId: input.execution.tenantId,
  })
  const promptBundle = assemblePrompt(input, skills)
  const toolBundle = assembleToolsForRun({
    milo: {
      convexSiteUrl: requireConvexSiteUrl(),
      executionToken,
    },
    integrations: input.integrations,
    target,
  })
  let trace: string | undefined
  let executionError: string | undefined
  let status: "completed" | "failed" = "completed"

  try {
    const runtimeResult = await runCodexInE2B({
      authJsonBase64: requireCodexAuthJsonBase64(),
      onSandboxCreated: async (sandboxId) => {
        await ctx.runMutation(internal.runs.executions.markRunning, {
          executionId: input.execution._id,
          sandboxId,
          hash,
        })
      },
      prompt: promptBundle.rendered,
      toolBundle,
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
    tenantId: input.execution.tenantId,
    executionId: input.execution._id,
    fileId,
    error: executionError,
    status,
  })
}

async function prepareIntegrationsForRuntime(
  ctx: ActionCtx,
  integrations: CodexRuntimeInput["integrations"],
  target: RuntimeTarget
) {
  const prepared: CodexRuntimeInput["integrations"] = []

  for (const integration of integrations) {
    prepared.push(
      await prepareIntegrationForRuntime(ctx, {
        integration,
        target,
      })
    )
  }

  return prepared
}

async function finishExecutionWithError(
  ctx: ActionCtx,
  tenantId: string,
  executionId: CodexRuntimeInput["execution"]["_id"],
  message: string
) {
  await ctx.runMutation(internal.runs.executions.finish, {
    tenantId,
    executionId,
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
