"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type ActionCtx, internalAction } from "../_generated/server"
import { getIntegrationAccess } from "../automations/access"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { createPromptedExecution } from "./artifacts"
import { type CodexRuntimeInput } from "./codex"
import { runPromptedExecution } from "./execute"
import { killE2BSandbox } from "./sandbox/e2b"
import { requireMessageTarget } from "./targets"
import { createExecutionToken } from "./tokens"

export const runMessage = internalAction({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(
      internal.executions.records.getInputByRun,
      args
    )

    if (input === null || input.type !== "message") {
      return
    }

    requireMessageTarget(input.provider, input.message.data)

    await runExecution(ctx, {
      type: "message",
      provider: input.provider,
      run: input.run,
      integration: input.integration,
      integrations: await prepareIntegrationsForRuntime(
        ctx,
        input.integrations
      ),
      message: input.message,
    })
  },
})

export const runAutomation = internalAction({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(
      internal.executions.records.getInputByRun,
      args
    )

    if (input === null || input.type !== "automation") {
      return
    }

    await runExecution(ctx, {
      type: "automation",
      run: input.run,
      integration: null,
      integrations: await prepareIntegrationsForRuntime(
        ctx,
        filterAutomationIntegrations(
          input.integrations,
          input.automation.access
        )
      ),
      automation: input.automation,
      event: input.event,
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
    agentId: input.type,
    execution,
    executionToken,
  })
}

function filterAutomationIntegrations(
  integrations: CodexRuntimeInput["integrations"],
  access: Extract<
    CodexRuntimeInput,
    { type: "automation" }
  >["automation"]["access"]
) {
  return integrations.filter(
    (integration) => getIntegrationAccess(access, integration._id) !== "none"
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
