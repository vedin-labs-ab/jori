"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { callProviderTool } from "../broker/providers"
import { callMiloScheduleTool } from "../scheduling/mcp"
import { createPromptedExecution } from "./artifacts"
import { type CodexRuntimeInput } from "./codex"
import { runPromptedExecution } from "./execute"
import { prepareIntegrationForRuntime } from "./integrations"
import { createExecutionToken } from "./tokens"
import { formatError } from "./trace"

export const runApprovedExecution = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.runMutation(
      internal.approvals.approvals.claimApproved,
      {
        approvalId: args.approvalId,
      }
    )

    if (approval === null) {
      return
    }

    const execution = await ctx.runQuery(internal.executions.records.get, {
      executionId: approval.executionId,
    })

    if (execution === null) {
      return
    }

    const input = await ctx.runQuery(
      internal.executions.records.getInputByTrigger,
      {
        triggerId: execution.triggerId,
      }
    )

    if (input === null) {
      return
    }

    const preparedInput = await prepareRuntimeInput(ctx, input)
    const result = await executeApprovedTool(ctx, preparedInput, approval)
    const executionToken = createExecutionToken()
    const promptedExecution = await createPromptedExecution(ctx, {
      convexSiteUrl: requireConvexSiteUrl(),
      input: preparedInput,
      executionToken,
      approvalId: approval._id,
      continuation: {
        handoff: approval.handoff,
        action: {
          provider: approval.provider,
          tool: approval.tool,
          summary: approval.summary,
          args: approval.args,
        },
        result,
      },
    })

    if (promptedExecution === null) {
      return
    }

    await runPromptedExecution(ctx, {
      execution: promptedExecution,
      executionToken,
    })
  },
})

async function prepareRuntimeInput(ctx: ActionCtx, input: CodexRuntimeInput) {
  const integrations = await prepareIntegrationsForRuntime(
    ctx,
    input.integrations
  )

  if (input.type === "message") {
    return {
      ...input,
      integration:
        integrations.find(
          (integration) => integration._id === input.integration._id
        ) ?? input.integration,
      integrations,
    }
  }

  return {
    ...input,
    integration:
      input.integration === null
        ? null
        : (integrations.find(
            (integration) => integration._id === input.integration?._id
          ) ?? input.integration),
    integrations,
  }
}

async function executeApprovedTool(
  ctx: ActionCtx,
  input: CodexRuntimeInput,
  approval: Doc<"approvals">
) {
  try {
    if (approval.provider === "milo") {
      return await callMiloScheduleTool(
        ctx,
        {
          tenantId: approval.tenantId,
          createdBy: input.trigger.createdBy,
        },
        {
          tool: approval.tool,
          args: approval.args,
        }
      )
    }

    const integration = input.integrations.find(
      (candidate) => candidate.provider === approval.provider
    )

    if (integration === undefined) {
      throw new Error(`No active ${approval.provider} integration is available`)
    }

    return await callProviderTool({
      integration,
      tool: approval.tool,
      toolArgs: normalizeToolArgs(approval.args),
    })
  } catch (error) {
    return {
      error: formatError(error),
    }
  }
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

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}

function requireConvexSiteUrl() {
  const siteUrl = process.env.CONVEX_SITE_URL

  if (siteUrl === undefined) {
    throw new Error("Missing CONVEX_SITE_URL")
  }

  return siteUrl
}
