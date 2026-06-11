"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import { getScheduleProviderAccess } from "../scheduling/output"
import { createPromptedExecution } from "./artifacts"
import { type CodexRuntimeInput } from "./codex"
import { runPromptedExecution } from "./execute"
import { prepareIntegrationForRuntime } from "./integrations"
import { killE2BSandbox } from "./sandbox/e2b"
import { requireMessageTarget } from "./targets"
import { createExecutionToken } from "./tokens"

export const runMessageExecution = internalAction({
  args: {
    triggerId: v.id("triggers"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(
      internal.executions.records.getInputByTrigger,
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
      internal.executions.records.getInputByTrigger,
      args
    )

    if (input === null || input.type !== "scheduled") {
      return
    }

    await runExecution(ctx, {
      type: "scheduled",
      trigger: input.trigger,
      integration: null,
      integrations: await prepareIntegrationsForRuntime(
        ctx,
        filterScheduledIntegrations(input.integrations, input.schedule.output)
      ),
      schedule: input.schedule,
    })
  },
})

export const killSandbox = internalAction({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    await killE2BSandbox(args.sandboxId)

    return null
  },
})

async function runExecution(ctx: ActionCtx, input: CodexRuntimeInput) {
  const executionToken = createExecutionToken()
  const execution = await createPromptedExecution(ctx, {
    convexSiteUrl: requireConvexSiteUrl(),
    input,
    executionToken,
  })

  if (execution === null) {
    return
  }

  await runPromptedExecution(ctx, {
    execution,
    executionToken,
  })
}

function filterScheduledIntegrations(
  integrations: CodexRuntimeInput["integrations"],
  output: Extract<
    CodexRuntimeInput,
    { type: "scheduled" }
  >["schedule"]["output"]
) {
  return integrations.filter(
    (integration) =>
      getScheduleProviderAccess(output, integration.provider) !== "none"
  )
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

function requireConvexSiteUrl() {
  const siteUrl = process.env.CONVEX_SITE_URL

  if (siteUrl === undefined) {
    throw new Error("Missing CONVEX_SITE_URL")
  }

  return siteUrl
}
