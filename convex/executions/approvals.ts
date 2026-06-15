"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { callMiloTool } from "../broker/milo"
import { callProviderTool } from "../broker/tools"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { createPromptedExecution } from "./agent/artifacts"
import { authorizeApprovedTool } from "./agent/authorization"
import { type CodexRuntimeInput } from "./agent/codex"
import { runPromptedExecution } from "./agent/sandbox/execute"
import { formatError } from "./agent/sandbox/trace"
import { createExecutionToken } from "./agent/tokens"

export const runApprovedExecution = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const continuation = await loadDecisionContinuation(ctx, {
      approvalId: args.approvalId,
      decision: "approved",
    })

    if (continuation === null) {
      return
    }

    await runApprovalContinuation(ctx, {
      ...continuation,
      decision: "approved",
      result: await executeApprovedTool(
        ctx,
        continuation.input,
        continuation.approval
      ),
    })
  },
})

export const runDeniedExecution = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const continuation = await loadDecisionContinuation(ctx, {
      approvalId: args.approvalId,
      decision: "denied",
    })

    if (continuation === null) {
      return
    }

    await runApprovalContinuation(ctx, {
      ...continuation,
      decision: "denied",
      result: createDeniedResult(),
    })
  },
})

async function loadDecisionContinuation(
  ctx: ActionCtx,
  args: {
    approvalId: Doc<"approvals">["_id"]
    decision: "approved" | "denied"
  }
) {
  const approval = await ctx.runMutation(
    internal.approvals.approvals.claimDecisionContinuation,
    args
  )

  if (approval === null) {
    return null
  }

  const input = await loadContinuationInput(ctx, approval)

  return input === null ? null : { approval, input }
}

async function runApprovalContinuation(
  ctx: ActionCtx,
  args: {
    approval: Doc<"approvals">
    decision: "approved" | "denied"
    input: CodexRuntimeInput
    result: unknown
  }
) {
  const executionToken = createExecutionToken()
  const promptedExecution = await createPromptedExecution(ctx, {
    convexSiteUrl: requireConvexSiteUrl(),
    input: args.input,
    executionToken,
    approvalId: args.approval._id,
    continuation: {
      decision: args.decision,
      handoff: args.approval.handoff,
      action: {
        provider: args.approval.provider,
        tool: args.approval.tool,
        summary: args.approval.summary,
        args: args.approval.args,
      },
      result: args.result,
    },
  })

  if (promptedExecution === null) {
    return
  }

  await runPromptedExecution(ctx, {
    agentId: args.input.type,
    execution: promptedExecution,
    executionToken,
  })
}

async function loadContinuationInput(
  ctx: ActionCtx,
  approval: Doc<"approvals">
) {
  const execution = await ctx.runQuery(internal.executions.records.get, {
    executionId: approval.executionId,
  })

  if (execution === null) {
    return null
  }

  const input = await ctx.runQuery(internal.executions.records.getInputByRun, {
    runId: execution.runId,
  })

  if (input === null) {
    return null
  }

  return await prepareRuntimeInput(ctx, input)
}

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
    const permission = await authorizeApprovedTool(ctx, input, approval)

    if (approval.provider === "milo") {
      return await callMiloTool(
        ctx,
        {
          tenantId: approval.tenantId,
          createdBy: input.run.createdBy,
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

    return await callApprovedProviderTool(ctx, approval, {
      integration,
      tool: permission.tool,
      toolArgs: approval.args,
    })
  } catch (error) {
    return {
      error: formatError(error),
    }
  }
}

async function callApprovedProviderTool(
  ctx: ActionCtx,
  approval: Doc<"approvals">,
  args: {
    integration: CodexRuntimeInput["integrations"][number]
    tool: string
    toolArgs: unknown
  }
) {
  const execution = await ctx.runQuery(internal.executions.records.get, {
    executionId: approval.executionId,
  })

  if (execution === null) {
    throw new Error("Approval execution is missing")
  }

  return await callProviderTool({
    ctx,
    execution,
    integration: args.integration,
    tool: args.tool,
    toolArgs: normalizeToolArgs(args.toolArgs),
  })
}

function createDeniedResult() {
  return {
    error: {
      code: "approval_denied",
      message: "The user denied approval for this action.",
    },
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
